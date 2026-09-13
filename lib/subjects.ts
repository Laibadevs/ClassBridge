/**
 * Parent-facing subject names read better in full than the gradebook short
 * codes the teacher tools use. Shared so every surface words them identically.
 */
const SUBJECT_DISPLAY: Record<string, string> = {
  Math: 'Mathematics',
  Maths: 'Mathematics',
  Sci: 'Science',
};

export function displaySubject(subject: string): string {
  return SUBJECT_DISPLAY[subject.trim()] ?? subject;
}
