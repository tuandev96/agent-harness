#!/usr/bin/env python3
"""Validate a System Requirements markdown document.

Usage: python3 validate_spec.py <spec.md> [--quiet]
Exit 0 = no errors. Exit 1 = errors. Warnings never fail the run.
"""
import re
import sys
import json
import hashlib
import argparse
import json
from datetime import datetime
from pathlib import Path
from collections import Counter

KINDS = {"ubiquitous", "event-driven", "state-driven", "optional feature",
         "unwanted behavior", "unwanted", "complex"}
TRIGGERS = {
    "event-driven": r"^(when|whenever|upon|after|once|every|each time|on |at |in response|khi|mỗi|sau|trước|ngay|tại)\b",
    "state-driven": r"^(while|during|as long as|trong lúc|trong khi|khi đang)\b",
    "unwanted behavior": r"^(if|nếu|in case)\b",
    "unwanted": r"^(if|nếu|in case)\b",
    "optional feature": r"^(where|nếu bật|khi bật)\b",
}
UBIQUITOUS_BAD = r"^(when|while|if|where|upon|after|whenever|khi|nếu|trong lúc|trong khi)\b"
MOSCOW = {"must", "should", "could", "won't", "wont"}
SEVERITY = {"p0", "p1", "p2"}
STATUSES = {"planned", "in progress", "implemented", "verified", "deferred"}
# ISO/IEC 25010:2023 product-quality characteristics, plus the 2011 names it
# renamed (usability -> interaction capability, portability -> flexibility).
# "privacy" is a 2023 sub-characteristic of security, accepted as a heading.
ISO = {"functional suitability", "performance efficiency", "compatibility",
       "interaction capability", "usability", "reliability", "security",
       "maintainability", "flexibility", "portability", "safety", "privacy"}
VAGUE = ["user-friendly", "state-of-the-art", "best effort", "as needed",
         "if possible", "and/or", "as appropriate", "quickly", "fast ",
         "easy", "easily", "robust", "appropriate", "sufficient", "seamless",
         "intuitive", "comfortably", "reasonable", "optimal", "flexible",
         "efficiently", "minimal ", "several", "etc."]
SECTIONS = ["Goal", "Scope", "Users / Actors", "Key Constraints", "Features",
            "Quality Requirements", "Decisions", "Assumptions and Open Questions"]

err, warn = [], []
E = lambda ln, m: err.append((ln, m))
W = lambda ln, m: warn.append((ln, m))


def structural_lines(lines):
    """Parse the documented Markdown subset, never inventory fenced examples.

    Blank lines preserve source coordinates. A BOM is tolerated; a code fence
    does not turn its contents into normative requirements.
    """
    out, fence, opened = [], None, 0
    for ln, raw in enumerate(lines, 1):
        raw = raw.lstrip('\ufeff') if ln == 1 else raw
        match = re.match(r'^ {0,3}(`{3,}|~{3,})(.*)$', raw)
        if fence:
            if match and match[1][0] == fence[0] and len(match[1]) >= len(fence) and not match[2].strip():
                fence = None
            out.append('')
        elif match:
            fence, opened = match[1], ln
            out.append('')
        else:
            out.append(raw.rstrip())
    if fence:
        E(opened, 'unclosed code fence')
    return out


