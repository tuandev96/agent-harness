# Runbook: gói phân phối riêng tư

```sh
npm run build
node scripts/export-schemas.mjs
node scripts/build-plugins.mjs
node scripts/package.mjs --check
node scripts/package.mjs --out .harness-checks/packages/agent-harness-private.zip
```

Entry point kiểm inventory allowlist, symlink, tên file nhạy cảm và một số mẫu secret; archive helper đọc lại từng file, đối chiếu byte/hash, tạo ZIP không ghi đè destination và kiểm CRC. `PACKAGE-MANIFEST.json` nằm trong gói.

Built-in pattern scan không phải secret audit toàn diện. Trước khi gửi ra ngoài, chạy scanner độc lập trên đúng candidate/package contents và xử lý findings. Không đánh dấu releaseReady chỉ dựa trên không có regex match.

Gói là PRIVATE_ONLY vì origin/license của skill nhập cần được xác nhận trước phân phối công khai. Không publish npm, tạo GitHub release hoặc triển khai live runtime chỉ để chứng minh script hoạt động.

Gói không chứa runtime home, SQLite, log, session hoặc memory cá nhân. Build provenance, independent review, supported platform evidence và quyền phát hành vẫn là gate riêng. SHA của archive bảo vệ phép đối chiếu byte, không chứng minh quyền chủ sở hữu.
