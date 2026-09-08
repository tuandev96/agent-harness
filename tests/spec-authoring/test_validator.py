"""Executable regressions for the uploaded SRS validator; no model assertions."""
import importlib.util
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
SKILL = ROOT / 'skills/requirements-spec'
VALIDATOR = SKILL / 'scripts/validate_spec.py'
GOOD = (SKILL / 'tests/fixtures/good.md').read_text(encoding='utf-8')


class ValidatorTests(unittest.TestCase):
    def run_spec(self, text, *args):
        with tempfile.TemporaryDirectory() as d:
            p = pathlib.Path(d) / 'spec.md'
            p.write_text(text, encoding='utf-8')
            return subprocess.run([sys.executable, str(VALIDATOR), str(p), *args],
                                  capture_output=True, text=True, timeout=10)

    def reject(self, text):
        result = self.run_spec(text)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn('ERROR:', result.stdout)

    def test_good(self):
        self.assertEqual(self.run_spec(GOOD).returncode, 0)

    def test_missing_header(self):
        self.reject(GOOD[GOOD.index('## Goal'):])

    def test_invalid_status(self):
        self.reject(GOOD.replace('Status: Planned', 'Status: Teleported'))

    def test_mixed_nfr_priority(self):
        head, tail = GOOD.split('## Quality Requirements', 1)
        self.reject(head + '## Quality Requirements' + tail.replace('Priority: Must', 'Priority: P1', 1))

    def test_ac_outside_requirement(self):
        stray = '\n##### AC-999 - Wrong parent\nGiven a valid fixture\nWhen a probe runs\nThen the state remains unchanged\n'
        self.reject(GOOD.replace('## Quality Requirements', '## Quality Requirements\n' + stray, 1))

    def test_entire_spec_inside_fence(self):
        self.reject('```markdown\n' + GOOD + '\n```\n')

    def test_required_annex(self):
        self.reject(GOOD.split('## Assumptions and Open Questions')[0])

    def test_duplicate_field(self):
        self.reject(GOOD.replace('- Feature: F-001', '- Feature: F-999\n- Feature: F-001', 1))

    def test_section_order(self):
        self.reject(GOOD.replace('## Goal', '## Scope', 1).replace('## Scope\n\n### In Scope', '## Goal\n\n### In Scope', 1))

    def test_code_example_is_not_inventory(self):
        example = '\n```md\n#### REQ-999\n- Status: Magic\n##### AC-999 - Example only\n```\n'
        result = self.run_spec(GOOD + example)
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertNotIn('REQ-999', result.stdout)

    def test_duplicate_section(self):
        self.reject(GOOD + '\n## Goal\nDuplicate.\n')

    def test_invalid_adr_status(self):
        self.reject(GOOD.replace('Status: Accepted', 'Status: Magic'))

    def test_bom_and_crlf(self):
        result = self.run_spec('\ufeff' + GOOD.replace('\n', '\r\n'))
        self.assertEqual(result.returncode, 0, result.stdout)

    def test_non_dense_ids_are_not_renumbered(self):
        result = self.run_spec(GOOD.replace('REQ-001', 'REQ-901'))
        self.assertEqual(result.returncode, 0, result.stdout)

    def test_unclosed_fence(self):
        self.reject(GOOD + '\n```md\nexample\n')

    def test_library_validation_does_not_leak_previous_errors(self):
        spec = importlib.util.spec_from_file_location('validator_under_test', VALIDATOR)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        module.validate(['broken'])
        _, errors, _ = module.validate(GOOD.splitlines())
        self.assertEqual(errors, [])


if __name__ == '__main__':
    unittest.main()
