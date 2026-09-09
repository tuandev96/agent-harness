/** Executable contract; manual requirements-tracking/1 is imported separately. */
export const CONTRACT = 'harness-runtime/1' as const;
export type Outcome = 'PASS' | 'FAIL' | 'BLOCKED' | 'CANCELLED' | 'TIMED_OUT' | 'UNKNOWN';
export type State = 'READY' | 'RUNNING' | 'WAITING_REVIEW' | 'BLOCKED' | 'CANCEL_REQUESTED' | 'CANCELLED' | 'COMPLETED';
export interface Principal { id: string; sessionId: string }
export interface FileRef { path: string; sha256: string; bytes: number }
export interface Snapshot { digest: string; files: FileRef[]; runtime: string }
export interface Binding {
  id: string; profile: string; kind: 'node-test' | 'command'; argv: string[];
  selectors: string[]; expectedExit: number; expectedStdout: string | null;
  mutation: boolean; artifacts: string[];
}
export interface Criterion { id: string; requirementId: string | null; target: boolean; bindingIds: string[] }
export interface TaskDefinition {
  contract: typeof CONTRACT; id: string; revision: number; projectId: string;
  authorId: string; sessionId: string; requirementIds: string[]; inputPaths: string[];
  criteria: Criterion[]; bindings: Binding[];
  baseline?: { path: string; sha256: string; warningDispositions: { id: string; reason: string }[] };
  policy: { id: string; reviewerIds: string[]; requireReview: boolean; timeoutMs: number; maxOutputBytes: number; maxAttempts: number };
}
export interface TestObservation { selector: string; status: 'PASS' | 'FAIL' | 'SKIPPED' | 'CANCELLED'; file: string | null }
export interface RunEvidence {
  contract: typeof CONTRACT; id: string; taskId: string; taskDigest: string; bindingId: string; profile: string;
  candidate: Snapshot; finishedCandidate: string; startedAt: string; finishedAt: string;
  outcome: Outcome; exitCode: number | null; tests: TestObservation[]; artifacts: FileRef[];
  stdout: string; stderr: string; truncated: boolean; reasonCodes: string[];
  producer: { id: string; sessionId: string; invocationId: string; mode: 'ASSISTED' };
}
export interface Review {
  contract: typeof CONTRACT; id: string; taskId: string; taskDigest: string; candidateDigest: string;
  reviewerId: string; reviewerSessionId: string; createdAt: string;
  criterionIds: string[]; runIds: string[]; verdict: 'PASS' | 'BLOCK'; summary: string; resolvedFailureIds: string[];
}
export interface CriterionAssessment {
  id: string; outcome: 'NOT_RUN' | 'PASS' | 'FAIL' | 'BLOCKED'; freshness: 'NONE' | 'CURRENT' | 'STALE';
  lastKnownOutcome: Outcome | null; gateReady: boolean; reasonCodes: string[];
}
export interface Assessment {
  contract: typeof CONTRACT; taskId: string; taskDigest: string; candidateDigest: string; mode: 'ASSISTED';
  criteria: CriterionAssessment[];
  requirements: { id: string; status: 'VERIFIED' | 'PARTIAL' | 'UNVERIFIED' | 'FAILED' | 'STALE' | 'OUTSIDE_TARGET' }[];
  gateReady: boolean; releaseReady: false; reasonCodes: string[];
}
