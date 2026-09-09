# Threat model: local ASSISTED harness

## Đối tượng và ranh giới

Tài sản cần bảo vệ gồm phạm vi task, source/policy revision, provenance của run/review, credentials MCP, lifecycle trạng thái, private memory và quyền release.

Nguồn không tin cậy gồm output model, tool/web documents, file spec nhập, memory note, log tự tạo và kết quả MCP. Nội dung dữ liệu không được biến thành approval, thay đổi policy hoặc lệnh quản trị bằng việc tự xưng là system instruction.

## Các lớp kiểm soát

Parser/schema kiểm cấu trúc; evaluator kiểm liên kết và điều kiện; recorder quan sát execution; service kiểm caller/authority và điều phối state; SQLite transaction ngăn hai writer cùng sửa một revision. Các lớp này không thay nhau.

Worker không được coi chuỗi PASS hoặc reviewed=true là execution/review provenance. Current failure phải được giữ và xử lý; thay policy, test selector hoặc loại NFR khỏi target không phải cách để tự nghiệm thu.

## Giới hạn hiện tại

Người dùng hệ điều hành có toàn quyền ghi vào cùng source/database có thể sửa hệ thống. Local principal string không phải danh tính đã xác thực bên ngoài. Test giả lập hai principal chỉ chứng minh policy logic, không chứng minh hai người thật đã review.

Không quảng bá ENFORCED hoặc production autonomy khi producer/control store vẫn cùng quyền ghi với worker. Các adapter native phải có bằng chứng đúng phiên bản/platform; mô tả plugin không thay sandbox/approval thật.

MCP loopback/origin là một lớp phòng vệ, không thay auth cho multi-user/remote deployment. Cần inspect và test host middleware thực trước khi đưa ra kết luận về cả hệ thống DSH.

Không hứa exactly-once đối với provider không có idempotency key hoặc oracle đối chiếu side effects. Timeout/restart không phải bằng chứng mutation chưa xảy ra.

## Bộ kiểm tra cần giữ

Adversarial cases gồm forged evidence, zero/skipped tests, stale policy/input, fake reviewer, cross-session calls, unknown mutation, competing writer, crash-before-commit, corruption, symlink traversal, oversized body, credential response, late-dispose và poisoned memory. Một bộ test hữu hạn đạt không chứng minh không tồn tại mọi lỗi khác.
