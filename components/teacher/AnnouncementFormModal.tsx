'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CloseIcon } from '@/components/icons';
import {
  teacherApi,
  type AnnouncementType,
  type AnnouncementTargetType,
  type TeacherStudentListItem,
} from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

interface AnnouncementFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  students: TeacherStudentListItem[];
}

const typeOptions: { value: AnnouncementType; label: string }[] = [
  { value: 'attendance_alert', label: 'Attendance Alert' },
  { value: 'school_event', label: 'School Event' },
  { value: 'parent_meeting', label: 'Parent Meeting' },
  { value: 'holiday_notice', label: 'Holiday Notice' },
  { value: 'exam_reminder', label: 'Exam Reminder' },
  { value: 'emergency', label: 'Emergency / Important Notice' },
  { value: 'general', label: 'General Announcement' },
];

const targetOptions: { value: AnnouncementTargetType; label: string }[] = [
  { value: 'all', label: 'All Parents' },
  { value: 'class', label: 'Specific Class' },
  { value: 'section', label: 'Specific Section' },
  { value: 'students', label: 'Specific Student(s)' },
];

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25';

export default function AnnouncementFormModal({ open, onClose, onSaved, students }: AnnouncementFormModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>('general');
  const [targetType, setTargetType] = useState<AnnouncementTargetType>('all');
  const [targetClass, setTargetClass] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setMessage('');
    setAnnouncementType('general');
    setTargetType('all');
    setTargetClass('');
    setTargetSection('');
    setStudentIds([]);
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const classOptions = Array.from(new Set(students.map((s) => s.class_name).filter((c): c is string => !!c)));
  const sectionOptions = Array.from(
    new Set(students.filter((s) => s.class_name === targetClass).map((s) => s.section).filter((s): s is string => !!s))
  );

  function toggleStudent(id: string) {
    setStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e: FormEvent, action: 'draft' | 'publish') {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Please fill in the title and message.');
      return;
    }
    if (targetType === 'class' && !targetClass) {
      setError('Select a class to target.');
      return;
    }
    if (targetType === 'section' && (!targetClass || !targetSection)) {
      setError('Select a class and section to target.');
      return;
    }
    if (targetType === 'students' && studentIds.length === 0) {
      setError('Select at least one student to target.');
      return;
    }

    setError(null);
    setSubmitting(action);
    try {
      const announcement = await teacherApi.createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        announcement_type: announcementType,
        target_type: targetType,
        target_class: targetType === 'class' || targetType === 'section' ? targetClass : null,
        target_section: targetType === 'section' ? targetSection : null,
        target_student_ids: targetType === 'students' ? studentIds : null,
      });
      if (action === 'publish') {
        await teacherApi.publishAnnouncement(announcement.id);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-announcement-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-premium sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="add-announcement-title" className="text-xl font-bold text-ink">
              New Announcement
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Share an update with parents.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-ring"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form className="mt-6 space-y-4">
          <div>
            <label htmlFor="announcement-title" className="mb-1.5 block text-sm font-medium text-ink">
              Announcement title
            </label>
            <input
              id="announcement-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Parent-Teacher Meeting"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="announcement-type" className="mb-1.5 block text-sm font-medium text-ink">
              Announcement type
            </label>
            <select
              id="announcement-type"
              value={announcementType}
              onChange={(e) => setAnnouncementType(e.target.value as AnnouncementType)}
              className={inputClasses}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="announcement-message" className="mb-1.5 block text-sm font-medium text-ink">
              Message
            </label>
            <textarea
              id="announcement-message"
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your announcement..."
              className={`${inputClasses} resize-none`}
            />
          </div>

          <div>
            <label htmlFor="target-type" className="mb-1.5 block text-sm font-medium text-ink">
              Target audience
            </label>
            <select
              id="target-type"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as AnnouncementTargetType)}
              className={inputClasses}
            >
              {targetOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {(targetType === 'class' || targetType === 'section') && (
            <div>
              <label htmlFor="target-class" className="mb-1.5 block text-sm font-medium text-ink">
                Class
              </label>
              <select
                id="target-class"
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className={inputClasses}
              >
                <option value="">Select a class…</option>
                {classOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'section' && (
            <div>
              <label htmlFor="target-section" className="mb-1.5 block text-sm font-medium text-ink">
                Section
              </label>
              <select
                id="target-section"
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value)}
                className={inputClasses}
                disabled={!targetClass}
              >
                <option value="">Select a section…</option>
                {sectionOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'students' && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-ink">Students</p>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {students.length === 0 && <p className="px-2 py-1 text-sm text-ink-muted">No students yet.</p>}
                {students.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={studentIds.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue/40"
                    />
                    {s.full_name} {s.class_name ? `· ${s.class_name}` : ''}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:bg-slate-50 hover:text-ink focus-ring"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting !== null}
              aria-busy={submitting === 'draft'}
              onClick={(e) => submit(e, 'draft')}
              className="rounded-full border border-brand-blue px-5 py-2.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-blue-50 focus-ring disabled:opacity-60"
            >
              {submitting === 'draft' ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              type="button"
              disabled={submitting !== null}
              aria-busy={submitting === 'publish'}
              onClick={(e) => submit(e, 'publish')}
              className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring disabled:opacity-60"
            >
              {submitting === 'publish' ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
