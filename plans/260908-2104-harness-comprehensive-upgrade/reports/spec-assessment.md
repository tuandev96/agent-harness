# Đánh giá requirements-spec — tóm tắt kết luận

Recommendation: NÊN TÍCH HỢP CÓ ĐIỀU KIỆN.
Assessment: self-review; independent review PENDING. Implementation NOT_STARTED.

Đã đọc toàn bộ 25 file của ZIP requirements-spec(5).zip; đối chiếu repo a1ef3fd. Đây là skill authoring và tracking, không phải SRS riêng cho harness. Skill cùng tên đã có ở global, nhưng chưa đối chiếu bytes toàn bộ; không tự reinstall hoặc ghi đè.

## Giá trị nên giữ

SKILL.md phân biệt create/update/audit với tracking và quyền triển khai. references/tracking.md yêu cầu một work source và project-local policy pin. references/tracking-contract.md tách implementation/outcome/freshness/gate, giữ failure history và không cho old PASS che current FAIL. Các hợp đồng mapping, reviewer, change control và publication phù hợp với những khoảng trống runtime đã audit.

## Những điểm phải xử lý

RS-01: validator thiếu kiểm tra cấu trúc. RS-02: tracking contract nói rõ chưa ship evaluator/JSON Schema — đây là capability gap, không phải tuyên bố enforcement sai. RS-03: assets/spec-template.md mặc định ADR Accepted, cần Proposed. RS-04: không dùng Status trong frozen SRS làm board progress thứ hai. RS-05: manual serialization không phải transaction/CAS thực. RS-06: số lượng feature/NFR/ADR chỉ là heuristic; sửa ví dụ gộp obligation độc lập. RS-07: pin origin/version/hash và kiểm tra license trước public.

## Bằng chứng đã chạy

Self-test gốc tests/run.sh exit 0: good fixture đạt, bad fixture nhận diện 15 lớp lỗi. Tám probe bổ sung đều exit 0: thiếu header/Source/Exported; status Teleported/Magic; mixed NFR priority; AC ngoài REQ; cả spec trong code fence; thiếu annex bắt buộc; duplicate Feature field; sai thứ tự H2. Bảy ca không warning; ca thiếu annex có một warning. Bốn JSON template chỉ được kiểm parse JSON, không phải semantic validation.

Nguồn đối chiếu: references/document-format.md:3–38,135–145; scripts/validate_spec.py:42–112,116–245; references/tracking-contract.md:7–9; assets/spec-template.md:84–85. Script, fixtures, logs, hashes và báo cáo mở rộng đi kèm bundle tải xuống của lần đánh giá này.

## Hướng tích hợp

Đưa skill vào lớp portable có version, không nạp toàn bộ vào mọi prompt. Task nhỏ dùng task-spec; feature lớn dùng SRS; tracking đầy đủ là workflow được project chọn. Xây evaluator, trusted producer, review authority và adapter native thành các phần thực thi riêng. “Nhẹ” không có nghĩa được giả PASS hoặc bỏ quyền hạn.

Chưa chạy native DSH integration, Windows integration, benchmark trả phí hoặc CI gate thực. Không cộng 11 probe audit cũ vào tám probe mới. Recommendation không phải approval/freeze/release PASS.
