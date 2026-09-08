# Plan nâng cấp toàn diện Agent Harness

Status: DRAFT_FOR_REVIEW
Implementation: NOT_STARTED
Created: 2026-09-08T21:11:54+07:00
Baseline: repo commit `a1ef3fd`; working tree sạch trước khi lập tài liệu.
Work source: thư mục plan này; không tạo board/ledger tiến độ thứ hai.
Independent review: PENDING — chưa có reviewer độc lập; bản tự đánh giá không phải PASS.

## 1. Quyết định đề xuất

Tích hợp `requirements-spec` làm skill đặc tả và hợp đồng traceability của lớp portable. Không coi bộ ZIP là runtime kiểm chứng đã hoàn thiện; không chép toàn bộ vào system prompt; không thay công cụ native của từng agent bằng công cụ DSH.

Bộ đầu vào có 25 file (19 Markdown, 4 JSON, 1 Python, 1 shell), tổng nội dung giải nén 142292 byte. SHA-256 ZIP: `08fcf746e17f82d3533b07814560fea360d8a4c9d09a8a866c483e89ae248819`. `SKILL.md` của skill cùng tên đã được quan sát tại hai thư mục global; chưa so sánh toàn bộ bytes global với ZIP. Bản ZIP được dùng làm candidate rõ nguồn, không tự ghi đè bản global.

Yêu cầu hiện tại chỉ cho phép đánh giá và lập kế hoạch. Các phase dưới đây là công việc đề xuất, không phải chỉ thị đã thực thi. Không install skill, sửa runtime, gọi model trả phí, đổi branch protection, publish hay commit trong bước lập plan.

## 2. Mục tiêu và ranh giới

Biến protocol “mọi AC đều có bằng chứng” thành quy tắc có thể kiểm tra, với quyền hạn và nguồn bằng chứng tách khỏi worker. Giữ công việc nhỏ gọn, dùng đúng tool native, giảm báo hoàn thành sai và phục hồi đúng khi hủy, crash hoặc đổi mục tiêu.

In scope: authoring SRS; schema và evaluator; thu bằng chứng; review/authority; lifecycle/cancel/retry; publication; DSH router/plugins; portability; memory an toàn; evals; cài đặt/migration/release có rollback.

Out of scope: viết lại thành framework agent từ đầu; chuyển ngôn ngữ toàn bộ; SaaS/multi-tenant/cloud orchestration; vector database bắt buộc; tự trị production không có quyền; đưa runtime home, credentials hay memory cá nhân vào repo; benchmark hay tuyên bố vượt model khác khi chưa đo.

## 3. Kiến trúc đích

`SRS / AC / NFR → approved task slice → native adapter → recorded execution → evidence validation → independent review → derived gates → release decision`.

Tách ba trạng thái: tiến độ công việc, mức quyền được cấp và mức độ đã kiểm chứng. Stage/router chỉ điều tiết thông tin, không cấp quyền hay chứng nhận hoàn tất.

Lớp portable chứa protocol, skill, template, contract, evaluator và CLI dùng chung. Lớp adapter giữ hook/session/tool semantics của DSH, Claude Code, Codex, Grok và Cursor. Adapter không có hook cưỡng chế phải công bố ASSISTED/NOT_ENFORCED; không được giả lập capability bằng lời nhắc.

Đề xuất triển khai tăng dần trên hệ hiện hữu: giữ Python validator; lõi runtime mới dùng TypeScript/Node để tích hợp các module JS hiện có, thông qua ADR Proposed. Không tạo nhiều service độc lập nếu thư viện + adapter đủ. SQLite giao dịch cục bộ là lựa chọn đề xuất cho state/publication single-host; JSON portable là định dạng trao đổi, không phải chứng minh khóa đa tiến trình.

Một process tách riêng nhưng cùng quyền ghi của worker không tự tạo ranh giới tin cậy. Profile ENFORCED chỉ được quảng bá khi có producer/reviewer/control inputs ngoài quyền sửa của worker và test chứng minh điều đó; nếu không, giữ ASSISTED.

## 4. Các phase và phụ thuộc

| Phase | Kết quả chính | Phụ thuộc |
|---|---|---|
| 00 | Baseline, threat model, regression và containment lỗi nặng | Quyền triển khai slice tương ứng |
| 01 | Đóng gói skill; sửa parser/template; spec/plan phân cấp | 00 inventory |
| 02 | JSON Schema, fixtures và evaluator thuần | 01 contract ổn định |
| 03 | Evidence producer, quyền phê duyệt và reviewer thực | 02 |
| 04 | Task lifecycle, cancel/retry, transaction và crash recovery | 03 |
| 05 | Tích hợp DSH; đơn giản router; sửa MCP và plugin | 02–04; regression 00 |
| 06 | Adapter portable, memory, diagnostics và installer | 03–05 |
| 07 | Evals, budget, độ trễ và đo cải thiện | Baseline từ 00; so sánh sau 05–06 |
| 08 | Migration, CI gate thật, canary và release | 01–07 + quyền phát hành |

Chi tiết nằm trong các file `phase-*.md`. Mỗi phase bắt đầu bằng đúng scope, assignee và reviewer được chỉ định; không tự gán người hoặc tạo chữ ký phê duyệt.

## 5. Nguồn dữ liệu và trạng thái

