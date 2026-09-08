# Phase 04 — Lifecycle, hủy/retry và publication bền vững

Status: NOT_STARTED
Assignee: UNASSIGNED
Independent reviewer: UNASSIGNED
Authority: phải khớp slice triển khai được duyệt; yêu cầu lập plan chưa cấp quyền thực thi phase này.

## Mục tiêu

Phân biệt session, task, attempt, revision và outcome; xử lý concurrency bằng transaction thực thay vì hướng dẫn single-writer.

## Việc thực hiện

- Tạo task state machine với DRAFT/READY/RUNNING/WAITING_REVIEW/BLOCKED/CANCEL_REQUESTED/CANCELLED/COMPLETED; transition chạy với task+revision+execution identity cụ thể. Goal complete cũng đi qua gate, không chỉ model action name.
- Mỗi tool attempt có dispatch/execution/outcome; tên tool hoặc tool/call event không đủ cho phase progress. Thiếu calling context thì fail rõ ràng, không chọn agent cuối Map.
- Reconcile timeout sau possible effect thành UNKNOWN, không blind retry. Bounded retry theo operation class/idempotency; không hứa exactly-once cho provider không hỗ trợ hoặc không có oracle.
- Dùng transactional state single-host đề xuất SQLite; check expected parent và epoch trong transaction. Worker gửi delta; coordinator publication có CAS/fencing, append-only history và independent anchor phù hợp trust profile.
- Persist artifact bền vững trước khi commit refs; JSON/head là projection hoặc export của transaction. Crash giữa stages phát hiện orphan, không công nhận artifact chưa durable; không dùng timestamp chọn fork thắng.
- Cancel truyền xuống process tree và hàng đợi, phân biệt trước/sau point-of-no-return; restart khôi phục task/capabilities/cancel intent mà không replay mutation nguy hiểm.

## Files / interfaces

Đề xuất: `src/core/task/`, `src/core/execution/`, `src/core/publication/`, `src/storage/`, `tests/fault/`, `tests/concurrency/`.
Thay adapter state JSON hiện tại chỉ sau test migration; giữ snapshot legacy stage/goal và ghi rõ evidence chưa có.

## Tiêu chí nghiệm thu đề xuất

- [ ] Hai writer cùng parent có tối đa một successor accepted; stale epoch không ghi; initial assignment và handoff đúng contract.
- [ ] Kill process tại từng checkpoint, reopen và đối chiếu head/state/artifact; không xóa failure để phục hồi.
- [ ] Cancellation và UNKNOWN giữ đúng effect count trong test có oracle; không nhầm CANCELLED với hoàn tác thành công.
- [ ] Session A không advance/reload/complete task B; đổi mục tiêu invalidates approval/evidence liên quan.

## Bằng chứng cần lưu

Actual command/invocation; candidate/input hash; fixture/profile; expected vs observed assertions; exit/collection/skips; artifact refs; independent review và reason codes. Logs thuộc plan/report, không chèn evidence vào frozen SRS. Không đánh dấu checkbox dựa trên code đọc thấy hợp lý.

## Stop / rollback

Không dùng manual JSON publication như atomic service. Quyết định SQLite/transaction API phải được chốt trước coding; legacy import giữ claims lịch sử nhưng không auto-promote PASS.