def parse(lines):
    doc = {"sections": {}, "features": {}, "reqs": {}, "acs": {}, "nfrs": {},
           "adrs": {}, "chars": [], "seen": []}
    sec = sub = None
    cur_f = cur_r = cur_n = cur_a = cur_d = None

    def block(i):
        """Field dict + body text following a heading at index i."""
        fields, body, j = {}, [], i + 1
        while j < len(lines) and not lines[j].startswith("#"):
            s = lines[j].strip()
            m = re.match(r"^- ([A-Za-z ]+):\s*(.*)$", s)
            if m and not body:
                key = m.group(1).strip().lower()
                if key in fields:
                    E(j + 1, f"duplicate field '{key}'")
                else:
                    fields[key] = m.group(2).strip()
            elif s:
                body.append(s)
            j += 1
        return fields, body

    for i, raw in enumerate(lines):
        line, ln = raw.rstrip(), i + 1
        if m := re.match(r"^## (?!#)(.+)$", line):
            sec, sub = m.group(1).strip(), None
            cur_f = cur_r = cur_n = cur_a = cur_d = None
            if sec in doc['sections']:
                E(ln, f"duplicate section '## {sec}'")
            doc["sections"][sec] = ln
            continue
        if m := re.match(r"^### (?!#)(.+)$", line):
            sub = m.group(1).strip()
            cur_f = cur_r = cur_n = cur_a = cur_d = None
            if sec == "Features" and (f := re.match(r"^(F-\d+)\s*-\s*(.+)$", sub)):
                cur_f = f.group(1)
                doc["seen"].append(cur_f)
                fields, body = block(i)
                doc["features"][cur_f] = dict(line=ln, name=f.group(2), reqs=[],
                                              fields=fields, body=body)
            elif sec == "Decisions" and (d := re.match(r"^(ADR-\d+)\s*-\s*(.+)$", sub)):
                cur_d = d.group(1)
                doc["seen"].append(cur_d)
                _, body = block(i)
                doc["adrs"][cur_d] = dict(line=ln, title=d.group(2), body=body,
                                          heads=[])
            elif sec == "Quality Requirements":
                doc["chars"].append((ln, sub))
            elif sub in ('In Scope', 'Out Of Scope') and sec != 'Scope':
                E(ln, f"'{sub}' must be under Scope")
            continue
        if m := re.match(r"^#### (?!#)(.+)$", line):
            h = m.group(1).strip()
            cur_r = cur_n = cur_a = None
            if r := re.match(r"^(REQ-[\w-]+)$", h):
                if sec != 'Features' or not cur_f:
                    E(ln, f'{h} must be inside a feature')
                cur_r = r.group(1)
                doc["seen"].append(cur_r)
                fields, body = block(i)
                doc["reqs"][cur_r] = dict(line=ln, fields=fields, acs=[],
                                          text=" ".join(body), feature=cur_f)
                if cur_f:
                    doc["features"][cur_f]["reqs"].append(cur_r)
            elif n := re.match(r"^(NFR-[\w-]+)$", h):
                if sec != 'Quality Requirements' or not sub:
                    E(ln, f'{h} must be inside a quality characteristic')
                cur_n = n.group(1)
                doc["seen"].append(cur_n)
                fields, body = block(i)
                doc["nfrs"][cur_n] = dict(line=ln, fields=fields,
                                          text=" ".join(body), char=sub)
            continue
        if m := re.match(r"^##### (AC-[\w-]+)\s*-\s*(.+)$", line):
            if sec != 'Features' or not cur_r:
                E(ln, f'{m.group(1)} is not attached to any requirement')
                cur_r = None
            cur_a = m.group(1)
            doc["seen"].append(cur_a)
            _, body = block(i)
            doc["acs"][cur_a] = dict(line=ln, title=m.group(2), body=body,
                                     req=cur_r)
            if cur_r:
                doc["reqs"][cur_r]["acs"].append(cur_a)
            continue
        if cur_d and sec == "Decisions" and line.strip() in (
                "Context", "Decision", "Consequences"):
            doc["adrs"][cur_d]["heads"].append(line.strip())
    return doc


