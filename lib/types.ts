export type Role = 'teacher' | 'parent';

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
}

export interface Student {
  id: string;
  name: string;
  className: string;
  parentId: string;
  avatarInitials: string;
}

export interface SubjectScore {
  subject: string;
  score: number;
  previousScore: number;
  /** Optional focus area within the subject (e.g. Algebra inside Mathematics). */
  topic?: string;
}

/**
 * Editable classroom facts the teacher feeds to ClassBridge AI on the update
 * generator. `topic` is the optional focus area inside a subject (e.g. Algebra
 * within Mathematics) — it lets the generated message name something concrete.
 */
export interface ClassroomSubject {
  subject: string;
  score: number;
  topic?: string;
}

export interface ClassroomData {
  attendance: number;
  subjects: ClassroomSubject[];
  teacherNotes: string[];
}

export interface Attendance {
  studentId: string;
  percentage: number;
}

export interface TeacherNote {
  studentId: string;
  note: string;
  createdAt: string;
}

export interface AIUpdate {
  studentId: string;
  englishSummary: string;
  romanUrduSummary: string;
  /** Real Urdu-script text — null for older records saved before this existed. */
  urduSummary: string | null;
  parentAction: string;
  whyThisMatters: string;
  createdAt: string;
}

export type StudentStatus = 'doing-well' | 'needs-attention';

export interface StudentProfile {
  student: Student;
  attendance: number;
  subjects: SubjectScore[];
  note: string;
  overallPerformance: number;
  status: StudentStatus;
  weakestSubject: SubjectScore;
}
