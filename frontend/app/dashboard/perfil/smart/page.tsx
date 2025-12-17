"use client";

import { useEffect, useState } from "react";
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

  const toggleRecording = async () => {
    if (!micSupported || !user) return;

    if (!isRecording) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = false;
        
        recognition.onresult = (event: any) => {
          const last = event.results[event.results.length - 1];
          const text = last[0].transcript as string;
          setCurrentAnswer(prev => prev ? prev + " " + text : text);
        };
        
        recognition.start();
        setIsRecording(true);
        
        (window as any)._routejob_recognition = recognition;
      } catch (error) {
        console.error('Speech recognition error:', error);
        setMicSupported(false);
      }
    } else {
      const recognition = (window as any)._routejob_recognition;
      if (recognition) recognition.stop();
      setIsRecording(false);
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-white text-zinc-700">
        Cargando...
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen flex flex-col bg-white text-zinc-900 relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
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
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-emerald-100 border border-zinc-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <span className="text-white text-lg">🤖</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Smart Profile Assistant</h2>
                <p className="text-sm text-zinc-600">AI-powered profile optimization</p>
              </div>
            </div>

            {/* Profile Completeness */}
            {profileAnalysis && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-zinc-900">Profile Completeness</span>
                  <span className="text-lg font-bold text-emerald-600">{profileAnalysis?.completenessScore || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
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
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                  <h3 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Smart CV Question
                  </h3>
                  <p className="text-sm text-purple-800 font-medium">{currentQuestion.question}</p>
                  <p className="text-xs text-purple-600 mt-2 italic">💡 Responde solo lo que se pregunta para obtener mejores resultados</p>
                </div>

                {/* Category Selection for category-related questions */}
                {currentQuestion.type === 'categories' && (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">
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
                    className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-all ${
                      isRecording 
                        ? 'border-red-300 bg-red-50 text-red-700' 
                        : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    } disabled:opacity-50`}
                  >
                    {isRecording ? '🔴 Recording...' : '🎤 Voice Answer'}
                  </button>
                  <span className="text-xs text-zinc-500">
                    {micSupported ? 'Click to record your answer' : 'Microphone not supported'}
                  </span>
                </div>

                {/* Text Input */}
                <textarea
                  className="w-full min-h-[120px] border border-zinc-200 rounded-xl p-3 text-sm text-zinc-900 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">¡Smart CV Completado!</h3>
                <p className="text-sm text-zinc-600 mb-4">
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
                    className="w-full px-6 py-3 text-sm font-semibold text-purple-700 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all"
                  >
                    Descargar Smart CV
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Smart CV Preview */}
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 shadow-xl shadow-emerald-100 border border-zinc-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Smart CV Preview</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">AI-Enhanced</span>
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
                  <h3 className="text-xl font-bold text-zinc-900">
                    {user.displayName || 'Your Name'}
                  </h3>
                  <p className="text-sm text-zinc-600">{user.email}</p>
                  {profileAnalysis?.objective && (
                    <p className="text-sm text-zinc-700 mt-2 italic">
                      "{profileAnalysis.objective}"
                    </p>
                  )}
                </div>

                {/* Experience */}
                {profileAnalysis?.experience?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 mb-3 uppercase tracking-wide">
                      Professional Experience
                    </h4>
                    <div className="space-y-3">
                      {profileAnalysis?.experience?.map((exp, index) => {
                        debugObject(exp, `Experience ${index}`);
                        return (
                          <div key={index} className="border-l-2 border-emerald-200 pl-4">
                            <h5 className="font-semibold text-zinc-900">{safeRender(exp.title, 'Sin título')}</h5>
                            <p className="text-sm text-emerald-600">{safeRender(exp.company, 'Sin empresa')}</p>
                            <p className="text-xs text-zinc-500">{safeRender(exp.period, 'Sin período')}</p>
                            <p className="text-sm text-zinc-700 mt-1">{safeRender(exp.description, 'Sin descripción')}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {(profileAnalysis?.skills?.technical?.length > 0 || profileAnalysis?.skills?.soft?.length > 0) && (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 mb-3 uppercase tracking-wide">
                      Skills & Competencies
                    </h4>
                    <div className="space-y-3">
                      {profileAnalysis?.skills?.technical?.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-emerald-700 mb-2">Technical Skills</h5>
                          <div className="flex flex-wrap gap-2">
                            {profileAnalysis?.skills?.technical?.map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {typeof skill === 'string' ? skill : 'Skill'}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {profileAnalysis?.skills?.soft?.length > 0 && (
                        <div>
                          <h5 className="text-xs font-semibold text-emerald-700 mb-2">Soft Skills</h5>
                          <div className="flex flex-wrap gap-2">
                            {profileAnalysis?.skills?.soft?.map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
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
                    <h4 className="text-sm font-bold text-zinc-900 mb-3 uppercase tracking-wide">
                      Education & Training
                    </h4>
                    <div className="space-y-2">
                      {profileAnalysis?.education?.map((edu, index) => (
                        <div key={index} className="border-l-2 border-blue-200 pl-4">
                          <h5 className="font-semibold text-zinc-900">{typeof edu.degree === 'string' ? edu.degree : 'Sin título'}</h5>
                          <p className="text-sm text-blue-600">{typeof edu.institution === 'string' ? edu.institution : 'Sin institución'}</p>
                          <p className="text-xs text-zinc-500">{typeof edu.period === 'string' ? edu.period : 'Sin período'}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            edu.status === 'completed' ? 'bg-green-100 text-green-800' :
                            edu.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
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
                    <h4 className="text-sm font-bold text-zinc-900 mb-3 uppercase tracking-wide flex items-center gap-2">
                      Audio Responses
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border border-purple-200">
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
                          className="text-xs"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Categories */}
                {selectedCategories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 mb-3 uppercase tracking-wide">
                      Job Categories
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map((categoryId, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          Category {categoryId}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">Building Your Profile</h3>
                <p className="text-sm text-zinc-600">
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