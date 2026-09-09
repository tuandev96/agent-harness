import {digest} from './files.js';
import {CONTRACT,type Assessment,type CriterionAssessment,type Review,type RunEvidence,type TaskDefinition} from './types.js';
/** Provenance IDs come from the recorder authority, not fields in submitted evidence JSON. */
export function evaluate(task:TaskDefinition,candidateDigest:string,runs:RunEvidence[],reviews:Review[],
  provenance:{runIds:ReadonlySet<string>;reviewIds:ReadonlySet<string>},findings:string[]=[]):Assessment {
  const taskDigest=digest(task);
  const reviewRows=reviews.filter(r=>provenance.reviewIds.has(r.id)&&r.taskId===task.id&&r.taskDigest===taskDigest&&r.candidateDigest===candidateDigest&&
    task.policy.reviewerIds.includes(r.reviewerId)&&r.reviewerId!==task.authorId&&r.reviewerSessionId!==task.sessionId&&r.summary.trim());
  const criteria:CriterionAssessment[]=task.criteria.map(c=>{
    const row:CriterionAssessment={id:c.id,outcome:'NOT_RUN',freshness:'NONE',lastKnownOutcome:null,gateReady:false,reasonCodes:[]};
    if(!c.target){row.reasonCodes.push('OUTSIDE_TARGET');return row;}
    const history=runs.filter(r=>r.taskId===task.id&&c.bindingIds.includes(r.bindingId));
    if(!history.length){row.reasonCodes.push('EVIDENCE_MISSING');return row;}
    const current=history.filter(r=>r.taskDigest===taskDigest&&r.candidate.digest===candidateDigest&&r.finishedCandidate===candidateDigest);
    row.lastKnownOutcome=history.at(-1)?.outcome??null;
    if(!current.length){row.freshness='STALE';row.reasonCodes.push('STALE_INPUTS');return row;}
    row.freshness='CURRENT';const untrusted=current.some(r=>!provenance.runIds.has(r.id));
    if(untrusted)row.reasonCodes.push('PROVENANCE_UNVERIFIED');
    const unresolved=current.filter(r=>r.outcome==='FAIL').filter(f=>!reviewRows.some(r=>r.verdict==='PASS'&&r.criterionIds.includes(c.id)&&r.resolvedFailureIds.includes(f.id)&&
      r.runIds.includes(f.id)&&current.some(p=>p.bindingId===f.bindingId&&p.outcome==='PASS'&&r.runIds.includes(p.id))));
    if(unresolved.length){row.outcome='FAIL';row.reasonCodes.push('CURRENT_FAILURE');return row;}
    const chosen:RunEvidence[]=[];
    for(const id of c.bindingIds){const b=task.bindings.find(b=>b.id===id);const last=current.filter(r=>r.bindingId===id).at(-1);
      if(!b||!last){row.reasonCodes.push('REQUIRED_BINDING_MISSING');continue;}
      if(last.outcome!=='PASS'||last.exitCode!==b.expectedExit||last.truncated||last.profile!==b.profile){row.reasonCodes.push('EXECUTION_INCOMPLETE');continue;}
      if(b.kind==='node-test'&&(last.tests.some(t=>t.status!=='PASS')||b.selectors.some(s=>last.tests.filter(t=>t.selector===s&&t.status==='PASS').length!==1))){row.reasonCodes.push('COLLECTION_INCOMPLETE');continue;}
      if(b.artifacts.some(p=>!last.artifacts.some(a=>a.path===p&&a.bytes>0))){row.reasonCodes.push('ARTIFACT_MISSING');continue;}
      if(last.reasonCodes.length){row.reasonCodes.push('RUN_HAS_ERRORS');continue;}chosen.push(last);
    }
    row.outcome=chosen.length===c.bindingIds.length&&!untrusted?'PASS':'BLOCKED';
    if(reviewRows.some(r=>r.verdict==='BLOCK'&&r.criterionIds.includes(c.id)))row.reasonCodes.push('REVIEW_BLOCKED');
    if(row.outcome==='PASS'&&task.policy.requireReview&&!reviewRows.some(r=>r.verdict==='PASS'&&r.criterionIds.includes(c.id)&&chosen.every(run=>r.runIds.includes(run.id))))row.reasonCodes.push('REVIEW_MISSING');
    if(findings.includes(c.id)||findings.includes('*'))row.reasonCodes.push('OPEN_FINDING');
    row.gateReady=row.outcome==='PASS'&&!row.reasonCodes.length;return row;
  });
  const target=criteria.filter(r=>task.criteria.find(c=>c.id===r.id)?.target);
  const requirements:Assessment['requirements']=task.requirementIds.map(id=>{
    const rows=criteria.filter(r=>task.criteria.some(c=>c.id===r.id&&c.requirementId===id&&c.target));
    const status=!rows.length?'OUTSIDE_TARGET':rows.some(r=>r.outcome==='FAIL')?'FAILED':rows.some(r=>r.freshness==='STALE')?'STALE':
      rows.every(r=>r.gateReady)?'VERIFIED':rows.some(r=>r.gateReady)?'PARTIAL':'UNVERIFIED';return {id,status};});
  const reasonCodes=[...new Set(target.flatMap(c=>c.reasonCodes))];if(!target.length)reasonCodes.push('EMPTY_TARGET');
  return {contract:CONTRACT,taskId:task.id,taskDigest,candidateDigest,mode:'ASSISTED',criteria,requirements,
    gateReady:target.length>0&&target.every(r=>r.gateReady),releaseReady:false,reasonCodes};
}
