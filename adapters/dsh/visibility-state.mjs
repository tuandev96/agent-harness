import {openSync,writeFileSync,closeSync,fsyncSync,renameSync,mkdirSync,existsSync,lstatSync,unlinkSync} from 'node:fs'
import {dirname} from 'node:path'
import {randomUUID} from 'node:crypto'
/** Advisory visibility cache only. Task authority and completion live in the transactional harness core. */
export function writeVisibilityState(path, value) {
  mkdirSync(dirname(path), {recursive:true,mode:0o700})
  if(existsSync(path)&&lstatSync(path).isSymbolicLink())throw new Error('ROUTER_STATE_SYMLINK')
  const tmp=`${path}.${randomUUID()}.tmp`;let fd
  try {
    fd=openSync(tmp,'wx',0o600);writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fsyncSync(fd);closeSync(fd);fd=undefined
    renameSync(tmp,path)
    if(process.platform!=='win32'){const d=openSync(dirname(path),'r');try{fsyncSync(d)}finally{closeSync(d)}}
  } finally {if(fd!==undefined)closeSync(fd);if(existsSync(tmp))unlinkSync(tmp)}
}
