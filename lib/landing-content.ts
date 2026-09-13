import { getStudentProfile, getTeacherStats } from './mock-data';

/**
 * Marketing-page preview data. Reuses the same Ali Khan mock record and
 * teacher stats the live demo uses, so the landing page previews and the
 * real /teacher, /teacher/student/[id], /parent pages never drift apart.
 * The AI update text mirrors the seed in lib/ai-update-store.ts — what a
 * fresh demo viewer actually sees before generating anything new.
 */
export const aliProfile = getStudentProfile('ali-khan')!;

export const teacherStats = getTeacherStats();

export const sampleAIUpdate = {
  englishSummary:
    "Ali is doing well overall, but Algebra needs a little extra practice.",
  romanUrduSummary:
    "Ali ki overall performance theek hai, lekin Algebra mein thori extra practice ki zaroorat hai.",
  parentAction: 'Practice Algebra for 15–20 minutes, 3 times this week.',
};

/**
 * Hero + teacher-dashboard marketing visuals. These mirror the reference
 * design's illustrative numbers (a full class section), which are different
 * from the 5-student live demo dataset — so we keep them separate rather
 * than reusing getTeacherStats() here.
 */
export const heroMetrics = [
  { label: 'Math', value: 58, tone: 'blue' as const },
  { label: 'Science', value: 76, tone: 'blue' as const },
  { label: 'English', value: 84, tone: 'green' as const },
  { label: 'Attendance', value: 87, tone: 'green' as const },
];

export const teacherDashboardStats = [
  { label: 'Students', value: '32', icon: 'users' as const, tone: 'blue' as const, bar: 'w-[70%]' },
  { label: "Today's Attendance", value: '94%', icon: 'check' as const, tone: 'green' as const, bar: 'w-[94%]' },
  { label: 'Students Doing Well', value: '24', icon: 'thumbs' as const, tone: 'green' as const, bar: 'w-[75%]' },
  { label: 'Needs Attention', value: '8', icon: 'alert' as const, tone: 'blue' as const, bar: 'w-[25%]' },
];
