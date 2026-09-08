# Phase 08 — CI, migration và phát hành có bằng chứng

Status: NOT_STARTED
Assignee: UNASSIGNED
Independent reviewer: UNASSIGNED
Authority: phải khớp slice triển khai được duyệt; yêu cầu lập plan chưa cấp quyền thực thi phase này.

## Mục tiêu

Biến công cụ local đã kiểm thử thành release gate thực tế, rollout có kiểm soát và khả năng rollback.

## Việc thực hiện

- Thiết lập deterministic contract/security/fault tests, reproducible builds và versioned verifier inputs sau khi được phép. Code worker không tự sửa verifier/required checks để cấp PASS cho chính nó.
- Pin candidate tree và release artifact; build một lần rồi promote cùng digest. Mapping/scope/reviewer đầy đủ cho merge slice; release yêu cầu toàn target AC/NFR và quyền phát hành.
- Quan sát một changeset vi phạm bị required check thật chặn; ghi actual config/authority/admin bypass. Workflow YAML hoặc manual report chưa đủ để ghi ci_enforced=true.
- Migration reader/importer giữ source IDs, policies, failures và immutable legacy snapshot. Legacy PASS thiếu provenance thành UNVERIFIED trong assessment mới nhưng không xóa claim gốc.
- Rollout disabled→shadow→opt-in enforced→default, mỗi bước có entry/exit criteria và rollback drill; không đổi global project pin tự động.
- Hoàn thiện runbook install/upgrade/rollback/recovery/security incident, changelog người dùng, supported matrix và provenance/license inventory; external publish cần quyền cụ thể.

## Files / interfaces

Đề xuất: `.github/workflows/` nếu repo dùng GitHub và có quyền, `scripts/release/`, `scripts/migrate/`, `docs/runbooks/`, `CHANGELOG.md`, release manifests.
Không tạo/đổi branch rules trong bước lập tài liệu.

## Tiêu chí nghiệm thu đề xuất

- [ ] Required-check rejection thực được quan sát; merge candidate/test inputs và release artifact khớp evidence.
- [ ] Migration không reset lịch sử/ID hay tự promote status; thử crash và rollback trên bản sao sanitized.
- [ ] Native/platform/UAT/security/perf gates bắt buộc đã có current evidence và independent review; no-delegate không thành PASS.
- [ ] Hướng dẫn, installer, archive sạch private memory/secrets; owner thực duyệt release đúng scope.

## Bằng chứng cần lưu

Actual command/invocation; candidate/input hash; fixture/profile; expected vs observed assertions; exit/collection/skips; artifact refs; independent review và reason codes. Logs thuộc plan/report, không chèn evidence vào frozen SRS. Không đánh dấu checkbox dựa trên code đọc thấy hợp lý.

## Stop / rollback

Nếu không có quyền CI/branch/release thì kết luận LOCAL_VERIFIED hoặc READY_FOR_REVIEW theo evidence thực, không ghi MERGE/RELEASE PASS.
