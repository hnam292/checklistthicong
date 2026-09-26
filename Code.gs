// ==========================================================
// Checklist Giám sát Thi công — AHT
// Google Apps Script backend (hook giữa frontend HTML và Google Sheet)
// ==========================================================

// ---------- CẤU HÌNH: sửa 2 dòng dưới đây ----------
const SHEET_ID = "PASTE_GOOGLE_SHEET_ID_HERE";
const MANAGER_EMAIL = ""; // để trống nếu chưa có email quản lý để CC
const DRIVE_FOLDER_NAME = "Checklist_ThiCong_Anh";

// ---------- ENTRY POINTS ----------
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === "init") {
      return jsonOutput(getInitData());
    }
    return jsonOutput({ success: false, error: "Unknown action" });
  } catch (err) {
    return jsonOutput({ success: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    if (action === "login") return jsonOutput(handleLogin(body));
    if (action === "submit") return jsonOutput(handleSubmit(body));
    return jsonOutput({ success: false, message: "Unknown action" });
  } catch (err) {
    return jsonOutput({ success: false, message: String(err) });
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getSheet(name) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error('Không tìm thấy tab "' + name + '" trong Google Sheet.');
  return sheet;
}

// ---------- INIT DATA (NhanSu + DanhMuc) ----------
function getInitData() {
  const nhanSuSheet = getSheet("NhanSu");
  const danhMucSheet = getSheet("DanhMuc");

  const nhanSuValues = nhanSuSheet.getDataRange().getValues(); // header: STT | Ten | Email
  const nhanSu = [];
  for (let i = 1; i < nhanSuValues.length; i++) {
    const row = nhanSuValues[i];
    if (!row[1]) continue;
    nhanSu.push({ stt: row[0], ten: String(row[1]).trim(), email: String(row[2] || "").trim() });
  }

  const danhMucValues = danhMucSheet.getDataRange().getValues(); // header: STT | HangMuc
  const danhMuc = [];
  for (let i = 1; i < danhMucValues.length; i++) {
    const row = danhMucValues[i];
    if (!row[1]) continue;
    danhMuc.push({ stt: row[0], hangMuc: String(row[1]).trim() });
  }

  return { success: true, nhanSu, danhMuc };
}

// ---------- LOGIN ----------
function handleLogin(body) {
  const sheet = getSheet("TaiKhoan"); // header: Username | Password
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(body.username) && String(values[i][1]) === String(body.password)) {
      return { success: true };
    }
  }
  return { success: false, message: "Sai tên đăng nhập hoặc mật khẩu." };
}

