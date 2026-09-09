# Runbook: kiểm tra, chẩn đoán và phục hồi cục bộ

## Chuẩn bị

Làm trên worktree hiện hữu. Kiểm tra `git status` trước khi chạy build; không stash, reset hoặc xóa thay đổi của người khác. Không sao chép `~/.dsh`, credentials, sessions hoặc private memory vào repo để tái hiện lỗi.

Chạy bộ lệnh trong `docs/implementation-status.md`. Khi command lỗi, đọc log đúng run ID và kiểm input digest. Không tự tăng status lên PASS vì bản source có vẻ đúng. Timeout là TIMED_OUT, không phải thành công và cũng không tự chứng minh không có side effect.

## Hủy và retry

Hủy được ghi nhận trong task state và truyền tới execution đang sở hữu. Nếu tiến trình có thể đã tạo tác dụng phụ trước khi bị dừng, outcome UNKNOWN yêu cầu reconciliation. Không dùng restart để làm mới bộ đếm attempts hoặc tự gọi lại mutation.

## SQLite

Dừng writer thuộc phạm vi tác vụ trước khi backup hoặc phục hồi. Giữ WAL/SHM cùng database theo backup API hoặc chế độ đóng writer; không sao chép ngẫu nhiên file SQLite đang được ghi. Giữ snapshot và history khi phát hiện mismatch. Không tự sửa hash/head bằng tay để làm kiểm tra history đạt.

Recovery phải đối chiếu attempt đã được ghi trước dispatch, caller/task revision và trạng thái cancellation. Một kết quả legacy PASS nhập từ JSON chỉ là claim lịch sử, không phải proof thực thi mới.

## Installer

`scripts/install.mjs` là entrypoint cài đặt có dry-run và receipt. Xem cú pháp thực của entrypoint trước khi áp dụng; không suy ra tham số từ tên file. Chỉ áp dụng plan được tạo cho đúng source/target và có quyền ghi. Thay đổi target sau dry-run hoặc user edits trong managed block phải tạo conflict, không bị ghi đè.

Khi rollback, dùng receipt đúng lần cài, kiểm hash file hiện tại và giữ edits người dùng làm sau cài đặt. Không xóa target toàn bộ để đơn giản hóa rollback. Cài thử và rollback trên thư mục tạm trước khi thay global entrypoint.

## MCP

API quản trị yêu cầu ranh giới host/peer/origin và quyền host tương ứng. Loopback không thay được xác thực đa người dùng. List không trả nguyên credentials; nhập trống khi edit phải giữ dữ liệu đã cấu hình, thao tác xóa phải tường minh.

Store corrupt phải được giữ nguyên và chặn write; sửa hoặc khôi phục theo bản sao có xác nhận, không seed empty rồi ghi đè. Không đưa headers/env chứa token vào báo cáo sự cố.
