"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseClient";
import type { User } from "firebase/auth";
import Image from "next/image";
import { getApiUrl } from "@/lib/env";
import UnifiedHeader from "@/app/components/UnifiedHeader";

type RespuestaGuardada = { pregunta: string; respuesta: string };

type PerfilApi = {
  userId: string;
  respuestas: Record<string, RespuestaGuardada>;
  audios?: Record<string, { url: string }>;
};

type Candidato = {
  experience?: string[];
  skills?: string[];
};

const preguntas = [
  "Objetivo profesional: Describe en 2‑3 frases qué tipo de trabajo buscas ahora y en qué área (ej: \"busco un puesto de vendedor en retail\" o \"desarrollador frontend junior\").",
  "Experiencia más reciente: Indica tu último cargo, empresa, fechas (mes/año) y 3 tareas principales (ej: \"Cajero en Supermercado X, 2022‑2024, atención clientes, manejo de caja, reposición\").",
  "Otras experiencias relevantes: Menciona 1 o 2 trabajos anteriores o prácticas que también sirvan para el puesto que buscas, con cargo, empresa y tarea principal.",
  "Habilidades técnicas: Escribe 5 habilidades concretas relacionadas al puesto (ej: \"Excel intermedio, SAP, atención telefónica, JavaScript básico, manejo de caja\").",
  "Habilidades blandas: Elige 3 que realmente te representen y da un ejemplo corto de cada una (ej: \"trabajo en equipo: colaboro bien con mis compañeros\", \"comunicación\", \"responsabilidad\").",
  "Educación: Indica tu último estudio completado o en curso, institución y fechas (ej: \"Técnico en Administración, Instituto X, 2021‑2023\").",
  "Formación adicional: Menciona cursos, certificaciones o talleres que aporten al puesto (ej: \"Curso Excel avanzado 40h\", \"Certificación Scrum\", \"Curso de atención al cliente\").",
];



