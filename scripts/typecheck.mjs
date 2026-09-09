import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const compiler=root+'node_modules/typescript/bin/tsc';
if(!existsSync(compiler)||!existsSync(root+'node_modules/@types/node/package.json')){console.error('TYPECHECK_TOOLCHAIN_MISSING: install pinned development dependencies');process.exit(2);}
const result=spawnSync(process.execPath,[compiler,'--noEmit'],{cwd:root,stdio:'inherit',timeout:45000});
if(result.error)console.error(result.error.message);process.exit(result.status??2);
