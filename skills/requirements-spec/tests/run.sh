#!/bin/sh
# Self-check for validate_spec.py: the good fixture must pass, the bad one must fail.
set -e
here=$(dirname "$0")
v="$here/../scripts/validate_spec.py"

python3 "$v" "$here/fixtures/good.md" >/dev/null || { echo "FAIL: good fixture reported errors"; exit 1; }

if python3 "$v" "$here/fixtures/bad.md" >/dev/null; then
  echo "FAIL: bad fixture passed validation"; exit 1
fi

# each defect class must be named at least once
out=$(python3 "$v" "$here/fixtures/bad.md" || true)
for pattern in \
  "placeholder left" \
  "has no bullets" \
  "F-002 has no requirements" \
  "REQ-001 has no acceptance criteria" \
  "missing '- Status:' field" \
  "Kind 'Telepathic' not in" \
  "opens with a trigger word" \
  "declares Feature F-002 but sits under F-001" \
  "REQ-002 has no 'shall'" \
  "ambiguous term" \
  "AC-001 missing 'Then' clause" \
  "NFR-001 missing '- Metric:' field" \
  "ADR-001 missing 'Consequences' section" \
  "mixed priority vocabularies" \
  "duplicate ID NFR-001"
do
  case "$out" in
    *"$pattern"*) ;;
    *) echo "FAIL: validator did not report: $pattern"; exit 1 ;;
  esac
done

echo "OK: validator passes the good fixture and catches 15 defect classes in the bad one"
