import {randomUUID} from 'node:crypto';
import {realpathSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseTask,reviewSchema,runSchema} from './contract.js';
import {validateBaseline} from './catalog.js';
import {distillLesson, recallLessons, type Lesson} from './memory.js';
import {assertSchema} from './schema.js';
import {digest,fileRef,snapshot} from './files.js';
import {evaluate} from './evaluator.js';
import {recordRun,type RunOptions} from './recorder.js';
import {Store,type StoredRecord} from './store.js';
import {CONTRACT,type Assessment,type Principal,type Review,type RunEvidence,type TaskDefinition} from './types.js';

export type Action='create'|'revise'|'read'|'run'|'review'|'complete'|'cancel'|'recover'|'reconcile'|'memory';
export type Authorize=(caller:Principal,action:Action,subject:{taskId:string;taskDigest:string;projectId:string})=>boolean;
export interface ServiceOptions {root:string;projectId:string;database:string;authorize:Authorize;runOptions?:Omit<RunOptions,'signal'>}
/** Host-owned entrypoint. Never expose authorize(), caller identity, or review as worker tool parameters. */
export class Harness {
  #root:string; #projectId:string; #store:Store; #authorize:Authorize; #runOptions:Omit<RunOptions,'signal'>;
  #running=new Map<string,AbortController>();
  constructor(options:ServiceOptions) {
    this.#root=realpathSync(options.root);this.#projectId=options.projectId;
    this.#store=new Store(options.database);this.#authorize=options.authorize;this.#runOptions=options.runOptions??{};
  }
  close():void {if(this.#running.size)throw new Error('WAIT_FOR_ACTIVE_RUNS');this.#store.close();}
  #permit(caller:Principal,action:Action,task:TaskDefinition):void {
    if(!caller.id||!caller.sessionId||task.projectId!==this.#projectId||this.#authorize(caller,action,{taskId:task.id,taskDigest:digest(task),projectId:task.projectId})!==true)throw new Error('NOT_AUTHORIZED');
  }
  #author(caller:Principal,task:TaskDefinition):void {
    if(caller.id!==task.authorId||caller.sessionId!==task.sessionId)throw new Error('EXACT_AUTHOR_REQUIRED');
  }
  #inputs(task:TaskDefinition):void {
    snapshot(this.#root,task.inputPaths,this.#runOptions.env);
    validateBaseline(this.#root,task);
    for(const name of ['package.json','package-lock.json','tsconfig.json'])if(existsSync(resolve(this.#root,name))&&!task.inputPaths.includes(name))throw new Error('CONTRIBUTING_CONFIG_NOT_PINNED: '+name);
    for(const b of task.bindings)if(b.artifacts.some(a=>task.inputPaths.includes(a)))throw new Error('ARTIFACT_INPUT_CYCLE');
  }
  create(caller:Principal,value:unknown) {
    const task=parseTask(value);this.#permit(caller,'create',task);this.#inputs(task);
    return this.#store.create(task,caller);
  }
  get(caller:Principal,id:string) {const row=this.#store.get(id);this.#permit(caller,'read',row.definition);if(caller.id===row.definition.authorId)this.#author(caller,row.definition);if(!this.#store.verifyHistory(id))throw new Error('HISTORY_CONFLICT');return row;}
  list(caller:Principal) {return this.#store.list().filter(row=>{try{this.#permit(caller,'read',row.definition);return true;}catch{return false;}});}
  revise(caller:Principal,id:string,value:unknown) {
    const row=this.#store.get(id);const task=parseTask(value);this.#permit(caller,'revise',row.definition);this.#permit(caller,'create',task);this.#inputs(task);
    return this.#store.revise(id,caller,row,task);
  }
  #record(kind:string,taskId:string,value:{id:string},origin:StoredRecord['origin']):StoredRecord {
    return {id:value.id,kind,taskId,value,hash:digest(value),origin};
  }
  async run(caller:Principal,id:string,bindingId:string):Promise<RunEvidence> {
    let row=this.get(caller,id);const task=row.definition;this.#permit(caller,'run',task);this.#author(caller,task);
    if(task.baseline&&fileRef(this.#root,task.baseline.path).sha256!==task.baseline.sha256)throw new Error('BASELINE_CHANGED');
    if(this.#running.has(id))throw new Error('RUN_ALREADY_ACTIVE');
    const binding=task.bindings.find(b=>b.id===bindingId);if(!binding)throw new Error('BINDING_NOT_FOUND');
    const old=this.#store.records(id,'run').map(r=>r.value as RunEvidence);
    const reconciled=new Set(this.#store.records(id,'reconciliation').map(r=>(r.value as {invocationId:string}).invocationId));
    if(binding.mutation&&(old.some(r=>r.bindingId===bindingId&&r.outcome==='UNKNOWN'&&!reconciled.has(r.id))||this.#store.records(id,'incident').some(r=>!reconciled.has(r.id))))throw new Error('RECONCILE_BEFORE_RETRY');
    const attempts=this.#store.records(id,'attempt').map(r=>r.value as {invocationId:string;bindingId:string;taskDigest:string});
    const attempted=new Set([...old.filter(r=>r.bindingId===bindingId&&r.taskDigest===digest(task)).map(r=>r.id),...attempts.filter(r=>r.bindingId===bindingId&&r.taskDigest===digest(task)).map(r=>r.invocationId)]);
    if(attempted.size>=task.policy.maxAttempts)throw new Error('ATTEMPT_BUDGET_EXHAUSTED');
    const invocationId=randomUUID();
    const attempt={id:'dispatch:'+invocationId,invocationId,bindingId,taskDigest:digest(task),ownerPid:process.pid,at:new Date().toISOString()};
    row=this.#store.transition(id,caller,row,'RUNNING',{record:this.#record('attempt',id,attempt,'RECORDER')});
    const controller=new AbortController();this.#running.set(id,controller);
    const cancellationPoll=setInterval(()=>{try{const live=this.#store.get(id);if(live.state==='CANCEL_REQUESTED'||live.epoch!==row.epoch)controller.abort();}catch{controller.abort();}},100);
    try {
      const run=await recordRun(this.#root,task,binding,caller,{...this.#runOptions,signal:controller.signal,invocationId});
      assertSchema(runSchema,run);
      const latest=this.#store.get(id);
      if(latest.epoch!==row.epoch)throw new Error('STALE_RUN_EPOCH');
      const next=latest.state==='CANCEL_REQUESTED'?'CANCELLED':run.outcome==='PASS'?'WAITING_REVIEW':'BLOCKED';
      this.#store.transition(id,caller,latest,next,{record:this.#record('run',id,run,'RECORDER')});
      return run;
    } catch(error) {
      const latest=this.#store.get(id);
      if(latest.epoch===row.epoch&&['RUNNING','CANCEL_REQUESTED'].includes(latest.state)) {
        const failure={id:randomUUID(),bindingId,cause:'RECORDER_FAILED',outcome:binding.mutation?'UNKNOWN':'BLOCKED',at:new Date().toISOString()};
        this.#store.transition(id,caller,latest,'BLOCKED',{record:this.#record('incident',id,failure,'LOCAL')});
      }
      throw error;
    } finally {clearInterval(cancellationPoll);this.#running.delete(id);}
  }
  cancel(caller:Principal,id:string) {
    const row=this.get(caller,id);this.#permit(caller,'cancel',row.definition);this.#author(caller,row.definition);
    if(row.state==='CANCELLED'||row.state==='COMPLETED')return row;
    if(row.state==='CANCEL_REQUESTED'){this.#running.get(id)?.abort();return row;}
    const updated=this.#store.transition(id,caller,row,row.state==='RUNNING'?'CANCEL_REQUESTED':'CANCELLED');
    this.#running.get(id)?.abort();return updated;
  }
  recover(caller:Principal,id:string) {
    const row=this.get(caller,id);this.#permit(caller,'recover',row.definition);this.#author(caller,row.definition);
    if(this.#running.has(id))throw new Error('LIVE_RUN_NOT_RECOVERABLE');
    if(!['RUNNING','CANCEL_REQUESTED'].includes(row.state))throw new Error('RECOVERY_NOT_NEEDED');
    const last=this.#store.records(id,'attempt').at(-1)?.value as {ownerPid?:number}|undefined;
    if(last?.ownerPid){try{process.kill(last.ownerPid,0);throw new Error('OWNER_PROCESS_STILL_RUNNING');}catch(error){if((error as NodeJS.ErrnoException).code!=='ESRCH')throw error;}}
    const incident={id:randomUUID(),outcome:'UNKNOWN',cause:'INTERRUPTED_PRODUCER',at:new Date().toISOString()};
    return this.#store.transition(id,caller,row,'BLOCKED',{record:this.#record('incident',id,incident,'LOCAL'),recovery:true});
  }
  reconcile(caller:Principal,id:string,invocationId:string,observation:string) {
    const row=this.get(caller,id);this.#permit(caller,'reconcile',row.definition);
    if(caller.id===row.definition.authorId||!observation.trim())throw new Error('INDEPENDENT_RECONCILIATION_REQUIRED');
    if(!this.#store.records(id).some(r=>r.id===invocationId))throw new Error('INVOCATION_NOT_FOUND');
    const record={id:randomUUID(),invocationId,observation,observer:caller,at:new Date().toISOString(),mode:'ASSISTED'};
    this.#store.append(this.#record('reconciliation',id,record,'LOCAL'));return record;
  }
  assess(caller:Principal,id:string):Assessment {
    const row=this.get(caller,id);const task=row.definition;
    const current=snapshot(this.#root,task.inputPaths,this.#runOptions.env);
    const runs=this.#store.records(id,'run');const reviews=this.#store.records(id,'review');
    const evidence=runs.map(r=>{assertSchema(runSchema,r.value);const run=structuredClone(r.value) as RunEvidence;
      for(const artifact of run.artifacts)try{if(digest(fileRef(this.#root,artifact.path))!==digest(artifact))run.reasonCodes.push('ARTIFACT_HASH_MISMATCH');}catch{run.reasonCodes.push('ARTIFACT_UNAVAILABLE');}
      return run;});
    const reviewRows=reviews.map(r=>{assertSchema(reviewSchema,r.value);return r.value as Review;});
    const reconciled=new Set(this.#store.records(id,'reconciliation').map(r=>(r.value as {invocationId:string}).invocationId));
    const incidents=this.#store.records(id,'incident').filter(r=>!reconciled.has(r.id));
    return evaluate(task,current.digest,evidence,reviewRows,{runIds:new Set(runs.filter(r=>r.origin==='RECORDER').map(r=>r.id)),
      reviewIds:new Set(reviews.filter(r=>r.origin==='REVIEWER').map(r=>r.id))},incidents.length?['*']:[]);
  }
  review(caller:Principal,id:string,decision:{verdict:'PASS'|'BLOCK';summary:string;criterionIds:string[];runIds:string[];resolvedFailureIds?:string[]}):Review {
    const row=this.get(caller,id);const task=row.definition;this.#permit(caller,'review',task);
    if(task.baseline&&fileRef(this.#root,task.baseline.path).sha256!==task.baseline.sha256)throw new Error('BASELINE_CHANGED');
    if(caller.id===task.authorId||caller.sessionId===task.sessionId||!task.policy.reviewerIds.includes(caller.id))throw new Error('INDEPENDENT_REVIEWER_REQUIRED');
    const runs=this.#store.records(id,'run');
    if(decision.runIds.some(id=>!runs.some(r=>r.id===id))||decision.criterionIds.some(id=>!task.criteria.some(c=>c.id===id)))throw new Error('REVIEW_SUBJECT_MISMATCH');
    if((decision.resolvedFailureIds??[]).some(id=>!decision.runIds.includes(id)))throw new Error('UNREVIEWED_FAILURE_RESOLUTION');
    const review:Review={contract:CONTRACT,id:randomUUID(),taskId:id,taskDigest:digest(task),candidateDigest:snapshot(this.#root,task.inputPaths,this.#runOptions.env).digest,
      reviewerId:caller.id,reviewerSessionId:caller.sessionId,createdAt:new Date().toISOString(),criterionIds:decision.criterionIds,runIds:decision.runIds,
      verdict:decision.verdict,summary:decision.summary,resolvedFailureIds:decision.resolvedFailureIds??[]};
    assertSchema(reviewSchema,review);this.#store.append(this.#record('review',id,review,'REVIEWER'));return review;
  }
  complete(caller:Principal,id:string) {
    const row=this.get(caller,id);this.#permit(caller,'complete',row.definition);this.#author(caller,row.definition);
    return this.#store.transition(id,caller,row,'COMPLETED',{completionGuard:()=>this.assess(caller,id).gateReady});
  }
  /** Legacy claims are retained, never relabeled as recorder or reviewer observations. */
  importLegacy(caller:Principal,id:string,value:unknown) {
    const row=this.get(caller,id);this.#permit(caller,'revise',row.definition);
    const record={id:randomUUID(),source:value,assessment:'UNVERIFIED',importedAt:new Date().toISOString()};
    this.#store.append(this.#record('legacy',id,record,'LEGACY'));return record;
  }
  export(caller:Principal,id:string) {return {task:this.get(caller,id),records:this.#store.records(id),assessment:this.assess(caller,id)};}
}
