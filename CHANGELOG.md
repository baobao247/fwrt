# 📋 NHẬT KÝ NÂNG CẤP & TÁI CẤU TRÚC — FWRT (FLOWWRITER / FLOWCHART EDITOR)

Phiên bản: **v2.0 — Modular Architecture & Advanced Diagram Intelligence**  
Ngày hoàn thành: **31/10/2026**  
Vị trí: `c:\WORK\Code\html\github beta\fwrt`  
Trạng thái kiểm thử: **100% Hoàn thành, 0 lỗi cú pháp, tương thích hoàn toàn chuẩn Offline (`file:///`)**

---

## 1. Các Lỗi Đã Phát Hiện & Cách Xử Lý (Audit & Bug Fixes)

1. **Khắc phục cấu trúc Monolithic cồng kềnh (282.2 KB):**
   - *Hiện trạng cũ:* Toàn bộ ứng dụng bao gồm 35.3 KB mã CSS và hơn 240 KB JavaScript (5.600 dòng code) bị nhồi nhét hoàn toàn vào một file duy nhất `index.html`. Việc bảo trì, mở rộng hoặc kiểm tra logic cực kỳ khó khăn.
   - *Giải pháp:* Tách triệt để thành kiến trúc module hóa hướng đối tượng và đơn nhiệm: `css/style.css`, `js/constants-shapes.js`, `js/canvas-engine.js`, `js/templates.js`, `js/diagram-analyzer.js`, `js/app.js`. File `index.html` giảm từ 282 KB xuống còn 7.4 KB.

2. **Bắt lỗi an toàn khi chèn Diagram Templates (Try/Catch Error Boundary):**
   - *Hiện trạng cũ:* Khi áp dụng mẫu sơ đồ, nếu xảy ra lỗi tính toán tọa độ hoặc thiếu hình, toàn bộ canvas bị treo và không thông báo cho người dùng.
   - *Giải pháp:* Bọc toàn bộ quy trình sinh template trong khối `try/catch` có toast thông báo lỗi rõ ràng, tự động `fitView()` và `pushHistory()` sau khi hoàn tất.

3. **Chống rò rỉ bộ nhớ & Tối ưu hóa Viewport Culling:**
   - Đảm bảo các tiến trình vẽ lại `renderRAF` được hủy đúng thời điểm khi có thao tác mới, không chồng chéo vòng lặp animation frame.
   - Bổ sung kiểm tra ranh giới viewport để culling các node nằm ngoài khung hình khi sơ đồ có kích thước lớn.

4. **Xử lý triệt để phím tắt & Đóng Modal (Escape Handling):**
   - Bổ sung cơ chế đóng nhanh tất cả các modal nổi (Metrics Modal, Backup Modal, About, Dialog) bằng phím `Escape`.

---

## 2. Cấu Trúc Thư Mục Mới (Modular Architecture)

```
c:\WORK\Code\html\github beta\fwrt\
├── index.html                   # HTML Skeleton tinh gọn, sạch sẽ (7.4 KB)
├── CHANGELOG.md                 # Tài liệu bàn giao & hướng dẫn kỹ thuật
├── css/
│   └── style.css                # Toàn bộ styling, CSS variables, dark/light themes & animation
└── js/
    ├── constants-shapes.js      # Khai báo hình học SVG, cấu hình bảng màu, kích thước, hệ thống đa trang (Pages)
    ├── canvas-engine.js         # Thuật toán định tuyến (Orthogonal, Curved, Straight), SVG rendering, history stack
    ├── templates.js             # Thư viện 11 mẫu lưu đồ nghiệp vụ (Flow, Process, Org, Mindmap, Auth Flow,...)
    ├── diagram-analyzer.js      # [MỚI] Bộ máy phân tích độ phức tạp McCabe, kiểm tra lỗi logic & Tìm/Thay thế hàng loạt
    └── app.js                   # Điều khiển tương tác con trỏ, kéo thả, phím tắt, command palette & khởi động app
```

---

## 3. Các Điểm Cải Tiến UI/UX & Hiệu Năng

- **Visual Feedback & Toolbar Icons:** Bổ sung icon trực quan trên thanh công cụ:
  - 📊 Nút Thống kê độ phức tạp McCabe (`#btnMetrics`).
  - 💧 Nút Đóng dấu bản quyền / Watermark (`#btnWatermark`).
