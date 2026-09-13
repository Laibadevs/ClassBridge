'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ParentDashboard from './ParentDashboard';
import { parentApi, type ParentChildDetail, type ParentChildSummary } from '@/lib/parent-api';
import { toStudentProfile, toAIUpdate } from '@/lib/parent-dashboard-adapter';
import { getMonthlyProgressNote } from '@/lib/mock-data';
import { ApiError } from '@/lib/api';

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

export default function ParentOverview() {
  const [children, setChildren] = useState<ParentChildSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ParentChildDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const childrenLoadSeq = useRef(0);
  useEffect(() => {
    const seq = ++childrenLoadSeq.current;
    parentApi
      .getChildren()
      .then((data) => {
        if (seq !== childrenLoadSeq.current) return;
        setChildren(data);
        if (data.length > 0) setSelectedId(data[0].id);
        setError(null);
      })
      .catch((err) => {
        if (seq !== childrenLoadSeq.current) return;
        setError(err instanceof ApiError ? err.message : 'Could not load your children. Please try again.');
      });
  }, []);

  const detailLoadSeq = useRef(0);
  const loadDetail = useCallback((id: string) => {
    const seq = ++detailLoadSeq.current;
    parentApi
      .getChild(id)
      .then((data) => {
        if (seq !== detailLoadSeq.current) return;
        setDetail(data);
      })
      .catch((err) => {
        if (seq !== detailLoadSeq.current) return;
        setError(err instanceof ApiError ? err.message : 'Could not load this child. Please try again.');
      });
  }, []);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  if (error) {
    return <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>;
  }

  if (children === null) {
    return <p className="text-sm text-ink-muted">Loading your dashboard…</p>;
  }

  if (children.length === 0) {
    return <p className="text-ink-muted">No student information is linked to this account yet.</p>;
  }

  if (!detail) {
    return <p className="text-sm text-ink-muted">Loading your dashboard…</p>;
  }

  const profile = toStudentProfile(detail);
  const update = toAIUpdate(detail.latest_update);

  return (
    <div className="space-y-6">
      {children.length > 1 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all focus-ring ${
                c.id === selectedId
                  ? 'bg-brand-blue text-white shadow-elevated'
                  : 'border border-slate-200 bg-white text-ink-muted hover:border-brand-blue/40 hover:text-ink'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  c.id === selectedId ? 'bg-white/20 text-white' : 'bg-blue-50 text-brand-blue'
                }`}
              >
                {initialsOf(c.full_name)}
              </span>
              {c.full_name.split(' ')[0]}
            </button>
          ))}
        </div>
      )}
      <ParentDashboard
        profile={profile}
        update={update}
        monthNote={getMonthlyProgressNote(profile)}
        teacherName={detail.teacher_name ?? 'Your child’s teacher'}
      />
    </div>
  );
}
