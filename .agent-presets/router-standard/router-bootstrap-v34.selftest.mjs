import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = readFileSync(join(here, 'router-bootstrap-v34.mjs'), 'utf8')
const cfg = readFileSync(join(here, 'agent.cordis.yml'), 'utf8')
const sensor = '' // v1.17：压力释放工具已撤（注意力最优化=最优泄压）；sensor 断言全部退役
const fails = []
const check = (name, ok) => { if (!ok) fails.push(name) }

// 1. 引导文案必须完整拼接（Unlock order / self-route / once 回到 START_GUIDE）
const startIdx = src.indexOf('const START_GUIDE =')
const guidesIdx = src.indexOf('const STAGE_GUIDES = [')
check('start-guide-located', startIdx >= 0 && guidesIdx > startIdx)
const tail = src.slice(startIdx, guidesIdx)
check('guide-unlock-order', tail.includes("+ 'Unlock order:"))
check('guide-once', tail.includes("+ 'This guide appears only once"))
check('no-orphan-tail', !src.includes("]\n\n  + 'Unlock order"))

// 2. 硬门控核心修复必须在场
check('restrictLift-declared', src.includes('const restrictLift = new Map()'))
check('restrict-not-silent', src.includes("console.error('[router-bootstrap] applyStageRestrict failed:"))
check('meta-tools', src.includes("const META_TOOLS = ['phase_advance', 'dev_router_status', 'tools_catalog', 'tools_help']"))
check('auto-advance', src.includes('function autoAdvance(') && src.includes('autoAdvance(st.stage,'))
check('staged-sdk-called', src.includes('const staged = buildStagedSdk(sections, stage)'))
check('no-stageSection-leak', !src.includes('(stageSection?.text'))
check('tools-catalog-registered', src.includes("    name: 'tools_catalog',"))
check('tools-help-registered', src.includes("    name: 'tools_help',"))
// v1.27.1 根修：DSH_HOME 缺省必须落到 <home>/.dsh（此前裸 homedir() 把 stages.json /
// last-mount.txt 写到 ~/router-standard，且 dev_reload_preset_live 去 ~/.agent-presets 找
// agent.cordis.yml → ENOENT）。单源 dshHomeForState()，禁止裸 fallback 复活。
check('dsh-home-helper', src.includes("const dshHomeForState = () => process.env.DSH_HOME || join(homedir(), '.dsh')"))
check('dsh-home-no-bare-fallback', !src.includes('process.env.DSH_HOME || homedir()'))
check('dsh-home-stage-file', src.includes("join(dshHomeForState(), 'router-standard', 'stages.json')"))
check('dsh-home-preset-dir', src.includes("join(dshHomeForState(), '.agent-presets'") && src.includes('const home = dshHomeForState()'))

// v1.27.2: never wipe runtime contexts / never let the model invent /Users/<guess> for ~
check('v1272-grounded-persona', src.includes('export function groundedPersona(') && src.includes('Expand ~ to OS home; never invent a username.'))
check('v1272-identity-stage', src.includes('export function identityStageLine(') && src.includes('identityStageLine(agent)'))
check('v1272-no-context-wipe', !src.includes('contexts: []'))
check('v1272-persona-not-bare-rl', !src.includes("text: RL_PERSONA") && src.includes('groundedPersona(agent)'))
check('v1272-version', src.includes("const ROUTER_VERSION = 'v1.27.4'"))
check('v1274-tools-help-heading', src.includes("tool_description: ") && !src.includes("'描述: '") && !src.includes("'描述: ' + found.desc"))
check('v1274-help-name-eq', src.includes("name=") && src.includes('export function formatHelpParams('))
check('v1274-coerce', src.includes('export function coerceSearchToolArgs(') && src.includes('export function extractMiskeyedPattern('))
check('v1274-pre-execute', src.includes("ctx.on('tools/pre-execute'") && src.includes('coerceSearchToolArgs(exec?.name'))
check('v1274-post-execute-echo', src.includes('export function enrichInvalidArgs(') && src.includes('received keys:'))
check('v1273-stage-tail', src.includes("name: 'router-stage', order: 9100") && src.includes("name: 'router-decl', order: 9110"))
check('v1273-no-mid-prompt-filter', src.includes('do not drop tool:* docs as phases unlock'))

