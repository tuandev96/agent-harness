# Current implementation readback

Source presence is not product acceptance. This report is generated from actual local files and check result references.

| Component | Source state |
|---|---|
| runtime-contract-evaluator | PRESENT_NOT_ACCEPTANCE |
| evidence-lifecycle | PRESENT_NOT_ACCEPTANCE |
| catalog | PRESENT_NOT_ACCEPTANCE |
| dsh-adapter | PRESENT_NOT_ACCEPTANCE |
| mcp-hardening | PRESENT_NOT_ACCEPTANCE |
| replay-lifecycle | PRESENT_NOT_ACCEPTANCE |
| portable-install-memory | PRESENT_NOT_ACCEPTANCE |
| cli | PRESENT_NOT_ACCEPTANCE |
| repository-runner | PRESENT_NOT_ACCEPTANCE |
| offline-eval | PRESENT_NOT_ACCEPTANCE |
| private-packaging | PRESENT_NOT_ACCEPTANCE |
| ci-definition | PRESENT_NOT_ACCEPTANCE |

| Check | Outcome | Current input and log verified |
|---|---|---|
| typecheck | NO_RESULT | False |
| core | NO_RESULT | False |
| plugins | PASS | True |
| operations | NO_RESULT | False |
| regression | PASS | True |
| spec | PASS | True |
| legacy | PASS | True |
| package | PASS | True |

Independent review, native DSH/browser/Windows, paid model comparison and remote required-check rejection remain pending. Release-ready: false.
