'use client';

/**
 * Client for the real FastAPI teacher/student endpoints (Phase 2). Every
 * call rides the same httpOnly session cookie + CSRF header as auth (see
 * lib/api.ts) — ownership is enforced server-side, never trusted here.
 */

import { api } from './api';

export type AttendanceStatus = 'present' | 'absent' | 'late';
export type PreferredLanguage = 'english' | 'roman_urdu' | 'urdu';
export type GuardianRelationship = 'mother' | 'father' | 'guardian' | 'other';
export type AnnouncementType =
  | 'attendance_alert'
  | 'school_event'
  | 'parent_meeting'
  | 'holiday_notice'
  | 'exam_reminder'
  | 'emergency'
  | 'general';
export type AnnouncementTargetType = 'all' | 'class' | 'section' | 'students';
export type AnnouncementStatus = 'draft' | 'published' | 'sent' | 'failed';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface TeacherParentLink {
  id: string;
  parent_user_id: string;
  student_id: string;
  relationship: GuardianRelationship;
  created_at: string;
}

export interface TeacherStudent {
  id: string;
  full_name: string;
  class_name: string | null;
  grade_level: string | null;
  student_key: string | null;
  roll_number: string | null;
  section: string | null;
  incharge_teacher_id: string | null;
  parent_name: string | null;
  parent_email: string | null;
  whatsapp_number: string | null;
  home_address: string | null;
  location: string | null;
  preferred_language: PreferredLanguage | null;
  created_at: string;
  updated_at: string;
  parent_links: TeacherParentLink[];
}

export interface TeacherStudentListItem extends TeacherStudent {
  attendance_rate: number | null;
  average_grade: number | null;
}

export interface TeacherAttendance {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  created_at: string;
}

export interface TeacherGrade {
  id: string;
  student_id: string;
  subject: string;
  score: string;
  max_score: string;
  assessment_name: string | null;
  assessment_date: string;
  created_at: string;
}

export interface TeacherNote {
  id: string;
  student_id: string;
  teacher_id: string;
  note: string;
  created_at: string;
}

export interface TeacherSubjectPerformance {
  subject: string;
  average_pct: number;
}

export interface TeacherRecentUpdate {
  student_id: string;
  student_name: string;
  created_at: string;
}

export interface TeacherDashboardStats {
  subject_performance: TeacherSubjectPerformance[];
  recent_updates: TeacherRecentUpdate[];
}

export interface CreateStudentInput {
  full_name: string;
  roll_number: string;
  section: string;
  class_name?: string | null;
  grade_level?: string | null;
  parent_name: string;
  whatsapp_number: string;
  home_address?: string | null;
  location?: string | null;
  preferred_language: PreferredLanguage;
  parent_email?: string | null;
}

