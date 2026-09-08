# Phase 01 — Tích hợp skill và gia cố đặc tả

Status: NOT_STARTED
Assignee: UNASSIGNED
Independent reviewer: UNASSIGNED
Authority: phải khớp slice triển khai được duyệt; yêu cầu lập plan chưa cấp quyền thực thi phase này.

## Mục tiêu

Đưa vào repo dưới dạng nguồn có pin/version, không reinstall global ngay và không áp toàn bộ thủ tục tracking cho task nhỏ.

## Việc thực hiện

- Import candidate ZIP vào `skills/requirements-spec/` sau phê duyệt; ghi origin, version, input hash và lịch sử delta. Kiểm tra license/origin trước phát hành công khai.
- Giữ API Python hiện có; thay parsing phẳng bằng cây subset SRS có phạm vi heading rõ và bỏ qua fenced examples. Chặn header/section order sai, duplicate field, unknown status, AC ngoài REQ và mixed priority trên cả NFR.
- Đưa 8 probe đã chạy vào regression; thêm CRLF/BOM, Unicode/Vietnamese, ID continuity qua update, malformed nesting, duplicate headings, valid retired IDs và tài liệu lớn có giới hạn.
- Đổi ADR template mặc định Proposed. Hợp nhất vocabulary với tài liệu; một source cho schema/enum. Tách progress khỏi frozen SRS: legacy Status không là evidence; trạng thái implementation chỉ là projection của work source/ledger.
- Gỡ ngôn từ quotas 8–14 feature/12–20 NFR/10–18 ADR khỏi hard bar; giữ thành heuristic. Sửa ví dụ encrypt+redact vì hai thuộc tính có thể đạt/rớt độc lập; chọn edition ISO và ghi rõ extension.
- Tạo entrypoint ngắn chọn authoring/audit/tracking. Task nhỏ dùng task-spec hiện hữu với scope+AC; feature/release mới dùng SRS; chỉ khởi tạo tracking khi được yêu cầu. Không rename ID nguồn để hợp một template mới.

## Files / interfaces

Hiện hữu: `AGENTS.md`, `templates/task-spec.md`, `templates/reviewer-prompt.md`, `README.md`.
Đề xuất: `skills/requirements-spec/**`, `skills/requirements-spec/manifest.json`, `tests/spec-authoring/**`. Không đụng `~/.agents` hoặc `~/.claude` trong phase import repo.

## Tiêu chí nghiệm thu đề xuất

- [ ] Self-test cũ vẫn đạt; cả 8 malformed probes bị từ chối đúng lỗi và line; tài liệu hợp lệ mới/cũ được xử lý theo profile được công bố.
- [ ] Code fence không tạo REQ/AC giả; cập nhật không âm thầm renumber; warnings có disposition, không bị đổi thành semantic PASS.
- [ ] Template mới không tự Accepted/Verified; liên kết tương đối tồn tại; skill version không tự sửa project pin.
- [ ] Native user request “audit/spec only” không tạo tracker/product/CI hoặc thực hiện mutation ngoài phạm vi.

## Bằng chứng cần lưu

Actual command/invocation; candidate/input hash; fixture/profile; expected vs observed assertions; exit/collection/skips; artifact refs; independent review và reason codes. Logs thuộc plan/report, không chèn evidence vào frozen SRS. Không đánh dấu checkbox dựa trên code đọc thấy hợp lý.

## Stop / rollback

Đổi format hoặc status semantics phải có compatibility/migration; không rewrite frozen SRS. Chuẩn bị Proposed spec cho chính harness trước bước runtime tương ứng, chưa freeze thay người dùng.
