// Shared shapes + mapping helpers for the Teacher Dashboard and Students
// pages, driven entirely by the real /api/teacher/students (and, for the
// two class-wide rollups it can't compute alone, /api/teacher/dashboard-stats)
// response — no static/demo figures.

import type { TeacherStudentListItem } from '@/lib/teacher-api';

export type StatTone = 'blue' | 'green' | 'amber';
export type StudentStatus = 'doing-well' | 'needs-support';
export type ProgressLabel = 'Improving' | 'Steady' | 'Needs support';

export interface DashboardStat {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: StatTone;
  trend?: { value: string; direction: 'up' | 'flat' };
}

export interface DashboardStudent {
  id: string; // links to /teacher/student/[id]
  name: string;
  initials: string;
  className: string;
  attendance: number;
  averageGrade: number;
  progress: ProgressLabel;
  status: StudentStatus;
  lastUpdate: string; // human-readable recency shown in the Students table
  updatedRank: number; // lower = more recently updated (drives "Recently Updated" sort)
}

export interface AttentionItem {
  id: string;
  name: string;
  initials: string;
  reason: string;
  value: number;
}

export interface SubjectPerformance {
  subject: string;
  value: number;
}

export interface RecentUpdate {
  studentId: string;
  name: string;
  initials: string;
  when: string;
}

/** Strong progress (green) at/above this score, otherwise standard (blue). */
export const STRONG_THRESHOLD = 80;

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

/**
 * "Needs support" whenever either real rollup dips below a healthy range.
 * A student with no attendance/grade rows yet reads as doing well rather
 * than flagged, since there's nothing concerning recorded about them yet —
 * matching how a brand-new roster entry should look on day one.
 */
export function statusFromStats(attendanceRate: number | null, averageGrade: number | null): StudentStatus {
  if ((attendanceRate !== null && attendanceRate < 80) || (averageGrade !== null && averageGrade < 65)) {
    return 'needs-support';
  }
  return 'doing-well';
}

/** Maps the real /api/teacher/students response onto the shape the
 * (unchanged) table/card UI renders. `progress` has no real trend backing
 * it yet — the list endpoint returns one rollup per student, not a
 * period-over-period comparison — so it's pinned to "Steady". */
export function toDashboardStudent(s: TeacherStudentListItem): DashboardStudent {
  return {
    id: s.id,
    name: s.full_name,
    initials: initialsOf(s.full_name),
    className: s.class_name ?? 'Unassigned',
    attendance: s.attendance_rate !== null ? Math.round(s.attendance_rate) : 0,
    averageGrade: s.average_grade !== null ? Math.round(s.average_grade) : 0,
    progress: 'Steady',
    status: statusFromStats(s.attendance_rate, s.average_grade),
    lastUpdate: relativeTime(s.updated_at),
    updatedRank: -new Date(s.updated_at).getTime(),
  };
}

/** The real students most worth a teacher's attention right now — lowest
 * attendance or average grade first, capped to a shortlist. Only ever built
 * from students already flagged "needs-support" by statusFromStats. */
export function attentionFrom(students: DashboardStudent[], limit = 4): AttentionItem[] {
  return students
    .filter((s) => s.status === 'needs-support')
    .map((s) => {
      const attendanceIsWorse = s.attendance < s.averageGrade || s.averageGrade === 0;
      return {
        id: s.id,
        name: s.name,
        initials: s.initials,
        reason: attendanceIsWorse ? 'Attendance' : 'Average grade',
        value: attendanceIsWorse ? s.attendance : s.averageGrade,
      };
    })
    .sort((a, b) => a.value - b.value)
    .slice(0, limit);
}