// 3. 配置指向新一代（?v= 预期递增）
check('config-points-v34', /router-bootstrap-v34\.mjs\?v=\d+/.test(cfg))
check('config-v24-or-newer', /router-bootstrap-v34\.mjs\?v=(2[4-9]|[3-9]\d+)/.test(cfg))

check('meta-goal', src.includes("const META_GOAL = ['get_goal', 'create_goal', 'update_goal']"))
check('goal-in-safe', src.includes("'get_goal', 'create_goal', 'update_goal',"))
check('stage-summary', src.includes('function stageSummary('))
check('no-auto-advance-inbox', !src.includes("id: 'auto-advance-'"))

// 4. v1.3 常驻引导 + 引导带宽控 + 二级披露全量索引
check('stage-guide-merged', src.includes('Stage guide: ') && src.includes(' + guide'))
check('decl-persist-section', src.includes("sections.push({ name: 'router-decl'"))
check('proactivity-persist-section', src.includes("sections.push({ name: 'router-proactivity'"))
check('guidance-width-filter', src.includes('function filterToolGuidance(') && src.includes('do not drop tool:* docs as phases unlock'))
check('full-index-shared', src.includes('function registryFullIndex('))
check('known-names-helper', src.includes('function knownToolNames('))
check('catalog-markers', src.includes('function markerFor(') && src.includes("return '可调'"))
check('no-bootstrap-guide-dup', !src.includes("+ '\\n' + STAGE_GUIDES[0]"))

// 5. v1.17 用户定稿：压力释放工具已撤（注意力最优化=最优泄压）——pressure-sensor 应完全不在装配面
check('v117-no-pressure-sensor', !cfg.includes('pressure-sensor') && !src.includes('pressureStatsFor'))

// 6. v1.4 实测吸收：参数速览 + 重读再改 + shell/沙箱/多图指引
check('param-hint', src.includes('export function paramHint(') && src.includes('params: pattern, path') === false)
check('no-guess-params', src.includes('never guess'))
check('reread-guide', src.includes('Re-read before re-edit'))
check('windows-shell-guide', src.includes('Git Bash (first-class)') && src.includes('pwsh for PowerShell'))
check('escalate-guide', src.includes('one-shot sandbox escalation') && src.includes('never bypass'))

// 7. v1.5 页面验证 + 平台事实 + 门控健壮性
check('v112-bash-re-enabled', src.includes('gitbash-shell 组提供真 Git Bash'))
check('restrict-double-filter', src.includes('restrictableNames'))
check('node-on-path', src.includes("dirname(process.execPath"))
check('v112-gitbash-executor', cfg.includes('gitbash-executor.mjs') && cfg.includes('gitbash-shell'))
check('v115-native-mode', src.includes("presentAs('native')") && src.includes('directly callable (native mode'))

// 8. v1.6 三轮实弹：shim 输出透传 + 预放两档 + 直达语义 + URL 自动编码 + pressure 澄清
check('shim-output-passthrough', src.includes('output: def.output ? { schema: def.output.schema, render: def.output.render }'))
check('preunlock-two-tiers', src.includes('export function windowFor(') && src.includes('idx < windowFor(stage)'))
check('advance-jump-semantics', src.includes("names.has('ask_user_question')") && src.includes("names.has('delivery_check')") && !src.includes('use a next-tier tool'))
check('proactivity-guide', src.includes('Proactivity (replaces the pressure valve)'))
check('phase-advance-one-step', src.includes('逐级推进（一次一级，不跳级）'))

// 9. v1.6.1 自验证：全分支统一形状（pageFail 修复"invalid output"第二条根因链）

// 10. v1.7 五轮实弹：console/title/selector/js 引擎 + 描述-行为对齐
check('v17-marker-single-sem', src.includes("return '可调'") && src.includes("return '未解锁'"))
check('v17-presentation-selfcheck', src.includes('export function readPresentation(') && src.includes('presentation='))
check('v18-stagetext-no-negative', src.includes('More tools unlock with the next stage') && !src.includes('Not yet callable (until delivery)'))

