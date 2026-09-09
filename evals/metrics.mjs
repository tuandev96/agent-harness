/** Descriptive metrics for externally observed trials; never creates acceptance evidence. */
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
const integer=value=>Number.isSafeInteger(value)&&value>=0;
const finite=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
function requireCondition(condition,reason){if(!condition)throw new Error(reason);}
export function wilson(successes,total) {
  if(!total)return null;
  const z=1.959963984540054,p=successes/total,denominator=1+z*z/total;
  const center=(p+z*z/(2*total))/denominator;
  const margin=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/denominator;
  return {lower:Math.max(0,center-margin),upper:Math.min(1,center+margin),method:'Wilson descriptive; trials may be correlated'};
}
function quantile(values,fraction) {
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b),position=(sorted.length-1)*fraction;
  const low=Math.floor(position),high=Math.ceil(position);
  return sorted[low]+(sorted[high]-sorted[low])*(position-low);
}
export function summarize(dataset) {
  requireCondition(dataset&&dataset.format==='harness-eval-observations/1','FORMAT_REQUIRED');
  requireCondition(Array.isArray(dataset.tasks)&&dataset.tasks.length>0&&dataset.tasks.every(nonempty),'TASKS_REQUIRED');
  requireCondition(new Set(dataset.tasks).size===dataset.tasks.length,'DUPLICATE_TASK');
  requireCondition(integer(dataset.repetitions)&&dataset.repetitions>0&&dataset.repetitions<=1000,'REPETITIONS_REQUIRED');
  requireCondition(Array.isArray(dataset.candidates)&&dataset.candidates.length>0,'CANDIDATES_REQUIRED');
  requireCondition(Array.isArray(dataset.trials),'TRIALS_REQUIRED');
  const dimensions=['model','provider','environmentDigest','tasksetDigest','budgetDigest','graderDigest'];
  const names=new Set();
  for(const candidate of dataset.candidates){
    requireCondition(nonempty(candidate.id)&&!names.has(candidate.id),'CANDIDATE_ID');names.add(candidate.id);
    for(const field of dimensions.concat(['harnessDigest']))requireCondition(nonempty(candidate[field]),'MISSING_'+field);
  }
  const seen=new Set();
  for(const trial of dataset.trials){
    requireCondition(names.has(trial.candidate)&&dataset.tasks.includes(trial.task),'UNKNOWN_TRIAL_TARGET');
    requireCondition(integer(trial.repetition)&&trial.repetition<dataset.repetitions,'INVALID_REPETITION');
    const key=JSON.stringify([trial.candidate,trial.task,trial.repetition]);
    requireCondition(!seen.has(key),'DUPLICATE_TRIAL');seen.add(key);
    requireCondition(['PASS','FAIL','BLOCKED','NOT_RUN'].includes(trial.oracle),'ORACLE_REQUIRED');
    requireCondition(typeof trial.reportedDone==='boolean','DONE_SIGNAL_REQUIRED');
    requireCondition(integer(trial.unauthorizedEffects),'EFFECT_COUNT_REQUIRED');
    requireCondition(nonempty(trial.observationRef),'OBSERVATION_REFERENCE_REQUIRED');
    for(const field of ['durationMs','costUsd','tokens'])requireCondition(trial[field]===null||finite(trial[field]),'INVALID_'+field);
  }
  const base=dataset.candidates[0];
  const comparable=dataset.candidates.every(candidate=>dimensions.every(field=>candidate[field]===base[field]));
  const planned=dataset.tasks.length*dataset.repetitions;
  const rows=dataset.candidates.map(candidate=>{
    const trials=dataset.trials.filter(trial=>trial.candidate===candidate.id);
    const successes=trials.filter(trial=>trial.oracle==='PASS'&&trial.unauthorizedEffects===0).length;
    const done=trials.filter(trial=>trial.reportedDone);
    const falseDone=done.filter(trial=>trial.oracle!=='PASS'||trial.unauthorizedEffects>0).length;
    const completeCost=trials.length===planned&&trials.every(trial=>trial.costUsd!==null);
    const cost=trials.reduce((sum,trial)=>sum+(trial.costUsd??0),0);
    return {id:candidate.id,plannedTrials:planned,observedTrials:trials.length,missingTrials:planned-trials.length,
      acceptedOutcomes:successes,acceptanceRate:successes/planned,interval:wilson(successes,planned),
      falseCompletions:falseDone,reportedCompletions:done.length,falseCompletionRate:done.length?falseDone/done.length:null,
      unauthorizedEffects:trials.reduce((sum,trial)=>sum+trial.unauthorizedEffects,0),
      p50DurationMs:quantile(trials.flatMap(trial=>trial.durationMs===null?[]:[trial.durationMs]),0.5),
      p95DurationMs:quantile(trials.flatMap(trial=>trial.durationMs===null?[]:[trial.durationMs]),0.95),
      measuredCostUsd:cost,completeCost,costPerAcceptedTask:completeCost&&successes?cost/successes:null};
  });
  return {format:'harness-eval-summary/1',provenance:'IMPORTED_NOT_INDEPENDENTLY_VERIFIED',
    comparable,comparisonReason:comparable?'MATCHING_DECLARED_DIMENSIONS':'DIFFERENT_MODEL_ENVIRONMENT_TASKSET_BUDGET_OR_GRADER',
    releaseReady:false,modelCallsMade:0,rows};
}
