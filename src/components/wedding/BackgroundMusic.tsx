import { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX, AlertCircle, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toArabicNumerals } from "@/lib/arabicNumbers";

interface BackgroundMusicProps {
  src: string | string[]; // Support both single URL and playlist
  volume?: number;
  shuffle?: boolean; // Randomize playlist order
  type?: "audio" | "anghami";
}

const BackgroundMusic = ({ src, volume = 0.3, shuffle = true, type = "audio" }: BackgroundMusicProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [startMuted, setStartMuted] = useState(true); // Start muted for autoplay
  const [showPrompt, setShowPrompt] = useState(false); // Show prompt if autoplay blocked
  const audioRef = useRef<HTMLAudioElement>(null);

  // Initialize playlist
  useEffect(() => {
    const songs = Array.isArray(src) ? src : [src];
    let processedPlaylist = [...songs];
    
    // Shuffle if enabled
    if (shuffle && processedPlaylist.length > 1) {
      processedPlaylist = processedPlaylist.sort(() => Math.random() - 0.5);
    }
    
    setPlaylist(processedPlaylist);
    setCurrentSongIndex(0);
    setStartMuted(true); // Reset to muted when playlist changes
  }, [src, shuffle]);

  const currentSong = playlist[currentSongIndex];

  // Play on first user interaction if auto-play was blocked
  // This function is used by both the prompt overlay and event listeners
  const handleFirstInteraction = useCallback(async () => {
    const audio = audioRef.current;
    if (audio && audio.paused) {
      try {
        setShowPrompt(false); // Hide prompt immediately when user interacts
        
        // Unmute before playing (in case it was muted for autoplay)
        if (audio.muted && startMuted) {
          audio.muted = false;
          setStartMuted(false);
          setIsMuted(false);
        }
        await audio.play();
        setIsPlaying(true);
        setError(null);
        console.log("🎵 ✅ Audio started on user interaction");
      } catch (error) {
        console.error("Failed to play audio:", error);
        setError("Could not play audio. Browser may require user interaction.");
      }
    }
  }, [startMuted]);

  useEffect(() => {
    if (type === "anghami" || !currentSong) return;

    const audio = audioRef.current;
    if (!audio) return;

    // Ensure audio is muted for HTML autoplay to work (browsers allow muted autoplay)
    if (startMuted) {
      audio.muted = true;
    }
    
    // Set volume
    audio.volume = isMuted ? 0 : volume;
    
    // Reset any previous errors
    setError(null);

    // Handle audio load errors
    const handleError = () => {
      const errorCode = audio.error?.code;
      const errorMsg = audio.error?.message || "Unknown error";
      
      let detailedError = `Failed to load: ${currentSong.substring(0, 50)}...`;
      
      // Provide more specific error messages
      if (errorCode === 4) { // MEDIA_ELEMENT_ERROR: Format error
        const ext = currentSong.toLowerCase().split('.').pop();
        if (ext === 'm4a' || ext === 'mp4') {
          detailedError += `\n\n❌ M4A Format Error: Your browser cannot decode this M4A file's codec.\n\n💡 Possible solutions:\n1. Try a different browser (Chrome/Edge usually have better M4A support)\n2. The file may need to be re-encoded with a compatible codec\n3. Convert to MP3 for universal compatibility (see FIX_MUSIC_NOW.md)`;
        } else {
          detailedError += `\n\n❌ Format Error: The file may not be a valid audio format or may be corrupted.\n\n💡 Solutions:\n1. Verify the file is a valid MP3, MP4, or M4A file\n2. Check the file isn't corrupted\n3. Try playing the file in a media player first`;
        }
      } else {
        detailedError += `\n\nError: ${errorMsg} (Code: ${errorCode})`;
      }
      
      setError(detailedError);
      console.error("Audio load error:", audio.error);
      console.error("Failed URL:", currentSong);
      console.error("Error code:", errorCode);
      console.log("\n💡 Troubleshooting tips:");
      console.log("1. Make sure the file exists in public/music/ folder");
      console.log("2. Check the filename is correct (case-sensitive)");
      console.log("3. Verify the file is a valid audio format (MP3, MP4, or M4A)");
      console.log("4. If file extension doesn't match format, rename it (e.g., .mp4 file should have .mp4 extension)");
      
      // Try next song on error (only if playlist has multiple songs)
      if (playlist.length > 1) {
        setTimeout(() => playNext(), 2000);
      }
    };

    // Handle when song ends - play next
    const handleEnded = () => {
      if (playlist.length > 1) {
        playNext();
      } else {
        // Loop single song
        audio.currentTime = 0;
        audio.play();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setError(null);
      
      // If audio started muted for autoplay, unmute it now
      if (startMuted && audio.muted) {
        setTimeout(() => {
          if (audio) {
            audio.muted = false;
            setIsMuted(false);
            setStartMuted(false);
            console.log("🎵 🔊 Audio unmuted after autoplay!");
          }
        }, 300);
      }
    };
    
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("error", handleError);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    // Load the current song
    // Ensure path is correct (starts with / for public folder)
    let audioSrc = currentSong;
    if (!audioSrc.startsWith('/')) {
      audioSrc = `/${audioSrc}`;
    }
    
    // URL encode only the filename part to handle spaces and special characters
    const pathParts = audioSrc.split('/');
    const folder = pathParts.slice(0, -1).join('/'); // /music
    const filename = pathParts[pathParts.length - 1]; // filename.m4a or .mp3
    const encodedPath = `${folder}/${encodeURIComponent(filename)}`;
    
    // Check file extension
    const ext = filename.toLowerCase().split('.').pop();
    console.log(`🎵 Loading audio: ${currentSong} (format: ${ext})`);
    
    // Function to check if HTML autoplay worked
    // We rely ONLY on HTML autoplay + muted attributes (browsers allow this)
    // We DON'T use programmatic play() - browsers block it until user interaction
    const checkAutoplayStatus = () => {
      if (!audio) return;
      
      // Check if HTML autoplay worked (audio is playing)
      if (!audio.paused) {
        console.log("🎵 ✅ HTML autoplay worked! Audio is playing automatically.");
        setIsPlaying(true);
        setShowPrompt(false); // Hide prompt if autoplay worked
      } else {
        // HTML autoplay was blocked by browser
        // Show visual prompt to encourage user interaction
        setShowPrompt(true);
        console.log("ℹ️ HTML autoplay blocked - showing prompt to start music");
      }
    };
    
    // Add canplaythrough listener to verify file is valid
    // Note: We rely on HTML autoplay + muted attributes (browsers allow this)
    const handleCanPlay = () => {
      console.log(`✅ Audio file is valid and ready: ${currentSong}`);
      setError(null);
      // Check if HTML autoplay worked (it should start automatically with muted attribute)
      setTimeout(() => checkAutoplayStatus(), 100);
    };
    
    const handleCanPlayThrough = () => {
      // Audio is fully loaded and can play through
      console.log(`✅ Audio fully loaded: ${currentSong}`);
      // Check if HTML autoplay worked
      setTimeout(() => checkAutoplayStatus(), 100);
    };
    
    const handleLoadStart = () => {
      console.log(`🔄 Starting to load: ${currentSong}`);
    };
    
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('loadstart', handleLoadStart);
    
    audio.load();

    // Check if HTML autoplay worked after a brief delay
    const timer1 = setTimeout(() => {
      checkAutoplayStatus();
    }, 500);
    
    const timer2 = setTimeout(() => {
      checkAutoplayStatus();
    }, 1500);


    // Add listeners for user interaction (multiple events for better coverage)
    // Includes click, touch, scroll, and keyboard events
    const interactionEvents = ['click', 'touchstart', 'mousedown', 'keydown', 'scroll', 'wheel'];
    interactionEvents.forEach(eventType => {
      document.addEventListener(eventType, handleFirstInteraction, { once: true, passive: true });
    });

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      // Remove interaction listeners
      interactionEvents.forEach(eventType => {
        document.removeEventListener(eventType, handleFirstInteraction);
      });
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('loadstart', handleLoadStart);
    };
  }, [currentSong, playlist.length, isPlaying, volume, isMuted, type, handleFirstInteraction]);

  const playNext = () => {
    if (playlist.length <= 1) return;
    setCurrentSongIndex((prev) => (prev + 1) % playlist.length);
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

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // Hide prompt if visible
    setShowPrompt(false);

    if (isPlaying) {
      audio.pause();
    } else {
      try {
        // Unmute if it was muted for autoplay
        if (audio.muted && startMuted) {
          audio.muted = false;
          setStartMuted(false);
          setIsMuted(false);
        }
        await audio.play();
        setError(null);
      } catch (error) {
        console.error("Failed to play audio:", error);
        setError("Could not play audio. Browser may require user interaction.");
      }
    }
  };
  

  if (!currentSong) return null;

  return (
    <>
      {/* Visual prompt to start music if autoplay was blocked */}
      {showPrompt && !isPlaying && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-sm"
          onClick={handleFirstInteraction}
          onTouchStart={handleFirstInteraction}
          style={{ cursor: 'pointer' }}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-center p-8 max-w-md mx-4"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="text-6xl mb-6"
            >
              🎵
            </motion.div>
            <h3 className="text-2xl font-display font-semibold text-foreground mb-4">
              Start the Music
            </h3>
            <p className="text-lg text-muted-foreground mb-6">
              Tap to begin
            </p>
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-sm sm:text-base text-gold font-semibold uppercase tracking-wider"
            >
              Tap to Start →
            </motion.div>
          </motion.div>
        </motion.div>
      )}
      
      <audio
        ref={audioRef}
        preload="auto"
        autoPlay
        muted={startMuted}
      >
        {/* Use source element for better format detection */}
        {currentSong && (() => {
          let audioSrc = currentSong;
          // Ensure path starts with / for absolute path from public folder
          if (!audioSrc.startsWith('/')) {
            audioSrc = `/${audioSrc}`;
          }
          const pathParts = audioSrc.split('/');
          const folder = pathParts.slice(0, -1).join('/');
          const filename = pathParts[pathParts.length - 1];
          
          // Use Vite's BASE_URL to properly handle GitHub Pages base path
          // BASE_URL already includes the trailing slash (e.g., '/our-special-day/')
          const baseUrl = import.meta.env.BASE_URL;
          // Remove leading slash from folder if present, then combine with base
          const cleanFolder = folder.startsWith('/') ? folder.slice(1) : folder;
          const encodedPath = `${baseUrl}${cleanFolder}/${encodeURIComponent(filename)}`;
          const ext = filename.toLowerCase().split('.').pop();
          
          // Determine MIME type based on extension
          let mimeType = 'audio/mpeg';
          if (ext === 'm4a') {
            mimeType = 'audio/mp4'; // M4A uses MP4 container
          } else if (ext === 'mp4') {
            mimeType = 'audio/mp4';
          } else if (ext === 'mp3') {
            mimeType = 'audio/mpeg';
          }
          
          return (
            <source src={encodedPath} type={mimeType} />
          );
        })()}
      </audio>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <div className="flex flex-col gap-2 items-end">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-destructive/90 text-card px-3 py-2 rounded-lg text-xs flex items-center gap-2 max-w-xs"
            >
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </motion.div>
          )}
          
          {/* Song counter for playlists */}
          {playlist.length > 1 && (
            <div className="text-xs text-muted-foreground bg-card/80 backdrop-blur-sm px-2 py-1 rounded">
              {toArabicNumerals(currentSongIndex + 1, isArabic)} / {toArabicNumerals(playlist.length, isArabic)}
            </div>
          )}
          
          <div className="flex gap-2">
            {playlist.length > 1 && (
              <Button
                onClick={playNext}
                variant="outline"
                size="icon"
                className="rounded-full w-12 h-12 bg-card/80 backdrop-blur-sm border-gold/20 hover:bg-card hover:border-gold/40 shadow-lg"
                aria-label="Next song"
              >
                <SkipForward className="w-5 h-5 text-gold" />
              </Button>
            )}
            <Button
              onClick={togglePlay}
              variant="outline"
              size="icon"
              className="rounded-full w-12 h-12 bg-card/80 backdrop-blur-sm border-gold/20 hover:bg-card hover:border-gold/40 shadow-lg"
              aria-label={isPlaying ? "Pause music" : "Play music"}
            >
              <AnimatePresence mode="wait">
                {isPlaying ? (
                  <motion.div
                    key="playing"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin"
                  />
                ) : (
                  <motion.div
                    key="paused"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="w-5 h-5 border-l-8 border-t-4 border-b-4 border-transparent border-l-gold ml-1"
                  />
                )}
              </AnimatePresence>
            </Button>
            <Button
              onClick={toggleMute}
              variant="outline"
              size="icon"
              className="rounded-full w-12 h-12 bg-card/80 backdrop-blur-sm border-gold/20 hover:bg-card hover:border-gold/40 shadow-lg"
              aria-label={isMuted ? "Unmute music" : "Mute music"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-gold" />
              ) : (
                <Volume2 className="w-5 h-5 text-gold" />
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default BackgroundMusic;
