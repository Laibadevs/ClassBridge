'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Card from '@/components/ui/Card';
import { CalendarCheckIcon } from '@/components/icons';
import { teacherApi, type TeacherAttendance } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

const RECENT_LIMIT = 8;

const statusStyle: Record<TeacherAttendance['status'], string> = {
  present: 'bg-emerald-50 text-brand-greenDark',
  late: 'bg-amber-50 text-amber-700',
  absent: 'bg-slate-200 text-ink',
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function StudentAttendanceSection({
  studentId,
  className = '',
}: {
  studentId: string;
  className?: string;
}) {
  const [rows, setRows] = useState<TeacherAttendance[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSeq = useRef(0);
  useEffect(() => {
    const seq = ++loadSeq.current;
    teacherApi
      .listAttendance(studentId)
      .then((data) => {
        if (seq !== loadSeq.current) return;
        setRows(data);
      })
      .catch((err) => {
        if (seq !== loadSeq.current) return;
        setError(err instanceof ApiError ? err.message : 'Could not load attendance history.');
      });
  }, [studentId]);

  const { present, late, absent, recent } = useMemo(() => {
    const all = rows ?? [];
    return {
      present: all.filter((r) => r.status === 'present').length,
      late: all.filter((r) => r.status === 'late').length,
      absent: all.filter((r) => r.status === 'absent').length,
      // Already newest-first (see student_service.list_attendance).
      recent: all.slice(0, RECENT_LIMIT),
    };
  }, [rows]);

  return (
    <Card className={className}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-brand-greenDark">
          <CalendarCheckIcon className="h-4 w-4" />
        </span>
        <h2 className="font-semibold text-ink">Recent attendance</h2>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {rows === null && !error ? (
        <p className="text-sm text-ink-muted">Loading attendance…</p>
      ) : (rows ?? []).length === 0 ? (
        <p className="text-sm text-ink-muted">No attendance recorded yet.</p>
      ) : (
        <>
          <div className="mb-4 flex gap-4 text-sm">
            <span>
              <span className="font-semibold text-brand-greenDark">{present}</span>{' '}
              <span className="text-ink-muted">present</span>
            </span>
            <span>
              <span className="font-semibold text-amber-700">{late}</span> <span className="text-ink-muted">late</span>
            </span>
            <span>
              <span className="font-semibold text-ink">{absent}</span> <span className="text-ink-muted">absent</span>
            </span>
          </div>
          <ul className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <li key={r.id}>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[r.status]}`}
                >
                  {formatDate(r.date)}
                  <span className="font-semibold capitalize">{r.status}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
