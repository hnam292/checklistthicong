# Checklist Giám sát Thi công — AHT (Nhà ga T2)

Ứng dụng web di động cho đội giám sát chấm checklist công trình thi công,
tự động lưu vào Google Sheet, tạo PDF và gửi email báo cáo.

**Kiến trúc:**
```
[HTML/CSS/JS — GitHub Pages] → [Google Apps Script Web App] → [Google Sheet]
                                          │
                                          └→ Google Drive (ảnh) + Gmail (PDF)
```

---

## 1. Tạo Google Sheet

Tạo 1 Google Sheet mới với **đúng 4 tab** sau (tên tab phải khớp chính xác):

### Tab `TaiKhoan`
| Username | Password |
|---|---|
| giamsat1 | 123456 |

### Tab `TaiKhoanAdmin`
| Username | Password |
|---|---|
| admin | matkhau_admin_ban_tu_chon |

> Tab riêng cho tài khoản **Trang Quản trị** — tách biệt hoàn toàn với tài khoản nhân viên chấm checklist ở tab `TaiKhoan`. Bạn tự thêm tài khoản admin vào đây, không giới hạn số lượng.

### Tab `NhanSu`
| STT | Ten | Email |
|---|---|---|
| 1 | Nguyễn Đình Hoàng Nam | nam.nguyen@aht.com.vn |
| 2 | Đặng Trần Nguyên | nguyen.dang@aht.com.vn |

### Tab `DanhMuc`
| STT | HangMuc |
|---|---|
| 1 | Thi công đúng phạm vi, khung giờ và BPTC/điều kiện đã được chấp thuận. |
| ... | (20 hạng mục — copy nguyên nội dung từ file Checklist_thi_công.xlsx bạn đã gửi) |

### Tab `KetQuaChecklist`
Chỉ cần tạo tab trống với đúng dòng tiêu đề (Apps Script sẽ tự ghi dữ liệu vào các dòng tiếp theo):

| Timestamp | Ngay | Ca | NguoiThucHien | Email | STT | HangMuc | TinhTrang | GhiChu | LinkAnh |
|---|---|---|---|---|---|---|---|---|---|

> Ghi nhớ **Sheet ID** — chuỗi ký tự trong URL của Google Sheet:
> `https://docs.google.com/spreadsheets/d/`**`SHEET_ID_Ở_ĐÂY`**`/edit`

---

## 2. Cài Apps Script

1. Trong Google Sheet vừa tạo → **Tiện ích mở rộng (Extensions) → Apps Script**.
2. Xoá code mẫu, dán toàn bộ nội dung file **`Code.gs`** vào.
3. Sửa 2 dòng cấu hình đầu file:
   ```js
   const SHEET_ID = "PASTE_GOOGLE_SHEET_ID_HERE"; // dán Sheet ID ở bước 1
   const MANAGER_EMAIL = "";                        // để trống hoặc điền email quản lý để CC
   ```
4. Lưu (Ctrl+S / Cmd+S).

## 3. Deploy Apps Script (lấy URL Web App)

1. Nút **Deploy → New deployment**.
2. Chọn loại: **Web app**.
3. Cấu hình:
   - **Execute as:** Me (tài khoản của bạn)
   - **Who has access:** Anyone (bắt buộc, để trang GitHub Pages gọi được, không cần đăng nhập Google)
4. Bấm **Deploy** → cấp quyền (Authorize access) khi được hỏi.
5. Copy **Web app URL** (dạng `https://script.google.com/macros/s/XXXXX/exec`).

> Mỗi lần bạn **sửa code** trong Apps Script, phải **Deploy → Manage deployments → sửa → New version** thì thay đổi mới có hiệu lực trên URL cũ.

---

## 4. Cấu hình frontend

Mở file **`config.js`**, dán URL vừa copy:
```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/XXXXX/exec";
```

---

## 5. Deploy lên GitHub Pages

