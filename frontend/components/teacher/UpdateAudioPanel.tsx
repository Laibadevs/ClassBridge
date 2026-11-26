'use client';

/**
 * Audio controls for an APPROVED parent update. Each language is generated
 * only when the teacher clicks its button — never on load, on approval or on
 * a language switch. The server decides what is ready vs. stale (audio whose
 * text was edited after generation is stale and must be regenerated), so this
 * panel just reflects what the list endpoint says.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { LoaderIcon, VolumeIcon } from '@/components/icons';
import { ApiError } from '@/lib/api';
import { AUDIO_LANGUAGE_LABEL, audioApi, type AudioLanguage, type TeacherAudio } from '@/lib/audio-api';

const LANGUAGES: AudioLanguage[] = ['en', 'roman_urdu'];
const FRIENDLY_ERROR = 'Unable to generate audio right now. Please try again.';

export default function UpdateAudioPanel({ updateId, version }: { updateId: string; version: string }) {
  const [audio, setAudio] = useState<Record<string, TeacherAudio>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  // A ref, not just state: two clicks in the same tick both see the stale
  // `generating` state, but the ref flips synchronously.
  const inFlight = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const rows = await audioApi.listForTeacher(updateId);
      setAudio(Object.fromEntries(rows.map((r) => [r.language, r])));
    } catch {
      /* best-effort — the generate buttons still work */
    }
  }, [updateId]);

  // `version` (the update's updated_at) changes when its text is edited, so
  // stale audio is re-checked right after an edit.
  useEffect(() => {
    void load();
  }, [load, version]);

  async function generate(language: AudioLanguage) {
    if (inFlight.current.has(language)) return;
    inFlight.current.add(language);
    setGenerating((g) => ({ ...g, [language]: true }));
    setErrors((e) => ({ ...e, [language]: null }));
    try {
      const row = await audioApi.generate(updateId, language);
      setAudio((a) => ({ ...a, [language]: row }));
    } catch (err) {
      setErrors((e) => ({
        ...e,
        [language]: err instanceof ApiError && err.status !== 502 ? err.message : FRIENDLY_ERROR,
      }));
      void load();
    } finally {
      inFlight.current.delete(language);
      setGenerating((g) => ({ ...g, [language]: false }));
    }
  }

  return (
    <div className="space-y-3 border-t border-slate-100 pt-4" aria-label="Audio">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Audio</p>
      {LANGUAGES.map((language) => {
        const label = AUDIO_LANGUAGE_LABEL[language];
        const row = audio[language];
        const busy = !!generating[language];
        const ready = !!row && row.status === 'ready' && !row.is_stale && !!row.audio_url;
        const stale = !!row && row.is_stale;
        const buttonText = busy
          ? 'Generating audio...'
          : stale
            ? `Regenerate ${label} Audio`
            : row?.status === 'failed'
              ? `Retry ${label} Audio`
              : `Generate ${label} Audio`;

        return (
          <div key={language} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="w-24 shrink-0 text-sm font-medium text-ink">{label}</span>
            {ready && row?.audio_url ? (
              <AudioPlayer src={row.audio_url} language={language} />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => generate(language)}
                  disabled={busy}
                  aria-busy={busy}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-slate-50 focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <VolumeIcon className="h-4 w-4" />}
                  {buttonText}
                </button>
                {stale && !busy && (
                  <span className="text-xs text-amber-700">The text changed after this audio was made.</span>
                )}
              </div>
            )}
            {errors[language] && (
              <p role="alert" className="text-xs text-red-600">
                {errors[language]}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
