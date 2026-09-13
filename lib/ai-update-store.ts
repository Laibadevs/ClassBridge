import 'server-only';
import type { AIUpdate } from './types';

/**
 * In-memory store so a teacher's generated update is immediately visible on the
 * parent dashboard in the same demo session. Fine for a single-process hackathon
 * demo; a real deployment would persist this in a database.
 *
 * Next.js compiles route handlers and server components into separate module
 * graphs, so a plain module-level singleton ends up duplicated (one instance per
 * graph) instead of shared. Pinning it to `globalThis` keeps a single instance
 * for the life of the server process, the same pattern used for Prisma clients.
 */
declare global {
  var __classbridgeAIUpdates: Map<string, AIUpdate> | undefined;
}

function seedUpdates(): Map<string, AIUpdate> {
  const map = new Map<string, AIUpdate>();
  // Seeded as "this morning" so the demo reads as a fresh update from the teacher.
  const thisMorning = new Date();
  thisMorning.setHours(9, 0, 0, 0);
  map.set('ali-khan', {
    studentId: 'ali-khan',
    englishSummary:
      "Ali is doing well overall, but Algebra needs a little extra practice. Regular practice at home can help improve his confidence.",
    romanUrduSummary:
      "Ali ki overall performance theek hai, lekin Algebra mein thori extra practice ki zaroorat hai. Ghar par regular practice se confidence behtar ho sakta hai.",
    urduSummary: null,
    parentAction: 'Practice Algebra for 15-20 minutes, 3 times this week.',
    whyThisMatters:
      'Algebra is currently Ali\u2019s lowest-performing area. Short, regular practice can help strengthen his understanding without overwhelming him.',
    createdAt: thisMorning.toISOString(),
  });
  return map;
}

const updates = globalThis.__classbridgeAIUpdates ?? seedUpdates();
globalThis.__classbridgeAIUpdates = updates;

export function getAIUpdate(studentId: string): AIUpdate | undefined {
  return updates.get(studentId);
}

export function setAIUpdate(update: AIUpdate): void {
  updates.set(update.studentId, update);
}
