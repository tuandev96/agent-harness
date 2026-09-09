# Phase 05 — DSH adapter, router và plugin

Status: IN_PROGRESS — implementation and acceptance tracked separately
Assignee: UNASSIGNED
Independent reviewer: UNASSIGNED
Authority: phải khớp slice triển khai được duyệt; yêu cầu lập plan chưa cấp quyền thực thi phase này.

## Mục tiêu

Dùng core cho kiểm chứng/quyền hạn; giữ router chỉ phục vụ khám phá tool, giảm shim và bản code trùng.

## Việc thực hiện

- Tách definitions/handlers/meta tools dùng chung; giữ wrapper entrypoint version cũ trong giai đoạn migration. Loại patch trực tiếp registry internals khi có API được hỗ trợ; capability thiếu phải báo rõ.
- Giữ toàn bộ runtime safety context; không xóa `contexts` trong router-spec. Cho phép probe read-only ở giai đoạn khảo sát, không buộc “đã phát triển” mới được chạy test baseline.
- Tool visibility không phải permission; restrict error không được mở quyền. Stage không thay policy. Developer reload là protected control operation, không gọi chéo session hoặc đổi policy đang tự đánh giá.
- MCP admin API: xác minh host auth boundary, Origin/Host/CSRF theo transport thực, request size limit, response redaction, credential ref thay secret trong list; không lấy yêu cầu MCP protocol áp bừa cho mọi route REST.
- Store invalid/corrupt thì không seed-empty rồi ghi đè; atomic write và lỗi disk không đổi trạng thái RAM thành đã lưu. Reconnect/mount có timeout, disposal và lỗi rõ ràng.
- Hoàn thiện coerce streak lifecycle, per-exporter dedup/restore, map bounds/TTL. Test client draft errors, pending/network offline, keyboard/focus và route compatibility.

## Files / interfaces

Hiện hữu: `.agent-presets/router-standard/**`, `.agent-presets/router-spec/**`, `vendor/dsh-mcp-settings/{src,lib,tests,scripts}/`, `vendor/dsh-tool-arg-coerce/**`, `vendor/dsh-replay-dedup/**`.
Đề xuất: `adapters/dsh/`, `tests/integration/dsh/`, `tests/security/mcp-admin/`, `tests/ui/mcp-settings/`.

## Tiêu chí nghiệm thu đề xuất

- [ ] Native DSH thực chạy task tích hợp, receive/cancel/restart và complete gated; fake call success không advance.
- [ ] State/admin changes sai quyền không có mutation; MCP list/log không lộ secret, corrupt store giữ dữ liệu gốc.
- [ ] Mount failure, timeout, dispose/remount không orphan tool/exporter và không treo toàn queue vô hạn.
- [ ] Old entrypoint/new core parity có bằng chứng; generated lib khớp source build; UI được xem thực nếu là AC.

## Bằng chứng cần lưu

Actual command/invocation; candidate/input hash; fixture/profile; expected vs observed assertions; exit/collection/skips; artifact refs; independent review và reason codes. Logs thuộc plan/report, không chèn evidence vào frozen SRS. Không đánh dấu checkbox dựa trên code đọc thấy hợp lý.

## Stop / rollback

Middleware host chưa được kiểm thử không được gọi an toàn hoặc vulnerable chắc chắn. Không bật server mới, sửa live credentials hay reload session người khác trong task docs.

## Current implementation evidence pointer

See `reports/current-progress.md` and `reports/current-status.json` for source presence and current checker outputs. No unchecked acceptance criterion is promoted solely by this status update. External/native/review gates require independent evidence.
