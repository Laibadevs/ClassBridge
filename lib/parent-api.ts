'use client';

/**
 * Client for the real FastAPI parent endpoints. A parent only ever sees
 * students an actual parent_student_links row connects them to — enforced
 * server-side, never trusted here.
 */

import { api } from './api';
import type { AnnouncementType, DeliveryStatus } from './teacher-api';

export interface ParentChildGrade {
  subject: string;
  score: string;
  max_score: string;
  assessment_name: string | null;
  assessment_date: string;
}

export interface ParentChildLatestUpdate {
  id: string;
  english_text: string;
  roman_urdu_text: string;
  urdu_text: string | null;
  created_at: string;
}

export interface ParentChildSummary {
  id: string;
  full_name: string;
  class_name: string | null;
  grade_level: string | null;
  section: string | null;
  student_key: string | null;
  teacher_name: string | null;
  attendance_rate: number | null;
  recent_grades: ParentChildGrade[];
  latest_update: ParentChildLatestUpdate | null;
}

export interface ParentChildDetail extends ParentChildSummary {
  grades: ParentChildGrade[];
}

export interface ParentAnnouncement {
  id: string;
  title: string;
  message: string;
  announcement_type: AnnouncementType;
  created_at: string;
  delivery_status: DeliveryStatus;
  student_id: string;
}

export const parentApi = {
  getChildren: () => api.get<ParentChildSummary[]>('/api/parent/children'),
  getChild: (id: string) => api.get<ParentChildDetail>(`/api/parent/children/${id}`),
  getAnnouncements: () => api.get<ParentAnnouncement[]>('/api/parent/announcements'),
};
