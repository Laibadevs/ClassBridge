/**
 * Maps real backend data (lib/parent-api.ts) onto the StudentProfile/AIUpdate
 * shapes ParentDashboard.tsx already renders, without fabricating anything
 * the database doesn't actually have. A subject with fewer than 2 graded
 * assessments gets previousScore === score, so the UI's "+N" delta badge
 * naturally shows nothing invented rather than a made-up trend.
 */
import type { AIUpdate, StudentProfile, SubjectScore } from './types';
import type { ParentChildDetail, ParentChildLatestUpdate } from './parent-api';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

function gradePercent(score: string, maxScore: string): number {
  const s = parseFloat(score);
  const m = parseFloat(maxScore);
  if (!m) return 0;
  return Math.round((s / m) * 100);
}

const FALLBACK_SUBJECT: SubjectScore = { subject: 'General', score: 0, previousScore: 0 };

export function toStudentProfile(child: ParentChildDetail): StudentProfile {
  const bySubject = new Map<string, ParentChildDetail['grades']>();
  for (const grade of child.grades) {
    const list = bySubject.get(grade.subject) ?? [];
    list.push(grade);
    bySubject.set(grade.subject, list);
  }

  const subjects: SubjectScore[] = Array.from(bySubject.entries()).map(([subject, grades]) => {
    const sorted = [...grades].sort((a, b) => a.assessment_date.localeCompare(b.assessment_date));
    const latest = sorted[sorted.length - 1];
    const prior = sorted.length >= 2 ? sorted[sorted.length - 2] : latest;
    return {
      subject,
      score: gradePercent(latest.score, latest.max_score),
      previousScore: gradePercent(prior.score, prior.max_score),
    };
  });

  const weakestSubject = subjects.length
    ? subjects.reduce((min, s) => (s.score < min.score ? s : min), subjects[0])
    : FALLBACK_SUBJECT;

  const attendance = child.attendance_rate !== null ? Math.round(child.attendance_rate) : 0;
  const overallPerformance = subjects.length
    ? Math.round(subjects.reduce((sum, s) => sum + s.score, 0) / subjects.length)
    : 0;
  const status = weakestSubject.score < 65 || attendance < 80 ? 'needs-attention' : 'doing-well';

  const classLabel = child.class_name ?? child.grade_level ?? 'Class';
  const className = child.section ? `${classLabel} - ${child.section}` : classLabel;

  return {
    student: {
      id: child.id,
      name: child.full_name,
      className,
      parentId: '',
      avatarInitials: initialsOf(child.full_name),
    },
    attendance,
    subjects,
    note: '',
    overallPerformance,
    status,
    weakestSubject,
  };
}

export function toAIUpdate(update: ParentChildLatestUpdate | null): AIUpdate | null {
  if (!update) return null;
  return {
    studentId: '',
    englishSummary: update.english_text,
    romanUrduSummary: update.roman_urdu_text,
    urduSummary: update.urdu_text,
    parentAction: '',
    whyThisMatters: '',
    createdAt: update.created_at,
  };
}
