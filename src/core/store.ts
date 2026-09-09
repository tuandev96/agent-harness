import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,realpathSync,existsSync,lstatSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {canonical,digest} from './files.js';
import {parseTask} from './contract.js';
import type {Principal,State,TaskDefinition} from './types.js';

export interface TaskRow {definition:TaskDefinition;state:State;sequence:number;epoch:number;head:string}
export interface StoredRecord {id:string;kind:string;taskId:string;hash:string;value:unknown;origin:'RECORDER'|'REVIEWER'|'LOCAL'|'LEGACY'}
interface DbTask {definition:string;state:State;sequence:number;epoch:number;head:string}
const transitions:Record<State,State[]>={
  READY:['RUNNING','CANCELLED','BLOCKED'],RUNNING:['WAITING_REVIEW','BLOCKED','CANCEL_REQUESTED'],
  WAITING_REVIEW:['RUNNING','COMPLETED','BLOCKED','CANCELLED'],BLOCKED:['RUNNING','CANCELLED'],
  CANCEL_REQUESTED:['CANCELLED','BLOCKED'],CANCELLED:[],COMPLETED:[],
};
/** Single-host transactional storage. Append-only API is not protection from a same-user SQL client. */
export class Store {
  #db:DatabaseSync;
  constructor(path:string) {
    if(path!==':memory:') {
      mkdirSync(dirname(path),{recursive:true,mode:0o700});
      if(realpathSync(dirname(path))!==dirname(path)||existsSync(path)&&lstatSync(path).isSymbolicLink())throw new Error('STATE_SYMLINK');
    }
    this.#db=new DatabaseSync(path,{timeout:3000});
    this.#db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=3000;');
    const version=(this.#db.prepare('PRAGMA user_version').get() as {user_version:number}).user_version;
    if(version!==0&&version!==1){this.#db.close();throw new Error('UNSUPPORTED_STATE_VERSION');}
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,definition TEXT NOT NULL,state TEXT NOT NULL,sequence INTEGER NOT NULL,epoch INTEGER NOT NULL,head TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS records(serial INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,kind TEXT NOT NULL,task_id TEXT NOT NULL REFERENCES tasks(id),hash TEXT NOT NULL,value TEXT NOT NULL,origin TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events(task_id TEXT NOT NULL REFERENCES tasks(id),sequence INTEGER NOT NULL,hash TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(task_id,sequence));
      CREATE TRIGGER IF NOT EXISTS records_no_update BEFORE UPDATE ON records BEGIN SELECT RAISE(ABORT,'IMMUTABLE_RECORD'); END;
      CREATE TRIGGER IF NOT EXISTS records_no_delete BEFORE DELETE ON records BEGIN SELECT RAISE(ABORT,'IMMUTABLE_RECORD'); END;
      CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'IMMUTABLE_HISTORY'); END;
      CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'IMMUTABLE_HISTORY'); END;
      PRAGMA user_version=1;
    `);
    if(path!==':memory:')chmodSync(path,0o600);
  }
  close():void{this.#db.close();}
  #transaction<T>(fn:()=>T):T {
    this.#db.exec('BEGIN IMMEDIATE');try{const result=fn();this.#db.exec('COMMIT');return result;}
    catch(error){this.#db.exec('ROLLBACK');throw error;}
  }
  get(id:string):TaskRow {
    const row=this.#db.prepare('SELECT definition,state,sequence,epoch,head FROM tasks WHERE id=?').get(id) as unknown as DbTask|undefined;
    if(!row)throw new Error('TASK_NOT_FOUND');return {...row,definition:parseTask(JSON.parse(row.definition))};
  }
  list():TaskRow[]{return (this.#db.prepare('SELECT id FROM tasks ORDER BY id').all() as {id:string}[]).map(r=>this.get(r.id));}
  #event(taskId:string,sequence:number,epoch:number,parent:string|null,actor:Principal,state:State,payload:unknown):string {
    const event={taskId,sequence,epoch,parent,actor,state,payload,at:new Date().toISOString()};const hash=digest(event);
    this.#db.prepare('INSERT INTO events(task_id,sequence,hash,value) VALUES(?,?,?,?)').run(taskId,sequence,hash,canonical(event));return hash;
  }
  create(definition:TaskDefinition,actor:Principal):TaskRow {
    const def=parseTask(definition);
    return this.#transaction(()=>{
      this.#db.prepare('INSERT INTO tasks VALUES(?,?,?,0,1,?)').run(def.id,canonical(def),'READY','');
      const head=this.#event(def.id,0,1,null,actor,'READY',{definition:def,authority:'LOCAL_ASSISTED'});
      this.#db.prepare('UPDATE tasks SET head=? WHERE id=?').run(head,def.id);
      return this.get(def.id);
    });
  }
  #insert(record:StoredRecord):void {
    if(digest(record.value)!==record.hash)throw new Error('RECORD_HASH_MISMATCH');
    this.#db.prepare('INSERT INTO records(id,kind,task_id,hash,value,origin) VALUES(?,?,?,?,?,?)')
      .run(record.id,record.kind,record.taskId,record.hash,canonical(record.value),record.origin);
  }
  append(record:StoredRecord):void{this.#transaction(()=>{this.get(record.taskId);this.#insert(record);});}
  records(taskId:string,kind?:string):StoredRecord[] {
    const rows=this.#db.prepare('SELECT id,kind,task_id,hash,value,origin FROM records WHERE task_id=? ORDER BY serial').all(taskId) as unknown as {id:string;kind:string;task_id:string;hash:string;value:string;origin:StoredRecord['origin']}[];
    return rows.filter(r=>!kind||r.kind===kind).map(r=>{const value:unknown=JSON.parse(r.value);if(digest(value)!==r.hash)throw new Error('CORRUPT_RECORD');
      return {id:r.id,kind:r.kind,taskId:r.task_id,hash:r.hash,value,origin:r.origin};});
  }
  /** Called by the service after authorization. CAS and gate calculation happen inside the transaction. */
  transition(id:string,actor:Principal,expected:{sequence:number;epoch:number},next:State,
    options:{record?:StoredRecord;completionGuard?:()=>boolean;recovery?:boolean}={}):TaskRow {
    return this.#transaction(()=>{
      const row=this.get(id);
      if(row.sequence!==expected.sequence||row.epoch!==expected.epoch)throw new Error('STALE_WRITER');
      if(row.definition.authorId!==actor.id||row.definition.sessionId!==actor.sessionId)throw new Error('WRITER_IDENTITY');
      if(!transitions[row.state].includes(next))throw new Error('INVALID_TRANSITION');
      if(next==='COMPLETED'&&options.completionGuard?.()!==true)throw new Error('COMPLETION_GATE_CLOSED');
      if(options.record){if(options.record.taskId!==id)throw new Error('CROSS_TASK_RECORD');this.#insert(options.record);}
      const sequence=row.sequence+1;const epoch=row.epoch+(options.recovery?1:0);
      const head=this.#event(id,sequence,epoch,row.head,actor,next,{recordId:options.record?.id??null,recovery:options.recovery??false});
      this.#db.prepare('UPDATE tasks SET state=?,sequence=?,epoch=?,head=? WHERE id=?').run(next,sequence,epoch,head,id);return this.get(id);
    });
  }
  revise(id:string,actor:Principal,expected:{sequence:number;epoch:number},definition:TaskDefinition):TaskRow {
    const def=parseTask(definition);
    return this.#transaction(()=>{
      const old=this.get(id);
      if(old.sequence!==expected.sequence||old.epoch!==expected.epoch)throw new Error('STALE_WRITER');
      if(['RUNNING','CANCEL_REQUESTED'].includes(old.state))throw new Error('STOP_BEFORE_REVISION');
      if(def.id!==id||def.projectId!==old.definition.projectId||def.revision!==old.definition.revision+1)throw new Error('REVISION_IDENTITY');
      const sequence=old.sequence+1,epoch=old.epoch+1;
      const head=this.#event(id,sequence,epoch,old.head,actor,'READY',{definition:def,previousDefinition:digest(old.definition)});
      this.#db.prepare('UPDATE tasks SET definition=?,state=?,sequence=?,epoch=?,head=? WHERE id=?').run(canonical(def),'READY',sequence,epoch,head,id);return this.get(id);
    });
  }
  verifyHistory(id:string):boolean {
    const task=this.get(id);const rows=this.#db.prepare('SELECT sequence,hash,value FROM events WHERE task_id=? ORDER BY sequence').all(id) as unknown as {sequence:number;hash:string;value:string}[];
    let parent:string|null=null;
    let finalState:string|undefined,finalEpoch:number|undefined,finalDefinition:unknown;
    for(let i=0;i<rows.length;i++) {
      const r=rows[i]!;const v=JSON.parse(r.value) as {parent:string|null;sequence:number;taskId:string;state:string;epoch:number;payload:{definition?:unknown}};
      if(r.sequence!==i||v.sequence!==i||v.taskId!==id||v.parent!==parent||digest(v)!==r.hash)return false;parent=r.hash;
      finalState=v.state;finalEpoch=v.epoch;if(v.payload.definition)finalDefinition=v.payload.definition;
    }
    this.records(id);return rows.length===task.sequence+1&&parent===task.head&&finalState===task.state&&finalEpoch===task.epoch&&digest(finalDefinition)===digest(task.definition);
  }
}
