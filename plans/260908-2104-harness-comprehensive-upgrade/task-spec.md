# Task Spec — Thực hiện nâng cấp harness

Status: IN_PROGRESS
Source authority: yêu cầu người dùng trong cuộc hội thoại ngày 2026-09-08: “oke giờ tến hành làm mọi thứ theo plan của bạn đề xuất”.
Baseline: a1ef3fd; 12 file plan chưa commit từ lượt trước được giữ nguyên lịch sử.
Executor: ChatGPT, phiên thực hiện hiện tại. Không tự gán reviewer độc lập.

## Goal

Thực hiện toàn bộ phần nâng cấp có thể triển khai và kiểm chứng trong repo theo phase 00–08. Chuyển các lỗi đã audit thành regression, tích hợp skill, xây lõi kiểm chứng/lifecycle và công cụ vận hành. Không biến thiếu bằng chứng thành PASS.

## Scope

In scope: skills/requirements-spec, contracts, src, adapters, tests, evals, scripts, docs, package/build/CI definitions; .agent-presets và ba vendor plugin đã audit; templates/protocol; plan và báo cáo.
Out of scope: code repo khác; secret/config/runtime đang chạy trong ~/.dsh; tự đổi branch protection, commit/push, public release; paid model benchmark chưa có budget; sửa global skills đè user changes. Không tạo worktree.

## Constraints

Giữ work source hiện hữu. Dùng đường dẫn tuyệt đối/kiểm cwd khi chat-fs pin thay đổi giữa phiên. Python validator được giữ; Node/TypeScript và SQLite single-host theo plan được người dùng cho thực hiện. Những ngưỡng giới hạn mặc định là guardrails của implementation, không phải NFR được tự xác nhận.
Reviewer: SKIPPED (policy — Astra self-contained/no-delegate). Independent review/release gate giữ PENDING. ASSISTED là mức tin cậy mặc định; không tuyên bố ENFORCED nếu chưa có isolation và thử nghiệm thực.

## Acceptance criteria

- [ ] AC-IMPL-01: Self-test hiện có được chạy; regression mới bắt đúng lỗi trước sửa và đạt sau sửa; kiểm tra cả positive/negative.
- [ ] AC-IMPL-02: Skill từ ZIP được pin đúng nguồn, validator bắt tám biến thể đã audit, tài liệu hợp lệ vẫn đạt.
- [ ] AC-IMPL-03: Contract/evaluator không cho empty, stale, failed, skipped, forged hoặc thiếu review mở gate; kết quả có reason codes và test.
- [ ] AC-IMPL-04: Recorder chạy subprocess thật, có candidate/inputs và kết quả thực; cancel/deadline/unknown effects được kiểm chứng.
- [ ] AC-IMPL-05: SQLite state/history có CAS/epoch; concurrency và crash recovery được kiểm thử, session/task khác không ghi lẫn.
- [ ] AC-IMPL-06: DSH router/plugins sửa các lỗi ưu tiên, integration adapter được kiểm thử; native capabilities thiếu bằng chứng được ghi rõ.
- [ ] AC-IMPL-07: Installer/migration/doctor/evals/release tooling có test và chế độ an toàn; không tự publish/install global.
- [ ] AC-IMPL-08: Build/typecheck/tests chạy trên worktree, report có scope và nguồn; phase checklist không đánh dấu gate chưa đạt.
- [ ] AC-IMPL-09: Native DSH/UI/Windows, independent review, paid comparative eval và required CI rejection có bằng chứng riêng trước nghiệm thu toàn bộ/release; thiếu giữ BLOCKED/PENDING.

## Checkpoints

Baseline → parser/containment → contracts/core → execution/storage → adapters/plugins → tooling/docs → full checks/self-review. Báo cáo và test artifacts ghi trong reports/ của plan; không đưa log nhạy cảm vào Git.

## Execution log

Lệnh shell ban đầu bị tool chặn; kiểm tra nhỏ `node --version` thành công (v26.8.1). Python 3.14.5; HEAD a1ef3fd. Chưa suy ra bất kỳ product PASS nào từ kiểm tra môi trường này.
