import test from 'node:test';
import assert from 'node:assert/strict';
import {summarize,wilson} from '../../evals/metrics.mjs';
function input(){return {format:'harness-eval-observations/1',tasks:['task'],repetitions:2,
 candidates:[{id:'base',model:'model',provider:'provider',environmentDigest:'env',tasksetDigest:'tasks',budgetDigest:'budget',graderDigest:'grader',harnessDigest:'harness'}],
 trials:[{candidate:'base',task:'task',repetition:0,oracle:'PASS',reportedDone:true,unauthorizedEffects:0,
 durationMs:10,costUsd:1,tokens:100,observationRef:'observation-1'}]};}
test('missing trial remains in denominator, never best-of-run',()=>{const out=summarize(input());assert.equal(out.rows[0].acceptanceRate,0.5);assert.equal(out.rows[0].missingTrials,1);assert.equal(out.rows[0].costPerAcceptedTask,null);assert.equal(out.releaseReady,false);});
test('duplicate trial cannot inflate metrics',()=>{const x=input();x.trials.push(x.trials[0]);assert.throws(()=>summarize(x),/DUPLICATE_TRIAL/);});
test('false completion and unauthorized effect are counted',()=>{const x=input();x.trials[0].unauthorizedEffects=1;const out=summarize(x);assert.equal(out.rows[0].falseCompletions,1);assert.equal(out.rows[0].acceptedOutcomes,0);});
test('different models are not a controlled harness comparison',()=>{const x=input();x.candidates.push({...x.candidates[0],id:'candidate',model:'different'});assert.equal(summarize(x).comparable,false);});
test('unknown oracle and nonfinite measurements are rejected',()=>{const x=input();x.trials[0].oracle='VERIFIED';assert.throws(()=>summarize(x),/ORACLE/);x.trials[0].oracle='PASS';x.trials[0].costUsd=NaN;assert.throws(()=>summarize(x),/INVALID_costUsd/);});
test('complete cost includes failed trials',()=>{const x=input();x.trials.push({...x.trials[0],repetition:1,oracle:'FAIL',reportedDone:false,costUsd:3,observationRef:'observation-2'});assert.equal(summarize(x).rows[0].costPerAcceptedTask,4);});
test('empty evaluations and invented target slots are rejected',()=>{const x=input();x.tasks=[];assert.throws(()=>summarize(x),/TASKS/);const y=input();y.trials[0].repetition=2;assert.throws(()=>summarize(y),/REPETITION/);});
test('uncertainty is retained at endpoints',()=>{assert.equal(wilson(0,0),null);assert.ok(wilson(0,10).upper>0);assert.ok(wilson(10,10).lower<1);});
