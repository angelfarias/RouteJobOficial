import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Trash2 } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  questionText: string;
  stepNumber: number;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onDelete?: () => void;
  className?: string;
}

export default function AudioPlayer({
  audioUrl,
  questionText,
  stepNumber,
  onPlayStart,
  onPlayEnd,
  onDelete,
  className = "",
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPlayEnd?.();
    };

    const handleError = () => {
      setError("Failed to load audio");
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
    };
  }, [onPlayEnd]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
        onPlayStart?.();
      }
    } catch (err) {
      console.error("Audio playback error:", err);
      setError("Playback failed");
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progressBar = progressRef.current;
    if (!audio || !progressBar || !duration) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audio.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const resetAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const formatTime = (time: number): string => {
    if (!isFinite(time)) return "0:00";

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-xl ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <VolumeX className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Audio Error</p>
            <p className="text-xs text-red-700">{error}</p>
            <p className="text-xs text-red-600 mt-1">Question: {questionText}</p>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              title="Delete audio"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl ${className}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        className="hidden"
      />

      {/* Question Text */}
      <div className="mb-3 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-full">
              Step {stepNumber}
            </span>
            <span className="text-xs text-blue-600 dark:text-blue-400">Audio Response</span>
          </div>
          <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">{questionText}</p>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete audio"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Audio Controls */}
      <div className="space-y-3">
        {/* Main Controls */}
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Progress Bar */}
          <div className="flex-1">
            <div
              ref={progressRef}
              className="h-2 bg-white/60 dark:bg-zinc-700 rounded-full cursor-pointer relative overflow-hidden"
              onClick={handleProgressClick}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={currentTime}
              aria-label="Audio progress"
            >
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-100"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-blue-700 dark:text-blue-300 mt-1">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={resetAudio}
            className="w-8 h-8 rounded-full bg-white/60 dark:bg-zinc-700 hover:bg-white/80 dark:hover:bg-zinc-600 flex items-center justify-center text-blue-600 dark:text-blue-400 transition-all"
            aria-label="Reset audio"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="w-6 h-6 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="flex-1 h-1 bg-white/60 dark:bg-zinc-700 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(59 130 246) 0%, rgb(59 130 246) ${(isMuted ? 0 : volume) * 100}%, rgb(255 255 255 / 0.6) ${(isMuted ? 0 : volume) * 100}%, rgb(255 255 255 / 0.6) 100%)`
            }}
            aria-label="Volume control"
          />
          <span className="text-xs text-blue-700 dark:text-blue-300 w-8 text-right">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}