SRS giữ định nghĩa và revision, không làm board progress. `plans/` sở hữu công việc. Ledger tương lai chỉ index nguồn, mapping, run, review và kết quả suy ra. Không khởi tạo ledger trong task lập plan này.

Giữ riêng: `implementation_state`, `verification_outcome`, `evidence_freshness`, `gate_ready`, `release_ready`. Spec freeze, validator xanh, code đã viết và release-ready là các kết luận khác nhau. Mã UPG trong báo cáo là mã kiểm soát đề xuất của plan, không phải REQ/AC đã freeze.

Bằng chứng phải gắn candidate code/test/config/toolchain/fixture, requirement/policy revision, invocation và artifact. Bằng chứng do worker tự khai không trở thành VERIFIED nhờ có hash. Test đổi assertion hoặc loại profile là thay control, không phải thao tác để làm CI xanh.

## 6. Ranh giới quyền hạn và thay đổi

User cancel và thiếu quyền thắng autonomy. Approval ràng buộc task/scope/revision/action; hiệu lực phải được kiểm tra tại điểm tạo side effect. Worker không tự approve release, policy weakening, đổi target scope hay gán mình làm reviewer. Dùng quyền đã cấp cho đúng slice; không hỏi lại quyền routine đã rõ.

Giữ baseline cũ và dùng migration có mapping. Global skill update không tự sửa policy project đã pin. G-READY, TRACE, IMPACT, VERIFY, MERGE và RELEASE áp dụng theo scope thật; một changeset nhỏ không phải hoàn thành cả release.

## 7. Nghiệm thu tổng thể đề xuất

Các kiểm soát UPG-01..UPG-24 trong `reports/control-matrix.md` phải có test/observation tương ứng. Mỗi gate cần cả test từ chối trường hợp sai và test cho phép trường hợp hợp lệ; không chỉ tối ưu để luôn BLOCK.

Không có số liệu latency/cost/retention hay hỗ trợ platform được tự điền như đã chốt. Pha 00 đo baseline; pha 07 đề xuất ngưỡng dựa trên thiết bị, workload và budget được duyệt. Zero lỗi trong tập adversarial chỉ chứng minh tập đã chạy, không chứng minh hệ thống không bao giờ lỗi.

Release chỉ sau bằng chứng chạy native runtime bắt buộc, reviewer độc lập, candidate/artifact đúng digest và quan sát gate thật chặn một vi phạm được kiểm soát. Checker self-test không thay product acceptance. Thiếu Windows host, integration credentials, reviewer hoặc branch authority thì gate liên quan PENDING/BLOCKED.

## 8. Migration và rollout

Giữ entrypoint hiện hữu làm wrapper; không xóa `.agent-presets/` hay `vendor/` trước khi adapter mới đạt parity. Triển khai theo disabled → shadow → opt-in enforced → default sau nghiệm thu. Shadow không được quảng bá là enforcement. Rollback không được biến stale evidence thành PASS hoặc xóa thất bại.

Installer sau này mặc định dry-run, hiển thị diff và backup; không đè global file hoặc symlink khi chưa có quyền. Không sao chép private runtime/memory vào bản phát hành. Thực hiện trên worktree hiện hữu, giữ thay đổi của người khác, không tự commit/push.

## 9. Những quyết định chưa được chốt

| Chủ đề | Đề xuất / ranh giới | Ai quyết định / chặn gì |
|---|---|---|
| Thứ tự platform | DSH là integration đầu tiên; portable authoring dùng chung | Chủ dự án; chặn cam kết supported matrix |
| Trust profile | ASSISTED mặc định nếu không có isolation thực | Chủ dự án + reviewer bảo mật; chặn ENFORCED |
| Core/storage | TypeScript/Node và SQLite single-host; giữ Python validator | Chủ dự án qua ADR; trước phase 02/04 product edits |
| Budget và NFR | Đo baseline, đề xuất p95/chi phí/limits theo workload | Chủ dự án; trước paid eval/release perf gate |
| Phân phối | Private trước; kiểm tra origin/license trước public | Chủ dự án; chặn publish |
| Review/CI authority | Chưa được gán và chưa thay cấu hình | Chủ dự án; chặn merge/release acceptance |

Đây là decision gates cho triển khai, không ngăn việc hoàn tất đánh giá và plan hiện tại.

## 10. Bằng chứng hiện tại

Đã đọc 25 file ZIP; đọc lại repo và các điểm code liên quan qua chat-fs; chạy self-test của validator trong container; chạy 8 probe cấu trúc; kiểm tra 4 JSON template parse được. Không chạy DSH integration hoặc benchmark trả phí.

Self-test gốc: exit 0, good fixture được chấp nhận và 15 lớp lỗi trong bad fixture được nhận diện. Tám biến thể sai cấu trúc đều exit 0; kết quả chi tiết trong `reports/spec-assessment.md` và bundle bằng chứng.

## 11. Tiến độ

- [x] Kiểm tra nguồn, đánh giá skill và viết plan.
- [ ] Chủ dự án chốt scope/ADR của slice triển khai đầu tiên.
- [ ] Phase 00–08: chưa thực hiện.
- [ ] Independent review: PENDING.
- [ ] Runtime / merge / release acceptance: NOT_ASSESSED trong task này.
