# Phương pháp đánh giá harness

Mục tiêu là đánh giá kết quả tác vụ, không thưởng độ dài reasoning hoặc số tool calls.

## Hai loại đánh giá

Repository regression dùng `npm test`: kiểm tra đặc tính xác định của parser, recorder, state store, plugin và công cụ vận hành. Nó không phải benchmark năng lực model.

Model evaluation cần các trial thực và ngân sách được chủ dự án chốt. Công cụ `evals/run.mjs` chỉ tổng hợp observation đã có, không gọi API, không cấp tính xác thực độc lập cho dữ liệu nhập và không tự approve release.

```sh
node evals/run.mjs --input observations.json --output summary.json
```

Dữ liệu dùng format `harness-eval-observations/1`, chứa `tasks`, `repetitions`, `candidates`, `trials`. Mỗi candidate có id, model, provider, environmentDigest, tasksetDigest, budgetDigest, graderDigest, harnessDigest. Mỗi trial có candidate, task, repetition bắt đầu từ 0, oracle PASS/FAIL/BLOCKED/NOT_RUN, reportedDone, unauthorizedEffects, durationMs/costUsd/tokens hoặc null, observationRef.

Trial thiếu vẫn nằm trong mẫu số. Trial trùng bị từ chối. Không chuyển chi phí thiếu thành bằng chứng chi phí bằng không. Chi phí trên một tác vụ đạt gồm chi phí của các trial thất bại, không chỉ các lần thành công.

Chỉ so sánh harness khi model/provider/environment/taskset/budget/grader khớp. Interval Wilson là thống kê mô tả theo trial; nhiều lần trên cùng task có thể tương quan, nên không dùng interval này một mình để tuyên bố superiority.

## Kiểm tra grader

Có reference success, known-bad output, fake completion, zero collection, test bị skip và output spoofing. Giải pháp hợp lệ không phải bắt chước một chuỗi tool cố định. Task bao gồm read-only, nhiệm vụ cần hỏi chủ sở hữu, nhiệm vụ không cần hỏi, thay mục tiêu, hủy và phục hồi sau crash.

Không có model benchmark hoặc tuyên bố tiết kiệm chi phí đã được xác nhận chỉ vì công cụ tổng hợp đã được viết. Summary luôn ghi `IMPORTED_NOT_INDEPENDENTLY_VERIFIED` và `releaseReady:false`.
