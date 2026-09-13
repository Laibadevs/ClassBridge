// Server-side data for the teacher's student detail page. Same pattern as
// lib/auth/server.ts: no direct DB access from Next.js — forward the
// session cookie to FastAPI and trust its (ownership-checked) answer.

import 'server-only';
import { cookies } from 'next/headers';
import type { StudentProfile, StudentStatus, SubjectScore } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface StudentRecord {
  id: string;
  full_name: string;
  class_name: string | null;
  grade_level: string | null;
}

interface AttendanceRecord {
  status: 'present' | 'absent' | 'late';
}

interface GradeRecord {
  subject: string;
  score: string;
  max_score: string;
  assessment_date: string;
}

interface NoteRecord {
  note: string;
  created_at: string;
}

function serializeCookies(): string {
  return cookies()
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
}

async function backendGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { headers: { cookie: serializeCookies() }, cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

const FLAT: SubjectScore = { subject: '—', score: 0, previousScore: 0 };

/**
 * Fetches one teacher-owned student and derives the same StudentProfile
 * shape the (unchanged) detail page already renders — computed from real
 * attendance/grade/note rows rather than the old mock-data lookup. FastAPI
 * enforces ownership; a 404 here (wrong teacher or unknown id) surfaces as
 * "not found" to the page exactly like the mock version did.
 */
export async function getTeacherStudentProfile(id: string): Promise<StudentProfile | null> {
  const student = await backendGet<StudentRecord>(`/api/teacher/students/${id}`);
  if (!student) return null;

  const [attendanceRows, gradeRows, noteRows] = await Promise.all([
    backendGet<AttendanceRecord[]>(`/api/teacher/students/${id}/attendance`),
    backendGet<GradeRecord[]>(`/api/teacher/students/${id}/grades`),
    backendGet<NoteRecord[]>(`/api/teacher/students/${id}/notes`),
  ]);

  const attendance = attendanceRows ?? [];
  const attendanceRate = attendance.length
    ? Math.round(
        (attendance.filter((a) => a.status === 'present' || a.status === 'late').length / attendance.length) * 100
      )
    : 0;

  const bySubject = new Map<string, GradeRecord[]>();
  for (const g of gradeRows ?? []) {
    const list = bySubject.get(g.subject) ?? [];
    list.push(g);
    bySubject.set(g.subject, list);
  }

  const subjects: SubjectScore[] = Array.from(bySubject.entries()).map(([subject, rows]) => {
    // Most recent assessment first, so "previous" is the one before it —
    // the same latest-vs-prior comparison the mock data hard-coded.
    const sorted = [...rows].sort((a, b) => b.assessment_date.localeCompare(a.assessment_date));
    const pct = (r: GradeRecord) => Math.round((Number(r.score) / Number(r.max_score)) * 100);
    const score = pct(sorted[0]);
    return { subject, score, previousScore: sorted[1] ? pct(sorted[1]) : score };
  });

  const note = noteRows?.[0]?.note ?? '';
  const weakestSubject = subjects.length
    ? subjects.reduce((min, s) => (s.score < min.score ? s : min), subjects[0])
    : FLAT;
  const overallPerformance = subjects.length
    ? Math.round(subjects.reduce((sum, s) => sum + s.score, 0) / subjects.length)
    : 0;
  const status: StudentStatus = weakestSubject.score < 65 || attendanceRate < 80 ? 'needs-attention' : 'doing-well';

  return {
    student: {
      id: student.id,
      name: student.full_name,
      className: student.class_name ?? 'Unassigned',
      parentId: '',
      avatarInitials: initialsOf(student.full_name),
    },
    attendance: attendanceRate,
    subjects,
    note,
    overallPerformance,
    status,
    weakestSubject,
  };
}
