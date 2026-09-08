import { coerceSearchToolArgs, extractMiskeyedPattern } from '../lib/index.js'
import assert from 'node:assert/strict'

assert.equal(extractMiskeyedPattern('pattern: **/*pnl*'), '**/*pnl*')
assert.equal(extractMiskeyedPattern('pattern:**/*.ts'), '**/*.ts')
assert.equal(extractMiskeyedPattern('*.json'), '*.json')
assert.equal(extractMiskeyedPattern('Show current directory'), null)

const a = coerceSearchToolArgs('glob', { description: 'pattern: **/*pnl*', path: '/tmp' })
assert.equal(a.coerced, true)
assert.equal(a.args.pattern, '**/*pnl*')
assert.equal(a.args.path, '/tmp')
assert.equal('description' in a.args, false)

const b = coerceSearchToolArgs('glob', { pattern: '*.ts', path: '.' })
assert.equal(b.coerced, false)
assert.equal(b.args.pattern, '*.ts')

const c = coerceSearchToolArgs('bash', { command: 'ls', description: 'List files' })
assert.equal(c.coerced, false)
assert.equal(c.args.description, 'List files')

const d = coerceSearchToolArgs('grep', { description: 'pattern: reclass' })
assert.equal(d.coerced, true)
assert.equal(d.args.pattern, 'reclass')

console.log('coerce.test.mjs PASS')
