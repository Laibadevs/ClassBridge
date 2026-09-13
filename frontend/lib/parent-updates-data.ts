import type { AIUpdate, StudentProfile } from '@/lib/types';
import { displaySubject } from '@/lib/subjects';
import { isImproving, relativeDay } from './parent-dashboard-data';

/**
 * The parent-facing update history. The newest entry is whatever the teacher
 * actually sent through the AI generator, so this timeline can never drift away
 * from the dashboard; the older entries are the shared history that preceded it.
 */

export type UpdateKind = 'ai' | 'progress';

export interface UpdateEntry {
  id: string;
  /** Parent-facing subject name, e.g. "Mathematics". */
  subject: string;
  /** Optional focus area inside the subject, e.g. "Algebra". */
  topic?: string;
  kind: UpdateKind;
  headline: string;
  preview: string;
  english: string;
  romanUrdu: string;
  /** Real Urdu-script text — null when this entry predates that field. */
  urdu: string | null;
  action: string;
  /** ISO timestamp the update was shared. */
  sentAt: string;
}

/**
 * History is anchored to the real clock rather than fixed calendar dates, so
 * "Today" always means today and the month filters stay correct whenever the
 * demo is opened. Every entry is sent at 09:00 local, matching the seeded
 * update from the generator.
 */
function sentDayAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

interface SeedEntry {
  subject: string;
  topic?: string;
  daysAgo: number;
  headline: string;
  preview: string;
  english: string;
  romanUrdu: string;
  action: string;
}

/** Everything after the newest update — the older half of the conversation. */
const olderUpdates: SeedEntry[] = [
  {
    subject: 'Science',
    daysAgo: 3,
    headline: 'Strong progress in Science',
    preview: 'Ali has shown improvement in Science and is participating confidently in class.',
    english:
      'Ali has shown steady improvement in Science and now takes part in class discussions with confidence. His recent quiz results were better than last month.',
    romanUrdu:
      'Ali Science mein behtar kar raha hai aur class mein bharose se hissa le raha hai. Uske recent quiz ke natije pichle mahine se achay rahe.',
    action: 'Continue regular revision before weekly quizzes.',
  },
  {
    subject: 'English',
    daysAgo: 7,
    headline: 'Good progress in English',
    preview: 'Ali is performing well in English and showing stronger participation.',
    english:
      'Ali is performing well in English and his reading is getting smoother. He is volunteering to read aloud more often in class.',
    romanUrdu:
      'Ali English mein achha kar raha hai aur uski reading behtar ho rahi hai. Woh class mein ab zyada read aloud karne ke liye tayyar hota hai.',
    action: 'Continue reading practice at home.',
  },
  {
    subject: 'Computer',
    daysAgo: 10,
    headline: 'Confident with practical work',
    preview: 'Ali is doing very well in Computer class and helps classmates with practical tasks.',
    english:
      'Ali is doing very well in Computer class. He finishes practical tasks independently and often helps classmates who get stuck.',
    romanUrdu:
      'Ali Computer class mein bohat achha kar raha hai. Woh practical tasks khud complete karta hai aur classmates ki bhi madad karta hai.',
    action: 'No extra practice needed — short project work at home keeps the interest alive.',
  },
  {
    subject: 'Mathematics',
    topic: 'Equations',
    daysAgo: 14,
    headline: 'More comfortable with equations',
    preview: 'Ali is handling one-step equations better, though multi-step ones still need practice.',
    english:
      'Ali is handling one-step equations much better. Multi-step equations still take him time, so a little regular practice will help.',
    romanUrdu:
      'Ali one-step equations ab behtar hal kar raha hai. Multi-step equations mein abhi bhi waqt lagta hai, thori regular practice se behtar ho jayega.',
    action: 'Keep up short practice twice a week.',
  },
  {
    subject: 'Science',
    topic: 'Electricity',
    daysAgo: 20,
    headline: 'Improving in Electricity',
    preview: 'Ali is grasping the Electricity unit well and asking good questions in class.',
    english:
      'Ali is grasping the Electricity unit well and asks useful questions during practical demonstrations. Written work is improving too.',
    romanUrdu:
      'Ali Electricity ka topic achha samajh raha hai aur demonstrations ke dauran achay sawal poochta hai. Written work bhi behtar ho raha hai.',
    action: 'A quick review of the electricity notes once a week is enough.',
  },
  {
    subject: 'English',
    topic: 'Reading',
    daysAgo: 24,
    headline: 'Reading aloud is improving',
    preview: 'Ali reads more fluently now and pauses correctly at full stops.',
    english:
      'Ali reads more fluently than a month ago and pauses correctly at full stops. Building vocabulary at home will keep this going.',
    romanUrdu:
      'Ali pichle mahine se zyada fluently parh raha hai aur full stop par theek se rukta hai. Ghar par vocabulary barhane se yeh raftar bani rahegi.',
    action: 'Ten minutes of reading aloud in the evening.',
  },
  {
    subject: 'Mathematics',
    topic: 'Algebra',
    daysAgo: 30,
    headline: 'Algebra was a little hard this month',
    preview: 'Ali followed the lessons but needed extra help with worksheet practice.',
    english:
      'Ali follows the class lessons, but Algebra worksheets take him longer than the rest of the class. Short, frequent practice works better for him than long sessions.',
    romanUrdu:
      'Ali class ki lessons samajh lete hain, lekin Algebra worksheets mein waqt zyada lagta hai. Unke liye choti lekin roz ki practice zyada mufeed hai.',
    action: 'Ask Ali to walk you through one solved example each week.',
  },
  {
    subject: 'Computer',
    daysAgo: 35,
    headline: 'Steady progress in Computer class',
    preview: 'Ali is keeping up well and typing speed is improving.',
    english:
      'Ali is keeping up well in Computer class. His typing speed is improving and his class work is handed in on time.',
    romanUrdu:
      'Ali Computer class mein theek chal rahe hain. Unki typing speed barh rahi hai aur class work waqt par jama hota hai.',
    action: 'Practice typing for ten minutes a day.',
  },
  {
    subject: 'Science',
    topic: 'Formulas',
    daysAgo: 41,
    headline: 'Formula recall needs a little help',
    preview: 'Ali understands the concepts but forgets which formula to apply.',
    english:
      'Ali understands the concepts well but sometimes forgets which formula to apply. Writing them on a single card helps him remember.',
    romanUrdu:
      'Ali concepts achha samajhte hain lekin kabhi kabhi formula yaad nahi rehta. Ek card par formulas likh lene se yaad rahta hai.',
    action: 'Use short revision cards for the key formulas.',
  },
  {
    subject: 'English',
    topic: 'Writing',
    daysAgo: 47,
    headline: 'Writing is getting stronger',
    preview: 'Ali is writing longer paragraphs with fewer punctuation slips.',
    english:
      'Ali is writing longer paragraphs with fewer punctuation slips. A little free writing at home keeps this momentum going.',
    romanUrdu:
      'Ali ab lambi paragraphs likh rahe hain aur punctuation ki galtiyan kam hain. Ghar par thori free writing se yeh raftar bani rahegi.',
    action: 'Encourage a few lines of free writing about their day.',
  },
  {
    subject: 'Mathematics',
    daysAgo: 52,
    headline: 'Class participation is steady',
    preview: 'Ali attempts board work willingly and hands in homework on time.',
    english:
      'Ali attempts board work willingly and hands in homework on time. The basics are in place, so focused practice on tricky topics will show results.',
    romanUrdu:
      'Ali board par exercises khushi se karte hain aur homework waqt par jama karte hain. Basics theek hain, so mushkil topics par practice se natije ayenge.',
    action: 'A quick check that homework is finished on time.',
  },
];

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const end = trimmed.search(/(?<=[.!?])\s/);
  return end === -1 ? trimmed : trimmed.slice(0, end + 1);
}

