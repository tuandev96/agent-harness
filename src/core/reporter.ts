import {relative,resolve} from 'node:path';
interface Event {type:string;data:{name?:string;file?:string;message?:string;skip?:boolean|string;todo?:boolean|string;details?:{type?:string;error?:{failureType?:string}}}}
/** JSON comes from the parent test reporter, not unwrapped test stdout. */
export default async function* reporter(events:AsyncIterable<Event>):AsyncGenerator<string> {
  for await(const e of events) {
    const d=e.data;
    if(e.type==='test:stdout'||e.type==='test:stderr') {yield JSON.stringify({kind:'log',text:d.message??''})+'\n';continue;}
    if(e.type!=='test:pass'&&e.type!=='test:fail')continue;
    if(d.details?.type==='suite')continue;
    // Node reports an empty file as a passing test-file wrapper: it is NOT an assertion.
    if(!d.file||!d.name||resolve(d.name)===resolve(d.file))continue;
    const file=relative(process.cwd(),d.file).split('\\').join('/');
    const status=d.skip||d.todo?'SKIPPED':d.details?.error?.failureType==='cancelledByParent'?'CANCELLED':e.type==='test:pass'?'PASS':'FAIL';
    yield JSON.stringify({kind:'result',selector:`${file}::${d.name}`,file,status})+'\n';
  }
}