1. Tạo repo mới trên GitHub (ví dụ `checklist-thicong`).
2. Upload toàn bộ các file trong thư mục này:
   - `index.html`, `style.css`, `app.js`, `config.js`, `logo.png`
3. Vào **Settings → Pages** của repo → Source: chọn nhánh `main`, thư mục `/root` → Save.
4. Sau 1-2 phút, trang sẽ chạy tại: `https://<username>.github.io/checklist-thicong/`

---

## 6. Kiểm thử

1. Mở link GitHub Pages trên điện thoại.
2. Đăng nhập bằng tài khoản trong tab `TaiKhoan`.
3. Chọn Ngày / Ca / Người thực hiện, chấm 20 hạng mục.
4. Với mục "Không đạt": nhập Ghi chú + chụp/chọn ảnh (bắt buộc cả hai).
5. Bấm "Hoàn tất & Gửi báo cáo" → kiểm tra:
   - Dòng mới xuất hiện trong tab `KetQuaChecklist`.
   - Ảnh "Không đạt" xuất hiện trong thư mục Drive `Checklist_ThiCong_Anh`.
   - Email PDF gửi tới đúng email người thực hiện (và CC quản lý nếu đã cấu hình).

---

## Cấu trúc file

| File | Vai trò |
|---|---|
| `index.html` | Khung 4 màn hình: Đăng nhập (có tab Nhân viên/Quản trị) / Checklist / Trang Quản trị / Hoàn tất |
| `style.css` | Giao diện theo bộ nhận diện AHT (navy #234093, teal #42C1C7, đỏ #982E20, font Noto Serif Display + Noto Sans) |
| `app.js` | Toàn bộ logic: đăng nhập (nhân viên/admin), tải danh sách động từ Sheet, nén ảnh, gửi dữ liệu, thống kê & gửi email từ Trang Quản trị |
| `config.js` | Nơi duy nhất cần sửa URL Apps Script |
| `Code.gs` | Backend Apps Script: xác thực, ghi Sheet, upload ảnh Drive, tạo PDF, gửi email, thống kê Admin |
| `logo.png` | Logo AHT |

## Trang Quản trị

Đăng nhập bằng tài khoản trong tab `TaiKhoanAdmin` (chọn tab **Quản trị** ở màn đăng nhập) để vào Trang Quản trị:

1. **Ca bị thiếu checklist** — chọn khoảng ngày, hệ thống liệt kê những (Ngày, Ca) chưa có dữ liệu nào trong `KetQuaChecklist`. Quy tắc: **mọi ngày trong khoảng đều bắt buộc đủ 3 ca** (Sáng/Chiều/Đêm).
2. **Hạng mục Không đạt trong khoảng thời gian** — danh sách toàn bộ dòng "Không đạt" trong khoảng đã chọn, kèm ảnh thumbnail xem trực tiếp.
3. **Gửi email tùy chỉnh** — tick chọn 1 hoặc nhiều hạng mục Không đạt → nhập email người nhận + nội dung tự soạn → gửi. Ảnh minh chứng được lấy lại từ Google Drive và **đính kèm dạng file riêng** (không nhúng trong nội dung email).

> Lưu ý: nếu bạn đổi tên/nội dung 3 ca trong `index.html` (mục `fieldCa`), phải sửa lại đúng y hệt trong hằng số `CA_LIST` ở đầu `Code.gs` để việc tính "ca thiếu" luôn chính xác.

## Những điểm có thể tuỳ chỉnh thêm sau

- **`MANAGER_EMAIL`** trong `Code.gs`: hiện để trống theo yêu cầu, bạn tự điền khi có.
- **Nội dung 20 hạng mục**: sửa trực tiếp trên tab `DanhMuc`, không cần sửa code — app tự tải lại mỗi lần vào checklist.
- **Danh sách nhân sự**: thêm/sửa trực tiếp trên tab `NhanSu`.
- **Thêm tài khoản đăng nhập**: thêm dòng mới trong tab `TaiKhoan`.
