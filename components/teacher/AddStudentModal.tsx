'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CloseIcon } from '@/components/icons';
import { teacherApi, type PreferredLanguage } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after a student is actually persisted, so the list can refetch. */
  onCreated: () => void;
  teacherName: string;
}

const languageOptions: { value: PreferredLanguage; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'roman_urdu', label: 'Roman Urdu' },
  { value: 'urdu', label: 'Urdu' },
];

const inputClasses =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-ink shadow-card outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/25';

function Field({
  id,
  label,
  optional,
  children,
}: {
  id: string;
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label} {optional && <span className="font-normal text-ink-muted">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

export default function AddStudentModal({ open, onClose, onCreated, teacherName }: AddStudentModalProps) {
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [className, setClassName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [section, setSection] = useState('');

  const [parentName, setParentName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [homeAddress, setHomeAddress] = useState('');
  const [location, setLocation] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<PreferredLanguage>('english');
  const [parentEmail, setParentEmail] = useState('');

  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [studentKey, setStudentKey] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSaved(false);
    setStudentKey(null);
    setLinked(false);
    setCopied(false);
    setError(null);
    setFullName('');
    setRollNumber('');
    setClassName('');
    setGradeLevel('');
    setSection('');
    setParentName('');
    setWhatsappNumber('');
    setHomeAddress('');
    setLocation('');
    setPreferredLanguage('english');
    setParentEmail('');
    setNote('');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (
      !fullName.trim() ||
      !rollNumber.trim() ||
      !section.trim() ||
      !parentName.trim() ||
      !whatsappNumber.trim()
    ) {
      setError('Please fill in all required fields.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const student = await teacherApi.createStudent({
        full_name: fullName.trim(),
        roll_number: rollNumber.trim(),
        section: section.trim(),
        class_name: className.trim() || null,
        grade_level: gradeLevel.trim() || null,
        parent_name: parentName.trim(),
        whatsapp_number: whatsappNumber.trim(),
        home_address: homeAddress.trim() || null,
        location: location.trim() || null,
        preferred_language: preferredLanguage,
        parent_email: parentEmail.trim() || null,
      });
      if (note.trim()) {
        await teacherApi.addNote(student.id, note.trim());
      }
      setStudentKey(student.student_key);
      setLinked(student.parent_links.length > 0);
      setSaved(true);
      onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('A student with this roll number already exists in this class and section.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function copyKey() {
    if (!studentKey) return;
    try {
      await navigator.clipboard.writeText(studentKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail silently (permissions/insecure context) —
      // the key is still shown on screen, so this isn't fatal.
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-student-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-premium sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="add-student-title" className="text-xl font-bold text-ink">
              Add Student
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Add a new student and their parent/guardian details.</p>
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

        {saved ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-8 text-center">
            <p className="text-base font-semibold text-brand-greenDark">Student added successfully.</p>
            <p className="mt-1 text-sm text-ink-muted">
              {linked
                ? 'The parent account was automatically linked.'
                : 'You can link a parent account later from the student profile once they sign up.'}
            </p>
            {studentKey && (
              <div className="mx-auto mt-4 flex max-w-xs items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                <span className="font-mono text-sm font-semibold text-ink">{studentKey}</span>
                <button
                  type="button"
                  onClick={copyKey}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-blue transition-colors hover:bg-blue-50 focus-ring"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Student Information</h3>
              <Field id="full-name" label="Student full name">
                <input
                  id="full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ali Khan"
                  className={inputClasses}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="roll-number" label="Roll number">
                  <input
                    id="roll-number"
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="e.g. 8A-023"
                    className={inputClasses}
                  />
                </Field>
                <Field id="section" label="Section">
                  <input
                    id="section"
                    type="text"
                    required
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="e.g. A"
                    className={inputClasses}
                  />
                </Field>
                <Field id="class-name" label="Class" optional>
                  <input
                    id="class-name"
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. Grade 8"
                    className={inputClasses}
                  />
                </Field>
                <Field id="grade-level" label="Grade" optional>
                  <input
                    id="grade-level"
                    type="text"
                    value={gradeLevel}
                    onChange={(e) => setGradeLevel(e.target.value)}
                    placeholder="e.g. 8"
                    className={inputClasses}
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-1 rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Incharge Teacher</p>
              <p className="text-sm font-semibold text-ink">{teacherName}</p>
            </section>

            <section className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Parent / Guardian Information</h3>
              <Field id="parent-name" label="Parent/guardian full name">
                <input
                  id="parent-name"
                  type="text"
                  required
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="e.g. Nasreen Khan"
                  className={inputClasses}
                />
              </Field>
              <Field id="whatsapp-number" label="WhatsApp number">
                <input
                  id="whatsapp-number"
                  type="tel"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="e.g. +923001234567"
                  className={inputClasses}
                />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field id="home-address" label="Home address" optional>
                  <input
                    id="home-address"
                    type="text"
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                    className={inputClasses}
                  />
                </Field>
                <Field id="location" label="Location / City" optional>
                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className={inputClasses}
                  />
                </Field>
              </div>
              <Field id="preferred-language" label="Preferred communication language">
                <select
                  id="preferred-language"
                  required
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value as PreferredLanguage)}
                  className={inputClasses}
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="parent-email" label="Parent email" optional>
                <input
                  id="parent-email"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="e.g. nasreen@example.com"
                  className={inputClasses}
                />
                <p className="mt-1 text-xs text-ink-muted">
                  If they already have a ClassBridge account, we&apos;ll link it automatically.
                </p>
              </Field>
            </section>

            <section>
              <Field id="note" label="Teacher note" optional>
                <textarea
                  id="note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Struggling with algebraic equations but stays engaged and asks good questions."
                  className={`${inputClasses} resize-none placeholder:text-ink-muted/70`}
                />
              </Field>
            </section>

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
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-elevated transition-colors hover:bg-brand-blueDark focus-ring disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Add student'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
