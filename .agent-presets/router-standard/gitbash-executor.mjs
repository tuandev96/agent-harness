/** Git Bash preset adapter. Subprocess/approval enforcement remains host-owned. */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

export const name = 'gitbash-executor'
export const inject = ['subprocess']

export function gitBashPath(config = {}) {
  const env = config.shellPath || process.env.GIT_BASH
  if (env && existsSync(env)) return env
  const pf = process.env.ProgramFiles || 'C:\\Program Files'
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const la = process.env.LOCALAPPDATA || join(homedir(), 'AppData\\Local')
  for (const path of [join(pf,'Git\\bin\\bash.exe'), join(pf,'Git\\usr\\bin\\bash.exe'),
    join(pf86,'Git\\bin\\bash.exe'), join(la,'Programs\\Git\\bin\\bash.exe')]) {
    if (existsSync(path)) return path
  }
  return 'bash'
}

function positive(value, fallback, maximum) {
  const n = value === undefined ? fallback : Number(value)
  if (!Number.isFinite(n) || n <= 0) throw new Error('execution limits must be positive finite numbers')
  return Math.min(maximum, Math.floor(n))
}

function cancellation(spec) {
  const controller = new AbortController()
  let cause = null
  const abort = reason => { if (!cause) { cause=reason; controller.abort(new Error(reason)) } }
  const onCancel = () => abort('CANCELLED')
  if (spec.signal?.aborted) onCancel()
  else spec.signal?.addEventListener('abort',onCancel,{once:true})
  const timer = setTimeout(()=>abort('TIMED_OUT'),positive(spec.timeoutMs,120000,600000))
  return {signal:controller.signal, cause:()=>cause,
    dispose() { clearTimeout(timer); spec.signal?.removeEventListener('abort',onCancel) }}
}

export function apply(ctx, config = {}) {
  const bashPath = gitBashPath(config)
  const finalOutput = reader => {
    const result = reader?.readFrom?.(0)
    return {text:result?.text || '',truncated:Boolean(result?.truncated),spillPath:result?.spillPath}
  }
  const spawn = (spec, signal) => ctx.subprocess.spawn({
    argv:[bashPath,'-lc',spec.command],cwd:spec.workdir,
    stdio:{stdin:'ignore',
      stdout:{maxBytes:spec.stdoutMaxBytes,spill:{maxBytes:spec.stdoutMaxBytes*2}},
      stderr:{maxBytes:spec.stdoutMaxBytes,spill:{maxBytes:spec.stdoutMaxBytes*2}}},
    graceMs:3000,signal,
  })
  const shell = {
    // No claim of sandbox enforcement here. Host capability conformance is required.
    resolve(request) {
      return {command:String(request?.command || ''),workdir:request?.workdir || process.cwd(),
        timeoutMs:positive(request?.timeoutMs,config.timeoutMs ?? 120000,600000),
        stdoutMaxBytes:positive(request?.stdoutMaxBytes,config.maxOutputBytes ?? 262144,4194304),
        ...(request?.signal ? {signal:request.signal} : {})}
    },
    async run(spec) {
      const cancel=cancellation(spec)
      let handle, outcome, spawnError=''
      try { handle=spawn(spec,cancel.signal); outcome=await handle.done }
      catch(error) { spawnError=error instanceof Error ? error.message : String(error) }
      finally { cancel.dispose() }
      return {exitCode:Number(outcome?.exitCode ?? outcome?.code ?? -1),signal:outcome?.signal ?? null,
        timedOut:cancel.cause()==='TIMED_OUT',aborted:cancel.cause()==='CANCELLED' || Boolean(spawnError),
        timeoutMs:spec.timeoutMs,stdout:finalOutput(handle?.collected?.stdout),stderr:finalOutput(handle?.collected?.stderr),
        ...(spawnError ? {spawnError} : {})}
    },
    start(spec) {
      const cancel=cancellation(spec)
      try {
        const handle=spawn(spec,cancel.signal)
        return {done:handle.done.finally(()=>cancel.dispose()),pid:handle.pid,collected:handle.collected}
      } catch(error) { cancel.dispose(); throw error }
    },
  }
  ctx.provide('shell',shell)
}
