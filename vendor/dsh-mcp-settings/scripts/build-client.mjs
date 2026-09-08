import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'src/client.js'), 'utf8')

const stripped = src
  .replace(/^[\s\S]*?^export const inject = \['slots'\]\n/m, '')
  .replace(/\nexport function apply\(ctx\) \{[\s\S]*$/m, '')
  .replaceAll('\nexport ', '\n')

const applyBody = src.match(/export function apply\(ctx\) \{([\s\S]*)\}\s*$/)?.[1]
if (!applyBody) throw new Error('could not extract apply()')

const out = `window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-mcp-settings",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const h = react.createElement;
		const { useCallback, useEffect, useMemo, useState } = react;
		const inject = ["slots"];
${stripped}
		function apply(ctx) {${applyBody}}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
`

mkdirSync(join(root, 'lib'), { recursive: true })
writeFileSync(join(root, 'lib/client.js'), out)
console.log('wrote lib/client.js', out.length, 'bytes')
