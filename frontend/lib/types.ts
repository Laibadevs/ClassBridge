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
  /** Backend parent_update id — set for real data only (used to load the
   * update's audio). Absent on the demo dataset, which has no audio. */
  updateId?: string;
  studentId: string;
  englishSummary: string;
  romanUrduSummary: string;
  /** Real Urdu-script text — null for older records saved before this existed. */
  urduSummary: string | null;
  /** Legacy single-action field, kept for the demo dataset in lib/mock-data.ts. */
  parentAction: string;
  /** 2-4 practical "what can I do at home" actions — preferred over
   * parentAction when present (real backend data always sets this). */
  homeActions?: string[];
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
  /** Raw record fields the teacher detail page's Student/Parent Information
   * cards and its Edit/Archive actions need — not derived from attendance/
   * grades, and not meaningful for the parent-side profile or legacy demo
   * data this same shape is reused for, so it's optional here. */
  record?: {
    rollNumber: string | null;
    studentKey: string | null;
    section: string | null;
    gradeLevel: string | null;
    parentName: string | null;
    whatsappNumber: string | null;
    whatsappOptIn: boolean;
    homeAddress: string | null;
    location: string | null;
    isActive: boolean;
  };
}
