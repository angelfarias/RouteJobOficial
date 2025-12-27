"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import type { User } from "firebase/auth";
import Image from "next/image";
import { getApiUrl } from "@/lib/env";
import CategoryFilter from "@/app/components/CategoryFilter";
import AudioPlayer from "@/app/components/AudioPlayer";
import UnifiedHeader from "@/app/components/UnifiedHeader";
import { Sparkles } from "lucide-react";
import { safeRender, debugObject } from "@/lib/utils/debugUtils";

interface ProfileAnalysis {
  objective: string;
  experience: Array<{
    title: string;
    company: string;
    period: string;
    description: string;
    skills: string[];
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages: string[];
  };
  education: Array<{
    degree: string;
    institution: string;
    period: string;
    status: 'completed' | 'in_progress' | 'incomplete';
  }>;
  suggestedCategories: string[];
  completenessScore: number;
  audioResponses?: AudioResponse[];
  hasAudioContent?: boolean;
}

interface AudioResponse {
  stepNumber: number;
  questionText: string;
  audioUrl: string;
  createdAt: any;
}

interface SmartQuestion {
  id: string;
  question: string;
  type: 'objective' | 'experience' | 'skills' | 'education' | 'categories';
  suggestions?: string[];
}

export default function SmartProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Profile data
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysis | null>(null);
  const [smartQuestions, setSmartQuestions] = useState<SmartQuestion[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Current interaction
  const [currentQuestion, setCurrentQuestion] = useState<SmartQuestion | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isListening, setIsListening] = useState(false); // Visual feedback state
  const [micSupported, setMicSupported] = useState(true);

  const router = useRouter();
  const API_URL = getApiUrl();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) {
        router.push("/login");
      } else {
        setUser(firebaseUser);
        await loadProfileData(firebaseUser.uid);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  const loadProfileData = async (userId: string) => {
    try {
      // Load enhanced profile data with audio
      const enhancedResp = await fetch(`${API_URL}/chat-assistant/enhanced-profile?userId=${userId}`);
      if (enhancedResp.ok) {
        const enhancedData = await enhancedResp.json();
        setProfileAnalysis(enhancedData.profileData);

        if (enhancedData.profileData?.suggestedCategories) {
          setSelectedCategories(enhancedData.profileData.suggestedCategories);
        }
      }

      // Load smart questions
      const questionsResp = await fetch(`${API_URL}/chat-assistant/smart-questions?userId=${userId}`);
      if (questionsResp.ok) {
        const questionsData = await questionsResp.json();
        const questions = questionsData.questions.map((q: string, index: number) => ({
          id: `smart-${index}`,
          question: q,
          type: 'general' as const,
        }));
        setSmartQuestions(questions);

        if (questions.length > 0) {
          setCurrentQuestion(questions[0]);
        }
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!currentAnswer.trim() || !user || !currentQuestion) return;

    try {
      // Save the answer
      await fetch(`${API_URL}/chat-assistant/respuesta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          paso: parseInt(currentQuestion.id.split('-')[1]),
          pregunta: currentQuestion.question,
          respuesta: currentAnswer,
        }),
      });

      // Update categories if selected
      if (selectedCategories.length > 0) {
        await fetch(`${API_URL}/candidates/category-preferences`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            preferredCategories: selectedCategories,
          }),
        });
      }

      // Reload profile data
      await loadProfileData(user.uid);

      // Clear current answer and move to next question
      setCurrentAnswer("");
      const currentIndex = smartQuestions.findIndex(q => q.id === currentQuestion.id);
      if (currentIndex < smartQuestions.length - 1) {
        setCurrentQuestion(smartQuestions[currentIndex + 1]);
      } else {
        setCurrentQuestion(null);
      }
    } catch (error) {
      console.error('Error saving answer:', error);
    }
  };

  // Ref for robust transcription
  const currentAnswerRef = useRef(currentAnswer);
  useEffect(() => {
    currentAnswerRef.current = currentAnswer;
  }, [currentAnswer]);

  const [mediaRecorderRef, setMediaRecorderRef] = useState<MediaRecorder | null>(null);

  const handleDeleteAudio = async (stepNumber: number) => {
    if (!user) return;

    // Optimistic update
    const previousAnalysis = profileAnalysis;
    if (profileAnalysis && profileAnalysis.audioResponses) {
      setProfileAnalysis({
        ...profileAnalysis,
        audioResponses: profileAnalysis.audioResponses.filter(a => a.stepNumber !== stepNumber)
      });
    }

    try {
      const resp = await fetch(`${API_URL}/chat-assistant/delete-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          stepNumber: stepNumber,
        }),
      });

      if (!resp.ok) {
        throw new Error('Failed to delete audio');
      }

      // Refresh to ensure sync
      await loadProfileData(user.uid);
    } catch (error) {
      console.error('Error deleting audio:', error);
      // Revert optimistic update
      if (previousAnalysis) {
        setProfileAnalysis(previousAnalysis);
      }
      alert("No se pudo eliminar el audio. Intente nuevamente.");
    }
  };

  const toggleRecording = async () => {
    if (!micSupported || !user || !currentQuestion) return;

    if (!isRecording) {
      const textoInicial = currentAnswer; // Capture text before recording

      try {
        // 1. Setup Speech Recognition
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log('🎤 Speech recognition started');
          setIsListening(true);
        };
        recognition.onend = () => {
          console.log('mic Speech recognition ended');
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          if (!event.results) return;

          let transcript = "";
          for (let i = 0; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }

          // Robust transcription update using Ref to avoid stale closures if needed, 
          // but here we append to the INITIAL text captured at start of recording session.
          // This is often safer for a single recording session.
          setCurrentAnswer((textoInicial ? textoInicial + " " : "") + transcript);
        };

        // 2. Setup MediaRecorder for Audio File
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop()); // Stop mic stream

          const blob = new Blob(chunks, { type: "audio/webm" });
          const stepNumber = parseInt(currentQuestion.id.split('-')[1]);

          const formData = new FormData();
          formData.append("userId", user.uid);
          formData.append("paso", String(stepNumber));
          formData.append("audio", blob, `smart-answer-${stepNumber}.webm`);

          try {
            const resp = await fetch(`${API_URL}/chat-assistant/audio`, {
              method: "POST",
              body: formData,
            });

            if (resp.ok) {
              console.log("Audio uploaded successfully");
              // Refresh profile to show the new audio
              await loadProfileData(user.uid);
            } else {
              console.error("Failed to upload audio");
            }
          } catch (error) {
            console.error("Error uploading audio:", error);
          }
        };

        mediaRecorder.start();
        setMediaRecorderRef(mediaRecorder);
        recognition.start();

        setIsRecording(true);
        (window as any)._routejob_recognition = recognition;

      } catch (error) {
        console.error('Recording error:', error);
        setMicSupported(false);
        alert("No se pudo acceder al micrófono. Verifique los permisos.");
      }
    } else {
      // Stop Speech Recognition
      const recognition = (window as any)._routejob_recognition;
      if (recognition) recognition.stop();

      // Stop Media Recorder
      if (mediaRecorderRef && mediaRecorderRef.state !== "inactive") {
        mediaRecorderRef.stop();
      }

      setIsRecording(false);
      setIsListening(false);
      setMediaRecorderRef(null);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300">
        Cargando...
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* Unified Header */}
      <UnifiedHeader
        currentPage="smart-cv"
        user={user}
        showSmartFeatures={true}
        onLogout={handleLogout}
      />

      <section className="mx-auto max-w-7xl px-4 pt-24 pb-12">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Smart Assistant Panel */}
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-emerald-100 dark:shadow-emerald-900/10 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="text-white text-lg">🤖</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Smart Profile Assistant</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">AI-powered profile optimization</p>
              </div>
            </div>

            {/* Profile Completeness */}
            {profileAnalysis && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Profile Completeness</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{profileAnalysis?.completenessScore || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${profileAnalysis?.completenessScore || 0}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Current Question */}
            {currentQuestion ? (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Smart CV Question
                  </h3>
                  <p className="text-sm text-purple-800 dark:text-purple-200 font-medium">{currentQuestion.question}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 italic">💡 Responde solo lo que se pregunta para obtener mejores resultados</p>
                </div>

                {/* Category Selection for category-related questions */}
                {currentQuestion.type === 'categories' && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                      Select your preferred job categories:
                    </label>
                    <CategoryFilter
                      selectedCategories={selectedCategories}
                      onCategoriesChange={setSelectedCategories}
                      placeholder="Search categories..."
                      maxSelections={5}
                    />
                  </div>
                )}

                {/* Voice Input */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={!micSupported}
                    className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${isRecording
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                      } disabled:opacity-50`}
                  >
                    {isRecording
                      ? (isListening ? '🎙️ Escuchando...' : '🔴 Grabando...')
                      : '🎤 Responde con tu voz'}
                  </button>
                  <span className="text-xs text-zinc-500">
                    {micSupported
                      ? (isRecording
                        ? (isListening ? "Habla ahora, te estoy escuchando..." : "Esperando voz...")
                        : 'Haz clic para grabar tu respuesta')
                      : 'Microphone not supported'}
                  </span>
                </div>

                {/* Text Input */}
                <textarea
                  className="w-full min-h-[120px] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Type your answer here or use voice input above..."
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                />

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleAnswerSubmit}
                  disabled={!currentAnswer.trim()}
                  className="w-full px-4 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Submit Answer & Continue
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">¡Smart CV Completado!</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  Tu Smart CV está listo. Ahora puedes ver ofertas personalizadas y usar tu CV inteligente.
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/mapa")}
                    className="w-full px-6 py-3 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Ver Smart Match
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full px-6 py-3 text-sm font-semibold text-purple-700 dark:text-purple-300 rounded-xl bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 border border-purple-200 dark:border-purple-800 transition-all"
                  >
                    Descargar Smart CV
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Smart CV Preview */}
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-emerald-100 dark:shadow-emerald-900/10 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Smart CV Preview</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadProfileData(user.uid)}
                  className="p-2 text-zinc-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                  title="Actualizar vista previa"
                >
                  🔄
                </button>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">AI-Enhanced</span>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            </div>

            {profileAnalysis ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center pb-4 border-b border-zinc-200">
                  <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 flex items-center justify-center text-2xl font-bold text-white">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {user.displayName || 'Your Name'}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
                  {profileAnalysis?.objective && (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2 italic">
                      "{profileAnalysis.objective}"
                    </p>
                  )}
                </div>

                {/* Experience */}
                {profileAnalysis?.experience?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wide">
                      Professional Experience
                    </h4>
                    <div className="space-y-3">
                      {profileAnalysis?.experience?.map((exp, index) => {
                        debugObject(exp, `Experience ${index}`);
                        return (
                          <div key={index} className="border-l-2 border-emerald-200 dark:border-emerald-800 pl-4">
                            <h5 className="font-semibold text-zinc-900 dark:text-zinc-100">{safeRender(exp.title, 'Sin título')}</h5>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400">{safeRender(exp.company, 'Sin empresa')}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{safeRender(exp.period, 'Sin período')}</p>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-1">{safeRender(exp.description, 'Sin descripción')}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {(profileAnalysis?.skills?.technical?.length > 0 || profileAnalysis?.skills?.soft?.length > 0) && (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wide">
                      Skills & Competencies
                    </h4>
                    <div className="space-y-3">
                      {profileAnalysis?.skills?.technical?.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Technical Skills</h5>
                          <div className="flex flex-wrap gap-2">
                            {profileAnalysis?.skills?.technical?.map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                                {typeof skill === 'string' ? skill : 'Skill'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {profileAnalysis?.skills?.soft?.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Soft Skills</h5>
                          <div className="flex flex-wrap gap-2">
                            {profileAnalysis?.skills?.soft?.map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded-full">
                                {typeof skill === 'string' ? skill : 'Skill'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Education */}
                {profileAnalysis?.education?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wide">
                      Education & Training
                    </h4>
                    <div className="space-y-2">
                      {profileAnalysis?.education?.map((edu, index) => (
                        <div key={index} className="border-l-2 border-blue-200 dark:border-blue-800 pl-4">
                          <h5 className="font-semibold text-zinc-900 dark:text-zinc-100">{typeof edu.degree === 'string' ? edu.degree : 'Sin título'}</h5>
                          <p className="text-sm text-blue-600 dark:text-blue-400">{typeof edu.institution === 'string' ? edu.institution : 'Sin institución'}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{typeof edu.period === 'string' ? edu.period : 'Sin período'}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${edu.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                            edu.status === 'in_progress' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                              'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-300'
                            }`}>
                            {edu.status === 'completed' ? 'Completed' :
                              edu.status === 'in_progress' ? 'In Progress' : 'Incomplete'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audio Responses */}
                {profileAnalysis?.audioResponses && profileAnalysis.audioResponses.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wide flex items-center gap-2">
                      Audio Responses
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        AI Enhanced
                      </span>
                    </h4>
                    <div className="space-y-3">
                      {profileAnalysis?.audioResponses?.map((audioResponse) => (
                        <AudioPlayer
                          key={audioResponse.stepNumber}
                          audioUrl={audioResponse.audioUrl}
                          questionText={audioResponse.questionText}
                          stepNumber={audioResponse.stepNumber}
                          onDelete={() => handleDeleteAudio(audioResponse.stepNumber)}
                          className="text-xs"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Categories */}
                {selectedCategories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3 uppercase tracking-wide">
                      Job Categories
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map((categoryId, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs rounded-full">
                          Category {categoryId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Building Your Profile</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Answer the smart questions to see your AI-enhanced CV preview here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}