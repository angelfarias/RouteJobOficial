"use client";

import React, { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Play, Pause, Square, RotateCcw, Upload } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, transcription?: string) => void;
  onError: (error: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  placeholder?: string;
  maxDuration?: number;
  disabled?: boolean;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

export default function AudioRecorder({
  onRecordingComplete,
  onError,
  onRecordingStart,
  onRecordingStop,
  placeholder = "Haz clic en el micrófono para grabar",
  maxDuration = 300, // 5 minutes default
  disabled = false,
}: AudioRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    isPlaying: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
  });

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string>("");
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      setPermissionDenied(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordingState(prev => ({
          ...prev,
          isRecording: false,
          isPaused: false,
          audioBlob,
          audioUrl,
        }));

        // Notify parent that recording has stopped
        if (onRecordingStop) {
          onRecordingStop();
        }

        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
      }));

      // Notify parent that recording has started
      if (onRecordingStart) {
        onRecordingStart();
      }

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setRecordingState(prev => {
          const newDuration = prev.duration + 1;
          
          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording();
            return prev;
          }
          
          return { ...prev, duration: newDuration };
        });
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setPermissionDenied(true);
        onError('Permiso de micrófono denegado. Por favor, permite el acceso al micrófono para grabar audio.');
      } else {
        onError('Error al acceder al micrófono. Verifica que tu dispositivo tenga micrófono disponible.');
      }
    }
  }, [maxDuration, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [recordingState.isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.pause();
      setRecordingState(prev => ({ ...prev, isPaused: true }));
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [recordingState.isRecording]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isPaused) {
      mediaRecorderRef.current.resume();
      setRecordingState(prev => ({ ...prev, isPaused: false }));
      
      // Resume timer
      intervalRef.current = setInterval(() => {
        setRecordingState(prev => {
          const newDuration = prev.duration + 1;
          
          if (newDuration >= maxDuration) {
            stopRecording();
            return prev;
          }
          
          return { ...prev, duration: newDuration };
        });
      }, 1000);
    }
  }, [recordingState.isPaused, maxDuration, stopRecording]);

  const playRecording = useCallback(() => {
    if (recordingState.audioUrl && audioRef.current) {
      audioRef.current.play();
      setRecordingState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [recordingState.audioUrl]);

  const pausePlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setRecordingState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (recordingState.audioUrl) {
      URL.revokeObjectURL(recordingState.audioUrl);
    }
    
    setRecordingState({
      isRecording: false,
      isPaused: false,
      isPlaying: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
    });
    
    setTranscription("");
    setIsTranscribing(false);
  }, [recordingState.audioUrl]);

  const handleTranscribe = useCallback(async () => {
    if (!recordingState.audioBlob) return;
    
    setIsTranscribing(true);
    try {
      // Import transcription service dynamically to avoid SSR issues
      const { transcriptionService } = await import('@/lib/transcriptionService');
      
      if (!transcriptionService.isConfigured()) {
        // Fallback to mock transcription if service is not configured
        await new Promise(resolve => setTimeout(resolve, 2000));
        const mockTranscription = "Esta es una transcripción simulada del audio grabado. Para usar transcripción real, configura la API key de OpenAI en las variables de entorno.";
        setTranscription(mockTranscription);
        onRecordingComplete(recordingState.audioBlob, mockTranscription);
        return;
      }

      const transcribedText = await transcriptionService.transcribeAudio(recordingState.audioBlob);
      setTranscription(transcribedText);
      
      onRecordingComplete(recordingState.audioBlob, transcribedText);
    } catch (error) {
      console.error('Error transcribing audio:', error);
      
      // Fallback to mock transcription on error
      const mockTranscription = "Error en la transcripción automática. Esta es una transcripción de ejemplo. Por favor, revisa la configuración del servicio de IA.";
      setTranscription(mockTranscription);
      onRecordingComplete(recordingState.audioBlob, mockTranscription);
      
      onError('Error al transcribir el audio. Se ha generado una transcripción de ejemplo.');
    } finally {
      setIsTranscribing(false);
    }
  }, [recordingState.audioBlob, onRecordingComplete, onError]);

  const handleUpload = useCallback(() => {
    if (recordingState.audioBlob) {
      onRecordingComplete(recordingState.audioBlob, transcription);
    }
  }, [recordingState.audioBlob, transcription, onRecordingComplete]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingState.audioUrl) {
        URL.revokeObjectURL(recordingState.audioUrl);
      }
    };
  }, [recordingState.audioUrl]);

  return (
    <div className="space-y-4">
      {/* Recording Interface */}
      <div className="flex items-center justify-center p-6 border-2 border-dashed border-zinc-300 rounded-xl bg-zinc-50">
        {permissionDenied ? (
          <div className="text-center">
            <div className="text-red-500 mb-2">
              <MicOff className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-sm text-red-600 mb-3">
              Permiso de micrófono denegado
            </p>
            <button
              onClick={() => {
                setPermissionDenied(false);
                startRecording();
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Intentar de nuevo
            </button>
          </div>
        ) : recordingState.isRecording || recordingState.isPaused ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className={`w-4 h-4 rounded-full ${recordingState.isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
              <span className="text-lg font-mono font-semibold">
                {formatTime(recordingState.duration)}
              </span>
              <span className="text-sm text-zinc-500">
                / {formatTime(maxDuration)}
              </span>
            </div>
            
            <div className="flex items-center justify-center gap-3">
              {recordingState.isPaused ? (
                <button
                  onClick={resumeRecording}
                  disabled={disabled}
                  className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  disabled={disabled}
                  className="p-3 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Pause className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={stopRecording}
                disabled={disabled}
                className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : recordingState.audioBlob ? (
          <div className="text-center w-full">
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="text-sm font-medium text-zinc-700">
                Grabación completada ({formatTime(recordingState.duration)})
              </span>
            </div>
            
            <div className="flex items-center justify-center gap-3 mb-4">
              {recordingState.isPlaying ? (
                <button
                  onClick={pausePlayback}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={playRecording}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={resetRecording}
                className="p-2 bg-zinc-500 text-white rounded-full hover:bg-zinc-600 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleTranscribe}
                disabled={isTranscribing || disabled}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isTranscribing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Transcribiendo...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Transcribir con IA
                  </>
                )}
              </button>
              
              <button
                onClick={handleUpload}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Upload className="w-4 h-4" />
                Usar grabación
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <button
              onClick={startRecording}
              disabled={disabled}
              className="p-4 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-3"
            >
              <Mic className="w-6 h-6" />
            </button>
            <p className="text-sm text-zinc-600">
              {placeholder}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Máximo {formatTime(maxDuration)}
            </p>
          </div>
        )}
      </div>

      {/* Audio Element for Playback */}
      {recordingState.audioUrl && (
        <audio
          ref={audioRef}
          src={recordingState.audioUrl}
          onEnded={() => setRecordingState(prev => ({ ...prev, isPlaying: false }))}
          className="hidden"
        />
      )}

      {/* Transcription Display */}
      {transcription && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            Transcripción:
          </h4>
          <p className="text-sm text-blue-800">
            {transcription}
          </p>
        </div>
      )}
    </div>
  );
}