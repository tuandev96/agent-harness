import {fileURLToPath} from 'node:url'
import {planInstall,install,rollback} from '../dist/core/installer.js'
const argv=process.argv.slice(2),options={}
for(let i=0;i<argv.length;i++){
 const key=argv[i]
 if(!['--target','--rollback','--apply'].includes(key)||Object.hasOwn(options,key))throw new Error('Invalid installer option')
 if(key==='--apply')options[key]=true
 else{if(!argv[i+1]||argv[i+1].startsWith('--'))throw new Error('Missing option value');options[key]=argv[++i]}
}
try{
 if(!options['--target'])throw new Error('--target must name an existing destination directory')
 if(options['--rollback']){
  if(!options['--apply'])console.log(JSON.stringify({dryRun:true,operation:'rollback',receiptId:options['--rollback']}))
  else console.log(JSON.stringify(rollback(options['--target'],options['--rollback'])))
 }else{
  const plan=planInstall(fileURLToPath(new URL('../',import.meta.url)),options['--target'])
  console.log(JSON.stringify({dryRun:!options['--apply'],sourceVersion:plan.sourceVersion,target:plan.target,changes:plan.entries.map(e=>({path:e.path,beforeHash:e.beforeHash,afterHash:e.afterHash,conflict:e.conflict}))},null,2))
  if(options['--apply'])console.log(JSON.stringify(install(plan)))
  else if(plan.entries.some(e=>e.conflict))process.exitCode=2
 }
}catch(error){console.error(error.message);process.exitCode=1}
