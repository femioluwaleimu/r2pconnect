import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, RotateCw, Loader2, Maximize, Volume2, VolumeX } from "lucide-react";

interface YouTubePlayerProps {
  videoId: string;
  className?: string;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function YouTubePlayer({ videoId, className = "" }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!containerRef.current) return;
      
      // Create a unique ID for the player container
      const playerId = `youtube-player-${videoId}-${Date.now()}`;
      const playerDiv = document.createElement("div");
      playerDiv.id = playerId;
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(playerDiv);

      playerRef.current = new window.YT.Player(playerId, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          origin: window.location.origin,
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true);
            setIsLoading(false);
            setDuration(event.target.getDuration());
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startTimeUpdate();
            } else {
              setIsPlaying(false);
              stopTimeUpdate();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      stopTimeUpdate();
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId]);

  const startTimeUpdate = () => {
    stopTimeUpdate();
    intervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 500);
  };

  const stopTimeUpdate = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    // Always hide controls after 3 seconds when playing
    if (isPlaying) {
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Start auto-hide timer when video starts playing
  useEffect(() => {
    if (isPlaying) {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    } else {
      // Show controls when video is paused
      setShowControls(true);
    }

    return () => {
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const seekTo = (seconds: number) => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(seconds, true);
    setCurrentTime(seconds);
  };

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  const skipBackward = () => {
    seekTo(Math.max(0, currentTime - 10));
  };

  const skipForward = () => {
    seekTo(Math.min(duration, currentTime + 10));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFullscreen = () => {
    const container = containerRef.current?.parentElement;
    if (container) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        container.requestFullscreen();
      }
    }
  };

  return (
    <div 
      className={`relative bg-black w-full h-full ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Container - fills parent completely with scale to cover */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 w-full h-full [&>div]:!w-full [&>div]:!h-full [&_iframe]:!w-full [&_iframe]:!h-full"
        style={{ 
          pointerEvents: "none",
          transform: 'scale(1.02)',
          transformOrigin: 'center center'
        }}
      />
      
      {/* Clickable overlay for play/pause */}
      <div 
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={togglePlay}
      />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      )}

      {/* Play button overlay when paused */}
      {isReady && !isPlaying && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-black/60 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1" />
          </div>
        </div>
      )}

      {/* Custom Controls Overlay */}
      {isReady && (
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 sm:p-4 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* Progress Bar */}
          <div className="mb-2 sm:mb-3">
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Skip Back */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); skipBackward(); }}
                className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>

              {/* Play/Pause */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                className="text-white hover:bg-white/20 h-8 w-8 sm:h-10 sm:w-10"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
                )}
              </Button>

              {/* Skip Forward */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); skipForward(); }}
                className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8"
              >
                <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>

              {/* Volume */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8"
              >
                {isMuted ? (
                  <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                )}
              </Button>

              {/* Time Display */}
              <div className="text-white text-xs sm:text-sm font-medium ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleFullscreen(); }}
              className="text-white hover:bg-white/20 h-7 w-7 sm:h-8 sm:w-8"
            >
              <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}