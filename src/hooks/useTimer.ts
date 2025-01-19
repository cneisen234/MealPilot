import { useState, useEffect, useCallback } from 'react';

export const useTimer = (onComplete: () => void) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
  const [savedTimeLeft, setSavedTimeLeft] = useState<number | null>(null);

  // Create audio context for beeper sound
  const playBeep = useCallback(() => {
    const audioContext = new (window.AudioContext || window.AudioContext)();
    
    // Create main oscillator for beep
    const mainOscillator = audioContext.createOscillator();
    const mainGain = audioContext.createGain();
    
    // Create secondary oscillator for harmonic
    const harmonicOscillator = audioContext.createOscillator();
    const harmonicGain = audioContext.createGain();
    
    // Connect nodes
    mainOscillator.connect(mainGain);
    harmonicOscillator.connect(harmonicGain);
    mainGain.connect(audioContext.destination);
    harmonicGain.connect(audioContext.destination);
    
    // Set up main beep tone
    mainOscillator.type = 'square';
    mainOscillator.frequency.setValueAtTime(2400, audioContext.currentTime);
    mainGain.gain.setValueAtTime(0, audioContext.currentTime);
    
    // Set up harmonic tone
    harmonicOscillator.type = 'square';
    harmonicOscillator.frequency.setValueAtTime(2000, audioContext.currentTime);
    harmonicGain.gain.setValueAtTime(0, audioContext.currentTime);

    // Beep pattern configuration
    const beepDuration = 0.15; // Duration of each beep
    const beepInterval = 0.2; // Time between beeps
    const beepsPerSet = 3; // Number of beeps in each set
    const setInterval = 1; // Time between sets of beeps
    const numberOfSets = 3; // Number of sets to play

    // Schedule all beep patterns
    for (let set = 0; set < numberOfSets; set++) {
      const setStartTime = audioContext.currentTime + (set * (beepsPerSet * beepInterval + setInterval));
      
      // Schedule beeps within this set
      for (let i = 0; i < beepsPerSet; i++) {
        const startTime = setStartTime + (i * beepInterval);
        
        // Main tone envelope
        mainGain.gain.setValueAtTime(0, startTime);
        mainGain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
        mainGain.gain.setValueAtTime(0.15, startTime + beepDuration);
        mainGain.gain.linearRampToValueAtTime(0, startTime + beepDuration + 0.01);
        
        // Harmonic tone envelope
        harmonicGain.gain.setValueAtTime(0, startTime);
        harmonicGain.gain.linearRampToValueAtTime(0.1, startTime + 0.01);
        harmonicGain.gain.setValueAtTime(0.1, startTime + beepDuration);
        harmonicGain.gain.linearRampToValueAtTime(0, startTime + beepDuration + 0.01);
      }
    }
    
    // Calculate total duration
    const totalDuration = (numberOfSets * (beepsPerSet * beepInterval + setInterval));
    
    // Start and stop oscillators
    mainOscillator.start(audioContext.currentTime);
    harmonicOscillator.start(audioContext.currentTime);
    mainOscillator.stop(audioContext.currentTime + totalDuration);
    harmonicOscillator.stop(audioContext.currentTime + totalDuration);
    
    // Clean up
    setTimeout(() => {
      audioContext.close();
    }, totalDuration * 1000 + 100);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let lastUpdateTime: number;

    const updateTimer = () => {
      if (isActive && startTime !== null && !isPaused) {
        const currentTime = Date.now();
        const elapsedTime = Math.floor((currentTime - startTime) / 1000);
        const newTimeLeft = savedTimeLeft! - elapsedTime;

        if (newTimeLeft <= 0) {
          setTimeLeft(0);
          setIsActive(false);
          onComplete();
          playBeep();
        } else {
          setTimeLeft(newTimeLeft);
          animationFrameId = requestAnimationFrame(updateTimer);
        }
      }
    };

    if (isActive && !isPaused) {
      lastUpdateTime = Date.now();
      animationFrameId = requestAnimationFrame(updateTimer);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive, isPaused, startTime, savedTimeLeft, onComplete]);

  const startTimer = (duration: number) => {
    setTimeLeft(duration);
    setSavedTimeLeft(duration);
    setStartTime(Date.now());
    setIsPaused(false);
    setIsActive(true);
  };

  const pauseTimer = () => {
    setIsPaused(true);
    setSavedTimeLeft(timeLeft);
  };

  const resetTimer = (duration: number) => {
    setIsActive(false);
    setTimeLeft(duration);
    setSavedTimeLeft(duration);
    setStartTime(null);
    setIsPaused(false);
  };

  return { timeLeft, isActive, startTimer, pauseTimer, resetTimer, playBeep };
};

export default useTimer;