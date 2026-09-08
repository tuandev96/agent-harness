# Phase 07 — Evals, hiệu năng và chi phí

Status: NOT_STARTED
Assignee: UNASSIGNED
Independent reviewer: UNASSIGNED
Authority: phải khớp slice triển khai được duyệt; yêu cầu lập plan chưa cấp quyền thực thi phase này.

## Mục tiêu

Chỉ giữ lớp điều phối tạo kết quả tốt hơn trên cùng nhiệm vụ, môi trường và budget.

## Việc thực hiện

- Tạo bộ task từ regression và việc thật đã khử dữ liệu nhạy cảm; khởi đầu đề xuất 20–50 task, nhiều lần chạy độc lập. Số lần và budget cần được chốt trước model calls trả phí.
- So sánh minimal protocol, router-standard, router-spec và candidate upgraded; cùng model/route/settings/budget/environment. Tách baseline lịch sử khỏi measurement mới.
- Graders ưu tiên effect/state và AC; thêm rubric UI/semantics có calibration. Kiểm grader với reference success và known-bad output; không thưởng chỉ vì gọi đúng tool hay nói đã làm.
- Đo task accepted success, false completion, unauthorized effects, cancel/recovery, over-asking, excessive ceremony, total latency/p95 overhead, tokens/cost per accepted task và cache hit quan sát được.
- Tách capability suite và regression suite; held-out tasks tránh tối ưu vào mẫu; lưu variance/confidence intervals và failed traces. Candidate tệ hơn hoặc chưa đủ dữ liệu không được marketing là nâng cấp.
- Áp budget/limits/backpressure thực, không dựa prompt “tối đa 2 lần”. Ngưỡng NFR dựa workload và baseline chứ không tự chọn số đẹp.

## Files / interfaces

Đề xuất: `evals/{tasks,graders,profiles}/`, `tests/performance/`, `docs/evaluation-method.md`, reports theo candidate/model/policy hash.
Tool command/benchmark runner chỉ ghi là thực thi sau khi có code và log thật.

## Tiêu chí nghiệm thu đề xuất

- [ ] Suite có cả task nên hỏi và không nên hỏi, cần tracking và task nhỏ, read-only và mutation có quyền.
- [ ] Grader bác được fake completion, test weakening và report-only evidence; accept được giải pháp hợp lệ khác đường triển khai mẫu.
- [ ] Báo kèm mẫu số, repetitions, environment, số lỗi/flakes, chi phí và giới hạn suy luận; không chọn best-of-run để che failure.
- [ ] NFR và paid-run budget được chấp thuận trước release/eval tương ứng; không có benchmark fabricated.

## Bằng chứng cần lưu

Actual command/invocation; candidate/input hash; fixture/profile; expected vs observed assertions; exit/collection/skips; artifact refs; independent review và reason codes. Logs thuộc plan/report, không chèn evidence vào frozen SRS. Không đánh dấu checkbox dựa trên code đọc thấy hợp lý.

## Stop / rollback

Không kết luận “model rẻ bằng model frontier” từ lời bình/router persona. Không chạy paid models hoặc benchmark public submissions trong task plan.
