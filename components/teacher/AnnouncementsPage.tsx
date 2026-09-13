'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import TeacherShell from './TeacherShell';
import AnnouncementFormModal from './AnnouncementFormModal';
import { PlusIcon, BellIcon } from '@/components/icons';
import {
  teacherApi,
  type Announcement,
  type AnnouncementWithRecipients,
  type TeacherStudentListItem,
} from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

const typeLabels: Record<string, string> = {
  attendance_alert: 'Attendance Alert',
  school_event: 'School Event',
  parent_meeting: 'Parent Meeting',
  holiday_notice: 'Holiday Notice',
  exam_reminder: 'Exam Reminder',
  emergency: 'Emergency',
  general: 'General',
};

const targetLabels: Record<string, string> = {
  all: 'All Parents',
  class: 'Specific Class',
  section: 'Specific Section',
  students: 'Specific Students',
};

function StatusPill({ status }: { status: Announcement['status'] }) {
  const map: Record<Announcement['status'], string> = {
    draft: 'bg-slate-100 text-ink-muted',
    published: 'bg-blue-50 text-brand-blue',
    sent: 'bg-emerald-50 text-brand-greenDark',
    failed: 'bg-red-50 text-red-600',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${map[status]}`}>
      {status}
    </span>
  );
}

function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function AnnouncementsPage({ userName }: { userName: string }) {
  const [addOpen, setAddOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [students, setStudents] = useState<TeacherStudentListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  // WhatsApp delivery detail per announcement — the list endpoint doesn't
  // include recipients, so non-draft rows are fetched individually. Fine at
  // hackathon scale (one teacher's own announcement list).
  const [detailsById, setDetailsById] = useState<Record<string, AnnouncementWithRecipients>>({});

  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const [announcementData, studentData] = await Promise.all([
        teacherApi.listAnnouncements(),
        teacherApi.listStudents(),
      ]);
      if (seq !== loadSeq.current) return;
      setAnnouncements(announcementData);
      setStudents(studentData);
      setError(null);

      const nonDraft = announcementData.filter((a) => a.status !== 'draft');
      const details = await Promise.all(nonDraft.map((a) => teacherApi.getAnnouncement(a.id).catch(() => null)));
      if (seq !== loadSeq.current) return;
      const map: Record<string, AnnouncementWithRecipients> = {};
      nonDraft.forEach((a, i) => {
        const detail = details[i];
        if (detail) map[a.id] = detail;
      });
      setDetailsById(map);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError(err instanceof ApiError ? err.message : 'Could not load announcements. Please try again.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function publish(id: string) {
    setPublishingId(id);
    try {
      // Publishing also attempts WhatsApp delivery to every resolved
      // recipient immediately (Phase 5) — no separate step for the teacher.
      await teacherApi.publishAnnouncement(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not publish announcement.');
    } finally {
      setPublishingId(null);
    }
  }

  async function retryWhatsApp(id: string) {
    setSendingId(id);
    try {
      await teacherApi.sendAnnouncementWhatsApp(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send WhatsApp messages right now.');
    } finally {
      setSendingId(null);
    }
  }

  return (
    <TeacherShell userName={userName}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">Important Announcements</h1>
          <p className="mt-1 text-ink-muted">Share updates with parents — attendance alerts, events, reminders and more.</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 self-start rounded-full bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring sm:self-auto"
        >
          <PlusIcon className="h-4 w-4" /> New Announcement
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {announcements === null && !error ? (
        <p className="mt-6 text-sm text-ink-muted">Loading announcements…</p>
      ) : announcements && announcements.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-card">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
            <BellIcon className="h-7 w-7" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-ink">No announcements yet</h3>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">Create one to keep parents in the loop.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {(announcements ?? []).map((a) => {
            const recipients = detailsById[a.id]?.recipients ?? [];
            const sentCount = recipients.filter((r) =>
              ['sent', 'delivered', 'read'].includes(r.delivery_status)
            ).length;
            const failedCount = recipients.filter((r) => r.delivery_status === 'failed').length;

            return (
              <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{a.title}</h3>
                      <StatusPill status={a.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{a.message}</p>
                    <p className="mt-2 text-xs text-ink-muted">
                      {typeLabels[a.announcement_type] ?? a.announcement_type} · {targetLabels[a.target_type] ?? a.target_type}
                      {a.target_class ? ` · ${a.target_class}` : ''}
                      {a.target_section ? ` ${a.target_section}` : ''} · {relativeTime(a.created_at)}
                    </p>
                    {recipients.length > 0 && (
                      <p className="mt-2 text-xs font-medium text-ink-muted">
                        WhatsApp — Recipients: {recipients.length} · Sent: {sentCount} · Failed: {failedCount}
                      </p>
                    )}
                  </div>
                  {a.status === 'draft' && (
                    <button
                      type="button"
                      disabled={publishingId === a.id}
                      onClick={() => publish(a.id)}
                      className="shrink-0 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring disabled:opacity-60"
                    >
                      {publishingId === a.id ? 'Publishing…' : 'Publish'}
                    </button>
                  )}
                  {a.status !== 'draft' && failedCount > 0 && (
                    <button
                      type="button"
                      disabled={sendingId === a.id}
                      onClick={() => retryWhatsApp(a.id)}
                      className="shrink-0 rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring disabled:opacity-60"
                    >
                      {sendingId === a.id ? 'Retrying…' : `Retry WhatsApp (${failedCount})`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnnouncementFormModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={load} students={students} />
    </TeacherShell>
  );
}