/**
 * The live update from the generator leads the timeline. Its headline names the
 * concrete focus area, so a regenerated update still reads correctly here.
 */
function leadEntry(live: AIUpdate, profile: StudentProfile): UpdateEntry {
  const weakest = profile.weakestSubject;
  const subject = displaySubject(weakest.subject);
  const area = weakest.topic?.trim();

  return {
    id: 'latest',
    subject,
    topic: area || undefined,
    kind: 'ai',
    headline: area ? `${area} needs a little extra practice` : `${subject} needs a little extra practice`,
    preview: firstSentence(live.englishSummary),
    english: live.englishSummary,
    romanUrdu: live.romanUrduSummary,
    urdu: live.urduSummary,
    action: live.parentAction,
    sentAt: live.createdAt,
  };
}

function fallbackLead(profile: StudentProfile): UpdateEntry {
  const weakest = profile.weakestSubject;
  const subject = displaySubject(weakest.subject);
  const area = weakest.topic?.trim() || subject;
  const name = profile.student.name.split(' ')[0];

  return {
    id: 'latest',
    subject,
    topic: weakest.topic?.trim() || undefined,
    kind: 'ai',
    headline: `${area} needs a little extra practice`,
    preview: `${name} is doing well overall, but ${area} could use some additional practice.`,
    english: `${name} is doing well overall, but ${area} needs a little extra practice. Regular practice at home can help improve confidence.`,
    romanUrdu: `${name} ki overall performance theek hai, lekin ${area} mein thori extra practice ki zaroorat hai. Ghar par regular practice se confidence behtar ho sakta hai.`,
    urdu: null,
    action: `Practice ${area} for 15-20 minutes, 3 times this week.`,
    sentAt: sentDayAgo(0),
  };
}

