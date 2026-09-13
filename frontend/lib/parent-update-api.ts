'use client';

/**
 * Client for the real FastAPI AI parent-update endpoints (Phase 3). Every
 * call rides the same httpOnly session cookie + CSRF header as the rest of
 * lib/teacher-api.ts — ownership and the AI call itself both happen
 * server-side in FastAPI; nothing here ever talks to an AI provider directly.
 */

import { api } from './api';

export type ParentUpdateStatus = 'draft' | 'approved' | 'sent';
export type WhatsAppDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ParentUpdateDelivery {
  id: string;
  parent_update_id: string;
  student_id: string;
  parent_user_id: string | null;
  provider_message_id: string | null;
  status: WhatsAppDeliveryStatus;
  error_code: string | null;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedUpdate {
  english_text: string;
  roman_urdu_text: string;
  urdu_text: string;
}

export interface ParentUpdate {
  id: string;
  student_id: string;
  teacher_id: string;
  english_text: string;
  roman_urdu_text: string;
  urdu_text: string | null;
  status: ParentUpdateStatus;
  ai_model: string | null;
  source_snapshot: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export const parentUpdateApi = {
  /** Triggers AI generation from the student's real recorded data. No body —
   * the backend gathers attendance/grades/notes itself; nothing the teacher
   * types here is what the AI reads from. */
  generate: (studentId: string) =>
    api.post<GeneratedUpdate>(`/api/teacher/students/${studentId}/generate-update`),

  save: (
    studentId: string,
    data: { english_text: string; roman_urdu_text: string; urdu_text: string; status?: ParentUpdateStatus }
  ) => api.post<ParentUpdate>(`/api/teacher/students/${studentId}/updates`, data),

  list: (studentId: string) => api.get<ParentUpdate[]>(`/api/teacher/students/${studentId}/updates`),

  edit: (
    studentId: string,
    updateId: string,
    data: Partial<{ english_text: string; roman_urdu_text: string; urdu_text: string; status: ParentUpdateStatus }>
  ) => api.patch<ParentUpdate>(`/api/teacher/students/${studentId}/updates/${updateId}`, data),

  /** The only action that makes an update visible to the linked parent.
   * Never sends anything to WhatsApp on its own — sending is a separate,
   * explicit step below. */
  approve: (studentId: string, updateId: string) =>
    api.post<ParentUpdate>(`/api/teacher/students/${studentId}/updates/${updateId}/approve`),

  /** Sends an already-approved update over WhatsApp exactly as approved —
   * never regenerated or edited here. Rejects a second send (409) once the
   * first has gone through; retry is allowed only after a failed attempt. */
  sendWhatsApp: (updateId: string) =>
    api.post<ParentUpdateDelivery>(`/api/teacher/parent-updates/${updateId}/send-whatsapp`),

  listWhatsAppDeliveries: (updateId: string) =>
    api.get<ParentUpdateDelivery[]>(`/api/teacher/parent-updates/${updateId}/whatsapp-deliveries`),
};
