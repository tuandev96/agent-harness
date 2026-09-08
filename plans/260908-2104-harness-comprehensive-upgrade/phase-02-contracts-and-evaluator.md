# Phase 02 — Contract, fixtures và evaluator thuần

Status: NOT_STARTED
Assignee: UNASSIGNED
Independent reviewer: UNASSIGNED
Authority: phải khớp slice triển khai được duyệt; yêu cầu lập plan chưa cấp quyền thực thi phase này.

## Mục tiêu

Chuyển hợp đồng tracking thành mã tính trạng thái kiểm thử được; chạy shadow cho đến khi producer/quyền hạn ở phase 03 có bằng chứng.

## Việc thực hiện

- Định nghĩa JSON Schema có version cho baseline, policy, mapping, run, review, finding, ledger, transition/head và receipt. Schema chỉ kiểm cấu trúc; evaluator kiểm quan hệ và ngữ nghĩa.
- Tạo fixture hoàn chỉnh từ spec nhỏ đến release-ready, cùng các fixture âm; không chỉ validate template rỗng. Có test hash-cycle, traversal, symlink escape, byte/hash mismatch và schema version không hỗ trợ.
- Implement hàm thuần derive criterion/REQ/gate theo precedence: current FAIL thắng old PASS; stale giữ lịch sử; NOT_RUN không bị đổi thành BLOCKED giả; zero target không VERIFIED.
- Kiểm inventory toàn phần và target per-AC/NFR; mapping có assertions/collection/profile; zero collection, skip/cancel/missing binding không tạo PASS.
- Snapshot input chỉ gồm phần đóng góp: code, tests, locks, config, fixture, toolchain/harness. Report-only edit không làm invalidate runtime vô cớ; unmapped inputs cần triage.
- API evaluator nhận observations đã có provenance classification; không tự tin trường verified trong JSON do worker đưa. Mọi output có reason codes và source digest; chưa nối nó vào gate cưỡng chế.

## Files / interfaces

Đề xuất: `contracts/requirements-tracking/1/`, `src/core/evaluator/`, `src/core/refs/`, `tests/contract/`, `tests/property/`, `tests/fixtures/tracking/`.
Giữ portable format `requirements-tracking/1` khi không đổi semantics; nếu đổi, viết version/migration rõ ràng.

## Tiêu chí nghiệm thu đề xuất

- [ ] Tất cả invariant UPG-03..UPG-09 có positive/negative fixtures; derived result deterministic cho cùng inputs.
- [ ] Run PASS thiếu independent review vẫn gate_ready=false; NFR thiếu vẫn chặn RELEASE.
- [ ] Không self hash/cycle/backpatch; field không hỗ trợ hoặc provenance unresolved tạo lý do đóng gate.
- [ ] Báo riêng schema validation, evaluator tests, shadow assessment; không gọi checker self-test là product acceptance.

## Bằng chứng cần lưu

Actual command/invocation; candidate/input hash; fixture/profile; expected vs observed assertions; exit/collection/skips; artifact refs; independent review và reason codes. Logs thuộc plan/report, không chèn evidence vào frozen SRS. Không đánh dấu checkbox dựa trên code đọc thấy hợp lý.

## Stop / rollback

Evaluator phát triển không tự ký nhận tính đúng của nó. Duyệt bootstrap bằng protocol hiện hành và reviewer thực; không dùng candidate policy để tự nới gate.
