'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRightIcon,
  CalendarCheckIcon,
  CheckIcon,
  ChevronRightIcon,
  EditIcon,
  GlobeIcon,
  LoaderIcon,
  MessageIcon,
  NoteIcon,
  SparklesIcon,
} from '@/components/icons';
import { ApiError } from '@/lib/api';
import { teacherApi, type TeacherGrade, type TeacherNote } from '@/lib/teacher-api';
import {
  parentUpdateApi,
  type GeneratedUpdate,
  type ParentUpdate,
  type ParentUpdateDelivery,
} from '@/lib/parent-update-api';
import TextToSpeechButton, { type SpeechLanguage } from '@/components/parent/TextToSpeechButton';

interface UpdateGeneratorProps {
  student: { id: string; name: string; initials: string; grade: string; section: string };
}

type Phase = 'idle' | 'generating' | 'ready' | 'saving' | 'saved';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25';

function gradePct(g: TeacherGrade): number {
  return Math.round((Number(g.score) / Number(g.max_score)) * 100);
}

const TONE_TILE: Record<'blue' | 'green' | 'amber', string> = {
  blue: 'bg-brand-blue text-white',
  green: 'bg-brand-green text-white',
  amber: 'bg-amber-500 text-white',
};
const TONE_HEADING: Record<'blue' | 'green' | 'amber', string> = {
  blue: 'text-brand-blueDark',
  green: 'text-brand-greenDark',
  amber: 'text-amber-700',
};