export default function PerfilPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [perfil, setPerfil] = useState<PerfilApi | null>(null);
  const [candidato, setCandidato] = useState<Candidato | null>(null);

  // estado asistente
  const [mensaje, setMensaje] = useState("");
  const mensajeRef = useRef(mensaje);
  useEffect(() => {
    mensajeRef.current = mensaje;
  }, [mensaje]);

  const [paso, setPaso] = useState(0);
  const [respuestas, setRespuestas] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [micSupported, setMicSupported] = useState(true);
  const [mediaRecorderRef, setMediaRecorderRef] =
    useState<MediaRecorder | null>(null);
  const [audioSubidoPorPaso, setAudioSubidoPorPaso] = useState<
    Record<number, boolean>
  >({});
  const [audioUrlsPorPaso, setAudioUrlsPorPaso] = useState<
    Record<number, string>
  >({});
  const [buscando, setBuscando] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const router = useRouter();

  // Auth + carga de perfil y candidato
  const fetchProfileData = async (uid: string) => {
    const API_URL = getApiUrl();
    try {
      const resp = await fetch(`${API_URL}/chat-assistant/perfil?userId=${uid}`);
      if (!resp.ok) throw new Error("Failed to fetch profile");
      const json = await resp.json();
      const perfilApi: PerfilApi | null = json.perfil || null;
      setPerfil(perfilApi);

      if (perfilApi?.respuestas) {
        const arr: string[] = [];
        for (let i = 0; i < preguntas.length; i++) {
          arr[i] = perfilApi.respuestas[i]?.respuesta || "";
        }
        setRespuestas(arr);
        // Only set message if not already set (to avoid overwriting user input during re-fetches if any)
        // But here we usually want to sync. For now, let's only set it on initial load or step change.
        // Actually, setRespuestas is enough, setMensaje is for current input.
      }

      if (perfilApi?.audios) {
        const urls: Record<number, string> = {};
        const flags: Record<number, boolean> = {};
        Object.keys(perfilApi.audios).forEach((k) => {
          const idx = Number(k);
          const url = perfilApi.audios![k]?.url;
          if (url) {
            urls[idx] = url;
            flags[idx] = true;
          }
        });
        setAudioUrlsPorPaso(urls);
        setAudioSubidoPorPaso(flags);
      }

      setCandidato(json.candidato || null);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    console.log("PERFIL useEffect montado");
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      console.log("onAuthStateChanged perfil", firebaseUser?.uid);

      if (!firebaseUser) {
        router.push("/login");
      } else {
        setUser(firebaseUser);
        await fetchProfileData(firebaseUser.uid);

        // Initialize message for first step
        // We need to wait for fetchProfileData to complete, but we can't easily access the state immediately.
        // However, fetchProfileData sets 'respuestas'. 
        // We can do a separate effect or just trust that the user will see the text when they navigate.
        // For the initial load, we might want to setMensaje from the fetched data.
        // Let's do it inside fetchProfileData logic or here if we had the data.
        // Since fetchProfileData is async, we can't rely on state being updated immediately.
        // But we can re-fetch the specific answer for step 0.
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // Effect to update message when answers change (initial load)
  useEffect(() => {
    if (respuestas.length > 0 && paso === 0 && !mensaje) {
      setMensaje(respuestas[0] || "");
    }
  }, [respuestas]);

  // detección micrófono
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !navigator.mediaDevices?.getUserMedia) {
      setMicSupported(false);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch(() => setMicSupported(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300">
        Cargando...
      </main>
    );
  }
  if (!user) return null;

  const handleLogout = async () => {
    await auth.signOut();
    router.push("/");
  };

  // --- lógica para mapear respuestas a vista previa ---
  const r = perfil?.respuestas || {};
  const objetivo = r[0]?.respuesta || "";
  const experienciaPrincipal = candidato?.experience?.[0] || r[1]?.respuesta || "";
  const otrasExperiencias =
    (candidato?.experience && candidato.experience.slice(1).join("\n\n")) ||
    r[2]?.respuesta ||
    "";
  const educacion = r[5]?.respuesta || "";
  const formacionExtra = r[6]?.respuesta || "";
  const skillsTexto = candidato?.skills?.join(", ") || "";

  // --- funciones asistente ---
  const API_URL = getApiUrl();
  const guardarPaso = async (pasoActual: number, texto: string) => {
    if (!texto.trim() || !user) return;

    setRespuestas((prev) => {
      const nuevas = [...prev];
      nuevas[pasoActual] = texto;
      return nuevas;
    });

    await fetch(`${API_URL}/chat-assistant/respuesta`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        paso: pasoActual,
        pregunta: preguntas[pasoActual],
        respuesta: texto,
      }),
    });

    setPerfil((prev) => {
      const nuevo = prev ? { ...prev } : { userId: user.uid, respuestas: {} as any };
      if (!nuevo.respuestas) nuevo.respuestas = {} as any;
      nuevo.respuestas[pasoActual] = {
        pregunta: preguntas[pasoActual],
        respuesta: texto,
      };
      return nuevo;
    });
  };

  const irAPaso = (nuevoPaso: number) => {
    setPaso(nuevoPaso);
    setMensaje(respuestas[nuevoPaso] || "");
  };

  const handleAnterior = async () => {
    const pasoActual = paso;
    const textoActual = mensaje;
    await guardarPaso(pasoActual, textoActual);
    if (pasoActual > 0) irAPaso(pasoActual - 1);
  };

  const toggleRecording = async () => {
    console.log("Button clicked - toggleRecording");
    if (typeof window === "undefined" || !user) return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !navigator.mediaDevices?.getUserMedia) {
      console.error("SpeechRecognition or getUserMedia not supported");
      setMicSupported(false);
      return;
    }

    if (!isRecording) {
      const textoInicial = mensaje; // Capture text before recording

      try {
        // 1. Setup Speech Recognition
        const recognition = new SpeechRecognition();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log('🎤 Speech recognition started event');
          setIsListening(true);
        };
        recognition.onend = () => {
          console.log('mic Speech recognition ended event');
          setIsListening(false);
        };
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error event:', event.error);
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          if (!event.results) return;
          let transcript = "";
          for (let i = 0; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
          }
          console.log("Transcription result:", transcript);
          setMensaje((textoInicial ? textoInicial + " " : "") + transcript);
        };

        // 2. Setup MediaRecorder
        console.log("Requesting microphone stream...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("Microphone stream obtained");

        const mediaRecorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        mediaRecorder.onstop = async () => {
          console.log("MediaRecorder stopped, processing audio...");
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunks, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("userId", user.uid);
          formData.append("paso", String(paso));
          formData.append("audio", blob, `respuesta-paso-${paso}.webm`);

          try {
            const resp = await fetch(`${API_URL}/chat-assistant/audio`, {
              method: "POST",
              body: formData,
            });

            if (resp.ok) {
              console.log("Audio uploaded successfully");
              // Refresh profile to ensure we have the correct URL
              await fetchProfileData(user.uid);
            } else {
              console.error("Failed to upload audio");
            }
          } catch (error) {
            console.error("Error uploading audio:", error);
          }
        };

        console.log("Starting MediaRecorder...");
        mediaRecorder.start();
        setMediaRecorderRef(mediaRecorder);

        console.log("Starting SpeechRecognition...");
        recognition.start();

        setIsRecording(true);
        (window as any)._routejob_recognition = recognition;

      } catch (err) {
        console.error("Error in toggleRecording:", err);
        alert("No se pudo acceder al micrófono para grabar audio.");
        setMicSupported(false);
      }
    } else {
      console.log("Stopping recording...");
      const recognition = (window as any)._routejob_recognition;
      if (recognition) recognition.stop();
      if (mediaRecorderRef && mediaRecorderRef.state !== "inactive") {
        mediaRecorderRef.stop();
      }
      setIsRecording(false);
      setIsListening(false);
    }
  };

  const sincronizarPerfilBackend = async () => {
    if (!user) return;
    await fetch(`${API_URL}/chat-assistant/sincronizar-perfil`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid }),
    });
    const respCand = await fetch(
      `${API_URL}/candidates/perfil?uid=${user.uid}`,
    );
    const jsonCand = await respCand.json();
    setCandidato(jsonCand.candidato || null);
  };

  const handleGuardarYAvanzar = async () => {
    const pasoActual = paso;
    const textoActual = mensaje;

    await guardarPaso(pasoActual, textoActual);
    await sincronizarPerfilBackend();

    // si NO es la última pregunta, avanzar
    if (pasoActual < preguntas.length - 1) {
      irAPaso(pasoActual + 1);
    } else {
      // si ya está en la 7, mismo botón se comporta como "buscar vacantes"
      setBuscando(true);
      alert(
        "¡Perfecto! Perfil completado. Ahora buscamos vacantes acordes a tu perfil.",
      );
      router.push("/dashboard/mapa");
    }
  };

  const handleFinalizarFormulario = async () => {
    const pasoActual = paso;
    const textoActual = mensaje;

    await guardarPaso(pasoActual, textoActual);
    await sincronizarPerfilBackend();

    setBuscando(true);
    alert(
      "¡Perfecto! Perfil completado. Ahora ve el mapa de vacantes para encontrar oportunidades acordes a tu perfil.",
    );
    router.push("/dashboard/mapa");
  };

  const handleDeleteAudio = async () => {
    if (!user) return;

    // Optimistic update
    const previousUrl = audioUrlsPorPaso[paso];
    setAudioUrlsPorPaso((prev) => {
      const newUrls = { ...prev };
      delete newUrls[paso];
      return newUrls;
    });
    setAudioSubidoPorPaso((prev) => ({ ...prev, [paso]: false }));

    try {
      const resp = await fetch(`${API_URL}/chat-assistant/delete-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          stepNumber: paso,
        }),
      });

      if (!resp.ok) {
        throw new Error('Failed to delete audio');
      }

      // Refresh profile to ensure sync
      await fetchProfileData(user.uid);
    } catch (error) {
      console.error('Error deleting audio:', error);
      // Revert optimistic update
      if (previousUrl) {
        setAudioUrlsPorPaso((prev) => ({ ...prev, [paso]: previousUrl }));
        setAudioSubidoPorPaso((prev) => ({ ...prev, [paso]: true }));
      }
      alert("No se pudo eliminar el audio. Intente nuevamente.");
    }
  };

  // --- UI combinada: asistente (izquierda) + preview (derecha) ---

  const esUltimaPregunta = paso === preguntas.length - 1;

  return (
    <main className="min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-900">
      {/* Unified Header */}
      <UnifiedHeader
        currentPage="profile"
        user={user}
        showSmartFeatures={true}
        onLogout={async () => {
          await auth.signOut();
        }}
      />

      <section className="mx-auto max-w-6xl px-4 pt-24 pb-12">
        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-xl shadow-emerald-100 dark:shadow-emerald-900/10 border border-zinc-200 dark:border-zinc-800 grid md:grid-cols-2 gap-8">
          {/* Asistente izquierda */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Asistente de perfil laboral
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Responde por voz o texto y verás tu perfil formateado al lado en
              tiempo real.
            </p>

            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              Pregunta {paso + 1} de {preguntas.length}
            </p>
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              {preguntas[paso]}
            </p>

            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={!micSupported || buscando}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-xl border border-emerald-600 bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-300/40 dark:shadow-emerald-900/20 disabled:opacity-60"
                >
                  {micSupported
                    ? isRecording
                      ? "Detener grabación"
                      : "Grabar respuesta (audio + texto)"
                    : "Micrófono no soportado"}
                </button>

                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {audioSubidoPorPaso[paso]
                    ? "Audio guardado para esta respuesta."
                    : "Graba un audio para esta respuesta antes de seguir."}
                </span>
              </div>

              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {isRecording
                  ? (isListening ? "🎙️ Escuchando... habla ahora." : "Esperando voz...")
                  : "Puedes editar el texto manualmente después de grabar para corregir detalles."}
              </span>

              {audioUrlsPorPaso[paso] && (
                <div className="mt-2 flex items-center gap-2">
                  <audio
                    controls
                    src={audioUrlsPorPaso[paso]}
                    className="w-full"
                  >
                    Tu navegador no soporta audio.
                  </audio>
                  <button
                    type="button"
                    onClick={handleDeleteAudio}
                    className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Eliminar audio"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>

            <textarea
              id="respuesta-textarea"
              name="respuesta"
              data-gramm="false"
              className="w-full min-h-[140px] border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-sm text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Responde aquí a la pregunta actual…"
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              disabled={buscando}
            />

            <div className="flex flex-wrap gap-3 justify-between mt-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAnterior}
                  disabled={paso === 0 || buscando}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
                >
                  Pregunta anterior
                </button>
                <button
                  type="button"
                  onClick={handleGuardarYAvanzar}
                  disabled={buscando}
                  className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-zinc-900 dark:bg-zinc-700 hover:bg-zinc-800 dark:hover:bg-zinc-600 shadow-md shadow-zinc-900/20 disabled:opacity-60"
                >
                  {esUltimaPregunta
                    ? buscando
                      ? "Buscando vacantes..."
                      : "Guardar y ver vacantes"
                    : "Guardar y siguiente"}
                </button>
              </div>

              <button
                type="button"
                onClick={handleFinalizarFormulario}
                disabled={buscando}
                className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-300/40 dark:shadow-emerald-900/20 disabled:opacity-60"
              >
                {buscando ? "Buscando vacantes..." : "Finalizar formulario"}
              </button>
            </div>
          </div>

          {/* Preview derecha mejorada */}
          <div className="border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/40 dark:from-emerald-900/20 dark:via-zinc-900 dark:to-emerald-900/10 shadow-md shadow-emerald-100 dark:shadow-emerald-900/10">
            <div className="flex flex-col items-center sm:items-start gap-4 mb-5">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-2xl font-bold text-emerald-700 dark:text-emerald-400 shadow-inner">
                {user.displayName?.charAt(0).toUpperCase() ||
                  user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="w-full">
                <p className="font-semibold text-lg sm:text-xl text-zinc-900 dark:text-zinc-100 leading-tight">
                  {user.displayName || "Tu nombre completo"}
                </p>
                <p className="mt-1 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="space-y-4 text-sm sm:text-[15px] text-zinc-800 dark:text-zinc-300">
              <div>
                <h3 className="text-[11px] sm:text-xs font-semibold tracking-[0.12em] text-emerald-700 dark:text-emerald-400 uppercase">
                  Objetivo profesional
                </h3>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                  {objetivo || "Aún no has definido tu objetivo profesional."}
                </p>
              </div>

              <div>
                <h3 className="text-[11px] sm:text-xs font-semibold tracking-[0.12em] text-emerald-700 dark:text-emerald-400 uppercase">
                  Último cargo
                </h3>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                  {experienciaPrincipal || "Aún no has detallado tu último cargo."}
                </p>
              </div>

              {otrasExperiencias && (
                <div>
                  <h3 className="text-[11px] sm:text-xs font-semibold tracking-[0.12em] text-emerald-700 dark:text-emerald-400 uppercase">
                    Otras experiencias relevantes
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                    {otrasExperiencias}
                  </p>
                </div>
              )}

              {skillsTexto && (
                <div>
                  <h3 className="text-[11px] sm:text-xs font-semibold tracking-[0.12em] text-emerald-700 dark:text-emerald-400 uppercase">
                    Habilidades
                  </h3>
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                    {skillsTexto}
                  </p>
                </div>
              )}

              <div>
                <h3 className="text-[11px] sm:text-xs font-semibold tracking-[0.12em] text-emerald-700 dark:text-emerald-400 uppercase">
                  Educación
                </h3>
                <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                  {educacion || "Aún no has registrado tu educación."}
                </p>
                {formacionExtra && (
                  <p className="mt-1 whitespace-pre-wrap leading-relaxed">
                    {formacionExtra}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