def check(doc, lines):
    text = "\n".join(lines)
    if not lines or lines[0] != '# System Requirements':
        E(1, "first line must be '# System Requirements'")
    if sum(bool(re.match(r'^# (?!#)', line)) for line in lines) != 1:
        E(1, 'exactly one H1 is required')
    first_h2 = next((i for i, line in enumerate(lines) if line.startswith('## ')), len(lines))
    header = lines[:first_h2]
    sources = [(i + 1, line) for i, line in enumerate(header) if line.startswith('Source:')]
    exports = [(i + 1, line) for i, line in enumerate(header) if line.startswith('Exported:')]
    if len(sources) != 1 or not re.fullmatch(r'Source: `[^`\r\n]+`', sources[0][1]):
        E(1, 'header needs exactly one nonempty Source: `origin`')
    if len(exports) != 1:
        E(1, 'header needs exactly one Exported: UTC timestamp')
    else:
        try:
            stamp = exports[0][1].split(':', 1)[1].strip()
            if not re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z', stamp):
                raise ValueError('not RFC3339 UTC')
            datetime.fromisoformat(stamp.replace('Z', '+00:00'))
        except ValueError:
            E(exports[0][0], 'Exported must be a valid RFC3339 UTC timestamp')
    for s in SECTIONS:
        if s not in doc["sections"]:
            E(0, f"missing required section '## {s}'")
    actual = [s for s in doc['sections'] if s in SECTIONS]
    if actual != [s for s in SECTIONS if s in doc['sections']]:
        E(0, 'required section order does not match document-format.md')
    for i, l in enumerate(lines):
        if re.search(r"\b(TBD|TODO|FIXME|\?\?\?)\b", l):
            E(i + 1, f"placeholder left in document: {l.strip()[:60]}")

    for h in ("### In Scope", "### Out Of Scope"):
        if h not in text:
            E(0, f"missing '{h}'")
        elif not re.search(re.escape(h) + r"\n+(- .+)", text):
            E(0, f"'{h}' has no bullets")
    for h in ("## Users / Actors", "## Key Constraints"):
        if h in text and not re.search(re.escape(h) + r"\n+(- .+)", text):
            E(0, f"'{h}' has no bullets")

    # count occurrences as parsed — dict keys would silently swallow duplicates
    ids = Counter(doc["seen"])
    for i, n in sorted(ids.items()):
        if n > 1:
            E(0, f"duplicate ID {i} ({n} occurrences)")

    prios = set()
    if not doc["features"]:
        E(0, "no features defined")
    for fid, f in doc["features"].items():
        for field in ('priority', 'status'):
            if field not in f['fields']:
                E(f['line'], f"{fid} missing '- {field.title()}:' field")
        if not f["reqs"]:
            E(f["line"], f"{fid} has no requirements — write them or delete the feature")
        if not any("intent" in b.lower() or len(b) > 30 for b in f["body"]):
            W(f["line"], f"{fid} has no Intent paragraph")
        prios.add(f["fields"].get("priority", "").lower())

    for rid, r in doc["reqs"].items():
        fl, ln, body = r["fields"], r["line"], r["text"]
        for k in ("feature", "kind", "priority", "status"):
            if k not in fl:
                E(ln, f"{rid} missing '- {k.title()}:' field")
        prios.add(fl.get("priority", "").lower())
        kind = fl.get("kind", "").lower()
        if kind and kind not in KINDS:
            E(ln, f"{rid} Kind '{fl['kind']}' not in {sorted(KINDS)}")
        if (fk := fl.get("feature")) and fk != r["feature"]:
            E(ln, f"{rid} declares Feature {fk} but sits under {r['feature']}")
        if fk and fk not in doc["features"]:
            E(ln, f"{rid} references unknown feature {fk}")
        if not r["acs"]:
            E(ln, f"{rid} has no acceptance criteria")
        clean = re.sub(r"^\[Source:[^\]]*\]\s*", "", body).strip()
        if not clean:
            E(ln, f"{rid} has no requirement text")
            continue
        n_shall = len(re.findall(r"\bSHALL\b|\bshall\b", clean))
        if n_shall == 0:
            E(ln, f"{rid} has no 'shall' — not an obligation")
        elif n_shall > 2:
            E(ln, f"{rid} has {n_shall} 'shall' clauses — split it")
        elif n_shall == 2 and not re.search(r"(and|hoặc|và|;)\s+(shall|SHALL)\b", clean):
            W(ln, f"{rid} has 2 unjoined 'shall' clauses — split it")
        low = clean.lower()
        if kind in TRIGGERS and not re.match(TRIGGERS[kind], low):
            E(ln, f"{rid} Kind={fl['kind']} but does not open with its EARS trigger")
        if kind == "ubiquitous" and re.match(UBIQUITOUS_BAD, low):
            E(ln, f"{rid} Kind=Ubiquitous but opens with a trigger word — reclassify")
        if len(clean.split()) > 45:
            W(ln, f"{rid} is {len(clean.split())} words — over 45, likely two requirements")
        for v in VAGUE:
            if v in low:
                W(ln, f"{rid} contains ambiguous term '{v.strip()}'")

    for aid, a in doc["acs"].items():
        joined = " ".join(a["body"])
        if not a["req"]:
            E(a["line"], f"{aid} is not attached to any requirement")
        for kw in ("Given", "When", "Then"):
            if not re.search(rf"(^|\n)\s*{kw}\b", "\n".join(a["body"])):
                E(a["line"], f"{aid} missing '{kw}' clause")
        if len(joined.split()) < 8:
            W(a["line"], f"{aid} is too thin to test")

    for ln, c in doc["chars"]:
        if c.lower() not in ISO:
            W(ln, f"quality characteristic '{c}' is not an ISO 25010 characteristic")
    for nid, n in doc["nfrs"].items():
        ln = n["line"]
        prios.add(n['fields'].get('priority', '').lower())
        if "metric" not in n["fields"]:
            E(ln, f"{nid} missing '- Metric:' field")
        else:
            m = n["fields"]["metric"]
            if not re.search(r"\d", m) and not re.search(
                    r"\b(zero|no |pass|fail|every|all |each |none|succeed|verif)", m.lower()):
                W(ln, f"{nid} Metric has no number or pass/fail procedure")
            elif len(m.split()) < 6:
                W(ln, f"{nid} Metric is a bare threshold — name what is measured, "
                      "how, and under which load or window")
        for k in ("priority", "status"):
            if k not in n["fields"]:
                E(ln, f"{nid} missing '- {k.title()}:' field")
        if "shall" not in n["text"].lower():
            W(ln, f"{nid} statement has no 'shall'")
        for v in VAGUE:
            if v in n["text"].lower():
                W(ln, f"{nid} contains ambiguous term '{v.strip()}'")

    for did, d in doc["adrs"].items():
        for h in ("Context", "Decision", "Consequences"):
            if h not in d["heads"]:
                E(d["line"], f"{did} missing '{h}' section")
        if not any(b.lower().startswith("status:") for b in d["body"]):
            E(d["line"], f"{did} missing 'Status:' line")
        statuses = [b.split(':', 1)[1].strip() for b in d['body'] if b.lower().startswith('status:')]
        if len(statuses) > 1:
            E(d['line'], f'{did} duplicate Status field')
        for status in statuses:
            if status not in {'Proposed', 'Accepted', 'Rejected'} and not re.fullmatch(r'Superseded by ADR-\d{3,}', status):
                E(d['line'], f"{did} invalid ADR status '{status}'")
            elif status.startswith('Superseded by ') and status.split()[-1] not in doc['adrs']:
                E(d['line'], f'{did} references a missing superseding ADR')

    for group in ('features', 'reqs', 'nfrs'):
        for identity, row in doc[group].items():
            status = row['fields'].get('status', '').lower()
            if status and status not in STATUSES:
                E(row['line'], f"{identity} invalid Status '{status}'")

    prios = {p for p in prios if p}
    if prios & MOSCOW and prios & SEVERITY:
        E(0, f"mixed priority vocabularies: {sorted(prios)}")
    bad = prios - MOSCOW - SEVERITY
    if bad:
        E(0, f"unrecognised priority values: {sorted(bad)}")

    for pre, group in (("F", "features"), ("REQ", "reqs")):
        nums = sorted(int(m.group(1)) for k in doc[group]
                      if (m := re.match(rf"^{pre}-(\d+)$", k)))
        if nums and nums != list(range(1, len(nums) + 1)):
            W(0, f"{pre} IDs have gaps — expected if entries were retired, "
                 "otherwise a copy/paste slip. Never renumber to close a gap.")

    if not re.search(r"^## (Assumptions|Open Questions|Sources)", text, re.M):
        W(0, "no 'Assumptions and Open Questions' section — record what was "
             "supplied vs invented, or a reader cannot tell which is which")


