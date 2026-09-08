# Ma trận 24 kiểm soát nghiệm thu đề xuất

Status: PROPOSED / NOT_ASSESSED. Đây là control IDs của plan, không phải REQ/AC đã freeze. Mỗi kiểm soát cần cả test từ chối trường hợp sai và test cho phép trường hợp đúng. Chi tiết source mapping và oracle mở rộng nằm trong bundle đánh giá.

| ID | Điều kiện phải chứng minh | Phase |
|---|---|---|
| UPG-01 | Parser reject malformed headings/fences/enums/AC ownership; valid fixtures vẫn đạt | 01 |
| UPG-02 | Stable IDs, inventory đầy đủ và target/deferred/unresolved rõ | 01–02 |
| UPG-03 | Template rỗng hoặc target rỗng không tạo VERIFIED | 02 |
| UPG-04 | Mapping/assertion/profile/collection thiếu, zero, skip/cancel không PASS | 02 |
| UPG-05 | Input đóng góp thay đổi làm evidence STALE nhưng giữ lịch sử | 02 |
| UPG-06 | Report-only edit không vô cớ invalidate runtime evidence | 02 |
| UPG-07 | Current required FAIL thắng historical PASS | 02 |
| UPG-08 | Worker không tự nới policy/scope/threshold/profile để approve mình | 02–03 |
| UPG-09 | JSON/log/hash tự khai không thay trusted execution observation | 03 |
| UPG-10 | Reviewer identity độc lập; timeout/no-delegate/unavailable giữ pending | 03 |
| UPG-11 | Approval gắn đúng task/revision/action; quyền rõ không bị hỏi lặp | 03 |
| UPG-12 | Hai writer cùng parent chỉ một successor accepted; stale epoch bị fence | 04 |
| UPG-13 | Crash recovery giữ head đáng tin; orphan/fork không chọn theo timestamp | 04 |
| UPG-14 | Deadline/caller cancel tới process tree; outcome phản ánh side effect | 00/04 |
| UPG-15 | Timeout không rõ side effect không blind retry; reconcile operation identity | 04 |
| UPG-16 | Session/task/workspace A không ghi hoặc điều khiển B; thiếu context reject | 04–05 |
| UPG-17 | Tool visibility và stage không cấp quyền; restrict error không fail-open | 05–06 |
| UPG-18 | MCP admin auth được xác minh; redaction, body limit, corrupt-store recovery | 05 |
| UPG-19 | First warning tới mọi exporter, dispose restore, success reset streak | 00/05 |
| UPG-20 | Global update không đổi local pin; installer giữ user edits và rollback | 01/06 |
| UPG-21 | Memory stale/poisoned/cross-project không thành permission hoặc proof | 06 |
| UPG-22 | Mỗi adapter/version có capability evidence; prompt-only không ENFORCED | 06 |
| UPG-23 | Grader reject known-bad và accept valid; so sánh cùng model/env/budget | 07 |
| UPG-24 | Candidate/artifact đúng; required CI check thật chặn lỗi; đủ AC/NFR/review/release authority | 08 |

Nguồn: SKILL.md; references/tracking.md; references/tracking-contract.md; references/tracking-gates.md; elicitation-probes; audit harness trước đó; các phase trong plan này. Chưa có evaluator enforced, runtime mapping accepted hoặc reviewer assignment trong task lập plan.

G-READY kiểm scope/quyền/oracle; G-TRACE kiểm refs/inventory/history; G-IMPACT kiểm contributing inputs; G-VERIFY kiểm current run/oracle/review/provenance; G-MERGE kiểm slice/candidate; G-RELEASE kiểm toàn target AC/NFR/artifact và authority.

Test phải lưu fixture, action, observable effects, assertions, candidate hash và negative controls. Canary không dùng secret thật. Mock/isolated test không được báo native integration PASS. Tên test hoặc chuỗi log PASS không đủ mở gate.
