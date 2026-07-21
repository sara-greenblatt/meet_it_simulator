import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_SILENCE_DELAY_MS = 1200;

export function useSpeechRecognition({
  language = 'en-US',
  silenceDelayMs = DEFAULT_SILENCE_DELAY_MS,
  onTranscriptReady,
} = {}) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const transcriptRef = useRef('');
  const finalizedRef = useRef(false);
  const activeSessionIdRef = useRef(0);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const finalizeTranscript = useCallback(
    (nextTranscript, sessionId) => {
      if (activeSessionIdRef.current !== sessionId) {
        return;
      }

      const trimmedTranscript = nextTranscript.trim();

      if (!trimmedTranscript || finalizedRef.current) {
        return;
      }

      finalizedRef.current = true;
      activeSessionIdRef.current += 1;
      clearSilenceTimer();
      setIsListening(false);

      const recognition = recognitionRef.current;
      recognitionRef.current = null;

      if (recognition) {
        try {
          recognition.stop();
        } catch {
          // Ignore shutdown race conditions.
        }
      }

      onTranscriptReady?.(trimmedTranscript);
    },
    [clearSilenceTimer, onTranscriptReady],
  );

  const scheduleSilenceFinalization = useCallback(
    (nextTranscript, sessionId) => {
      clearSilenceTimer();

      if (!nextTranscript.trim()) {
        return;
      }

      silenceTimerRef.current = window.setTimeout(() => {
        finalizeTranscript(transcriptRef.current, sessionId);
      }, silenceDelayMs);
    },
    [clearSilenceTimer, finalizeTranscript, silenceDelayMs],
  );

  const stopListening = useCallback(() => {
    clearSilenceTimer();
    activeSessionIdRef.current += 1;

    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignore shutdown race conditions.
      }
    }

    setIsListening(false);
  }, [clearSilenceTimer]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return false;
    }

    stopListening();
    finalizedRef.current = false;
    transcriptRef.current = '';
    setError('');
    const sessionId = activeSessionIdRef.current + 1;
    activeSessionIdRef.current = sessionId;

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      if (activeSessionIdRef.current !== sessionId) {
        return;
      }

      const nextTranscript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join('');

      transcriptRef.current = nextTranscript;
      scheduleSilenceFinalization(nextTranscript, sessionId);
    };

    recognition.onerror = (event) => {
      if (activeSessionIdRef.current !== sessionId) {
        return;
      }

      setIsListening(false);
      clearSilenceTimer();

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone access was denied.');
        return;
      }

      setError('Voice recognition failed.');
    };

    recognition.onend = () => {
      if (activeSessionIdRef.current !== sessionId) {
        return;
      }

      setIsListening(false);
      clearSilenceTimer();
      finalizeTranscript(transcriptRef.current, sessionId);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      return true;
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setError('Could not start voice recognition.');
      return false;
    }
  }, [clearSilenceTimer, finalizeTranscript, language, scheduleSilenceFinalization, stopListening]);

  useEffect(() => {
    return () => {
      clearSilenceTimer();

      const recognition = recognitionRef.current;
      recognitionRef.current = null;

      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // Ignore shutdown race conditions.
        }
      }
    };
  }, [clearSilenceTimer]);

  return {
    error,
    isListening,
    startListening,
    stopListening,
  };
}
