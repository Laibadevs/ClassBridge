'use client';

/**
 * The browser's own <audio controls> — play/pause, progress, volume and full
 * keyboard support come for free and stay accessible. Never autoplays, and
 * preload="none" means nothing is downloaded until the user presses play.
 */

import type { AudioLanguage } from '@/lib/audio-api';
import { AUDIO_LANGUAGE_LABEL } from '@/lib/audio-api';

export default function AudioPlayer({
  src,
  language,
  className = '',
}: {
  src: string;
  language: AudioLanguage;
  className?: string;
}) {
  return (
    <audio
      controls
      preload="none"
      src={src}
      aria-label={`Play ${AUDIO_LANGUAGE_LABEL[language]} audio`}
      className={`h-10 w-full max-w-md ${className}`}
    >
      Your browser does not support audio playback.
    </audio>
  );
}
