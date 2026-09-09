# Hướng dẫn cài đặt và sử dụng Agent Harness

[README](../README.md) · [Cài đặt chi tiết](installation.md) · [Cấu hình từng agent](agents.md) · [Sử dụng và CLI](usage.md) · [Xử lý lỗi](troubleshooting.md)

Bộ này có hai cách dùng: **protocol/skill cho agent hiện có**, và **runtime cục bộ ghi nhận bằng chứng**. Không cần DSH hoặc database để dùng cách thứ nhất.

Bản hiện tại là checkpoint phát triển `0.3.0`, mức tin cậy `ASSISTED`. Nó không thay sandbox, không tự tạo reviewer độc lập và không cấp quyền release. Mã có trong repo không đồng nghĩa mọi native integration đã được nghiệm thu.

## 1. Chuẩn bị checkout

Cần Git, Node.js 24+, npm và Python 3.10+ gọi được bằng `python3`. Ví dụ bên dưới dùng Bash trên macOS/Linux; Windows có thể tham khảo WSL trong [ghi chú nền tảng](installation.md#platforms-and-prerequisites).

```bash
git clone https://github.com/tuandev96/agent-harness.git
cd agent-harness
export HARNESS_HOME="$(pwd -P)"

npm ci --ignore-scripts
npm run typecheck
npm run build
node "$HARNESS_HOME/bin/harness.mjs" doctor --root "$HARNESS_HOME"
```

Dùng quyền truy cập Git đã được cấp. Không có bước cài một npm package công khai hay nhập API key cho harness. Agent của bạn vẫn dùng tài khoản, model và quyền native riêng.

`HARNESS_HOME` là checkout, không phải thư mục skill đã cài. Build không thay thế typecheck. `doctor` kiểm build và thông báo giới hạn; `releaseReady: false` là trạng thái bình thường, không phải lỗi cần tắt.

## 2. Cài protocol và skill vào dự án

```bash
export PROJECT="/duong-dan-tuyet-doi/toi-du-an"
mkdir -p "$PROJECT/.agents"

# Chỉ xem trước, chưa ghi file cài đặt.
node "$HARNESS_HOME/scripts/install.mjs" --target "$PROJECT/.agents"

# Sau khi đã xem diff/conflict, mới áp dụng.
node "$HARNESS_HOME/scripts/install.mjs" --target "$PROJECT/.agents" --apply
```

Installer chép protocol vào `.agents/rules/`, template vào `.agents/templates/`, cả skill vào `.agents/skills/requirements-spec/`, và tạo/cập nhật một đoạn quản lý trong `.agents/AGENTS.md`.

**Nó chưa tạo loader ở root dự án và chưa cài hook native cho từng agent.** Hãy ghép đoạn sau vào `AGENTS.md` ở root, giữ nguyên các quy tắc sẵn có:

```markdown
## Agent Harness

Trước khi làm việc, đọc `.agents/rules/harness-protocol.md`.
Khi làm requirements hoặc tracking, đọc
`.agents/skills/requirements-spec/SKILL.md` và các tham chiếu cần cho mode đó.
Tiếp tục nguồn công việc hiện có, ưu tiên `plans/` khi dự án đã dùng thư mục này.
Không tạo tracker thứ hai, không bỏ quyền native, không báo PASS khi thiếu bằng chứng.
```

Không đưa `.harness/`, receipt backup hoặc loader sinh tự động có đường dẫn máy cá nhân lên Git. Các mẫu `.gitignore` và cách cài cá nhân vào `~/.agents` nằm trong [hướng dẫn cài đặt](installation.md#files-to-keep-out-of-git).

## 3. Nối với từng agent

Các đường dẫn và nguồn chính thức được giải thích đầy đủ ở [agent setup](agents.md):

| Agent | Việc cần làm sau cài portable |
|---|---|
| Codex | Dùng root `AGENTS.md` và skill dưới `.agents/skills/`; kiểm tra override có thể che hướng dẫn |
| Claude Code | Ghép `@AGENTS.md` vào root `CLAUDE.md`; để dùng slash skill, đăng ký cả bundle vào `.claude/skills/` hoặc yêu cầu đọc skill theo đường dẫn |
| Cursor | Dùng root `AGENTS.md` và `.agents/skills/`, hoặc rule `.mdc` được hướng dẫn; không chép cả protocol vào nhiều nơi |
| Grok Build | Dùng root `AGENTS.md`; kiểm bằng `grok inspect`; native skill có thể đặt dưới `.grok/skills/` |
| DSH | Portable instructions dùng riêng; runtime gate cần host authority, database và binding agent–task thực |
| Gemini CLI | Có công thức nạp thủ công qua `GEMINI.md`; không coi đây là native adapter đã triển khai trong repo |

Không nhầm model với client: dùng Grok trong Cursor thì loader vẫn là loader của Cursor. Hướng dẫn được đối chiếu tài liệu nhà cung cấp, chưa phải kết quả chạy nghiệm thu tất cả agent trên máy.

Sau cấu hình, mở phiên mới và yêu cầu:

```text
Đọc hướng dẫn dự án, rồi mở .agents/rules/harness-protocol.md và
.agents/skills/requirements-spec/SKILL.md cho lần kiểm tra requirements này.
Nêu đúng đường dẫn đã đọc, nguồn công việc có thẩm quyền và cách phân biệt
code đã viết, bằng chứng hiện hành, review còn thiếu. Không sửa file.
```

Xem tool read hoặc màn hình context thực, không chỉ tin câu trả lời “đã đọc”. Với công việc thường ngày, chỉ nạp skill khi cần.

## 4. Dùng trong công việc

Task nhỏ: chốt scope và AC trong template task hiện có, triển khai rồi kiểm tra. Feature lớn: dùng SRS có ID ổn định. Tracking là workflow riêng, không tự khởi tạo chỉ vì viết SRS.

```text
Đọc protocol và skill requirements-spec. Kiểm tra codebase, tiếp tục plan phù hợp.
Với feature này, tạo Draft SRS có yêu cầu kiểm thử được và AC cho từng yêu cầu.
Ghi riêng giả định/câu hỏi mở; không tự Accepted quyết định chưa được duyệt.
Chưa triển khai sản phẩm ở bước này.
```

Khi đã có scope được duyệt:

```text
Tiếp tục plan đã duyệt, triển khai đúng phạm vi và kiểm chứng từng AC bằng
lệnh/test hoặc kiểm tra native phù hợp. Báo rõ bằng chứng còn thiếu; không coi
timeout, reviewer bị bỏ qua hay report sinh tự động là PASS.
```

Validate SRS bằng:

```bash
python3 "$PROJECT/.agents/skills/requirements-spec/scripts/validate_spec.py" \
  "$PROJECT/plans/duong-dan-toi-spec.md"
```

Exit `0` chỉ xác nhận không có lỗi cấu trúc. Vẫn phải xử lý warning, xem xét ý nghĩa yêu cầu và kiểm chứng sản phẩm.

## 5. Runtime CLI là tùy chọn

[Ví dụ CLI đầy đủ](usage.md#local-cli-walkthrough) tạo một dự án tạm, lấy identity thật, ghi một task JSON, chạy lệnh, xem evidence và hoàn tất task minh họa. Không cần model hoặc API trả phí.

Các lệnh chính: `help`, `doctor`, `init`, `identity`, `create`, `revise`, `run`, `status`, `complete`, `cancel`, `recover`, `export`, `migrate`. `status` trả exit `2` khi task chưa đủ điều kiện. Chỉ `init` có preview/apply; `create` và `run` là thao tác ghi/chạy thật.

CLI không có lệnh tạo review độc lập, không phải MCP server và không tự nạp mọi lệnh agent vào recorder. Công việc cần reviewer mà chưa có tích hợp reviewer vẫn phải giữ pending. Ví dụ review-exempt chỉ dành cho bài thử nhỏ, không dùng để bỏ điều kiện nghiệm thu thật.

## 6. Cập nhật và rollback

Giữ receipt cũ, chọn revision mới, rebuild checkout, rồi chạy lại preview/apply trên đúng target. Nếu file đã có chỉnh sửa riêng, giải quyết conflict bằng diff; không có `--force` để bỏ bảo vệ.

Lấy UUID của receipt từ kết quả cài đặt, bỏ phần `.json`:

```bash
export RECEIPT_ID="uuid-thuc-cua-lan-cai"
node "$HARNESS_HOME/scripts/install.mjs" --target "$PROJECT/.agents" \
  --rollback "$RECEIPT_ID"
node "$HARNESS_HOME/scripts/install.mjs" --target "$PROJECT/.agents" \
  --rollback "$RECEIPT_ID" --apply
```

Lệnh đầu chỉ in ý định rollback, chưa kiểm đầy đủ receipt/conflict. Lệnh apply mới kiểm hash và phục hồi. Rollback không hoàn tác root loader hoặc bản skill native bạn tự chép, và không xóa database. Nếu có edits mới sau khi cài, nó sẽ từ chối ghi đè.

Không xóa lock đang được tiến trình sử dụng; không sửa SQLite/hash để làm gate xanh. Xem [xử lý lỗi](troubleshooting.md) và [trạng thái triển khai](implementation-status.md) trước khi coi hệ thống sẵn sàng phát hành.
