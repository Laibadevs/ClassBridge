/**
 * Bridges the real /api/teacher/students and /api/teacher/attendance data
 * onto the shapes lib/attendance-data.ts's pure helpers already work with.
 * A "class" isn't a separate entity in the schema — it's just the
 * (class_name, section) pair already on each Student record, the same
 * convention announcements use for `target_class`/`target_section`.
 */
import { initialsOf, slug, type DayMarks, type RosterStudent } from './attendance-data';
import type { TeacherAttendance, TeacherStudentListItem } from './teacher-api';

export interface ClassGroup {
  id: string;
  label: string;
  students: TeacherStudentListItem[];
}

const UNASSIGNED_LABEL = 'Unassigned';

/** Groups a teacher's real roster into classes by (class_name, section),
 * sorted by label so the dropdown order stays stable across reloads. */
export function groupIntoClasses(students: TeacherStudentListItem[]): ClassGroup[] {
  const groups = new Map<string, ClassGroup>();

  for (const student of students) {
    const className = student.class_name?.trim() || null;
    const section = student.section?.trim() || null;
    const label = className ? (section ? `${className} — Section ${section}` : className) : UNASSIGNED_LABEL;
    const id = slug(`${className ?? 'unassigned'}-${section ?? ''}`) || 'unassigned';

    const group = groups.get(id);
    if (group) {
      group.students.push(student);
    } else {
      groups.set(id, { id, label, students: [student] });
    }
  }

  const list = [...groups.values()];
  for (const group of list) {
    group.students.sort((a, b) => {
      const rollDiff = (a.roll_number ?? '').localeCompare(b.roll_number ?? '', undefined, { numeric: true });
      return rollDiff !== 0 ? rollDiff : a.full_name.localeCompare(b.full_name);
    });
  }
  list.sort((a, b) => (a.label === UNASSIGNED_LABEL ? 1 : b.label === UNASSIGNED_LABEL ? -1 : a.label.localeCompare(b.label)));
  return list;
}

/** The roster shape the attendance page's summary/trend math expects, built
 * from real students — `rate` is the server-computed attendance rollup, not
 * a guess. */
export function rosterFromGroup(group: ClassGroup): RosterStudent[] {
  return group.students.map((s) => ({
    id: s.id,
    name: s.full_name,
    initials: initialsOf(s.full_name),
    rate: s.attendance_rate !== null ? Math.round(s.attendance_rate) : 0,
  }));
}

/** Buckets a flat list of real attendance rows (e.g. from a date-range fetch)
 * by ISO date, each bucket in the `DayMarks` shape the pure helpers use. */
export function bucketByDate(records: TeacherAttendance[]): Record<string, DayMarks> {
  const out: Record<string, DayMarks> = {};
  for (const record of records) {
    const day = out[record.date] ?? (out[record.date] = {});
    day[record.student_id] = { status: record.status };
  }
  return out;
}
