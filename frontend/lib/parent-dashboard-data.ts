import type { AIUpdate, StudentProfile, SubjectScore } from '@/lib/types';
import { displaySubject } from '@/lib/subjects';

/** Below this a subject is framed as needing a little extra practice. */
export const SUPPORT_THRESHOLD = 65;
/** At/above this a subject is strong — shown in green. */
export const STRONG_THRESHOLD = 80;

export type SubjectTone = 'strong' | 'standard' | 'support';

export interface SubjectStat {
  name: string;
  score: number;
  previousScore: number;
  tone: SubjectTone;
  label: string;
}

/** "A", "A and B" or "A, B and C" — the phrasing parent copy always uses. */
export function listPhrase(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Subjects trending upward, minus the one highlighted as needing support — so a
 * parent is never told the same subject is both improving and lagging.
 */
export function improverNames(profile: StudentProfile): string[] {
  return profile.subjects
    .filter((s) => isImproving(s) && s.subject !== profile.weakestSubject.subject)
    .map((s) => displaySubject(s.subject));
}

/** Trending upward and already past the support line — worth celebrating. */
export function isImproving(s: SubjectScore) {
  return s.score > s.previousScore && s.score >= SUPPORT_THRESHOLD;
}

export function needsSupport(s: SubjectScore) {
  return s.score < SUPPORT_THRESHOLD;
}

function toneFor(score: number): SubjectTone {
  if (score >= STRONG_THRESHOLD) return 'strong';
  if (score >= SUPPORT_THRESHOLD) return 'standard';
  return 'support';
}

const LABELS: Record<SubjectTone, string> = {
  strong: 'Doing well',
  standard: 'Improving',
  support: 'Needs some support',
};

export function toSubjectStat(s: SubjectScore): SubjectStat {
  const tone = toneFor(s.score);
  return {
    name: displaySubject(s.subject),
    score: s.score,
    previousScore: s.previousScore,
    tone,
    label: LABELS[tone],
  };
}

/** Turns an ISO timestamp into the soft, human recency a parent expects. */
export function relativeDay(iso: string | null | undefined): string {
  if (!iso) return 'Recently';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Recently';
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}

export interface UpdateRow {
  subject: string;
  kind: string;
  when: string;
  sent?: boolean;
}

/**
 * The update the teacher actually sent leads the list; the child's strongest
 * moving subjects follow as progress notes.
 */
export function buildRecentUpdates(
  subjects: SubjectScore[],
  sentUpdate: AIUpdate | null,
  weakest?: SubjectScore
): UpdateRow[] {
  const rows: UpdateRow[] = [];

  if (sentUpdate && weakest) {
    rows.push({
      subject: displaySubject(weakest.subject),
      kind: 'Parent update',
      when: relativeDay(sentUpdate.createdAt),
      sent: true,
    });
  }

  const demoRecency = ['3 days ago', '1 week ago'];
  subjects
    .filter((s) => isImproving(s) && (!weakest || s.subject !== weakest.subject))
    .sort((a, b) => b.score - a.score)
    .slice(0, demoRecency.length)
    .forEach((s, i) => {
      rows.push({ subject: displaySubject(s.subject), kind: 'Progress update', when: demoRecency[i] });
    });

  return rows;
}