def validate(lines):
    """Validate one document; each call owns fresh diagnostics."""
    err.clear()
    warn.clear()
    normalized = structural_lines(lines)
    doc = parse(normalized)
    check(doc, normalized)
    return doc, list(err), list(warn)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('path')
    parser.add_argument('--quiet', action='store_true')
    parser.add_argument('--catalog-json', action='store_true', help='emit structural inventory only; not semantic approval')
    parser.add_argument('--baseline', help='prior SRS; removed IDs require --retired')
    parser.add_argument('--retired', help='JSON array of explicitly retired source IDs')
    args = parser.parse_args()
    path = args.path
    try:
        if Path(path).stat().st_size > 2 * 1024 * 1024:
            raise ValueError('document exceeds the 2 MiB parser guardrail')
        lines = Path(path).read_text(encoding='utf-8-sig').splitlines()
        previous = None
        if args.baseline:
            previous, errors, _ = validate(Path(args.baseline).read_text(encoding='utf-8-sig').splitlines())
            if errors:
                raise ValueError('baseline does not validate; use an explicit reviewed migration')
        doc, _, _ = validate(lines)
        if previous:
            retired = json.loads(Path(args.retired).read_text()) if args.retired else []
            if not isinstance(retired, list) or any(not isinstance(x, str) for x in retired) or len(set(retired)) != len(retired):
                raise ValueError('retired IDs must be a unique string array')
            removed = set(previous['seen']) - set(doc['seen'])
            if set(retired) - removed:
                E(0, 'retired IDs include unknown or still-present IDs')
            for identity in sorted(removed - set(retired)):
                E(0, f'{identity} removed without explicit retirement; never renumber existing IDs')
            for identity in previous['acs'].keys() & doc['acs'].keys():
                if previous['acs'][identity]['req'] != doc['acs'][identity]['req']:
                    E(doc['acs'][identity]['line'], f'{identity} changed parent requirement')
    except (OSError, UnicodeError, ValueError) as error:
        print(f'{path}:0: ERROR: {error}')
        return 1

    if args.catalog_json:
        def issues(values):
            return [{'line': line, 'message': message,
                     'id': hashlib.sha256(f'{line}:{message}'.encode()).hexdigest()}
                    for line, message in values]
        criteria = [{'id': identity, 'requirementId': row['req'], 'kind': 'AC'}
                    for identity, row in doc['acs'].items()]
        criteria += [{'id': identity, 'requirementId': None, 'kind': 'NFR'} for identity in doc['nfrs']]
        print(json.dumps({'contract': 'requirements-catalog/1', 'valid': not err,
                          'semanticApproval': False, 'sourceSha256': hashlib.sha256(Path(path).read_bytes()).hexdigest(),
                          'requirementIds': list(doc['reqs']), 'criteria': criteria,
                          'featureIds': list(doc['features']), 'errors': issues(err), 'warnings': issues(warn)}, ensure_ascii=False))
        return 1 if err else 0

    for label, items in (("ERROR", err), ("WARN", warn)):
        for ln, m in sorted(items):
            print(f"{path}:{ln}: {label}: {m}")
    n_req = len(doc["reqs"])
    covered = sum(1 for r in doc["reqs"].values() if r["acs"])
    pct = f"{covered / n_req * 100:.0f}%" if n_req else "n/a"
    print(f"\n{path}: {len(doc['features'])} features, {n_req} requirements, "
          f"{len(doc['acs'])} ACs, {len(doc['nfrs'])} NFRs, {len(doc['adrs'])} ADRs")
    print(f"REQ->AC coverage: {covered}/{n_req} ({pct})")
    print(f"{len(err)} error(s), {len(warn)} warning(s)")
    if not args.quiet:
        print("\nMANUAL (this script cannot check these — see references/audit.md):"
          "\n  scope correctness · credibility of every threshold · missing domain"
          "\n  rules · who authorised each priority and Accepted status")
    return 1 if err else 0


if __name__ == "__main__":
    sys.exit(main())