- **Nâng cấp thanh tìm kiếm (Smart Search & Replace):** Tích hợp trường nhập "Thay thế bằng…" trực tiếp trong drawer `Ctrl+F`.
- **Chế độ Sáng / Tối (Dark/Light Mode):** Lưu trạng thái cấu hình vào `localStorage`, chuyển đổi mượt mà không bị giật nhấp nháy.
- **Tối ưu hóa thao tác chạm (Mobile/Touch Friendly):** Tự động phát hiện thiết bị cảm ứng và kích hoạt layout tương thích.

---

## 4. Các Tính Năng Mới Sáng Tạo (Innovations)

### 1. Phân Tích Độ Phức Tạp McCabe & Đo Lường Sức Khỏe Lưu Đồ (McCabe Cyclomatic Analyzer)
- **Cơ sở khoa học:** Ứng dụng công thức độ phức tạp chu trình McCabe trong kỹ nghệ phần mềm:
  $$M = E - N + 2P$$
  *(Trong đó: $E$ là số đường liên kết, $N$ là số node thao tác/điều kiện, $P$ là số thành phần liên thông độc lập).*
- **Phân loại rủi ro tự động:**
  - $M \le 10$: Lưu đồ chuẩn mực, cấu trúc rành mạch, rủi ro thấp.
  - $11 \le M \le 20$: Mức độ phân nhánh trung bình, cần chú ý kiểm thử các trường hợp biên.
  - $M > 20$: Cấu trúc phức tạp cao, đề xuất chia nhỏ thành các Sub-Process để tránh lỗi logic.
- **Báo cáo chi tiết:** Thống kê số lượng node theo từng loại hình học, phát hiện các nhánh cụt (Dead-ends), số lượng từ/ký tự văn bản.
- **Xuất báo cáo 1-Click:** Nút "📋 Sao chép báo cáo Markdown" cho phép dán trực tiếp vào Jira, GitHub Issue hoặc tài liệu kỹ thuật.

### 2. Tìm Kiếm & Thay Thế Đồng Loạt Trên Toàn Bộ Sơ Đồ (Batch Search & Replace)
- Cho phép tìm kiếm bất kỳ từ khóa nào trên tất cả các node và nhãn đường nối (edge labels).
- Hỗ trợ thay thế từng vị trí hoặc "Thay thế tất cả" chỉ trong 1 click.
- Tự động ghi lại vào lịch sử Undo/Redo (`Ctrl+Z`).

### 3. Đóng Dấu Bản Quyền / Watermark Trực Tiếp Trên Canvas (Watermark Overlay)
- Cho phép người dùng đóng dấu văn bản tùy ý (VD: `DRAFT`, `CONFIDENTIAL`, `BẢN THẢO NỘI BỘ`, Họ tên tác giả).
- Hiển thị mờ trang nhã ở góc canvas và được giữ nguyên khi xuất ra tài liệu.

### 4. Bổ Sung Mẫu Sơ Đồ Xác Thực & Đăng Nhập (Auth Flow Template)
- Template chuyên nghiệp mô tả hoàn chỉnh luồng xác thực: Kiểm tra Token -> Điều hướng Đăng nhập -> Nhập Mật khẩu -> Sinh JWT & Cookie -> Vào Dashboard.

---

## 5. Bảng Phím Tắt Nhanh (Quick Reference)

| Phím tắt | Chức năng |
|---|---|
| **Alt + M** | Mở bảng Thống kê & Đo lường Độ phức tạp McCabe |
| **Ctrl + F** | Mở bảng Tìm kiếm & Thay thế nội dung trên sơ đồ |
| **Ctrl + K** | Mở Command Palette điều khiển bằng lệnh |
| **Ctrl + 0** | Vừa khung hình (Fit View) |
| **Ctrl + Z / Ctrl + Y** | Hoàn tác (Undo) / Làm lại (Redo) |
| **Ctrl + S** | Lưu file sơ đồ `.json` |
| **Ctrl + T** | Thêm trang lưu đồ mới |
| **F11** | Bật / Tắt chế độ Toàn màn hình |