// ---------- SUBMIT CHECKLIST ----------
function handleSubmit(body) {
  const { ngay, ca, nguoiThucHien, email, items } = body;
  if (!ngay || !ca || !nguoiThucHien || !items || !items.length) {
    return { success: false, message: "Thiếu dữ liệu bắt buộc." };
  }

  const resultSheet = getSheet("KetQuaChecklist");
  const timestamp = new Date();
  let folder = null;

  const rows = [];
  items.forEach((item) => {
    let driveUrl = "";
    if (item.tinhTrang === "Không đạt" && item.anhBase64) {
      if (!folder) folder = getOrCreateFolder(DRIVE_FOLDER_NAME);
      driveUrl = uploadImageToDrive(item.anhBase64, "anh_" + ngay.replace(/\//g, "-") + "_stt" + item.stt + ".jpg", folder);
    }
    rows.push([timestamp, ngay, ca, nguoiThucHien, email || "", item.stt, item.hangMuc, item.tinhTrang, item.ghiChu || "", driveUrl]);
  });

  resultSheet.getRange(resultSheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

  const total = items.length;
  const dat = items.filter((i) => i.tinhTrang === "Đạt").length;
  const khongDat = total - dat;

  const reportData = { ngay, ca, nguoiThucHien, items, total, dat, khongDat };
  const pdfBlob = buildPdf(reportData);

  const ccSent = sendReportEmail(email, reportData, pdfBlob);

  return { success: true, total, dat, khongDat, ccSent };
}

function getOrCreateFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

// data URL dạng "data:image/jpeg;base64,...."
function uploadImageToDrive(dataUrl, fileName, folder) {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  const mimeType = match ? match[1] : "image/jpeg";
  const base64 = match ? match[2] : dataUrl;
  const bytes = Utilities.base64Decode(base64);
  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

// ---------- PDF ----------
function buildPdf(data) {
  const html = renderReportHtml(data);
  const blob = Utilities.newBlob(html, "text/html", "BaoCao.html").getAs("application/pdf");
  blob.setName("BaoCao_Checklist_" + data.ngay.replace(/\//g, "-") + "_" + data.nguoiThucHien.replace(/\s+/g, "_") + ".pdf");
  return blob;
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderReportHtml(data) {
  const rows = data.items
    .map((it) => {
      const isFail = it.tinhTrang === "Không đạt";
      const statusColor = isFail ? "#982E20" : "#1F8A8F";
      const imgTag =
        isFail && it.anhBase64
          ? '<div style="margin-top:6px;"><img src="' + it.anhBase64 + '" style="max-width:220px;max-height:220px;border-radius:6px;border:1px solid #D8A79E;"></div>'
          : "";
      return (
        "<tr>" +
        '<td style="padding:6px;border:1px solid #E2E5EA;text-align:center;vertical-align:top;">' + esc(it.stt) + "</td>" +
        '<td style="padding:6px;border:1px solid #E2E5EA;vertical-align:top;">' + esc(it.hangMuc) + "</td>" +
        '<td style="padding:6px;border:1px solid #E2E5EA;text-align:center;vertical-align:top;color:' + statusColor + ';font-weight:bold;">' + esc(it.tinhTrang) + "</td>" +
        '<td style="padding:6px;border:1px solid #E2E5EA;vertical-align:top;">' + esc(it.ghiChu) + imgTag + "</td>" +
        "</tr>"
      );
    })
    .join("");

  return (
    "<html><head><meta charset=\"utf-8\"><style>" +
    "body{font-family:Arial,sans-serif;color:#1A1A1A;padding:24px;}" +
    "h1{color:#112956;font-size:16px;margin-bottom:4px;}" +
    "p.meta{font-size:12px;color:#5B6472;margin-top:0;}" +
    "table{border-collapse:collapse;width:100%;font-size:11px;margin-top:12px;}" +
    ".summary{display:flex;gap:8px;margin:12px 0;}" +
    ".box{border:1px solid #E2E5EA;padding:8px 16px;text-align:center;border-radius:4px;}" +
    "</style></head><body>" +
    "<h1>BÁO CÁO CHECKLIST GIÁM SÁT THI CÔNG — NHÀ GA T2</h1>" +
    '<p class="meta">Ngày: <b>' + esc(data.ngay) + "</b> &nbsp;|&nbsp; Ca: <b>" + esc(data.ca) + "</b> &nbsp;|&nbsp; Người thực hiện: <b>" + esc(data.nguoiThucHien) + "</b></p>" +
    '<div class="summary">' +
    '<div class="box">Tổng mục<br><b>' + data.total + "</b></div>" +
    '<div class="box" style="color:#1F8A8F;">Đạt<br><b>' + data.dat + "</b></div>" +
    '<div class="box" style="color:#982E20;">Không đạt<br><b>' + data.khongDat + "</b></div>" +
    "</div>" +
    "<table><thead><tr>" +
    '<th style="padding:6px;border:1px solid #E2E5EA;background:#234093;color:#fff;">STT</th>' +
    '<th style="padding:6px;border:1px solid #E2E5EA;background:#234093;color:#fff;">Hạng mục</th>' +
    '<th style="padding:6px;border:1px solid #E2E5EA;background:#234093;color:#fff;">Tình trạng</th>' +
    '<th style="padding:6px;border:1px solid #E2E5EA;background:#234093;color:#fff;">Ghi chú / Ảnh</th>' +
    "</tr></thead><tbody>" + rows + "</tbody></table>" +
    "</body></html>"
  );
}

// ---------- EMAIL ----------
// Trả về true nếu có gửi CC cho quản lý (MANAGER_EMAIL đã cấu hình)
function sendReportEmail(toEmail, data, pdfBlob) {
  const subject = "Báo cáo Checklist Thi công - " + data.ngay + " (" + data.ca + ")";
  const body =
    "Xin chào " + data.nguoiThucHien + ",\n\n" +
    "Báo cáo checklist giám sát thi công ca " + data.ca + " ngày " + data.ngay + " đã hoàn tất.\n" +
    "Tổng: " + data.total + " mục | Đạt: " + data.dat + " | Không đạt: " + data.khongDat + "\n\n" +
    "Chi tiết xem file PDF đính kèm.\n\nTrân trọng,\nHệ thống Checklist AHT";

  const hasManager = !!MANAGER_EMAIL;
  const mailOptions = { attachments: [pdfBlob], name: "Hệ thống Checklist AHT" };
  if (hasManager) mailOptions.cc = MANAGER_EMAIL;

  const recipient = toEmail || MANAGER_EMAIL;
  if (!recipient) return false; // không có email nào để gửi

  MailApp.sendEmail(Object.assign({ to: recipient, subject: subject, body: body }, mailOptions));
  return hasManager;
}
