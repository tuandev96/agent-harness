import {CONTRACT,type TaskDefinition} from './types.js';
import {array,assertSchema,hash,id,integer,nullable,object,text,type Schema} from './schema.js';
const ids=()=>array(id,0,true);
const texts=(min=0)=>array(text,min,true);
export const fileSchema=object({path:text,sha256:hash,bytes:integer()});
export const taskSchema=object({
  contract:{const:CONTRACT},id,revision:integer(1),projectId:id,authorId:id,sessionId:id,
  requirementIds:ids(),inputPaths:texts(1),
  criteria:array(object({id,requirementId:nullable(id),target:{type:'boolean'},bindingIds:array(id,0,true)}),1),
  bindings:array(object({id,profile:id,kind:{enum:['node-test','command']},argv:array(text,1),selectors:texts(),
    expectedExit:integer(0,255),expectedStdout:nullable({type:'string',maxLength:65536}),mutation:{type:'boolean'},artifacts:texts()}),1),
  policy:object({id,reviewerIds:ids(),requireReview:{type:'boolean'},timeoutMs:integer(10,600000),maxOutputBytes:integer(1024,16777216),maxAttempts:integer(1,3)}),
});
taskSchema.properties!.baseline=object({path:text,sha256:hash,warningDispositions:array(object({id:hash,reason:text}),0)});
export const runSchema=object({
  contract:{const:CONTRACT},id,taskId:id,taskDigest:hash,bindingId:id,profile:id,
  candidate:object({digest:hash,files:array(fileSchema,1),runtime:text}),finishedCandidate:hash,
  startedAt:text,finishedAt:text,outcome:{enum:['PASS','FAIL','BLOCKED','CANCELLED','TIMED_OUT','UNKNOWN']},exitCode:nullable(integer(0,255)),
  tests:array(object({selector:text,status:{enum:['PASS','FAIL','SKIPPED','CANCELLED']},file:nullable(text)})),artifacts:array(fileSchema),
  stdout:{type:'string'},stderr:{type:'string'},truncated:{type:'boolean'},reasonCodes:texts(),
  producer:object({id,sessionId:id,invocationId:id,mode:{const:'ASSISTED'}}),
});
export const reviewSchema=object({
  contract:{const:CONTRACT},id,taskId:id,taskDigest:hash,candidateDigest:hash,reviewerId:id,reviewerSessionId:id,createdAt:text,
  criterionIds:array(id,1,true),runIds:array(id,1,true),verdict:{enum:['PASS','BLOCK']},summary:text,resolvedFailureIds:ids(),
});
export const schemas: Record<string,Schema>={task:taskSchema,run:runSchema,review:reviewSchema};
export function parseTask(value: unknown): TaskDefinition {
  assertSchema(taskSchema,value);
  const task=structuredClone(value) as TaskDefinition;
  for(const rows of [task.criteria,task.bindings]) if(new Set(rows.map(r=>r.id)).size!==rows.length) throw new Error('DUPLICATE_ID');
  for(const c of task.criteria) {
    if(c.target&&!c.bindingIds.length)throw new Error('TARGET_MAPPING_REQUIRED');
    if(c.requirementId!==null&&!task.requirementIds.includes(c.requirementId)) throw new Error('REQUIREMENT_LINK');
    if(c.bindingIds.some(id=>!task.bindings.some(b=>b.id===id))) throw new Error('BINDING_LINK');
  }
  for(const r of task.requirementIds) if(!task.criteria.some(c=>c.requirementId===r)) throw new Error('REQUIREMENT_WITHOUT_CRITERIA');
  for(const b of task.bindings) {
    if(b.kind==='node-test'&&(!b.selectors.length||b.argv.some(a=>a.startsWith('-'))||b.expectedExit!==0)) throw new Error('NODE_TEST_REQUIRES_FILES_AND_SELECTORS');
    if(b.kind==='command'&&b.selectors.length) throw new Error('COMMAND_HAS_NO_TEST_SELECTORS');
    if(b.kind==='command'&&b.expectedStdout===null) throw new Error('COMMAND_ORACLE_REQUIRED');
    if(!task.criteria.some(c=>c.bindingIds.includes(b.id))) throw new Error('ORPHAN_BINDING');
  }
  if(task.policy.requireReview&&!task.policy.reviewerIds.length) throw new Error('REVIEW_ASSIGNMENT_REQUIRED');
  if(task.policy.reviewerIds.includes(task.authorId)) throw new Error('AUTHOR_IS_NOT_REVIEWER');
  return task;
}
