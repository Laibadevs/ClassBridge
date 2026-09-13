import type {
  Student,
  SubjectScore,
  TeacherNote,
  StudentProfile,
  StudentStatus,
} from './types';
import { displaySubject } from './subjects';
import { improverNames, listPhrase } from './parent-dashboard-data';

export const teacherUser = {
  id: 'teacher-sarah',
  name: 'Ms. Sarah',
  role: 'teacher' as const,
  email: 'sarah.teacher@classbridge.ai',
};

export const demoParentStudentId = 'ali-khan';

export const students: Student[] = [
  { id: 'ali-khan', name: 'Ali Khan', className: 'Grade 8 - Blue', parentId: 'parent-ali', avatarInitials: 'AK' },
  { id: 'ayesha-malik', name: 'Ayesha Malik', className: 'Grade 8 - Blue', parentId: 'parent-ayesha', avatarInitials: 'AM' },
  { id: 'hamza-ahmed', name: 'Hamza Ahmed', className: 'Grade 8 - Green', parentId: 'parent-hamza', avatarInitials: 'HA' },
  { id: 'sara-noor', name: 'Sara Noor', className: 'Grade 8 - Green', parentId: 'parent-sara', avatarInitials: 'SN' },
  { id: 'zain-ali', name: 'Zain Ali', className: 'Grade 8 - Blue', parentId: 'parent-zain', avatarInitials: 'ZA' },
];

const attendanceByStudent: Record<string, number> = {
  'ali-khan': 87,
  'ayesha-malik': 95,
  'hamza-ahmed': 79,
  'sara-noor': 92,
  'zain-ali': 84,
};

const subjectsByStudent: Record<string, SubjectScore[]> = {
  'ali-khan': [
    { subject: 'Math', score: 58, previousScore: 52, topic: 'Algebra' },
    { subject: 'Science', score: 76, previousScore: 70 },
    { subject: 'English', score: 84, previousScore: 81 },
    { subject: 'Computer', score: 91, previousScore: 87 },
  ],
  'ayesha-malik': [
    { subject: 'Math', score: 82, previousScore: 78 },
    { subject: 'Science', score: 88, previousScore: 85 },
    { subject: 'English', score: 90, previousScore: 87 },
    { subject: 'Computer', score: 94, previousScore: 92 },
  ],
  'hamza-ahmed': [
    { subject: 'Math', score: 65, previousScore: 60 },
    { subject: 'Science', score: 70, previousScore: 66 },
    { subject: 'English', score: 72, previousScore: 68 },
    { subject: 'Computer', score: 75, previousScore: 70 },
  ],
  'sara-noor': [
    { subject: 'Math', score: 88, previousScore: 84 },
    { subject: 'Science', score: 91, previousScore: 89 },
    { subject: 'English', score: 85, previousScore: 82 },
    { subject: 'Computer', score: 89, previousScore: 86 },
  ],
  'zain-ali': [
    { subject: 'Math', score: 60, previousScore: 55 },
    { subject: 'Science', score: 68, previousScore: 64 },
    { subject: 'English', score: 74, previousScore: 70 },
    { subject: 'Computer', score: 80, previousScore: 76 },
  ],
};

const notesByStudent: Record<string, TeacherNote> = {
  'ali-khan': {
    studentId: 'ali-khan',
    note: 'Ali participates well in class but needs additional practice with algebraic equations.',
    createdAt: '2026-09-08',
  },
  'ayesha-malik': {
    studentId: 'ayesha-malik',
    note: 'Consistently strong across all subjects. Could take on more challenging enrichment work.',
    createdAt: '2026-09-08',
  },
  'hamza-ahmed': {
    studentId: 'hamza-ahmed',
    note: 'Attendance has been inconsistent this month, which is affecting his progress across subjects.',
    createdAt: '2026-09-07',
  },
  'sara-noor': {
    studentId: 'sara-noor',
    note: 'Doing great overall. Shows strong effort and is a positive presence in group work.',
    createdAt: '2026-09-08',
  },
  'zain-ali': {
    studentId: 'zain-ali',
    note: 'Needs encouragement with reading comprehension in English, but showing good effort in class discussions.',
    createdAt: '2026-09-06',
  },
};

function average(subjects: SubjectScore[]): number {
  const total = subjects.reduce((sum, s) => sum + s.score, 0);
  return Math.round(total / subjects.length);
}

function computeStatus(attendance: number, subjects: SubjectScore[]): StudentStatus {
  const weakest = subjects.reduce((min, s) => (s.score < min.score ? s : min), subjects[0]);
  if (weakest.score < 65 || attendance < 80) return 'needs-attention';
  return 'doing-well';
}

export function getStudentProfile(studentId: string): StudentProfile | undefined {
  const student = students.find((s) => s.id === studentId);
  if (!student) return undefined;

  const subjects = subjectsByStudent[studentId];
  const attendance = attendanceByStudent[studentId];
  const note = notesByStudent[studentId]?.note ?? '';
  const weakestSubject = subjects.reduce((min, s) => (s.score < min.score ? s : min), subjects[0]);

  return {
    student,
    attendance,
    subjects,
    note,
    overallPerformance: average(subjects),
    status: computeStatus(attendance, subjects),
    weakestSubject,
  };
}

export function getAllStudentProfiles(): StudentProfile[] {
  return students.map((s) => getStudentProfile(s.id)!);
}

export function getMonthlyProgressNote(profile: StudentProfile): string {
  const name = profile.student.name.split(' ')[0];
  const improving = improverNames(profile);
  const weakest = profile.weakestSubject;

  const improvingText = improving.length
    ? `steady improvement in ${listPhrase(improving)}`
    : 'steady progress across subjects';

  const weakestNote =
    weakest.score < 65
      ? ` ${displaySubject(weakest.subject)} is improving gradually, but regular practice at home could help it along even more.`
      : '';

  return `${name} is showing ${improvingText}.${weakestNote}`;
}

export function getTeacherStats() {
  const profiles = getAllStudentProfiles();
  const totalStudents = profiles.length;
  const attendanceToday = Math.round(
    profiles.reduce((sum, p) => sum + p.attendance, 0) / profiles.length
  );
  const doingWell = profiles.filter((p) => p.status === 'doing-well').length;
  const needsAttention = profiles.filter((p) => p.status === 'needs-attention').length;

  return { totalStudents, attendanceToday, doingWell, needsAttention };
}
