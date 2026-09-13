'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { AIUpdate, StudentProfile } from '@/lib/types';
import {
  DATE_OPTIONS,
  SUBJECT_ALL,
  buildUpdates,
  filterUpdates,
  filtersActive,
  longDate,
  progressSince,
  stampDate,
  subjectFilters,
  updateSummary,
  type DateFilterKey,
  type UpdateEntry,
} from '@/lib/parent-updates-data';
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronRightIcon,
  GlobeIcon,
  LightbulbIcon,
  MessageIcon,
  SearchIcon,
  SparklesIcon,
  TrendingUpIcon,
} from '@/components/icons';
import TextToSpeechButton from '@/components/parent/TextToSpeechButton';

const card = 'rounded-[20px] border border-slate-200 bg-white p-5 shadow-card sm:p-6';

/** Reads a timeline entry, not an email row: subject first, then the story. */
function TimelineEntry({
  entry,
  selected,
  onView,
}: {
  entry: UpdateEntry;
  selected: boolean;
  onView: () => void;
}) {
  return (
    <li className="relative">
      {/* Node on the rail — AI updates carry the same sparkle badge as the dashboard. */}
      <span
        aria-hidden
        className={`absolute -left-8 top-7 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 bg-white ${
          entry.kind === 'ai' ? 'border-brand-blue text-brand-blue' : 'border-slate-200 text-ink-muted'
        }`}
      >
        {entry.kind === 'ai' ? <SparklesIcon className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
      </span>

      <article
        className={`${card} !p-5 transition-all ${
          selected ? 'border-brand-blue/45 shadow-elevated ring-1 ring-brand-blue/15' : 'hover:shadow-cardHover'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-blue">
            {entry.subject}
          </span>
          {entry.kind === 'ai' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-ink-muted">
              AI Parent Update
            </span>
          )}
          <span className="ml-auto text-xs font-medium text-ink-muted">{stampDate(entry.sentAt)}</span>
        </div>

        <h3 className="mt-3 text-base font-bold tracking-tight text-ink sm:text-lg">{entry.headline}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{entry.preview}</p>

        <div className="mt-4 rounded-xl border border-brand-green/20 bg-emerald-50/60 px-3.5 py-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-greenDark">
            Recommended action
          </p>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-ink">{entry.action}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <CheckIcon className="h-3.5 w-3.5 text-brand-green" />
            Sent to parent
          </span>
          <button
            type="button"
            onClick={onView}
            aria-pressed={selected}
            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3.5 py-2 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue hover:text-white focus-ring"
          >
            View Update <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </article>
    </li>
  );
}

function DetailSection({
  icon,
  label,
  iconClass,
  labelClass,
  action,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  iconClass: string;
  labelClass: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-dashed border-slate-200 pt-5 first:border-0 first:pt-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconClass}`}>{icon}</span>
        <h4 className={`text-sm font-semibold uppercase tracking-wide ${labelClass}`}>{label}</h4>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </div>
  );
}

function UpdateDetail({ entry, profile }: { entry: UpdateEntry; profile: StudentProfile }) {
  const progress = progressSince(entry, profile);
  const first = profile.student.name.split(' ')[0];
  const initials = profile.student.avatarInitials;

  return (
    <section id="update-detail" className="scroll-mt-24 space-y-4 lg:sticky lg:top-24 lg:self-start">
      <div className={`${card} shadow-elevated`}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-green text-sm font-bold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold tracking-tight text-ink sm:text-xl">{entry.subject} Update</h2>
            <p className="mt-0.5 truncate text-sm text-ink-muted">
              {profile.student.name} · {longDate(entry.sentAt)}
            </p>
          </div>
          {entry.kind === 'ai' && (
            <span className="hidden shrink-0 items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand-blue sm:inline-flex">
              <SparklesIcon className="h-3.5 w-3.5" /> AI Parent Update
            </span>
          )}
        </div>

        <div className="mt-6 space-y-5">
          <DetailSection
            icon={<GlobeIcon className="h-4 w-4" />}
            label="Simple English"
            iconClass="bg-brand-blue text-white"
            labelClass="text-brand-blueDark"
            action={<TextToSpeechButton text={entry.english} language="english" label="the English update" />}
          >
            <p className="text-[1.05rem] leading-[1.9] text-ink">{entry.english}</p>
          </DetailSection>

          <DetailSection
            icon={<MessageIcon className="h-4 w-4" />}
            label="Friendly Roman Urdu"
            iconClass="bg-brand-green text-white"
            labelClass="text-brand-greenDark"
            action={
              <TextToSpeechButton text={entry.romanUrdu} language="roman_urdu" label="the Roman Urdu update" />
            }
          >
            <p className="text-[1.05rem] leading-[1.9] text-ink">{entry.romanUrdu}</p>
          </DetailSection>

          {entry.urdu && (
            <DetailSection
              icon={<MessageIcon className="h-4 w-4" />}
              label="Urdu (اردو)"
              iconClass="bg-amber-500 text-white"
              labelClass="text-amber-700"
              action={<TextToSpeechButton text={entry.urdu} language="urdu" label="the Urdu update" />}
            >
              <p className="text-[1.05rem] leading-[1.9] text-ink" dir="rtl">
                {entry.urdu}
              </p>
            </DetailSection>
          )}

          <DetailSection
            icon={<CheckIcon className="h-4 w-4" />}
            label="What you can do this week"
            iconClass="bg-brand-green text-white"
            labelClass="text-brand-greenDark"
          >
            <p className="text-[1.05rem] font-semibold leading-relaxed text-ink">{entry.action}</p>
          </DetailSection>
        </div>

        {entry.topic && progress && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Area for improvement</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="font-semibold text-ink">{entry.subject}</span>
              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold text-ink">{entry.topic}</span>
              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-bold text-ink">{progress.to}%</span>
            </div>
          </div>
        )}
      </div>

      {/* The payoff: what actually happened after this was sent. */}
      {progress && (
        <div className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-ink-muted">Since this update</p>
            {progress.improved ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-brand-greenDark">
                <TrendingUpIcon className="h-3.5 w-3.5" /> +{progress.change}% improvement
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-ink-muted">
                No change yet
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight text-slate-400">{progress.from}%</span>
            <ArrowRightIcon className="h-5 w-5 shrink-0 text-slate-300" />
            <span className="text-3xl font-bold tracking-tight text-ink">{progress.to}%</span>
            <span className="text-sm font-medium text-ink-muted">{progress.subject}</span>
          </div>

          <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-ink-muted">
            <LightbulbIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
            {progress.note}
          </p>
        </div>
      )}

      <p className="px-1 text-center text-xs text-ink-muted">
        {first}&apos;s updates are shared by the class teacher through ClassBridge AI.
      </p>
    </section>
  );
}

function EmptyState({ filtered, onClear }: { filtered: boolean; onClear: () => void }) {
  return (
    <div className={`${card} py-16 text-center`}>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue">
        <MessageIcon className="h-7 w-7" />
      </span>
      <h3 className="mt-5 text-lg font-semibold text-ink">No updates yet</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">
        Once your child&apos;s teacher shares an update, it will appear here.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {filtered && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-glowBlue transition-colors hover:bg-brand-blueDark focus-ring"
          >
            Clear filters
          </button>
        )}
        <Link
          href="/parent"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-card transition-colors hover:border-brand-blue hover:text-brand-blue focus-ring"
        >
          Go to Overview <ChevronRightIcon className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export default function UpdatesPage({
  profile,
  update,
}: {
  profile: StudentProfile;
  update: AIUpdate | null;
}) {
  const [subject, setSubject] = useState<string>(SUBJECT_ALL);
  const [date, setDate] = useState<DateFilterKey>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('latest');

  const entries = useMemo(() => buildUpdates(profile, update), [profile, update]);
  const visible = useMemo(() => filterUpdates(entries, { subject, date, query }), [entries, subject, date, query]);
  const summary = useMemo(() => updateSummary(entries, profile), [entries, profile]);
  const chips = useMemo(() => subjectFilters(entries), [entries]);

  // A filtered-out selection falls back to the newest visible update, so the
  // detail panel never shows something the parent can no longer see in the list.
  const selected = visible.find((e) => e.id === selectedId) ?? visible[0] ?? null;

  function openUpdate(entry: UpdateEntry) {
    setSelectedId(entry.id);
    // On mobile the detail sits below the timeline; keep it in reach.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      document.getElementById('update-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function clearFilters() {
    setSubject(SUBJECT_ALL);
    setDate('all');
    setQuery('');
  }

  return (
    <div className="space-y-8">
      {/* Header + date range */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.85rem]">Updates</h1>
          <p className="mt-1.5 text-ink-muted">Keep track of your child&apos;s learning updates and recommendations.</p>
        </div>

        <div
          role="group"
          aria-label="Filter by date"
          className="-mx-1 flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-card sm:mx-0"
        >
          {DATE_OPTIONS.map((option) => {
            const active = option.key === date;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setDate(option.key)}
                aria-pressed={active}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-ring ${
                  active ? 'bg-brand-blue text-white shadow-elevated' : 'text-ink-muted hover:bg-slate-50 hover:text-ink'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Search + subject filter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative lg:max-w-md lg:flex-1">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search updates..."
              aria-label="Search updates by subject, keyword or date"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-ink outline-none transition focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/25"
            />
          </div>
          <p className="text-xs font-medium text-ink-muted lg:ml-auto">
            Showing {visible.length} of {entries.length} updates
          </p>
        </div>

        <div className="-mx-1 mt-4 flex gap-1 overflow-x-auto px-1 pb-1" role="group" aria-label="Filter by subject">
          {chips.map((chip) => {
            const active = chip.value === subject;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setSubject(chip.value)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all focus-ring ${
                  active
                    ? 'bg-brand-blue text-white shadow-elevated'
                    : 'border border-slate-200 bg-white text-ink-muted hover:border-brand-blue/40 hover:text-ink'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={card}>
          <p className="text-4xl font-bold tracking-tight text-brand-blue">{summary.total}</p>
          <p className="mt-2 text-sm font-semibold text-ink-muted">Total Updates</p>
        </div>
        <div className={card}>
          <p className="text-4xl font-bold tracking-tight text-brand-blue">{summary.thisMonth}</p>
          <p className="mt-2 text-sm font-semibold text-ink-muted">This Month</p>
        </div>
        <div className={card}>
          <p className="text-4xl font-bold tracking-tight text-brand-greenDark">{summary.areasImproving}</p>
          <p className="mt-2 text-sm font-semibold text-ink-muted">Areas Improving</p>
        </div>
      </div>

      {/* Timeline + detail */}
      {visible.length ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <section aria-label="Update timeline">
            <ol className="relative space-y-4 pl-8">
              <span aria-hidden className="absolute bottom-3 left-[11px] top-3 w-px bg-slate-200" />
              {visible.map((entry) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  selected={selected?.id === entry.id}
                  onView={() => openUpdate(entry)}
                />
              ))}
            </ol>
          </section>

          {selected && <UpdateDetail entry={selected} profile={profile} />}
        </div>
      ) : (
        <EmptyState filtered={filtersActive({ subject, date, query })} onClear={clearFilters} />
      )}
    </div>
  );
}