// 12. v1.18 注意力盲区：catalog 默认可调面 + query/all 白盒 + level-up 技能卡 + help 解锁阶段
check('v18-catalog-default-blind', src.includes("if (!q && t.mark === '未解锁') return false"))
check('v18-catalog-query-stage', src.includes('（解锁于阶段 ') && src.includes('宿主·交付期'))
check('v185-no-all-escape', !src.includes("all: { type: 'boolean'") && !src.includes('const showAll =') && src.includes('query 单点白盒'))
check('v18-advance-card', src.includes('New this stage:') && src.includes('Pre-unlocked (already callable):'))
check('v18-help-unlock-stage', src.includes('解锁阶段: '))
check('v18-auto-fresh', src.includes('function sessionFresh(') && src.includes("reason === 'initial'"))

// 12b. v1.18.1 分组与标注：预放标记 / 宿主·阶段外 / 统一 helper
check('v181-stage-info-helper', src.includes('export function stageInfo(') && src.includes('export function preUnlockedFor('))
check('v181-catalog-mark-extra', src.includes('export function catalogMarkExtra(') && src.includes('（预放）'))
check('v181-host-stage-annotation', src.includes('宿主·交付期：阶段 3 全量开放'))
check('v181-help-unlock-helper', src.includes('export function helpUnlockLine(') && src.includes('交付期（宿主工具'))

// 12c. v1.18.2 P0：窗口单一来源 / 派生常量 / stageText 分栏 / bootstrap 真实列表
check('v182-window-single-source', src.split('Math.min(stage + 3, STAGES.length)').length <= 2 && src.includes('export function windowFor('))
check('v182-derive-stage-safe', src.includes('const STAGE_SAFE = STAGES.flatMap'))
check('v182-derive-stage-host', src.includes('const STAGE_HOST = [...STAGE_2_TOOLS'))
check('v182-stagetext-core-pre', src.includes('Core: ') && src.includes('Pre-unlocked (already callable): '))
check('v182-bootstrap-runtime-list', src.includes('runtimeCallable(toolsSvc, currentAgent())'))

// 12d. v1.18.3 评审修复：external evidence / own-first 索引 / muted 卡片 / domain 单源 / meta 归类 / status 口径
check('v183-external-schema', src.includes("enum: ['file','page','image','run','test','text','external','numeric']"))
check('v183-own-first-index', src.includes('if (own) layersList.push(own)'))
check('v183-muted-advance-card', src.includes('muteAwareList(STAGES[next].tools, muted)') && src.includes('muteAwareList(preUnlockedFor('))
check('v183-domain-single-source', src.includes('export function categorizeDomain(') && src.split('const dom = categorizeDomain').length >= 3)
check('v183-meta-reset-tool', src.includes("'delivery_check', 'dev_reset_experience'"))
check('v183-status-muted-consistent', src.includes('muteAwareList(runtimeCallable(agent?.ctx?.get?.(\'tools\'), agent), memoryMuted(session))'))

// 12e. v1.18.4 P1：lastAdvance 持久化/展示 + all:true 汇总头 + host 常驻/交付期细分
check('v184-last-advance-record', src.includes('st.lastAdvance') && src.includes('.lastAdvance = { at: Date.now()'))
check('v184-last-advance-status', src.includes('lastAdvance=') && src.includes("la.reason ? ' (' + la.reason + ')'"))
check('v184-load-restores-times', src.includes('stageAtTime: st.stageAtTime') && src.includes('lastAdvance: { at:'))
check('v185-no-all-summary-head', !src.includes("' tools: '") && !src.includes('stage-locked · '))
check('v184-host-resident', src.includes('（宿主·常驻）'))

// 12f. v1.19.1 引导工程：任务回显 / Done 提示 / Next goal / 引导而非打回
check('v191-task-echo', src.includes('export function firstUserTask(') && src.includes("'\\nTask: '") && src.includes('firstUserTask(session)'))
check('v191-done-hint', src.includes('→ Done?'))
check('v191-next-goal', src.includes('Next goal: '))
check('v191-guide-not-gate', src.includes('工具分配问题') && src.includes('而不是寻求绕过'))
check('v191-no-all-ref', !src.includes('tools_catalog(all:true)'))

