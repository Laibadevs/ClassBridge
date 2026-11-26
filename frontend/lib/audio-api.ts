'use client';

/**
 * Client for the Phase 5 parent-update audio endpoints. Generation only ever
 * happens from an explicit teacher click — nothing here is called on page
 * load except the read-only list calls. The audio_url values are
 * authenticated API paths (same session cookie as every other call), never
 * public file URLs, so they only play for someone allowed to hear them.
 */

import { api } from './api';

export type AudioLanguage = 'en' | 'roman_urdu';
export type AudioStatus = 'generating' | 'ready' | 'failed';

export interface TeacherAudio {
  id: string;
  language: AudioLanguage;
  status: AudioStatus;
  /** True when the approved text was edited after this audio was made. */
  is_stale: boolean;
  /** Only set while the audio is ready AND matches the current text. */
  audio_url: string | null;
  duration_seconds: number | null;
  updated_at: string;
}

export interface ParentAudio {
  language: AudioLanguage;
  audio_url: string;
  duration_seconds: number | null;
}

export const AUDIO_LANGUAGE_LABEL: Record<AudioLanguage, string> = {
  en: 'English',
  roman_urdu: 'Roman Urdu',
};

export const audioApi = {
  generate: (updateId: string, language: AudioLanguage) =>
    api.post<TeacherAudio>(`/api/teacher/parent-updates/${updateId}/audio/generate`, { language }),

  listForTeacher: (updateId: string) => api.get<TeacherAudio[]>(`/api/teacher/parent-updates/${updateId}/audio`),

  listForParent: (updateId: string) => api.get<ParentAudio[]>(`/api/parent/parent-updates/${updateId}/audio`),
};
