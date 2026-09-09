import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {schemas} from '../dist/core/contract.js';
const root=fileURLToPath(new URL('../contracts/harness-runtime/1/',import.meta.url));mkdirSync(root,{recursive:true});
for(const [name,schema] of Object.entries(schemas))writeFileSync(root+name+'.schema.json',JSON.stringify({$schema:'http://json-schema.org/draft-07/schema#',$id:`urn:agent-harness:runtime:1:${name}`,...schema},null,2)+'\n');
