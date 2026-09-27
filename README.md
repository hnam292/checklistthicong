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

Tạo 1 Google Sheet mới với **đúng 3 tab** sau (tên tab phải khớp chính xác):

### Tab `TaiKhoan`
| Username | Password | Name | Email |
|---|---|---|---|
| giamsat1 | 123456 | Nguyễn Đình Hoàng Nam | nam.nguyen@aht.com.vn |

> Mỗi tài khoản = đúng 1 người thực hiện checklist — **không dùng chung tài khoản cho nhiều người**, vì hệ thống tự lấy Name/Email của đúng tài khoản đang đăng nhập làm "Người thực hiện", không cần chọn lại. Nếu 1 tài khoản chưa kịp điền Name/Email, hệ thống vẫn cho đăng nhập bình thường — tạm dùng Username làm tên hiển thị và bỏ qua gửi email cá nhân cho tài khoản đó.

### Tab `TaiKhoanAdmin`
| Username | Password |
|---|---|
| admin | matkhau_admin_ban_tu_chon |

> Tab riêng cho tài khoản **Trang Quản trị** — tách biệt hoàn toàn với tài khoản nhân viên ở tab `TaiKhoan`. Bạn tự thêm tài khoản admin vào đây, không giới hạn số lượng.

### Tab `DanhMuc`
| STT | HangMuc |
|---|---|
| 1 | Thi công đúng phạm vi, khung giờ và BPTC/điều kiện đã được chấp thuận. |
| ... | (20 hạng mục — copy nguyên nội dung từ file Checklist_thi_công.xlsx bạn đã gửi) |

### Tab `KetQuaChecklist`
Chỉ cần tạo tab trống với đúng dòng tiêu đề (Apps Script sẽ tự ghi dữ liệu vào các dòng tiếp theo):

| Timestamp | Ngay | Ca | ViTriGiamSat | NguoiThucHien | Email | STT | HangMuc | TinhTrang | GhiChu | LinkAnh |
|---|---|---|---|---|---|---|---|---|---|---|

> **Nếu bạn đang cập nhật từ bản trước** (đã có sẵn dữ liệu trong `KetQuaChecklist`): bấm chuột phải vào **tên cột D (NguoiThucHien)** → **Insert 1 column left** → đặt tên cột D mới là `ViTriGiamSat`. Google Sheet sẽ tự dịch toàn bộ dữ liệu cũ từ cột D trở đi sang phải 1 cột, không mất dữ liệu. Các dòng dữ liệu cũ sẽ có ô `ViTriGiamSat` để trống (vì lúc đó chưa có trường này) — không ảnh hưởng gì, chỉ đơn giản là chưa biết vị trí của các lần chấm cũ.

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
| `style.css` | Giao diện theo bộ nhận diện AHT (navy #234093, teal #42C1C7, đỏ #982E20, font Times New Roman) |
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

## Cảnh báo tự động khi thiếu checklist theo ca

Hệ thống tự kiểm tra định kỳ và **tự gửi email cảnh báo** (không cần ai mở trang web) nếu 1 ca kết thúc mà chưa có checklist nào được chấm. Vì Ca đêm vắt qua nửa đêm (22:00–06:00 hôm sau), thuật toán kiểm tra Ca đêm sẽ nới lỏng: chấp nhận checklist ghi Ngày = hôm qua **hoặc** hôm nay (đề phòng nhân viên chấm trễ sau 0h quên đổi ngày).

**Điều kiện bắt buộc:** phải điền `MANAGER_EMAIL` ở đầu `Code.gs` — nếu để trống, cảnh báo sẽ không có người nhận nên hệ thống tự bỏ qua, không báo lỗi.

Sau khi deploy `Code.gs` (Deploy → Manage deployments → New version), vào thiết lập 3 Trigger sau:

1. Trong Apps Script, bấm biểu tượng **đồng hồ (Triggers)** ở thanh bên trái.
2. Bấm **+ Add Trigger** (góc dưới phải), lặp lại 3 lần với cấu hình:

| Trigger # | Choose which function to run | Select event source | Select type of time based trigger | Select time |
|---|---|---|---|---|
| 1 | `kiemTraCaSang` | Time-driven | Day timer | 2pm to 3pm (14:00–15:00) |
| 2 | `kiemTraCaChieu` | Time-driven | Day timer | 10pm to 11pm (22:00–23:00) |
| 3 | `kiemTraCaDem` | Time-driven | Day timer | 6am to 7am (06:00–07:00) |

Apps Script chỉ cho chọn khung giờ 1 tiếng (không chọn được chính xác phút), hệ thống sẽ tự chạy vào một thời điểm ngẫu nhiên trong khung đó — vẫn đảm bảo đúng logic vì luôn kiểm tra dữ liệu **sau khi ca đã kết thúc**.

## Những điểm có thể tuỳ chỉnh thêm sau

- **`MANAGER_EMAIL`** trong `Code.gs`: hiện để trống theo yêu cầu, bạn tự điền khi có.
- **Nội dung 20 hạng mục**: sửa trực tiếp trên tab `DanhMuc`, không cần sửa code — app tự tải lại mỗi lần vào checklist.
- **Thêm nhân viên / tài khoản đăng nhập mới**: thêm 1 dòng mới trong tab `TaiKhoan` (Username, Password, Name, Email) — mỗi dòng là 1 người, không dùng chung tài khoản.