export interface Announcement {
  id: string;
  teacher_id: string;
  title: string;
  message: string;
  announcement_type: AnnouncementType;
  target_type: AnnouncementTargetType;
  target_class: string | null;
  target_section: string | null;
  target_student_ids: string[] | null;
  status: AnnouncementStatus;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementRecipient {
  id: string;
  announcement_id: string;
  parent_user_id: string | null;
  student_id: string;
  whatsapp_number: string | null;
  language: string | null;
  delivery_status: DeliveryStatus;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  failed_at: string | null;
  error_message: string | null;
}

export interface AnnouncementWithRecipients extends Announcement {
  recipients: AnnouncementRecipient[];
}

export interface AnnouncementCreateInput {
  title: string;
  message: string;
  announcement_type: AnnouncementType;
  target_type: AnnouncementTargetType;
  target_class?: string | null;
  target_section?: string | null;
  target_student_ids?: string[] | null;
}

export const teacherApi = {
  listStudents: () => api.get<TeacherStudentListItem[]>('/api/teacher/students'),
  /** Per-subject class-wide averages and the most recent AI parent updates
   * across every student this teacher owns — the two dashboard rollups that
   * can't be derived from listStudents() alone. */
  getDashboardStats: () => api.get<TeacherDashboardStats>('/api/teacher/dashboard-stats'),
  createStudent: (data: CreateStudentInput) => api.post<TeacherStudent>('/api/teacher/students', data),
  getStudent: (id: string) => api.get<TeacherStudent>(`/api/teacher/students/${id}`),
  updateStudent: (id: string, data: Partial<Omit<CreateStudentInput, 'parent_email'>>) =>
    api.patch<TeacherStudent>(`/api/teacher/students/${id}`, data),
  deleteStudent: (id: string) => api.delete<void>(`/api/teacher/students/${id}`),
  linkParent: (studentId: string, data: { parent_email: string; relationship: GuardianRelationship }) =>
    api.post<TeacherParentLink>(`/api/teacher/students/${studentId}/link-parent`, data),

  listAttendance: (studentId: string) =>
    api.get<TeacherAttendance[]>(`/api/teacher/students/${studentId}/attendance`),
  addAttendance: (studentId: string, data: { date: string; status: AttendanceStatus }) =>
    api.post<TeacherAttendance>(`/api/teacher/students/${studentId}/attendance`, data),

  /** Every attendance row for this teacher's own students within one
   * (inclusive) date range — one call for a whole class register/trend
   * window, never one request per student. */
  getAttendanceRange: (start: string, end: string) =>
    api.get<TeacherAttendance[]>(`/api/teacher/attendance?start=${start}&end=${end}`),

  /** Saves one day's register in one call: a student in `marks` is
   * created/updated, a roster student left out has any existing record for
   * that date removed (an "unmark"). `rosterStudentIds` scopes the clear —
   * only those students' records for this date are ever touched. */
  setAttendanceDay: (data: {
    date: string;
    rosterStudentIds: string[];
    marks: { student_id: string; status: AttendanceStatus }[];
  }) =>
    api.post<TeacherAttendance[]>('/api/teacher/attendance/day', {
      date: data.date,
      roster_student_ids: data.rosterStudentIds,
      marks: data.marks,
    }),

  listGrades: (studentId: string) => api.get<TeacherGrade[]>(`/api/teacher/students/${studentId}/grades`),
  addGrade: (
    studentId: string,
    data: {
      subject: string;
      score: number;
      max_score: number;
      assessment_name?: string | null;
      assessment_date: string;
    }
  ) => api.post<TeacherGrade>(`/api/teacher/students/${studentId}/grades`, data),

  listNotes: (studentId: string) => api.get<TeacherNote[]>(`/api/teacher/students/${studentId}/notes`),
  addNote: (studentId: string, note: string) =>
    api.post<TeacherNote>(`/api/teacher/students/${studentId}/notes`, { note }),

  listAnnouncements: () => api.get<Announcement[]>('/api/teacher/announcements'),
  createAnnouncement: (data: AnnouncementCreateInput) =>
    api.post<Announcement>('/api/teacher/announcements', data),
  getAnnouncement: (id: string) => api.get<AnnouncementWithRecipients>(`/api/teacher/announcements/${id}`),
  updateAnnouncement: (id: string, data: Partial<AnnouncementCreateInput>) =>
    api.patch<Announcement>(`/api/teacher/announcements/${id}`, data),
  /** Publishing also attempts WhatsApp delivery to every resolved recipient
   * immediately — no separate step needed for the common case. */
  publishAnnouncement: (id: string) =>
    api.post<AnnouncementWithRecipients>(`/api/teacher/announcements/${id}/publish`),

  /** Retries WhatsApp delivery for recipients still pending or failed.
   * Never re-sends to a recipient already sent/delivered/read. */
  sendAnnouncementWhatsApp: (id: string) =>
    api.post<AnnouncementWithRecipients>(`/api/teacher/announcements/${id}/send-whatsapp`),
};
