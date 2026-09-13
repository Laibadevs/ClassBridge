'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BellIcon } from '@/components/icons';
import { parentApi, type ParentAnnouncement } from '@/lib/parent-api';
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

function relativeTime(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function ParentAnnouncementsView() {
  const [announcements, setAnnouncements] = useState<ParentAnnouncement[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const data = await parentApi.getAnnouncements();
      if (seq !== loadSeq.current) return;
      setAnnouncements(data);
      setError(null);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      setError(err instanceof ApiError ? err.message : 'Could not load announcements. Please try again.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">Announcements</h1>
        <p className="mt-1 text-ink-muted">Updates shared by your child&apos;s teacher.</p>
      </header>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {announcements === null && !error ? (
        <p className="mt-6 text-sm text-ink-muted">Loading announcements…</p>
      ) : announcements && announcements.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-[20px] border border-slate-200 bg-white px-6 py-16 text-center shadow-card">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
            <BellIcon className="h-7 w-7" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-ink">No announcements yet</h3>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">Your teacher hasn&apos;t shared anything here yet.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {(announcements ?? []).map((a) => (
            <div key={a.id} className="rounded-[20px] border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-brand-blue">
                  <BellIcon className="h-4 w-4" />
                </span>
                <h3 className="font-semibold text-ink">{a.title}</h3>
                <span className="ml-auto text-xs text-ink-muted">{relativeTime(a.created_at)}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink">{a.message}</p>
              <p className="mt-2 text-xs font-medium text-ink-muted">
                {typeLabels[a.announcement_type] ?? a.announcement_type}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
