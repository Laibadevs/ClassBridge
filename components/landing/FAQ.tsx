'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@/components/icons';
import Reveal from './Reveal';

const faqs = [
  {
    question: 'What is ClassBridge AI?',
    answer:
      'ClassBridge AI is a bilingual communication platform that helps teachers turn attendance, grades, and quick notes into simple, empathetic updates parents can understand and act on.',
  },
  {
    question: 'How does the AI generate parent updates?',
    answer:
      'A teacher enters attendance, subject grades, and a short note. ClassBridge AI turns that into a warm Simple English summary, a Friendly Roman Urdu summary, and one practical action for the parent.',
  },
  {
    question: 'Does it support Roman Urdu?',
    answer:
      'Yes. Every update includes a natural, conversational Roman Urdu version alongside the Simple English version, so parents can read whichever feels most comfortable.',
  },
  {
    question: 'Can teachers edit AI-generated updates?',
    answer:
      'Teachers can regenerate an update anytime after changing attendance, grades, or their note — giving them full control before it reaches a parent.',
  },
  {
    question: 'How does ClassBridge identify subjects needing support?',
    answer:
      'ClassBridge looks at each subject score and flags the ones that could use extra practice — always using supportive language like "needs a little extra practice," never words like failing or at risk.',
  },
  {
    question: 'Is student data secure?',
    answer:
      'This hackathon demo uses local mock data and AI calls happen only on the server, so no keys or student data are ever exposed in the browser. A production deployment would add authentication and encrypted storage.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center">
          <h2 className="text-3xl font-bold text-ink sm:text-4xl">Frequently asked questions</h2>
          <p className="mt-4 text-lg text-ink-muted">Everything you need to know about ClassBridge AI.</p>
        </Reveal>

        <div className="mt-10 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-card">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={faq.question}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left focus-ring sm:px-6"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-ink">{faq.question}</span>
                  <ChevronDownIcon
                    className={`h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-5 pb-4 leading-relaxed text-ink-muted sm:px-6">{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
