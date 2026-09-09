# Phase 03 — Nguồn bằng chứng, authority và reviewer

Status: IN_PROGRESS — implementation and acceptance tracked separately
Assignee: UNASSIGNED
Independent reviewer: UNASSIGNED
Authority: phải khớp slice triển khai được duyệt; yêu cầu lập plan chưa cấp quyền thực thi phase này.

## Mục tiêu

Làm rõ ai được cấp proof/approval; hash chỉ bảo vệ integrity trong phạm vi trust đã xác định.

## Việc thực hiện

- Tạo execution/evidence recorder do adapter hoặc producer tin cậy quản lý; run_id từ invocation thực, candidate/input hashes chốt trước và sau chạy. Capture collection, exit, assertions và artifact; không nhận stdout tự điền làm execution record.
- Tách trusted record store/control code khỏi quyền ghi của worker ở profile ENFORCED. Local same-user writable store phải gắn ASSISTED/PROVENANCE_UNVERIFIED; không quảng bá tamper resistance từ read-only bit hay process riêng.
- Approval gắn action/scope/revision/actor/source/time; reauthorize khi target thay đổi. External decisions có snapshot và kiểm tra source; không tạo chữ ký thay owner.
- Review context sạch chứa canonical AC, diff, inputs, raw evidence và oracle; registry identity thực, không chấp nhận đổi session label của author. Khác model là lựa chọn tăng đa dạng, không thay identity/provenance.
- Review unavailable/no-delegate/timeout giữ PENDING; self-review được ghi nhãn riêng. Không dùng lần chạy model mới để lách giới hạn runtime.
- Sanitize canary secrets trước khi công bố log; artifact bảo mật lưu đúng phạm vi. Raw sensitive data không được giữ lại chỉ để bảo toàn hash: dùng incident/redaction record và migration được phép.

## Files / interfaces

Đề xuất: `src/core/evidence/`, `src/core/authority/`, `src/core/review/`, `src/cli/`, `tests/security/`, `tests/integration/evidence/`.
Contract CLI/API chỉ được công bố sau khi executable tồn tại; plan này không giả định lệnh `harness verify` đã cài.

## Tiêu chí nghiệm thu đề xuất

- [ ] Fake JSON/log/hash, reused approval trên diff khác, fake reviewer identity đều không mở gate.
- [ ] Invocation thật được phép có đường positive tới accepted evidence; output artifact/input hashes khớp.
- [ ] Worker không sửa được producer/control inputs trong profile ENFORCED được kiểm thử; nếu thiếu isolation, downgrade rõ ràng.
- [ ] Thiếu reviewer vẫn giữ gate phụ thuộc pending; dữ liệu secret canary không xuất hiện ở response/report/log được chia sẻ.

## Bằng chứng cần lưu

Actual command/invocation; candidate/input hash; fixture/profile; expected vs observed assertions; exit/collection/skips; artifact refs; independent review và reason codes. Logs thuộc plan/report, không chèn evidence vào frozen SRS. Không đánh dấu checkbox dựa trên code đọc thấy hợp lý.

## Stop / rollback

Quyền producer, external anchor và cách vận hành reviewer chưa được người dùng chốt. Không tự cấu hình CI, tài khoản, khóa hoặc API trả phí để tạo authority.

## Current implementation evidence pointer

See `reports/current-progress.md` and `reports/current-status.json` for source presence and current checker outputs. No unchecked acceptance criterion is promoted solely by this status update. External/native/review gates require independent evidence.