// 11. v1.9 六轮实弹：目录=真绑定 / 页检重试 / WebGL 软件渲染 / 契约描述
check('v19-runtime-mark', src.includes('export function runtimeMark(') && src.includes('visible.has(name) ? \'可调\''))
check('v19-catalog-uses-runtime', src.includes('mark: runtimeMark(ctx.tools') && src.includes('mark: runtimeMark(toolsSvc, agent'))
check('v19-native-begin-desc', src.includes('呈现为 native 直调'))
check('v19-no-stale-code-mode-contract', !src.includes('Code Mode 契约') && !src.includes('lossless JSON 结束'))

if (fails.length) { console.error('SELFTEST FAIL:', fails.join(' | ')); process.exit(1) }

const { groundedPersona, identityStageLine, identityFacts, coerceSearchToolArgs, extractMiskeyedPattern, formatHelpParams, enrichInvalidArgs } = await import(join(here, 'router-bootstrap-v34.mjs'))
const fake = { session: { header: { cwd: '/tmp/project' } } }
const persona = groundedPersona(fake)
const facts = identityFacts(fake)
const line = identityStageLine(fake)
if (!facts.home) { console.error('SELFTEST FAIL: identityFacts.home empty'); process.exit(1) }
if (facts.cwd !== fake.session.header.cwd) { console.error('SELFTEST FAIL: identityFacts.cwd mismatch'); process.exit(1) }
if (!persona.includes(facts.home) || !persona.includes(facts.cwd) || !persona.includes('never invent a username')) {
  console.error('SELFTEST FAIL: groundedPersona missing home/cwd\n' + persona)
  process.exit(1)
}
if (persona.includes('/Users/bestmix') || persona.includes('/Users/huyhoang')) {
  console.error('SELFTEST FAIL: groundedPersona hallucinated username\n' + persona)
  process.exit(1)
}
if (!line.includes('cwd=' + facts.cwd) || !line.includes('OS home=' + facts.home)) {
  console.error('SELFTEST FAIL: identityStageLine missing facts\n' + line)
  process.exit(1)
}
if (extractMiskeyedPattern('pattern: **/*pnl*') !== '**/*pnl*') {
  console.error('SELFTEST FAIL: extractMiskeyedPattern prefix')
  process.exit(1)
}
if (extractMiskeyedPattern('Show current directory') !== null) {
  console.error('SELFTEST FAIL: extractMiskeyedPattern must ignore bash descriptions')
  process.exit(1)
}
const coerced = coerceSearchToolArgs('glob', { description: 'pattern: **/*.ts', path: '.' })
if (!coerced.coerced || coerced.args.pattern !== '**/*.ts' || 'description' in coerced.args) {
  console.error('SELFTEST FAIL: coerceSearchToolArgs glob', coerced)
  process.exit(1)
}
const bashKeep = coerceSearchToolArgs('bash', { command: 'ls', description: 'List files' })
if (bashKeep.coerced || bashKeep.args.description !== 'List files') {
  console.error('SELFTEST FAIL: bash description must not coerce', bashKeep)
  process.exit(1)
}
const help = formatHelpParams({ pattern: { type: 'string', required: true, description: 'Glob pattern' }, path: { type: 'string', description: 'Dir' } }).join('\n')
if (!help.includes('name=pattern') || !help.includes('required=true') || help.includes('描述:')) {
  console.error('SELFTEST FAIL: formatHelpParams\n' + help)
  process.exit(1)
}
const echo = enrichInvalidArgs({ name: 'glob', arguments: { description: 'pattern: *.ts', path: '/tmp' } }, { isError: true, error: { message: 'invalid arguments: missing required property "pattern"' }, content: [{ type: 'text', text: 'Error: invalid arguments: missing required property "pattern"' }] })
if (!echo || !echo.message.includes('received keys: description, path') || !echo.message.includes('unknown key "description"')) {
  console.error('SELFTEST FAIL: enrichInvalidArgs\n' + (echo && echo.message))
  process.exit(1)
}
console.log('SELFTEST PASS')
console.log('identity home=' + facts.home)
console.log('identity cwd=' + facts.cwd)