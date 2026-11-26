'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { CloseIcon } from '@/components/icons';
import { teacherApi } from '@/lib/teacher-api';
import { ApiError } from '@/lib/api';

export interface EditableStudent {
  id: string;
  fullName: string;
  rollNumber: string;
  section: string;
  className: string;
  gradeLevel: string;
  parentName: string;
  whatsappNumber: string;
  whatsappOptIn: boolean;
  homeAddress: string;
  location: string;
}

interface EditStudentModalProps {
  open: boolean;
  onClose: () => void;
  /** Called after the student is actually persisted, so the caller can refetch. */
  onUpdated: () => void;
  student: EditableStudent;
}

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

export default function EditStudentModal({ open, onClose, onUpdated, student }: EditStudentModalProps) {
  const [fullName, setFullName] = useState(student.fullName);
  const [rollNumber, setRollNumber] = useState(student.rollNumber);
  const [section, setSection] = useState(student.section);
  const [className, setClassName] = useState(student.className);
  const [gradeLevel, setGradeLevel] = useState(student.gradeLevel);
  const [parentName, setParentName] = useState(student.parentName);
  const [whatsappNumber, setWhatsappNumber] = useState(student.whatsappNumber);
  const [whatsappOptIn, setWhatsappOptIn] = useState(student.whatsappOptIn);
  const [homeAddress, setHomeAddress] = useState(student.homeAddress);
  const [location, setLocation] = useState(student.location);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFullName(student.fullName);
    setRollNumber(student.rollNumber);
    setSection(student.section);
    setClassName(student.className);
    setGradeLevel(student.gradeLevel);
    setParentName(student.parentName);
    setWhatsappNumber(student.whatsappNumber);
    setWhatsappOptIn(student.whatsappOptIn);
    setHomeAddress(student.homeAddress);
    setLocation(student.location);
    setError(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, student]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !rollNumber.trim() || !section.trim() || !parentName.trim() || !whatsappNumber.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    // Matches the backend's E.164 check (see app.services.whatsapp.phone) so
    // an obviously-local number is caught here instead of a round trip.
    if (!/^\+[1-9]\d{7,14}$/.test(whatsappNumber.trim().replace(/[\s\-()]/g, ''))) {
      setError('Enter a valid WhatsApp number in international format, e.g. +923001234567.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await teacherApi.updateStudent(student.id, {
        full_name: fullName.trim(),
        roll_number: rollNumber.trim(),
        section: section.trim(),
        class_name: className.trim() || null,
        grade_level: gradeLevel.trim() || null,
        parent_name: parentName.trim(),
        whatsapp_number: whatsappNumber.trim(),
        whatsapp_opt_in: whatsappOptIn,
        home_address: homeAddress.trim() || null,
        location: location.trim() || null,
      });
      onUpdated();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('A student with this roll number already exists in this class and section.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not update the student. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-student-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-premium sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 id="edit-student-title" className="text-xl font-bold text-ink">
              Edit Student
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Update student and parent/guardian details.</p>
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Student Information</h3>
            <Field id="edit-full-name" label="Student full name">
              <input
                id="edit-full-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="edit-roll-number" label="Roll number / Student ID">
                <input
                  id="edit-roll-number"
                  type="text"
                  required
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field id="edit-section" label="Section">
                <input
                  id="edit-section"
                  type="text"
                  required
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field id="edit-class-name" label="Class" optional>
                <input
                  id="edit-class-name"
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field id="edit-grade-level" label="Grade" optional>
                <input
                  id="edit-grade-level"
                  type="text"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className={inputClasses}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Parent / Guardian Information</h3>
            <Field id="edit-parent-name" label="Parent/guardian full name">
              <input
                id="edit-parent-name"
                type="text"
                required
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                className={inputClasses}
              />
            </Field>
            <Field id="edit-whatsapp-number" label="WhatsApp number">
              <input
                id="edit-whatsapp-number"
                type="tel"
                required
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. +923001234567"
                className={inputClasses}
              />
            </Field>
            <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-sm text-ink">
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-blue focus-ring"
              />
              <span>
                <span className="font-medium">Parent has consented to WhatsApp updates</span>
                <span className="block text-ink-muted">
                  Required before any parent update can be sent via WhatsApp. Having a number on file alone is not
                  treated as consent.
                </span>
              </span>
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field id="edit-home-address" label="Home address" optional>
                <input
                  id="edit-home-address"
                  type="text"
                  value={homeAddress}
                  onChange={(e) => setHomeAddress(e.target.value)}
                  className={inputClasses}
                />
              </Field>
              <Field id="edit-location" label="Location / City" optional>
                <input
                  id="edit-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputClasses}
                />
              </Field>
            </div>
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
              {submitting ? 'Saving changes…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
