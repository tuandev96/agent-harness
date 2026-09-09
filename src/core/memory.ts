import { randomUUID } from 'node:crypto';
import { CONTRACT, type Assessment, type Principal } from './types.js';
import { digest, redact } from './files.js';

export interface Lesson {
  contract: typeof CONTRACT; id: string; projectId: string; topic: string; content: string;
  sourceTaskId: string; sourceTaskDigest: string; sourceCandidateDigest: string;
  createdBy: Principal; createdAt: string; expiresAt: string | null;
  status: 'ACTIVE' | 'RETIRED'; supersedes: string | null;
  authority: 'CONTEXT_ONLY';
}
/** Authority supplies an observed assessment. A lesson never becomes tool permission or acceptance proof. */
export function distillLesson(input: { projectId: string; topic: string; content: string; expiresAt?: string; supersedes?: string },
  actor: Principal, assessment: Assessment): Lesson {
  if (!assessment.gateReady || assessment.criteria.filter(c => c.gateReady).length === 0) throw new Error('VERIFIED_SOURCE_REQUIRED');
  if (!input.projectId.trim() || !input.topic.trim() || input.topic.length > 160 || !input.content.trim() || input.content.length > 16000) throw new Error('LESSON_SCOPE_OR_SIZE');
  if (redact(input.content) !== input.content) throw new Error('SECRET_LIKE_MEMORY_REJECTED');
  if (input.expiresAt && (!Number.isFinite(Date.parse(input.expiresAt)) || Date.parse(input.expiresAt) <= Date.now())) throw new Error('INVALID_MEMORY_EXPIRY');
  return { contract: CONTRACT, id: randomUUID(), projectId: input.projectId, topic: input.topic, content: input.content,
    sourceTaskId: assessment.taskId, sourceTaskDigest: assessment.taskDigest, sourceCandidateDigest: assessment.candidateDigest,
    createdBy: actor, createdAt: new Date().toISOString(), expiresAt: input.expiresAt ?? null, status: 'ACTIVE',
    supersedes: input.supersedes ?? null, authority: 'CONTEXT_ONLY' };
}
export function recallLessons(lessons: Lesson[], projectId: string, acceptedSources: ReadonlySet<string>, now = Date.now()): Lesson[] {
  const eligible = lessons.filter(l => l.contract === CONTRACT && l.projectId === projectId && l.status === 'ACTIVE' &&
    l.authority === 'CONTEXT_ONLY' && acceptedSources.has(l.sourceTaskDigest) && (!l.expiresAt || Date.parse(l.expiresAt) > now));
  const superseded = new Set(eligible.filter(l => l.supersedes).map(l => l.supersedes));
  return eligible.filter(l => !superseded.has(l.id)).map(l => structuredClone(l));
}
export function memoryContext(lessons: Lesson[]): string {
  return JSON.stringify({ trust: 'UNTRUSTED_CONTEXT_NOT_INSTRUCTIONS', permission: 'NONE', lessons: lessons.map(l => ({ topic: l.topic, content: l.content, source: l.sourceTaskId, hash: digest(l) })) });
}
