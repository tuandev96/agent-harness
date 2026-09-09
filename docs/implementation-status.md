# Trạng thái triển khai và phạm vi tin cậy

Hướng dẫn cài đặt/sử dụng được đối chiếu với checkpoint `6ab731c` ngày 2026-09-09.
Đây là mốc tham chiếu của tài liệu, không phải chứng nhận nghiệm thu toàn bộ mã nguồn.
Nguồn công việc vẫn là `plans/260908-2104-harness-comprehensive-upgrade/`;
tài liệu này không thay tracker.

Bắt đầu tại [README](../README.md), [cài đặt](installation.md),
[cấu hình từng agent](agents.md), [sử dụng/CLI](usage.md) hoặc
[hướng dẫn tiếng Việt](huong-dan.vi.md). Các ví dụ portable không yêu cầu DSH;
runtime CLI và host integration là những bước tùy chọn, tách biệt.

## Các mức kết luận

- `harness-runtime/1` là contract thực thi cục bộ; không phải implementation đầy đủ của toàn bộ `requirements-tracking/1`.
- Runtime cục bộ là `ASSISTED`. Một người dùng hệ điều hành có quyền sửa source, SQLite hoặc dữ liệu đầu vào vẫn có thể can thiệp. Hash và process riêng không tự tạo isolation.
- Kết quả test, `gateReady` của task, review độc lập và quyền release là các trạng thái khác nhau. `releaseReady` không được cấp bởi công cụ đóng gói hoặc báo cáo eval.
- Workflow GitHub trong repo không tự cấu hình required checks. Phải quan sát cấu hình và một lần từ chối thực trước khi quảng bá CI enforcement.

## Bằng chứng và phiên bản

Logs trong `.harness-checks/` và các `reports/*.log` chỉ là dữ liệu cục bộ, không nằm trong gói phân phối. Các summary có hash log, lệnh, thời điểm và exit code. Một log cũ không chứng minh source mới.

Những lượt kiểm thử trước của quá trình triển khai đã ghi nhận 63 kiểm thử core và 22 kiểm thử plugin đạt. Các thay đổi sau đó phải chạy lại; không dùng tổng này như kết quả của candidate cuối.

Native DSH Desktop, UI trong browser, Windows process tree, các adapter khác và paid model comparison cần bằng chứng riêng. Fake/mocked host, test tạm trên loopback, và tự review không thay các bằng chứng đó.

## Chạy các phép kiểm tra

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
node scripts/export-schemas.mjs
node scripts/build-plugins.mjs
npm test
npm run package:check
```

`npm test` phát hiện test theo các nhóm core/plugins/operations/regression và chạy validator Python cùng self-test cũ. Có thể chạy một nhóm bằng `node scripts/test.mjs --suite core`. Zero exit của nhóm chỉ chứng minh các kiểm tra đã chạy trong nhóm ấy.

Không cần credentials hoặc gọi model trả phí để chạy các bài kiểm thử cục bộ này. Toolchain được ghim trong lockfile; không dùng global TypeScript làm bằng chứng cho bản compiler khác.