/** Section shell shared by the English / Roman Urdu / Urdu blocks. */
function ResultSection({
  icon,
  title,
  tone,
  value,
  editing,
  onChange,
  speechLanguage,
}: {
  icon: React.ReactNode;
  title: string;
  tone: 'blue' | 'green' | 'amber';
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  speechLanguage: SpeechLanguage;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_TILE[tone]}`}>
          {icon}
        </span>
        <h4 className={`flex-1 font-semibold ${TONE_HEADING[tone]}`}>{title}</h4>
        {!editing && (
          <>
            <TextToSpeechButton text={value} language={speechLanguage} label={`the ${title} update`} />
            <span className="text-xs font-medium text-ink-muted">Read-only</span>
          </>
        )}
      </div>
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          dir={speechLanguage === 'urdu' ? 'rtl' : 'ltr'}
          aria-label={`Edit ${title}`}
          className={`${fieldClass} resize-y leading-relaxed`}
        />
      ) : (
        <p className="text-[0.97rem] leading-[1.85] text-ink" dir={speechLanguage === 'urdu' ? 'rtl' : 'ltr'}>
          {value}
        </p>
      )}
    </div>
  );
}

function Skeleton() {
  const bar =
    'h-3.5 rounded-full bg-gradient-to-r from-slate-100 via-blue-50 to-slate-100 bg-[length:200%_100%] animate-shimmer';
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
          <SparklesIcon className="h-4 w-4" />
        </span>
        <div className="h-3.5 w-32 animate-shimmer rounded-full bg-gradient-to-r from-slate-100 via-blue-50 to-slate-100 bg-[length:200%_100%]" />
      </div>
      <div className={bar} />
      <div className={`${bar} w-11/12`} />
      <div className={`${bar} w-2/3`} />
    </div>
  );
}

export default function UpdateGenerator({ student }: UpdateGeneratorProps) {
  // Real classroom facts — read-only here. This is what the AI actually
  // reads server-side; nothing typed on this page feeds the generator.
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [grades, setGrades] = useState<TeacherGrade[]>([]);
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [contextLoading, setContextLoading] = useState(true);

  const [generated, setGenerated] = useState<GeneratedUpdate | null>(null);
  const [savedUpdate, setSavedUpdate] = useState<ParentUpdate | null>(null);
  const [history, setHistory] = useState<ParentUpdate[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [approving, setApproving] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [whatsappDelivery, setWhatsappDelivery] = useState<ParentUpdateDelivery | null>(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsappError, setWhatsappError] = useState<string | null>(null);

  const firstName = student.name.split(' ')[0];

  const loadContext = useCallback(async () => {
    setContextLoading(true);
    try {
      const [attendance, gradeRows, noteRows, updates] = await Promise.all([
        teacherApi.listAttendance(student.id),
        teacherApi.listGrades(student.id),
        teacherApi.listNotes(student.id),
        parentUpdateApi.list(student.id),
      ]);
      const total = attendance.length;
      setAttendanceRate(
        total ? Math.round((attendance.filter((a) => a.status !== 'absent').length / total) * 100) : null
      );
      setGrades(gradeRows);
      setNotes(noteRows);
      setHistory(updates);
    } catch {
      // Read-only context is best-effort; generation still works without it.
    } finally {
      setContextLoading(false);
    }
  }, [student.id]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  function flash(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  const weakestGrade = useMemo(() => {
    if (!grades.length) return null;
    return grades.reduce((min, g) => (gradePct(g) < gradePct(min) ? g : min), grades[0]);
  }, [grades]);

  const hasAnyData = attendanceRate !== null || grades.length > 0 || notes.length > 0;

  async function generate() {
    setPhase('generating');
    setEditing(false);
    setConfirmApprove(false);
    setWhatsappDelivery(null);
    setWhatsappError(null);
    setError(null);
    try {
      const result = await parentUpdateApi.generate(student.id);
      setGenerated(result);
      setSavedUpdate(null);
      setPhase('ready');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "We couldn't generate the update right now. Please try again.");
      setPhase(generated ? 'ready' : 'idle');
    }
  }

  async function saveDraft() {
    if (!generated) return;
    setPhase('saving');
    setError(null);
    try {
      const saved = await parentUpdateApi.save(student.id, {
        english_text: generated.english_text,
        roman_urdu_text: generated.roman_urdu_text,
        urdu_text: generated.urdu_text,
        status: 'draft',
      });
      setSavedUpdate(saved);
      setHistory((h) => [saved, ...h]);
      setPhase('saved');
      setEditing(false);
      setConfirmApprove(false);
      setWhatsappDelivery(null);
      setWhatsappError(null);
      flash('Draft saved');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The draft could not be saved. Please try again.');
      setPhase('ready');
    }
  }

  async function approve() {
    if (!savedUpdate) return;
    if (!confirmApprove) {
      setConfirmApprove(true);
      return;
    }
    setApproving(true);
    setError(null);
    try {
      const approved = await parentUpdateApi.approve(student.id, savedUpdate.id);
      setSavedUpdate(approved);
      setHistory((h) => h.map((u) => (u.id === approved.id ? approved : u)));
      setConfirmApprove(false);
      flash('Approved — the parent can now see this update');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not approve this update right now. Please try again.');
    } finally {
      setApproving(false);
    }
  }

  async function sendWhatsApp() {
    if (!savedUpdate) return;
    setSendingWhatsApp(true);
    setWhatsappError(null);
    try {
      const delivery = await parentUpdateApi.sendWhatsApp(savedUpdate.id);
      setWhatsappDelivery(delivery);
      if (delivery.status === 'failed') {
        flash('WhatsApp delivery failed');
      } else {
        setSavedUpdate((prev) => (prev ? { ...prev, status: 'sent' } : prev));
        setHistory((h) => h.map((u) => (u.id === savedUpdate.id ? { ...u, status: 'sent' } : u)));
        flash('Sent via WhatsApp');
      }
    } catch (err) {
      setWhatsappError(
        err instanceof ApiError ? err.message : 'WhatsApp could not send the message right now. Please try again.'
      );
    } finally {
      setSendingWhatsApp(false);
    }
  }

  const busy = phase === 'generating' || phase === 'saving';

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
          <li>
            <Link href="/teacher/students" className="rounded transition-colors hover:text-brand-blue focus-ring">
              Students
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </li>
          <li>
            <Link
              href={`/teacher/student/${student.id}`}
              className="rounded transition-colors hover:text-brand-blue focus-ring"
            >
              {student.name}
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </li>
          <li aria-current="page" className="font-medium text-ink">
            Generate Parent Update
          </li>
        </ol>
      </nav>

      {/* Header */}
      <header className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">
          Create a parent-friendly update
        </h1>
        <p className="mt-1.5 max-w-2xl text-ink-muted">
          ClassBridge AI reads {firstName}&apos;s real recorded attendance, grades, and notes, and writes a clear,
          supportive message parents can understand and act on.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] xl:gap-8">
        {/* ------------------------------ LEFT ------------------------------ */}
        <section aria-labelledby="classroom-data-heading">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Classroom Data</h2>

          <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <div id="classroom-data-heading" className="mb-5 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-brand-blue">
                <NoteIcon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-bold text-ink">What&apos;s on record</h3>
            </div>

            {/* Student */}
            <div className="mb-6 flex items-center gap-3.5 rounded-2xl bg-slate-50 p-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-base font-bold text-brand-blue">
                {student.initials}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{student.name}</p>
                <p className="truncate text-sm text-ink-muted">
                  {student.grade}
                  {student.section ? ` · Class ${student.section}` : ''}
                </p>
              </div>
            </div>

            {contextLoading ? (
              <p className="text-sm text-ink-muted">Loading recorded data…</p>
            ) : !hasAnyData ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-ink-muted">
                No attendance, grades, or notes recorded yet for {firstName}. Add some from the student page first.
              </div>
            ) : (
              <div className="space-y-5">
                {/* Attendance */}
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                    <CalendarCheckIcon className="h-3.5 w-3.5" /> Attendance
                  </p>
                  <p className="text-2xl font-bold text-ink">
                    {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                  </p>
                </div>

                {/* Grades */}
                {grades.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Recent grades
                    </p>
                    <div className="space-y-2">
                      {grades.slice(0, 5).map((g) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5"
                        >
                          <span className="truncate text-sm font-medium text-ink">{g.subject}</span>
                          <span className="text-sm font-bold text-ink">{gradePct(g)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher notes */}
                {notes.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      Recent teacher notes
                    </p>
                    <div className="space-y-2">
                      {notes.slice(0, 3).map((n) => (
                        <p
                          key={n.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 text-sm leading-relaxed text-ink-muted"
                        >
                          &ldquo;{n.note}&rdquo;
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {error}
              </div>
            )}

            {/* Generate */}
            <button
              type="button"
              onClick={generate}
              disabled={busy || contextLoading || !hasAnyData}
              aria-busy={phase === 'generating'}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-6 py-4 text-base font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phase === 'generating' ? (
                <>
                  <LoaderIcon className="h-5 w-5 animate-spin" /> Generating update...
                </>
              ) : (
                <>
                  {generated ? 'Regenerate AI Update' : 'Generate Parent Update'}
                  <ArrowRightIcon className="h-5 w-5" />
                </>
              )}
            </button>
            <p className="mt-2.5 text-center text-xs text-ink-muted">
              Takes a few seconds. Nothing is sent to the parent — this only creates a draft you review first.
            </p>
          </div>
        </section>

        {/* ------------------------------ RIGHT ------------------------------ */}
        <section aria-labelledby="ai-result-heading">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">AI Parent Update</h2>

          <div className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-elevated sm:p-6">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span id="ai-result-heading" className="flex-1 text-lg font-bold text-ink">
                Parent-Friendly Update
              </span>
              {generated && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-blue">
                  <SparklesIcon className="h-3.5 w-3.5" /> AI Generated
                </span>
              )}
              {phase === 'saved' && savedUpdate?.status === 'draft' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-brand-greenDark">
                  <CheckIcon className="h-3.5 w-3.5" /> Draft saved
                </span>
              )}
              {savedUpdate && savedUpdate.status !== 'draft' && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-semibold text-brand-greenDark">
                  <CheckIcon className="h-3.5 w-3.5" /> Approved
                </span>
              )}
            </div>

            {phase === 'generating' && (
              <div className="animate-fadeIn space-y-4">
                <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3.5">
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-brand-blue/15" />
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-white">
                      <SparklesIcon className="h-4 w-4" />
                    </span>
                  </span>
                  <p className="text-sm font-medium text-brand-blueDark">
                    ClassBridge AI is turning {firstName}&apos;s classroom data into a parent-friendly update.
                  </p>
                </div>
                <Skeleton />
                <Skeleton />
              </div>
            )}

            {phase !== 'generating' && !generated && (
              <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-14 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
                  <SparklesIcon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-semibold text-ink">Your update will appear here</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-ink-muted">
                  Click Generate Parent Update — ClassBridge AI writes it in simple English and friendly Roman Urdu,
                  using only what&apos;s actually on record.
                </p>
              </div>
            )}

            {phase !== 'generating' && generated && (
              <div className="animate-fadeIn space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-ink-muted">
                    Review the wording before saving. {editing ? 'Edit any section, then save.' : ''}
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditing((v) => !v)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
                  >
                    <EditIcon className="h-3.5 w-3.5" /> {editing ? 'Done editing' : 'Edit'}
                  </button>
                </div>

                <div className="grid gap-4">
                  <ResultSection
                    icon={<GlobeIcon className="h-4 w-4" />}
                    title="Simple English"
                    tone="blue"
                    value={generated.english_text}
                    editing={editing}
                    onChange={(v) => setGenerated({ ...generated, english_text: v })}
                    speechLanguage="english"
                  />
                  <ResultSection
                    icon={<MessageIcon className="h-4 w-4" />}
                    title="Friendly Roman Urdu"
                    tone="green"
                    value={generated.roman_urdu_text}
                    editing={editing}
                    onChange={(v) => setGenerated({ ...generated, roman_urdu_text: v })}
                    speechLanguage="roman_urdu"
                  />
                  <ResultSection
                    icon={<MessageIcon className="h-4 w-4" />}
                    title="Urdu (اردو)"
                    tone="amber"
                    value={generated.urdu_text}
                    editing={editing}
                    onChange={(v) => setGenerated({ ...generated, urdu_text: v })}
                    speechLanguage="urdu"
                  />
                </div>

                {weakestGrade && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-5">
                    <h4 className="mb-3 text-sm font-semibold text-ink">Area for improvement</h4>
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                      <span className="min-w-0 flex-1 truncate font-semibold text-ink">{weakestGrade.subject}</span>
                      <span className="text-sm font-bold text-ink">{gradePct(weakestGrade)}%</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={saveDraft}
                      disabled={busy}
                      aria-busy={phase === 'saving'}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                    >
                      {phase === 'saving' ? (
                        <>
                          <LoaderIcon className="h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4" /> Save Draft
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
                    >
                      <EditIcon className="h-4 w-4" /> {editing ? 'Done' : 'Edit Update'}
                    </button>
                    <button
                      type="button"
                      onClick={generate}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-ring disabled:opacity-50"
                    >
                      <SparklesIcon className="h-4 w-4" /> Regenerate
                    </button>

                    {savedUpdate && savedUpdate.status === 'draft' && (
                      <button
                        type="button"
                        onClick={approve}
                        disabled={approving}
                        aria-busy={approving}
                        className={`ml-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-elevated transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                          confirmApprove ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand-green hover:bg-brand-greenDark'
                        }`}
                      >
                        {approving ? (
                          <>
                            <LoaderIcon className="h-4 w-4 animate-spin" /> Approving...
                          </>
                        ) : confirmApprove ? (
                          'Confirm approve?'
                        ) : (
                          <>
                            <CheckIcon className="h-4 w-4" /> Approve
                          </>
                        )}
                      </button>
                    )}
                    {confirmApprove && !approving && (
                      <button
                        type="button"
                        onClick={() => setConfirmApprove(false)}
                        className="text-sm font-semibold text-ink-muted transition-colors hover:text-ink focus-ring"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  {savedUpdate && savedUpdate.status === 'draft' && (
                    <p className="text-xs text-ink-muted">
                      Saved as draft {new Date(savedUpdate.updated_at).toLocaleString()}. Still only visible to you —
                      approve it to share with the parent and send it via WhatsApp.
                    </p>
                  )}
                  {savedUpdate && savedUpdate.status !== 'draft' && (
                    <p className="text-xs font-medium text-brand-greenDark">
                      Approved {new Date(savedUpdate.updated_at).toLocaleString()} — the linked parent can now see
                      this update on their dashboard.
                    </p>
                  )}

                  {savedUpdate && savedUpdate.status !== 'draft' && (
                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                      {savedUpdate.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-green/15 px-3 py-1.5 text-xs font-semibold text-brand-greenDark">
                          <CheckIcon className="h-3.5 w-3.5" /> Sent via WhatsApp
                        </span>
                      ) : whatsappDelivery?.status === 'failed' ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600">
                            WhatsApp delivery failed
                          </span>
                          <button
                            type="button"
                            onClick={sendWhatsApp}
                            disabled={sendingWhatsApp}
                            aria-busy={sendingWhatsApp}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {sendingWhatsApp ? (
                              <>
                                <LoaderIcon className="h-4 w-4 animate-spin" /> Retrying...
                              </>
                            ) : (
                              <>
                                <MessageIcon className="h-4 w-4" /> Retry Send
                              </>
                            )}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={sendWhatsApp}
                          disabled={sendingWhatsApp}
                          aria-busy={sendingWhatsApp}
                          className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-greenDark focus-ring disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {sendingWhatsApp ? (
                            <>
                              <LoaderIcon className="h-4 w-4 animate-spin" /> Sending...
                            </>
                          ) : (
                            <>
                              <MessageIcon className="h-4 w-4" /> Send via WhatsApp
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                  {whatsappError && (
                    <p role="alert" className="text-xs text-red-600">
                      {whatsappError}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Previous updates */}
          {history.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Previous updates for {firstName}
              </h2>
              <div className="space-y-3">
                {history.slice(0, 5).map((u) => (
                  <div key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        {new Date(u.created_at).toLocaleString()}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          u.status === 'draft' ? 'bg-slate-100 text-ink-muted' : 'bg-emerald-50 text-brand-greenDark'
                        }`}
                      >
                        {u.status === 'draft' ? 'Draft' : u.status === 'approved' ? 'Approved' : 'Sent'}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-ink-muted">{u.english_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fadeIn rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-premium"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
