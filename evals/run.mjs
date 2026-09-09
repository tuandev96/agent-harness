import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {summarize} from './metrics.mjs';
const args=process.argv.slice(2);
if(args.length!==2&&args.length!==4 || args[0]!=='--input' || args.length===4&&args[2]!=='--output') {
 console.error('Usage: node evals/run.mjs --input observations.json [--output summary.json]');
 console.error('No provider calls are made. Imported observations do not acquire independent provenance.');
 process.exit(2);
}
try {
 const bytes=readFileSync(args[1]);if(bytes.length>16*1024*1024)throw new Error('DATASET_TOO_LARGE');
 const result=summarize(JSON.parse(bytes.toString('utf8')));
 result.sourceSha256=createHash('sha256').update(bytes).digest('hex');
 const json=JSON.stringify(result,null,2)+'\n';
 if(args[3])writeFileSync(args[3],json,{flag:'wx',mode:0o600});else process.stdout.write(json);
}catch(error){console.error(error instanceof Error?error.message:'EVALUATION_FAILED');process.exitCode=1;}
