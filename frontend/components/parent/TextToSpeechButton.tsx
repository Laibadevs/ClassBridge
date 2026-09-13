'use client';

/**
 * Reads an update's text aloud using the browser's built-in SpeechSynthesis
 * API — no paid TTS provider, no backend call, nothing sent over the network.
 * Never autoplays: speech only starts from an explicit click (see the
 * Accessibility requirements this was built against). Safe to render multiple
 * instances on one page — starting one always stops whichever other instance
 * was speaking, rather than queueing or overlapping them.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { LoaderIcon, PauseIcon, StopIcon, VolumeIcon } from '@/components/icons';

export type SpeechLanguage = 'english' | 'roman_urdu' | 'urdu';

const LANG_CODE: Record<SpeechLanguage, string> = {
  english: 'en-US',
  roman_urdu: 'en-US',
  urdu: 'ur-PK',
};

type PlaybackState = 'idle' | 'loading-voices' | 'speaking' | 'paused';

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

/** Picks a voice matching the requested language; falls back to the
 * browser's default voice (undefined) if none is installed, rather than
 * failing — SpeechSynthesis still speaks using utterance.lang either way. */
function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
  const prefix = lang.split('-')[0];
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix.toLowerCase()))
  );
}

export default function TextToSpeechButton({
  text,
  language,
  label = 'this update',
  className = '',
}: {
  text: string;
  language: SpeechLanguage;
  /** Used only to build the accessible label, e.g. "Listen to the English update". */
  label?: string;
  className?: string;
}) {
  const [state, setState] = useState<PlaybackState>('idle');
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(isSupported());
  }, []);

  // Stop cleanly if the text changes (regenerated) or the component unmounts
  // — never leave a stale utterance speaking over new content.
  useEffect(() => {
    return () => {
      if (isSupported()) window.speechSynthesis.cancel();
    };
  }, [text]);

  const stop = useCallback(() => {
    if (!isSupported()) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setState('idle');
  }, []);

  const play = useCallback(() => {
    if (!isSupported() || !text.trim()) return;
    // Only one utterance across the whole page at a time — starting a new
    // one always wins over whatever another button was reading.
    window.speechSynthesis.cancel();

    const lang = LANG_CODE[language];
    const speakWith = (voices: SpeechSynthesisVoice[]) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      const voice = pickVoice(voices, lang);
      if (voice) utterance.voice = voice;
      utterance.onstart = () => {
        if (utteranceRef.current === utterance) setState('speaking');
      };
      utterance.onend = () => {
        if (utteranceRef.current === utterance) setState('idle');
      };
      utterance.onerror = () => {
        if (utteranceRef.current === utterance) setState('idle');
      };
      utteranceRef.current = utterance;
      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        setState('idle');
      }
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      speakWith(voices);
    } else {
      // Some browsers load the voice list asynchronously — wait for it once
      // rather than speaking with an empty list (which just uses default).
      setState('loading-voices');
      const onVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        speakWith(window.speechSynthesis.getVoices());
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
      // Fallback in case voiceschanged never fires on this browser.
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        if (utteranceRef.current === null) speakWith(window.speechSynthesis.getVoices());
      }, 400);
    }
  }, [text, language]);

  function togglePlayPause() {
    if (!isSupported()) return;
    if (state === 'idle') {
      play();
    } else if (state === 'speaking') {
      window.speechSynthesis.pause();
      setState('paused');
    } else if (state === 'paused') {
      window.speechSynthesis.resume();
      setState('speaking');
    }
  }

  if (!supported) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted ${className}`}
        title="Text-to-speech isn't available in this browser."
      >
        <VolumeIcon className="h-3.5 w-3.5 opacity-50" /> Listening isn&apos;t available in this browser
      </span>
    );
  }

  const busy = state === 'loading-voices';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={togglePlayPause}
        disabled={busy || !text.trim()}
        aria-busy={busy}
        aria-label={
          state === 'speaking'
            ? `Pause reading ${label}`
            : state === 'paused'
              ? `Resume reading ${label}`
              : `Listen to ${label}`
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <LoaderIcon className="h-3.5 w-3.5 animate-spin" />
        ) : state === 'speaking' ? (
          <PauseIcon className="h-3.5 w-3.5" />
        ) : (
          <VolumeIcon className="h-3.5 w-3.5" />
        )}
        {state === 'speaking' ? 'Pause' : state === 'paused' ? 'Resume' : 'Listen'}
      </button>
      {(state === 'speaking' || state === 'paused') && (
        <button
          type="button"
          onClick={stop}
          aria-label={`Stop reading ${label}`}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-red-300 hover:text-red-600 focus-ring"
        >
          <StopIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
