'use client';

/**
 * Plays the teacher-generated audio for one language of an approved update.
 * Renders nothing unless the backend says that audio is ready and current, so
 * a parent never sees a dead control. The read-only list call is the only
 * request made on load; audio bytes are fetched only when play is pressed.
 */

import { useEffect, useState } from 'react';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { audioApi, type AudioLanguage } from '@/lib/audio-api';

export default function ParentAudioPlayer({
  updateId,
  language,
  className = '',
}: {
  updateId: string | undefined;
  language: AudioLanguage;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!updateId) return;
    let cancelled = false;
    audioApi
      .listForParent(updateId)
      .then((rows) => {
        if (!cancelled) setSrc(rows.find((r) => r.language === language)?.audio_url ?? null);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [updateId, language]);

  if (!src) return null;
  return <AudioPlayer src={src} language={language} className={className} />;
}
