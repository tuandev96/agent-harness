# Phase 06 — Portability, memory và cài đặt

Status: IN_PROGRESS — implementation and acceptance tracked separately
Assignee: UNASSIGNED
Independent reviewer: UNASSIGNED
Authority: phải khớp slice triển khai được duyệt; yêu cầu lập plan chưa cấp quyền thực thi phase này.

## Mục tiêu

Chia sẻ quy tắc và bằng chứng, không port các seam nội bộ DSH sang agent khác.

## Việc thực hiện

- Lập capability matrix cho từng runtime/version/platform: read-only, pre-execute gate, cancel, evidence capture, reviewer, merge/release. Khai báo supported chỉ theo test, không theo README chung.
- Dùng native tools/approvals/session semantics; adapter gọi evaluator/recorder khi hook thật có sẵn. Trường hợp prompt-only giữ ASSISTED và không giả block quyền shell của host.
- Memory chỉ là context có provenance, scope, thời điểm và trạng thái đã kiểm chứng; đọc lại facts đang thay đổi. Memory không cấp quyền hay tái dùng credentials/approval cũ; note sai được supersede/tombstone.
- Xử lý nội dung tool/web/spec/memory không tin cậy như dữ liệu; kiểm thử prompt injection đề nghị sửa evaluator, tiết lộ secret hoặc tự approve. Không log hidden chain-of-thought; chỉ trace sự kiện, tool result và artifact được phép.
- Doctor kiểm version/pin/drift, link lỗi, unsupported capabilities và stale report. Observability có task/attempt/run/review correlation và retention rõ ràng.
- Installer mặc định dry-run: preview diff, merge snippet nhỏ, backup và rollback; quản lý symlink an toàn, không copy toàn bộ runtime home. Release manifest pin dependency/build/tool schema và nguồn skill.

## Files / interfaces

Đề xuất: `adapters/{claude-code,codex,grok,cursor}/`, `src/core/memory/`, `src/core/telemetry/`, `scripts/install/`, `docs/compatibility.md`, `docs/runbooks/`.
Hiện hữu: `AGENTS.md`, `README.md`, `memory/INDEX.md`, `.gitignore`; không đưa note cá nhân vào Git.

## Tiêu chí nghiệm thu đề xuất

- [ ] Mỗi adapter advertised có real smoke evidence, phiên bản và quyền hạn chính xác; không-supported giữ trạng thái rõ.
- [ ] Installed skill thay đổi không đổi policy pin của project; reinstall không ghi đè user edits và rollback khôi phục bytes.
- [ ] Poisoned/stale/cross-project memory không mở gate/permission; lesson chưa verified không được promote.
- [ ] Report/telemetry không lộ secret hay nội dung ngoài scope; static report hiển thị source hash và freshness.

## Bằng chứng cần lưu

Actual command/invocation; candidate/input hash; fixture/profile; expected vs observed assertions; exit/collection/skips; artifact refs; independent review và reason codes. Logs thuộc plan/report, không chèn evidence vào frozen SRS. Không đánh dấu checkbox dựa trên code đọc thấy hợp lý.

## Stop / rollback

Matrix và yêu cầu live test còn cần platform thực. Không auto-install toàn máy để “chứng minh portable”; không tạo watcher hay gửi dữ liệu telemetry ra ngoài mặc định.

## Current implementation evidence pointer

See `reports/current-progress.md` and `reports/current-status.json` for source presence and current checker outputs. No unchecked acceptance criterion is promoted solely by this status update. External/native/review gates require independent evidence.
