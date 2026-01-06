import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { Volume2, VolumeX, AlertCircle, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toArabicNumerals } from "@/lib/arabicNumbers";

// Global lock to prevent multiple simultaneous loads across all instances
const globalLoadLock = {
  isLocked: false,
  currentSong: null as string | null,
  lockTime: 0,
};

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
  const wasPlayingBeforeHidden = useRef<boolean>(false); // Track if music was playing before tab was hidden
  const hasUserInteracted = useRef<boolean>(false); // Track if user has already interacted with music
  const showPromptRef = useRef<boolean>(false); // Track prompt state for use in event handlers
  const isLoadingRef = useRef<boolean>(false); // Track if audio is currently loading to prevent multiple loads
  const lastLoadedSongRef = useRef<string | null>(null); // Track the last loaded song to prevent reloading the same song
  const startMutedRef = useRef<boolean>(true); // Track startMuted in a ref to avoid callback dependencies
  const lastLoadTimeRef = useRef<number>(0); // Track when we last loaded to prevent rapid re-loads
  const isMountedRef = useRef<boolean>(true); // Track if component is mounted
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For debouncing loads
  const lastLoadCallRef = useRef<number>(0); // Track when we last called audio.load()
  const loadCallCountRef = useRef<number>(0); // Track how many times we've tried to load
  const lastSourceRef = useRef<string | null>(null); // Track the last source we set to prevent unnecessary updates

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
    startMutedRef.current = true; // Also update ref
  }, [src, shuffle]);

  const currentSong = playlist[currentSongIndex];

  // Play on first user interaction if auto-play was blocked
  // This function is used by both the prompt overlay and event listeners
  // Using refs to avoid dependency issues that cause re-renders
  const handleFirstInteraction = useCallback(async () => {
    const audio = audioRef.current;
    if (audio && audio.paused) {
      try {
        setShowPrompt(false); // Hide prompt immediately when user interacts
        showPromptRef.current = false;
        hasUserInteracted.current = true; // Mark that user has interacted
        
        // Unmute before playing (in case it was muted for autoplay)
        // Use ref to avoid dependency on startMuted state
        if (audio.muted && startMutedRef.current) {
          audio.muted = false;
          setStartMuted(false);
          setIsMuted(false);
          startMutedRef.current = false;
        }
        // Check if audio is ready to play
        if (audio.readyState < 2) {
          // Audio not ready, wait a bit
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await audio.play();
        setIsPlaying(true);
        setError(null);
        console.log("🎵 ✅ Audio started on user interaction");
      } catch (error) {
        // Only log error if it's not a common autoplay/interaction error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('play()') && !errorMessage.includes('interaction') && !errorMessage.includes('NotAllowedError')) {
          console.error("Failed to play audio:", error);
          // Only show error for non-autoplay errors
          setError("Unable to play music. Please try again.");
          // Auto-dismiss after 3 seconds
          setTimeout(() => {
            if (isMountedRef.current) {
              setError(null);
            }
          }, 3000);
        }
        // Don't show error for autoplay/interaction errors - they're expected
      }
    }
  }, []); // Empty deps - use refs instead to avoid re-renders

  // Separate effect for volume/mute changes (doesn't require reloading audio)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || type === "anghami" || !currentSong) return;
    
    // Update volume and mute state without reloading
    if (startMuted) {
      audio.muted = true;
    }
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted, startMuted, type, currentSong]);

  // Main effect for loading audio - only runs when song changes
  useEffect(() => {
    if (type === "anghami" || !currentSong || !isMountedRef.current) return;

    // ULTRA-EARLY GUARD: Check if we've already processed this song very recently
    const now = Date.now();
    if (lastLoadedSongRef.current === currentSong) {
      const timeSinceLastLoad = now - lastLoadTimeRef.current;
      if (timeSinceLastLoad < 3000) { // 3 second window
        console.log(`🔍 ULTRA-EARLY: Skipping - loaded ${timeSinceLastLoad}ms ago`);
        return;
      }
    }

    const audio = audioRef.current;
    if (!audio) return;

    // Clear any pending load timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // Prevent multiple simultaneous loads - check multiple conditions
    // Reuse 'now' from above, no need to redeclare
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    const timeSinceGlobalLock = now - globalLoadLock.lockTime;
    const timeSinceLastLoadCall = now - lastLoadCallRef.current;
    
    // ULTRA-AGGRESSIVE: If we called load() very recently (within 500ms), skip entirely
    if (timeSinceLastLoadCall < 500) {
      console.log(`🔍 ULTRA-GUARD: Skipping - load() called ${timeSinceLastLoadCall}ms ago`);
      return;
    }
    
    // Check global lock first (prevents loads across component re-renders)
    if (globalLoadLock.isLocked && globalLoadLock.currentSong === currentSong && timeSinceGlobalLock < 2000) {
      console.log(`🔍 Global lock active - skipping load (locked ${timeSinceGlobalLock}ms ago)`);
      return;
    }
    
    // AGGRESSIVE: If we loaded this song very recently (within 2000ms), skip to prevent rapid re-renders
    if (lastLoadedSongRef.current === currentSong && timeSinceLastLoad < 2000) {
      console.log(`🔍 Skipping rapid reload - loaded ${timeSinceLastLoad}ms ago (threshold: 2000ms)`);
      return;
    }
    
    // If we're currently loading this exact song, skip
    if (isLoadingRef.current && lastLoadedSongRef.current === currentSong) {
      console.log("🔍 Skipping duplicate load - already loading this song");
      return;
    }

    // If the song is already loaded and ready, skip reload
    if (lastLoadedSongRef.current === currentSong && audio.readyState >= 2 && !audio.error) {
      console.log("🔍 Skipping reload - song already loaded and ready");
      return;
    }
    
    // Final check: if audio element already has the correct source loaded
    const audioCurrentSrcCheck = audio.currentSrc || '';
    if (audioCurrentSrcCheck && audioCurrentSrcCheck.includes(encodeURIComponent(currentSong.split('/').pop() || '')) && audio.readyState > 0 && !audio.error) {
      console.log("🔍 Audio element already has correct source, skipping");
      lastLoadedSongRef.current = currentSong;
      lastLoadTimeRef.current = now;
      return;
    }

    // Set global lock
    globalLoadLock.isLocked = true;
    globalLoadLock.currentSong = currentSong;
    globalLoadLock.lockTime = now;

    // Mark as loading BEFORE we do anything else to prevent race conditions
    isLoadingRef.current = true;
    lastLoadedSongRef.current = currentSong;
    lastLoadTimeRef.current = now;
    
    // Set initial muted state for autoplay (browsers allow muted autoplay)
    if (startMuted) {
      audio.muted = true;
      startMutedRef.current = true;
    }
    
    // Set initial volume
    audio.volume = isMuted ? 0 : volume;
    
    // Reset any previous errors
    setError(null);

    // Handle audio load errors
    const handleError = () => {
      if (!isMountedRef.current) return;
      isLoadingRef.current = false; // Mark as not loading on error
      globalLoadLock.isLocked = false; // Release global lock
      const errorCode = audio.error?.code;
      const errorMsg = audio.error?.message || "Unknown error";
      const failedSrc = audio.currentSrc || audio.src || currentSong;
      
      // Log error for debugging
      console.error("Audio load error:", audio.error);
      console.error("Failed URL:", failedSrc);
      console.error("Original path:", currentSong);
      console.error("Error code:", errorCode);
      
      // Don't show error immediately - wait a bit to see if it recovers
      // This handles transient network issues (like when accessing from Google Drive)
      setTimeout(() => {
        if (!isMountedRef.current || !audioRef.current) return;
        
        const audioCheck = audioRef.current;
        
        // Check multiple recovery indicators:
        // 1. No error anymore
        // 2. ReadyState improved (has data)
        // 3. Audio is actually playing
        // 4. Duration is available (file loaded)
        const hasRecovered = 
          !audioCheck.error || 
          audioCheck.readyState >= 2 || 
          !audioCheck.paused ||
          (audioCheck.duration && audioCheck.duration > 0);
        
        if (hasRecovered) {
          console.log("✅ Audio recovered, not showing error");
          setError(null);
          return;
        }
        
        // Only show error for persistent issues (not transient network problems)
        // Error code 1 = MEDIA_ERR_ABORTED (user aborted) - don't show
        // Error code 2 = MEDIA_ERR_NETWORK - might be transient, check again
        if (errorCode === 1 || errorCode === undefined) {
          // User aborted, browser optimization, or undefined error - don't show error
          console.log(`🔍 Error code ${errorCode || 'undefined'} (aborted/optimization) - not showing error to user`);
          setError(null);
          return;
        }
        
        // For network errors, only show if it persists after retry
        if (errorCode === 2) {
          // Network error - might be transient (especially on mobile/Google Drive)
          // Wait longer and check multiple times before showing error
          console.log("🔄 Network error detected, waiting for recovery...");
          
          let retryCount = 0;
          const maxRetries = 3;
          const checkRecovery = () => {
            if (!isMountedRef.current || !audioRef.current) return;
            
            const audioRetry = audioRef.current;
            const recovered = 
              !audioRetry.error || 
              audioRetry.readyState >= 2 || 
              !audioRetry.paused ||
              (audioRetry.duration && audioRetry.duration > 0);
            
            if (recovered) {
              console.log("✅ Audio recovered after network error");
              setError(null);
              return;
            }
            
            retryCount++;
            if (retryCount < maxRetries) {
              // Check again after delay
              setTimeout(checkRecovery, 1000);
            } else {
              // Still failing after multiple checks - show error
              console.log("⚠️ Network error persists after retries");
              setError("Unable to load music. Please check your internet connection.");
              // Auto-dismiss after 5 seconds
              setTimeout(() => {
                if (isMountedRef.current) {
                  setError(null);
                }
              }, 5000);
              // Try next song on error (only if playlist has multiple songs)
              if (playlist.length > 1) {
                setTimeout(() => playNext(), 2000);
              }
            }
          };
          
          // Start checking after initial delay
          setTimeout(checkRecovery, 1000);
          return;
        }
        
        // For other errors (format errors, etc.), show error but be less aggressive
        let detailedError = `Unable to play music`;
        
        if (errorCode === 4) { // MEDIA_ELEMENT_ERROR: Format error
          const ext = currentSong.toLowerCase().split('.').pop();
          if (ext === 'm4a' || ext === 'mp4') {
            detailedError = `Music format not supported. Please try a different browser.`;
          } else {
            detailedError = `Music file format error. Please check the file.`;
          }
        } else if (errorCode === 3) {
          // Decode error
          detailedError = `Music file cannot be decoded. The file may be corrupted.`;
        } else {
          // Unknown error - show generic message
          detailedError = `Unable to play music. Please try refreshing the page.`;
        }
        
        // Only show error if audio is definitely not working
        // Double-check before showing
        if (audioCheck.readyState === 0 && audioCheck.error) {
          setError(detailedError);
          
          // Auto-dismiss error after 5 seconds
          setTimeout(() => {
            if (isMountedRef.current) {
              setError(null);
            }
          }, 5000);
          
          // Try next song on error (only if playlist has multiple songs)
          if (playlist.length > 1) {
            setTimeout(() => playNext(), 2000);
          }
        } else {
          // Audio might still be loading, don't show error yet
          console.log("🔍 Audio might still be loading, not showing error");
          setError(null);
        }
      }, 1000); // Wait 1 second before showing error to allow recovery (increased from 500ms)
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
      // This is a legitimate play (either user-initiated or autoplay/resume)
      // Reset the flag since we're playing now
      wasPlayingBeforeHidden.current = false;
      
      setIsPlaying(true);
      setError(null);
      
      // If audio started muted for autoplay, unmute it now
      if (startMutedRef.current && audio.muted) {
        setTimeout(() => {
          if (audio) {
            audio.muted = false;
            setIsMuted(false);
            setStartMuted(false);
            startMutedRef.current = false;
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
    
    // Properly encode the filename (decode first in case it's already encoded, then encode)
    // This prevents double encoding issues
    let decodedFilename = filename;
    try {
      decodedFilename = decodeURIComponent(filename);
    } catch (e) {
      // If already decoded or invalid encoding, use as is
      decodedFilename = filename;
    }
    const encodedFilename = encodeURIComponent(decodedFilename);
    const encodedPath = `${folder}/${encodedFilename}`;
    
    // Check file extension
    const ext = filename.toLowerCase().split('.').pop();
    console.log(`🎵 Loading audio: ${currentSong} (format: ${ext})`);
    console.log(`🎵 Encoded path: ${encodedPath}`);
    
    // Function to check if HTML autoplay worked
    // We rely ONLY on HTML autoplay + muted attributes (browsers allow this)
    // We DON'T use programmatic play() - browsers block it until user interaction
    const checkAutoplayStatus = () => {
      if (!audio) return;
      
      // Don't show prompt if user has already interacted or if music was paused due to tab switch
      if (hasUserInteracted.current || wasPlayingBeforeHidden.current) {
        console.log("🔍 Skipping autoplay check - user already interacted or music was paused due to tab switch");
        return;
      }
      
      // Check if HTML autoplay worked (audio is playing)
      if (!audio.paused) {
        console.log("🎵 ✅ HTML autoplay worked! Audio is playing automatically.");
        setIsPlaying(true);
        setShowPrompt(false); // Hide prompt if autoplay worked
        showPromptRef.current = false;
        hasUserInteracted.current = true; // Mark as interacted since autoplay worked
      } else {
        // HTML autoplay was blocked by browser
        // Only show prompt if user hasn't interacted yet
        if (!hasUserInteracted.current) {
          setShowPrompt(true);
          showPromptRef.current = true;
          console.log("ℹ️ HTML autoplay blocked - showing prompt to start music");
        }
      }
    };
    
    // Add canplaythrough listener to verify file is valid
    // Note: We rely on HTML autoplay + muted attributes (browsers allow this)
    const handleCanPlay = () => {
      if (!isMountedRef.current) return;
      isLoadingRef.current = false;
      globalLoadLock.isLocked = false;
      console.log(`✅ Audio file is valid and ready: ${currentSong}`);
      setError(null);
      // Check if HTML autoplay worked (it should start automatically with muted attribute)
      setTimeout(() => {
        if (isMountedRef.current) checkAutoplayStatus();
      }, 100);
    };
    
    const handleCanPlayThrough = () => {
      if (!isMountedRef.current) return;
      isLoadingRef.current = false;
      globalLoadLock.isLocked = false;
      // Audio is fully loaded and can play through
      console.log(`✅ Audio fully loaded: ${currentSong}`);
      // Check if HTML autoplay worked
      setTimeout(() => {
        if (isMountedRef.current) checkAutoplayStatus();
      }, 100);
    };
    
    const handleLoadStart = () => {
      console.log(`🔄 Starting to load: ${currentSong}`);
    };
    
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('loadstart', handleLoadStart);
    // Note: handleError is already added above with audio.addEventListener("error", handleError)
    
    // Only load if the source has actually changed
    const audioCurrentSrc = audio.currentSrc || '';
    const encodedFilenameCheck = encodeURIComponent(filename);
    
    // Check if we're already loading/loaded this exact file
    if (audioCurrentSrc && audioCurrentSrc.includes(encodedFilenameCheck) && audio.readyState > 0 && !audio.error) {
      console.log("🔍 Audio source unchanged and ready, skipping load()");
      isLoadingRef.current = false;
      globalLoadLock.isLocked = false;
      // Still set up event listeners in case they were removed
      return;
    }
    
    // Debounce the load call to prevent rapid successive loads
    // Reuse timeSinceLastLoadCall from above, no need to redeclare
    
    // AGGRESSIVE: If we called load() very recently (within 200ms), skip entirely
    if (timeSinceLastLoadCall < 200) {
      console.log(`🔍 Skipping load() call - last call was ${timeSinceLastLoadCall}ms ago`);
      isLoadingRef.current = false;
      globalLoadLock.isLocked = false;
      return;
    }
    
    loadTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current || !audioRef.current) {
        globalLoadLock.isLocked = false;
        return;
      }
      const audioElement = audioRef.current;
      
      // Triple-check we still need to load
      const timeSinceLastCall = Date.now() - lastLoadCallRef.current;
      if (timeSinceLastCall < 200) {
        console.log("🔍 Load call canceled - another load happened during debounce");
        isLoadingRef.current = false;
        globalLoadLock.isLocked = false;
        return;
      }
      
      if (lastLoadedSongRef.current === currentSong && audioElement.readyState >= 2 && !audioElement.error) {
        console.log("🔍 Song already loaded during debounce, skipping");
        isLoadingRef.current = false;
        globalLoadLock.isLocked = false;
        return;
      }
      
      // Mark that we're calling load()
      lastLoadCallRef.current = Date.now();
      loadCallCountRef.current += 1;
      console.log(`🎵 Calling audio.load() for: ${currentSong} (call #${loadCallCountRef.current})`);
      audioElement.load();
    }, 100); // 100ms debounce (increased from 50ms)

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
      isLoadingRef.current = false;
      globalLoadLock.isLocked = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
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
  }, [currentSong, playlist.length, type]); // Removed handleFirstInteraction - it's stable now with empty deps

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      globalLoadLock.isLocked = false;
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, []);

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

    // Hide prompt if visible and mark user as interacted
    setShowPrompt(false);
    showPromptRef.current = false;
    hasUserInteracted.current = true;

    if (isPlaying) {
      // Pause the audio and immediately update state
      audio.pause();
      setIsPlaying(false);
      // Reset the flag since user manually paused
      wasPlayingBeforeHidden.current = false;
      console.log("🎵 ⏸️ Music paused");
    } else {
      try {
        // Reset the flag before playing - this is a user-initiated play
        wasPlayingBeforeHidden.current = false;
        
        // Unmute if it was muted for autoplay
        if (audio.muted && startMutedRef.current) {
          audio.muted = false;
          setStartMuted(false);
          setIsMuted(false);
          startMutedRef.current = false;
        }
        
        // Check if audio is ready to play
        if (audio.readyState < 2) {
          // Audio not ready, wait a bit
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await audio.play();
        setIsPlaying(true);
        setError(null);
        console.log("🎵 ▶️ Music playing");
      } catch (error) {
        // Only log error if it's not a common autoplay/interaction error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('play()') && !errorMessage.includes('interaction')) {
          console.error("Failed to play audio:", error);
        }
        // Don't show error for autoplay/interaction errors - they're expected and handled by the prompt
        // Only log for debugging
        console.log("ℹ️ Autoplay blocked - user will see prompt to start music");
      }
    }
  };

  // Stop music when tab is switched or browser is closed (especially for mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log("🔍 Visibility change detected:", {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        audioExists: !!audioRef.current,
        audioPaused: audioRef.current?.paused
      });

      const audio = audioRef.current;
      if (!audio) {
        console.warn("⚠️ Audio element not found in visibility change handler");
        return;
      }

      // When tab becomes hidden (user switches tab or minimizes browser)
      if (document.hidden || document.visibilityState === 'hidden') {
        // Save if music was playing before hiding
        wasPlayingBeforeHidden.current = !audio.paused;
        console.log("🔍 Tab hidden, wasPlayingBeforeHidden:", wasPlayingBeforeHidden.current);
        
        if (!audio.paused) {
          try {
            // Pause the audio - use multiple methods to ensure it works
            audio.pause();
            // Set currentTime to current position (don't reset, just ensure pause)
            const currentPos = audio.currentTime;
            audio.currentTime = currentPos; // This can help ensure pause sticks
            
            setIsPlaying(false);
            console.log("🎵 ⏸️ Music paused - tab switched or browser minimized", {
              paused: audio.paused,
              currentTime: audio.currentTime
            });
            
            // Double-check after a brief moment to ensure it stayed paused
            setTimeout(() => {
              const audioCheck = audioRef.current;
              if (audioCheck && !audioCheck.paused) {
                console.warn("⚠️ Audio resumed after pause, forcing pause again");
                audioCheck.pause();
                setIsPlaying(false);
              }
            }, 100);
          } catch (error) {
            console.error("❌ Error pausing audio:", error);
          }
        } else {
          console.log("🔍 Audio was already paused");
        }
      } else {
        // Tab became visible again
        console.log("🔍 Tab visible again, wasPlayingBeforeHidden:", wasPlayingBeforeHidden.current);
        
        // Hide prompt if it was showing (user already interacted, don't show it again)
        if (showPromptRef.current) {
          setShowPrompt(false);
          showPromptRef.current = false;
          console.log("🔍 Hiding prompt - tab became visible again");
        }
        
        // Resume music if it was playing before tab was hidden
        if (wasPlayingBeforeHidden.current && hasUserInteracted.current) {
          // Only resume if user had interacted with music before
          const resumeMusic = async () => {
            const audioCheck = audioRef.current;
            if (audioCheck && audioCheck.paused) {
              try {
                // Unmute if it was muted for autoplay
                if (audioCheck.muted && startMutedRef.current) {
                  audioCheck.muted = false;
                  setStartMuted(false);
                  setIsMuted(false);
                  startMutedRef.current = false;
                }
                // Check if audio is ready to play
                if (audioCheck.readyState < 2) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
                await audioCheck.play();
                setIsPlaying(true);
                console.log("🎵 ▶️ Music resumed after tab became visible");
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (!errorMessage.includes('play()') && !errorMessage.includes('interaction')) {
                  console.error("Failed to resume audio:", error);
                }
                // If resume fails, don't show error - just log it
              }
            }
            wasPlayingBeforeHidden.current = false;
          };
          
          // Try to resume after a short delay to ensure page is fully visible
          setTimeout(resumeMusic, 200);
        } else {
          // Reset flag if we're not resuming
          wasPlayingBeforeHidden.current = false;
        }
      }
    };

    const handleBeforeUnload = () => {
      // When user is about to close the browser/tab
      // Use synchronous operations only (no async/await)
      const audio = audioRef.current;
      if (!audio) return;
      
      console.log("🔍 Beforeunload event detected:", { 
        audioPaused: audio.paused,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      });
      
      if (!audio.paused) {
        try {
          // Pause the audio
          audio.pause();
          // Set volume to 0 for more aggressive stop
          audio.volume = 0;
          // Don't call setIsPlaying in beforeunload as state updates might not work during unload
          console.log("🎵 ⏸️ Music paused - browser closing");
        } catch (error) {
          // Ignore errors during unload
          console.error("Error in beforeunload handler:", error);
        }
      }
    };

    const handlePageHide = (e: PageTransitionEvent) => {
      // Additional event for mobile browsers when page is being unloaded
      // Only stop if page is not being cached (persisted = false means page is being unloaded)
      const audio = audioRef.current;
      if (!audio) return;
      
      console.log("🔍 Pagehide event detected:", { 
        persisted: e.persisted, 
        audioPaused: audio.paused,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      });
      
      if (!e.persisted) {
        // Page is being unloaded (not cached) - stop music
        if (!audio.paused) {
          try {
            // Pause the audio
            audio.pause();
            // Also set volume to 0 for more aggressive stop on mobile
            audio.volume = 0;
            // Don't call setIsPlaying in pagehide as state updates might not work during unload
            console.log("🎵 ⏸️ Music paused - page hiding (mobile browser close)");
          } catch (error) {
            // Ignore errors during page hide
            console.error("Error in pagehide handler:", error);
          }
        }
      } else {
        // Page is being cached (persisted = true) - might be tab switch on mobile
        // Still pause if playing, as cached pages shouldn't play audio
        if (!audio.paused) {
          try {
            audio.pause();
            console.log("🎵 ⏸️ Music paused - page cached (mobile tab switch)");
          } catch (error) {
            // Ignore errors
          }
        }
      }
    };

    // Fallback: Handle window blur (when window loses focus)
    const handleBlur = () => {
      const audio = audioRef.current;
      if (!audio) return;
      
      // Only pause if tab is actually hidden (not just window lost focus)
      if (document.hidden || document.visibilityState === 'hidden') {
        wasPlayingBeforeHidden.current = !audio.paused;
        if (!audio.paused) {
          try {
            audio.pause();
            setIsPlaying(false);
            console.log("🎵 ⏸️ Music paused - window blur (fallback)");
          } catch (error) {
            console.error("Error pausing audio on blur:", error);
          }
        }
      }
    };

    // Handle suspend event on audio element (when browser suspends media)
    const handleSuspend = () => {
      const audio = audioRef.current;
      if (audio) {
        setIsPlaying(false);
        console.log("🎵 ⏸️ Music suspended by browser");
      }
    };

    // Add suspend listener to audio element (will be added when audio exists)
    const addSuspendListener = () => {
      const audio = audioRef.current;
      if (audio) {
        audio.addEventListener("suspend", handleSuspend);
        console.log("✅ Suspend listener added to audio element");
      }
    };

    // Try to add suspend listener immediately
    addSuspendListener();
    
    // Also try after a delay in case audio element isn't ready yet
    const suspendTimer = setTimeout(addSuspendListener, 1000);

    // Add event listeners with capture phase for better reliability
    // Mobile browsers need special handling with pagehide/pageshow events
    console.log("✅ Registering visibility change listeners for mobile and desktop");
    
    // Primary: visibilitychange (works on desktop and most mobile browsers)
    document.addEventListener("visibilitychange", handleVisibilityChange, true);
    
    // Mobile-specific: pagehide (critical for iOS Safari and Android Chrome when closing/switching)
    window.addEventListener("pagehide", handlePageHide, true);
    
    // Desktop and mobile: beforeunload (browser/tab closing)
    window.addEventListener("beforeunload", handleBeforeUnload, true);
    
    // Fallback: blur (for browsers that don't properly fire visibilitychange)
    window.addEventListener("blur", handleBlur, true);
    
    // Mobile-specific: pageshow (when returning to cached page - resume if was playing)
    const handlePageShow = (e: PageTransitionEvent) => {
      // If page was cached and we return, resume if music was playing before
      if (e.persisted && wasPlayingBeforeHidden.current && hasUserInteracted.current) {
        const audio = audioRef.current;
        if (audio && audio.paused) {
          const resumeMusic = async () => {
            try {
              if (audio.muted && startMutedRef.current) {
                audio.muted = false;
                setStartMuted(false);
                setIsMuted(false);
                startMutedRef.current = false;
              }
              if (audio.readyState < 2) {
                await new Promise(resolve => setTimeout(resolve, 100));
              }
              await audio.play();
              setIsPlaying(true);
              console.log("🎵 ▶️ Music resumed on cached page return (mobile)");
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              if (!errorMessage.includes('play()') && !errorMessage.includes('interaction')) {
                console.error("Failed to resume audio on pageshow:", error);
              }
            }
          };
          setTimeout(resumeMusic, 200);
        }
        wasPlayingBeforeHidden.current = false;
      }
    };
    window.addEventListener("pageshow", handlePageShow, true);
    
    console.log("✅ All event listeners registered (visibilitychange, pagehide, beforeunload, blur, pageshow)");

    // Cleanup
    return () => {
      clearTimeout(suspendTimer);
      const audioForCleanup = audioRef.current;
      if (audioForCleanup) {
        audioForCleanup.removeEventListener("suspend", handleSuspend);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange, true);
      window.removeEventListener("beforeunload", handleBeforeUnload, true);
      window.removeEventListener("pagehide", handlePageHide, true);
      window.removeEventListener("blur", handleBlur, true);
      window.removeEventListener("pageshow", handlePageShow, true);
      console.log("🧹 Event listeners cleaned up");
    };
  }, []);

  // Memoize audio source to prevent recalculation on every render
  const audioSource = useMemo(() => {
    if (!currentSong) return null;
    
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
    
    return { src: encodedPath, type: mimeType };
  }, [currentSong]);

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
        {/* Use source element for better format detection - only render if source changed */}
        {audioSource && (
          <source src={audioSource.src} type={audioSource.type} />
        )}
      </audio>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-6 right-6 z-50 pointer-events-none"
      >
        <div className="flex flex-col gap-2 items-end pointer-events-auto">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-destructive/90 text-card px-3 py-2 rounded-lg text-xs flex items-center gap-2 max-w-xs shadow-lg"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="break-words">{error}</span>
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePlay();
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              variant="outline"
              size="icon"
              className="rounded-full w-12 h-12 bg-card/80 backdrop-blur-sm border-gold/20 hover:bg-card hover:border-gold/40 shadow-lg cursor-pointer touch-manipulation z-50"
              aria-label={isPlaying ? "Pause music" : "Play music"}
              type="button"
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

// Memoize component to prevent unnecessary re-renders
export default memo(BackgroundMusic, (prevProps, nextProps) => {
  // Only re-render if these props actually change
  return (
    prevProps.src === nextProps.src &&
    prevProps.volume === nextProps.volume &&
    prevProps.shuffle === nextProps.shuffle &&
    prevProps.type === nextProps.type
  );
});
