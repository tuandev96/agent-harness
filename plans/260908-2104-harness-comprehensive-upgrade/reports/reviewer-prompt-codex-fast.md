READ-ONLY independent review of UNCOMMITTED slice in this repo. Do not edit files. Do not run full package unpack. Max 8 tool calls.

Check only:
1. skills/capture-intent/SKILL.md, plan-mode/SKILL.md, review-policy/SKILL.md have frontmatter name+description
2. hooks/*.sh + installer chmod +x for .sh (src/core/installer.ts)
3. scripts/package-archive.py sets 0o755 for .sh
4. tests/operations/hooks-pack.test.mjs exists
5. Run: node scripts/test.mjs --suite operations
6. No ENFORCED/release claims in adapters/portable/index.mjs

Output EXACTLY:
AC table (1-6 PASS/FAIL)
Findings (or "0 findings")
Last line must be exactly one of:
VERDICT: PASS
VERDICT: BLOCK (N finding)