export function buildUpdates(profile: StudentProfile, live: AIUpdate | null): UpdateEntry[] {
  const history = olderUpdates.map((seed, i) => ({
    id: `update-${i + 1}`,
    subject: seed.subject,
    topic: seed.topic,
    kind: 'progress' as UpdateKind,
    headline: seed.headline,
    preview: seed.preview,
    english: seed.english,
    romanUrdu: seed.romanUrdu,
    urdu: null,
    action: seed.action,
    sentAt: sentDayAgo(seed.daysAgo),
  }));

  return [live ? leadEntry(live, profile) : fallbackLead(profile), ...history];
}

// ---------------------------------------------------------------- filters

export type DateFilterKey = 'all' | 'month' | 'quarter';

export const DATE_OPTIONS: { key: DateFilterKey; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: 'Last 3 months' },
];

export const SUBJECT_ALL = 'all';

/** Subject chips in first-seen order, so the filter list matches the data. */
export function subjectFilters(entries: UpdateEntry[]): { value: string; label: string }[] {
  const seen: string[] = [];
  for (const entry of entries) {
    if (!seen.includes(entry.subject)) seen.push(entry.subject);
  }
  return [{ value: SUBJECT_ALL, label: 'All' }, ...seen.map((s) => ({ value: s, label: s }))];
}

function withinWindow(iso: string, filter: DateFilterKey): boolean {
  if (filter === 'all') return true;
  const sent = new Date(iso);
  const now = new Date();
  if (Number.isNaN(sent.getTime())) return false;

  if (filter === 'month') {
    return sent.getFullYear() === now.getFullYear() && sent.getMonth() === now.getMonth();
  }
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
  return sent >= cutoff;
}

/** Date, relative label and subject words all live in one searchable string. */
function haystack(entry: UpdateEntry): string {
  const sent = new Date(entry.sentAt);
  const long = sent.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const short = sent.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const monthYear = sent.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return [
    entry.subject,
    entry.topic ?? '',
    entry.headline,
    entry.preview,
    entry.english,
    entry.romanUrdu,
    entry.urdu ?? '',
    entry.action,
    entry.kind === 'ai' ? 'ai parent update' : 'progress update',
    'sent to parent',
    long,
    short,
    monthYear,
    relativeDay(entry.sentAt).toLowerCase(),
  ]
    .join(' ')
    .toLowerCase();
}

export interface UpdateFilters {
  subject: string;
  date: DateFilterKey;
  query: string;
}

export function filterUpdates(entries: UpdateEntry[], filters: UpdateFilters): UpdateEntry[] {
  const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  return entries.filter((entry) => {
    if (filters.subject !== SUBJECT_ALL && entry.subject !== filters.subject) return false;
    if (!withinWindow(entry.sentAt, filters.date)) return false;
    if (!terms.length) return true;

    const hay = haystack(entry);
    return terms.every((term) => hay.includes(term));
  });
}

/** True when something is narrowing the list — drives the "Clear filters" affordance. */
export function filtersActive(filters: UpdateFilters): boolean {
  return filters.subject !== SUBJECT_ALL || filters.date !== 'all' || filters.query.trim().length > 0;
}

// ---------------------------------------------------------------- summary

export interface UpdatesSummary {
  total: number;
  thisMonth: number;
  areasImproving: number;
}

export function updateSummary(entries: UpdateEntry[], profile: StudentProfile): UpdatesSummary {
  return {
    total: entries.length,
    thisMonth: entries.filter((e) => withinWindow(e.sentAt, 'month')).length,
    // Same rule the Progress page uses, so "3 improving" means one thing.
    areasImproving: profile.subjects.filter(isImproving).length,
  };
}

// ---------------------------------------------------------------- detail

/** "September 12, 2026" — the form used in the detail header. */
export function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** "Today · September 12" — recency first, because that is what parents scan for. */
export function stampDate(iso: string): string {
  const sent = new Date(iso);
  const label = sent.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  return `${relativeDay(iso)} · ${label}`;
}

export interface ProgressSince {
  subject: string;
  from: number;
  to: number;
  change: number;
  improved: boolean;
  note: string;
}

/**
 * The payoff of a sent update: what the subject did afterwards. Neutral wording
 * when nothing has moved yet — a quiet update is not a failed one.
 */
export function progressSince(entry: UpdateEntry, profile: StudentProfile): ProgressSince | null {
  const score = profile.subjects.find((s) => displaySubject(s.subject) === entry.subject);
  if (!score) return null;

  const change = score.score - score.previousScore;
  const first = profile.student.name.split(' ')[0];

  return {
    subject: entry.subject,
    from: score.previousScore,
    to: score.score,
    change,
    improved: change > 0,
    note:
      change > 0
        ? `${first} has made progress since this update was created.`
        : change === 0
          ? `Nothing new has been marked since this update — the next class record will show here.`
          : `${first} dipped a little since this update. A gentle check-in usually helps.`,
  };
}
