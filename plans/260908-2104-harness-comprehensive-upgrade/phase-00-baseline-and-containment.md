# Phase 00 — Baseline, threat model và lỗi ưu tiên cao

Status: IN_PROGRESS — implementation and acceptance tracked separately
Assignee: UNASSIGNED
Independent reviewer: UNASSIGNED
Authority: phải khớp slice triển khai được duyệt; yêu cầu lập plan chưa cấp quyền thực thi phase này.

## Mục tiêu

Không dùng refactor lớn để che lấp lỗi đã biết. Chốt inventory/hash, mô hình đe dọa và regression trước khi đổi đường điều phối.

## Việc thực hiện

- Đối chiếu entrypoint thực sự được load; ghi SHA của source/build, tool/runtime version và cấu hình không chứa secret. Đọc lại diff vì repo có thể đổi giữa các phiên.
- Chuyển các phát hiện deliveryCheck, autoAdvance, timeout/cancel, replay exporter và streak reset thành test hành vi; ghi rõ test mock và test DSH thực.
- Bổ sung phép kiểm thử hợp lệ: UTF-8 biên 64KiB, binary artifact, page visual evidence thật; không dùng một text-file gate cho mọi loại output.
- Chặn đường “text result/reviewed:true là proof”; trước khi có evaluator đầy đủ, phản hồi EVIDENCE_PENDING/UNVERIFIED thay vì quảng bá PASS. Không biến audit/read-only thành yêu cầu tạo artifact hoặc quyền ghi.
- Vá nhanh signal kết hợp deadline/caller, cleanup exporter/counters; containment admin surface nếu không xác minh được host auth. Không kết luận có RCE hoặc sandbox escape khi chưa tái hiện.
- Phân loại trust: lỗi vô ý, worker bị prompt injection, local principal độc hại, compromised dependency và remote MCP. Ghi rõ lớp nào chỉ giám sát, lớp nào thật sự cưỡng chế.

## Files / interfaces

Hiện hữu: `.agent-presets/router-standard/router-bootstrap-v34.mjs`, bản không version đang trùng logic, `gitbash-executor.mjs`; `vendor/dsh-tool-arg-coerce/lib/index.js`; `vendor/dsh-replay-dedup/src/index.ts` và output build; `vendor/dsh-mcp-settings/src/index.js`.
Đề xuất mới: `tests/regression/`, `docs/threat-model.md`, baseline report trong plan.

## Tiêu chí nghiệm thu đề xuất

- [ ] Mỗi lỗi ưu tiên có reproduction thất bại trước vá và regression đạt sau vá; hợp lệ không bị chặn nhầm.
- [ ] Caller cancel và deadline dừng đúng subprocess/process tree trên platform đã kiểm thử, trả phân biệt CANCELLED/TIMED_OUT/UNKNOWN.
- [ ] Hai exporter đều nhận cảnh báo đầu; dispose khôi phục; fail→success→fail không bị coi là streak liên tục.
- [ ] Baseline có environment/input hashes và không có secret; không có tuyên bố integration PASS từ mock.

## Bằng chứng cần lưu

Actual command/invocation; candidate/input hash; fixture/profile; expected vs observed assertions; exit/collection/skips; artifact refs; independent review và reason codes. Logs thuộc plan/report, không chèn evidence vào frozen SRS. Không đánh dấu checkbox dựa trên code đọc thấy hợp lý.

## Stop / rollback

Chưa được phép tự đổi runtime trong task lập plan. Sau này chỉ rollback bản vá qua revision đã lưu, không xóa logs hoặc gọi lại mutation không rõ outcome.

## Current implementation evidence pointer

See `reports/current-progress.md` and `reports/current-status.json` for source presence and current checker outputs. No unchecked acceptance criterion is promoted solely by this status update. External/native/review gates require independent evidence.
