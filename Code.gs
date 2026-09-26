// ==========================================================
// Checklist Giám sát Thi công — AHT
// Google Apps Script backend (hook giữa frontend HTML và Google Sheet)
// ==========================================================

// ---------- CẤU HÌNH: sửa 2 dòng dưới đây ----------
const SHEET_ID = "PASTE_GOOGLE_SHEET_ID_HERE";
const MANAGER_EMAIL = ""; // để trống nếu chưa có email quản lý để CC
const DRIVE_FOLDER_NAME = "Checklist_ThiCong_Anh";

// Logo AHT được nhúng sẵn dạng base64 (không phụ thuộc URL ngoài) —
// dùng chung cho cả PDF và email, không cần cấu hình gì thêm.
const LOGO_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAATEAAACSCAYAAAAtmv2cAAAWfmNhQlgAABZ+anVtYgAAAB5qdW1kYzJwYQARABCAAACqADibcQNjMnBhAAAAFlhqdW1iAAAAR2p1bWRjMm1hABEAEIAAAKoAOJtxA3VybjpjMnBhOjM2ZmQ0YTkyLTdhYmQtNGM3YS05NmFkLTc2MzE2YmZlOTVlOQAAAAOTanVtYgAAAClqdW1kYzJhcwARABCAAACqADibcQNjMnBhLmFzc2VydGlvbnMAAAAAuGp1bWIAAABEanVtZGNib3IAEQAQgAAAqgA4m3ETYzJwYS5pbmdyZWRpZW50LnYzAAAAABhjMnNohVjZDU7mBrPRug5ZErRiIQAAAGxjYm9yo2lkYzpmb3JtYXRpaW1hZ2UvcG5namluc3RhbmNlSUR4LHhtcDppaWQ6OWI4M2E1ZWItMWY3Mi00NWIxLWE1MDktNjM2MWUzODk2N2M0bHJlbGF0aW9uc2hpcGhwYXJlbnRPZgAAAeJqdW1iAAAAQWp1bWRjYm9yABEAEIAAAKoAOJtxE2MycGEuYWN0aW9ucy52MgAAAAAYYzJzaDd8MwHV3V/y0ODnTsajJeEAAAGZY2JvcqJnYWN0aW9uc4KiZmFjdGlvbmtjMnBhLm9wZW5lZGpwYXJhbWV0ZXJzoWtpbmdyZWRpZW50c4GiY3VybHgtc2VsZiNqdW1iZj1jMnBhLmFzc2VydGlvbnMvYzJwYS5pbmdyZWRpZW50LnYzZGhhc2hYIAiiVYG+DGhFiv6dGU/KVVwbR2fvXuHld1Abc/IYLUcipGZhY3Rpb254HWNvbS5hbnRocm9waWMuY2xhdWRlLnByb3ZpZGVkanBhcmFtZXRlcnOheB9jb20uYW50aHJvcGljLm9yaWdpbi1jb25maWRlbmNlZ3Vua25vd25rZGVzY3JpcHRpb254ZkNsYXVkZSBwcm92aWRlZCB0aGlzIGZpbGUgYXQgdGhlIHJlcXVlc3Qgb2YgYSB1c2VyIGFuZCBtYXkgaGF2ZSBjcmVhdGVkIG9yIG1vZGlmaWVkIHRoZSBmaWxlIGNvbnRlbnRzLm1zb2Z0d2FyZUFnZW50oWRuYW1lZkNsYXVkZXJhbGxBY3Rpb25zSW5jbHVkZWT1AAAAyGp1bWIAAABAanVtZGNib3IAEQAQgAAAqgA4m3ETYzJwYS5oYXNoLmRhdGEAAAAAGGMyc2jfgPrRbwWlYraMlIrIK/iVAAAAgGNib3KlY2FsZ2ZzaGEyNTZjcGFkTQAAAAAAAAAAAAAAAABkaGFzaFgg0XUmQKe25Jiu5DCZ5vdNREgnfx9AhFREikKAprgd/xhkbmFtZW5qdW1iZiBtYW5pZmVzdGpleGNsdXNpb25zgaJlc3RhcnQYIWZsZW5ndGgZFooAAAI+anVtYgAAACdqdW1kYzJjbAARABCAAACqADibcQNjMnBhLmNsYWltLnYyAAAAAg9jYm9ypWNhbGdmc2hhMjU2aXNpZ25hdHVyZXhNc2VsZiNqdW1iZj0vYzJwYS91cm46YzJwYTozNmZkNGE5Mi03YWJkLTRjN2EtOTZhZC03NjMxNmJmZTk1ZTkvYzJwYS5zaWduYXR1cmVqaW5zdGFuY2VJRHgseG1wOmlpZDo1YzBmNzU1NS1iZTBhLTQ1YmMtOTZjNy01NTZkNjEwNzNkODJyY3JlYXRlZF9hc3NlcnRpb25zg6JjdXJseC1zZWxmI2p1bWJmPWMycGEuYXNzZXJ0aW9ucy9jMnBhLmluZ3JlZGllbnQudjNkaGFzaFggCKJVgb4MaEWK/p0ZT8pVXBtHZ+9e4eV3UBtz8hgtRyKiY3VybHgqc2VsZiNqdW1iZj1jMnBhLmFzc2VydGlvbnMvYzJwYS5hY3Rpb25zLnYyZGhhc2hYIJaLgQU5uq/u0rJhqXJgpyze1CHLW+QQFKkKUuVrS0EbomN1cmx4KXNlbGYjanVtYmY9YzJwYS5hc3NlcnRpb25zL2MycGEuaGFzaC5kYXRhZGhhc2hYIGTEGfzfvu/b13zcXsO+s3GjgJYlC2VIAQP7cvr2g9bmdGNsYWltX2dlbmVyYXRvcl9pbmZvo2RuYW1lb0FudGhyb3BpYyBGaWxlc2d2ZXJzaW9uZTEuMC4wa3NwZWNWZXJzaW9uZTIuNC4wAAAQOGp1bWIAAAAoanVtZGMyY3MAEQAQgAAAqgA4m3EDYzJwYS5zaWduYXR1cmUAAAAQCGNib3LShFkCEqIBJhghWQIKMIICBjCCAY2gAwIBAgIUQOWgCu7COdC+uIP6BkIFPWdVEwAwCgYIKoZIzj0EAwMwSTEXMBUGA1UEChMOQW50aHJvcGljLCBQQkMxLjAsBgNVBAMTJUFudGhyb3BpYyBDb250ZW50IENyZWRlbnRpYWxzIFJvb3QgQ0EwHhcNMjYwODA3MTg0MzU2WhcNMjgwODA2MTk0MzU2WjBEMRcwFQYDVQQKEw5BbnRocm9waWMsIFBCQzEpMCcGA1UEAxMgQW50aHJvcGljIENsYXVkZSBDb250ZW50IFNpZ25pbmcwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAASYegpry1AYBRTVNL1CpTlbROnY3dey+UrsF9C3phYrATN3ZHf93Mo8RQN0KOUuOn19P4oWNFWe5n2/She9N7eTo1gwVjAOBgNVHQ8BAf8EBAMCB4AwFQYDVR0lBA4wDAYKKwYBBAGD6F4CATAMBgNVHRMBAf8EAjAAMB8GA1UdIwQYMBaAFM5R4gSBTmRbI/jjxM+aPpzB11zCMAoGCCqGSM49BAMDA2cAMGQCMDFzHRSeAXrSy1WOzkbhPZ6Km2wGTmZ/2gK18k8BQGXyqz88Rdrz6CTX9flAnYNVxgIwcF9c3fVhqmJKpi+UhasNUMko69cyX6STPfta3Q8EjyzDjzoyrol46FP6VFHhvUcJoWNwYWRZDZ4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA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";
const LOGO_DATA_URL = "data:image/png;base64," + LOGO_BASE64;

// Bảng màu thương hiệu AHT
const COLOR = {
  navy: "#234093",
  navyDark: "#112956",
  teal: "#42C1C7",
  tealText: "#1F8A8F",
  red: "#982E20",
  bg: "#F4F6FA",
  border: "#E2E5EA",
  text: "#1A1A1A",
  textMuted: "#5B6472",
};

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
  const blob = dataUrlToBlob(dataUrl, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Nhóm 20 hạng mục theo cấu trúc gốc của checklist (theo khoảng STT).
// Nếu danh mục thực tế không khớp các khoảng này, mọi mục còn lại
// tự động rơi vào nhóm "Nội dung khác" — không làm hỏng báo cáo.
const CATEGORY_RANGES = [
  { title: "Phạm vi & Kiểm soát Thi công", from: 1, to: 4 },
  { title: "An toàn & Trải nghiệm Hành khách", from: 5, to: 9 },
  { title: "Môi trường & Vệ sinh", from: 10, to: 11 },
  { title: "Phòng cháy chữa cháy (PCCC)", from: 12, to: 16 },
  { title: "Che chắn & Bảo vệ Công trường", from: 17, to: 20 },
];

function groupItemsByCategory(items) {
  const groups = CATEGORY_RANGES.map((c) => ({ title: c.title, items: [] }));
  const other = { title: "Nội dung khác", items: [] };
  items.forEach((it) => {
    const stt = Number(it.stt);
    const cat = CATEGORY_RANGES.findIndex((c) => stt >= c.from && stt <= c.to);
    if (cat >= 0) groups[cat].items.push(it);
    else other.items.push(it);
  });
  if (other.items.length) groups.push(other);
  return groups.filter((g) => g.items.length);
}

// ---------- PDF ----------
function buildPdf(data) {
  const html = renderReportHtml(data);
  const blob = Utilities.newBlob(html, "text/html", "BaoCao.html").getAs("application/pdf");
  blob.setName("BaoCao_Checklist_" + data.ngay.replace(/\//g, "-") + "_" + data.nguoiThucHien.replace(/\s+/g, "_") + ".pdf");
  return blob;
}

function renderReportHtml(data) {
  const groups = groupItemsByCategory(data.items);

  const groupsHtml = groups
    .map((g) => {
      const rows = g.items
        .map((it, idx) => {
          const isFail = it.tinhTrang === "Không đạt";
          const badgeBg = isFail ? "#FBEEEC" : "#EAF7F7";
          const badgeColor = isFail ? COLOR.red : COLOR.tealText;
          const accentColor = isFail ? COLOR.red : COLOR.teal;
          const rowBg = idx % 2 === 0 ? "#FFFFFF" : "#FAFBFD";
          const imgTag =
            isFail && it.anhBase64
              ? '<div style="margin-top:8px;"><div style="font-size:9px;color:' + COLOR.textMuted + ';margin-bottom:3px;text-transform:uppercase;letter-spacing:.03em;">Ảnh minh chứng</div>' +
                '<img src="' + it.anhBase64 + '" style="max-width:230px;max-height:230px;border-radius:6px;border:1px solid ' + COLOR.border + ';display:block;"></div>'
              : "";
          return (
            '<tr style="background:' + rowBg + ';">' +
            '<td style="padding:10px 8px;border-bottom:2px solid ' + COLOR.border + ';border-left:5px solid ' + accentColor + ';text-align:center;vertical-align:top;font-weight:700;color:' + COLOR.navyDark + ';width:34px;">' + esc(it.stt) + "</td>" +
            '<td style="padding:10px 10px;border-bottom:2px solid ' + COLOR.border + ';border-right:1px solid ' + COLOR.border + ';vertical-align:top;line-height:1.5;">' + esc(it.hangMuc) + "</td>" +
            '<td style="padding:10px 8px;border-bottom:2px solid ' + COLOR.border + ';border-right:1px solid ' + COLOR.border + ';text-align:center;vertical-align:top;width:82px;">' +
              '<span style="display:inline-block;padding:3px 10px;border-radius:20px;background:' + badgeBg + ';color:' + badgeColor + ';font-weight:700;font-size:10px;white-space:nowrap;">' + esc(it.tinhTrang) + "</span>" +
            "</td>" +
            '<td style="padding:10px 10px;border-bottom:2px solid ' + COLOR.border + ';border-right:1px solid ' + COLOR.border + ';vertical-align:top;width:220px;line-height:1.4;">' + (esc(it.ghiChu) || '<span style="color:#B7BEC9;">—</span>') + imgTag + "</td>" +
            "</tr>"
          );
        })
        .join("");

      return (
        '<div style="margin-top:20px;padding:6px 0 6px 10px;border-left:4px solid ' + COLOR.navy + ';font-family:Georgia,\'Times New Roman\',serif;font-weight:700;font-size:12.5px;color:' + COLOR.navyDark + ';">' + esc(g.title) + " (" + g.items.length + " mục)</div>" +
        '<table style="border-collapse:collapse;width:100%;font-size:10.5px;margin-top:6px;font-family:Arial,Helvetica,sans-serif;color:' + COLOR.text + ';border:1px solid ' + COLOR.border + ';">' +
        "<thead><tr>" +
        '<th style="padding:8px;border-right:1px solid rgba(255,255,255,0.25);background:' + COLOR.navy + ';color:#fff;font-size:10px;">STT</th>' +
        '<th style="padding:8px;border-right:1px solid rgba(255,255,255,0.25);background:' + COLOR.navy + ';color:#fff;font-size:10px;text-align:left;">Hạng mục</th>' +
        '<th style="padding:8px;border-right:1px solid rgba(255,255,255,0.25);background:' + COLOR.navy + ';color:#fff;font-size:10px;">Tình trạng</th>' +
        '<th style="padding:8px;background:' + COLOR.navy + ';color:#fff;font-size:10px;text-align:left;">Ghi chú / Minh chứng</th>' +
        "</tr></thead><tbody>" + rows + "</tbody></table>"
      );
    })
    .join("");

  const generatedAt = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm");

  return (
    "<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\"><style>" +
    "@page { margin: 26px 22px; }" +
    "body{font-family:Arial,Helvetica,sans-serif;color:" + COLOR.text + ";margin:0;}" +
    "</style></head><body>" +

    // Header
    '<table style="width:100%;border-collapse:collapse;margin-bottom:14px;">' +
    '<tr>' +
    '<td style="width:64px;vertical-align:middle;"><img src="' + LOGO_DATA_URL + '" style="width:56px;height:auto;"></td>' +
    '<td style="vertical-align:middle;padding-left:10px;border-bottom:2px solid ' + COLOR.navy + ';padding-bottom:10px;">' +
    '<div style="font-family:Georgia,\'Times New Roman\',serif;font-weight:700;font-size:16px;color:' + COLOR.navyDark + ';">BÁO CÁO CHECKLIST GIÁM SÁT THI CÔNG</div>' +
    '<div style="font-size:10.5px;color:' + COLOR.textMuted + ';margin-top:2px;">Nhà ga T2 · Da Nang International Terminal</div>' +
    "</td></tr></table>" +

    // Meta info box
    '<table style="width:100%;border-collapse:collapse;background:' + COLOR.bg + ';border:1px solid ' + COLOR.border + ';border-radius:8px;font-size:11px;margin-bottom:14px;">' +
    '<tr>' +
    '<td style="padding:10px 14px;width:33%;"><div style="color:' + COLOR.textMuted + ';font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;">Ngày thực hiện</div><div style="font-weight:700;color:' + COLOR.navyDark + ';margin-top:2px;">' + esc(data.ngay) + "</div></td>" +
    '<td style="padding:10px 14px;width:33%;border-left:1px solid ' + COLOR.border + ';"><div style="color:' + COLOR.textMuted + ';font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;">Ca thực hiện</div><div style="font-weight:700;color:' + COLOR.navyDark + ';margin-top:2px;">' + esc(data.ca) + "</div></td>" +
    '<td style="padding:10px 14px;width:34%;border-left:1px solid ' + COLOR.border + ';"><div style="color:' + COLOR.textMuted + ';font-size:9.5px;text-transform:uppercase;letter-spacing:.04em;">Người thực hiện</div><div style="font-weight:700;color:' + COLOR.navyDark + ';margin-top:2px;">' + esc(data.nguoiThucHien) + "</div></td>" +
    "</tr></table>" +

    // Summary stat boxes
    '<table style="width:100%;border-collapse:separate;border-spacing:8px 0;margin-bottom:6px;">' +
    "<tr>" +
    '<td style="width:33%;text-align:center;border:1px solid ' + COLOR.border + ';border-radius:8px;padding:12px;"><div style="font-family:Georgia,serif;font-weight:700;font-size:24px;color:' + COLOR.navyDark + ';">' + data.total + '</div><div style="font-size:10px;color:' + COLOR.textMuted + ';margin-top:2px;">Tổng số mục</div></td>' +
    '<td style="width:33%;text-align:center;border:1px solid ' + COLOR.border + ';border-radius:8px;padding:12px;"><div style="font-family:Georgia,serif;font-weight:700;font-size:24px;color:' + COLOR.tealText + ';">' + data.dat + '</div><div style="font-size:10px;color:' + COLOR.textMuted + ';margin-top:2px;">Đạt</div></td>' +
    '<td style="width:33%;text-align:center;border:1px solid ' + COLOR.border + ';border-radius:8px;padding:12px;"><div style="font-family:Georgia,serif;font-weight:700;font-size:24px;color:' + COLOR.red + ';">' + data.khongDat + '</div><div style="font-size:10px;color:' + COLOR.textMuted + ';margin-top:2px;">Không đạt</div></td>' +
    "</tr></table>" +

    groupsHtml +

    // Signature block
    '<table style="width:100%;border-collapse:collapse;margin-top:34px;font-size:10.5px;">' +
    "<tr>" +
    '<td style="width:50%;vertical-align:top;">' +
    '<div style="color:' + COLOR.textMuted + ';">Người thực hiện</div>' +
    '<div style="height:46px;"></div>' +
    '<div style="border-top:1px solid ' + COLOR.border + ';padding-top:4px;font-weight:700;color:' + COLOR.navyDark + ';">' + esc(data.nguoiThucHien) + "</div>" +
    "</td>" +
    '<td style="width:50%;vertical-align:top;">' +
    '<div style="color:' + COLOR.textMuted + ';">Quản lý / Giám sát xác nhận</div>' +
    '<div style="height:46px;"></div>' +
    '<div style="border-top:1px solid ' + COLOR.border + ';padding-top:4px;">&nbsp;</div>' +
    "</td>" +
    "</tr></table>" +

    // Footer
    '<div style="margin-top:22px;padding-top:8px;border-top:1px solid ' + COLOR.border + ';font-size:9px;color:#9AA3B0;">' +
    'Báo cáo được tạo tự động bởi Hệ thống Checklist AHT lúc ' + generatedAt + "." +
    "</div>" +

    "</body></html>"
  );
}

// ---------- EMAIL ----------
// Trả về true nếu có gửi CC cho quản lý (MANAGER_EMAIL đã cấu hình)
function sendReportEmail(toEmail, data, pdfBlob) {
  const allPass = data.khongDat === 0;
  const subject =
    (allPass ? "✓ Đạt toàn bộ" : "⚠ Có " + data.khongDat + " mục không đạt") +
    " — Checklist Thi công " + data.ngay + " (" + data.ca + ")";

  const logoBlob = Utilities.newBlob(Utilities.base64Decode(LOGO_BASE64), "image/png", "logo.png");
  const inlineImages = { logoAht: logoBlob };

  // Chỉ đính kèm ảnh minh chứng của các hạng mục Không đạt, mỗi ảnh 1 cid riêng
  const failedItems = data.items.filter((i) => i.tinhTrang === "Không đạt");
  failedItems.forEach((it, idx) => {
    if (!it.anhBase64) return;
    const cid = "fail_" + idx;
    inlineImages[cid] = dataUrlToBlob(it.anhBase64, "khongdat_" + it.stt + ".jpg");
    it._cid = cid; // dùng lại khi render HTML
  });

  const htmlBody = renderEmailHtml(data, allPass, failedItems);
  const plainBody = allPass
    ? "Checklist thi công ca " + data.ca + " ngày " + data.ngay + ": TẤT CẢ " + data.total + "/" + data.total + " hạng mục đều đạt yêu cầu.\nChi tiết xem file PDF đính kèm."
    : "Checklist thi công ca " + data.ca + " ngày " + data.ngay + " có " + data.khongDat + "/" + data.total + " hạng mục KHÔNG ĐẠT, cần xử lý:\n" +
      failedItems.map((i) => "- #" + i.stt + " " + i.hangMuc + (i.ghiChu ? " (Ghi chú: " + i.ghiChu + ")" : "")).join("\n") +
      "\n\nChi tiết đầy đủ + ảnh minh chứng xem file PDF đính kèm.";

  const hasManager = !!MANAGER_EMAIL;
  const mailOptions = {
    attachments: [pdfBlob],
    inlineImages: inlineImages,
    name: "Hệ thống Checklist AHT",
    htmlBody: htmlBody,
    body: plainBody,
  };
  if (hasManager) mailOptions.cc = MANAGER_EMAIL;

  const recipient = toEmail || MANAGER_EMAIL;
  if (!recipient) return false; // không có email nào để gửi

  MailApp.sendEmail(Object.assign({ to: recipient, subject: subject }, mailOptions));
  return hasManager;
}

// data URL "data:image/jpeg;base64,...." → Blob (dùng chung cho Drive + email inline)
function dataUrlToBlob(dataUrl, fileName) {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  const mimeType = match ? match[1] : "image/jpeg";
  const base64 = match ? match[2] : dataUrl;
  return Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
}

function emailHeader() {
  return (
    '<table role="presentation" width="100%" style="border-collapse:collapse;">' +
    '<tr><td style="background:' + COLOR.navy + ';padding:18px 22px;border-radius:10px 10px 0 0;" bgcolor="' + COLOR.navy + '">' +
    '<table role="presentation"><tr>' +
    '<td style="padding-right:12px;"><img src="cid:logoAht" width="40" style="display:block;"></td>' +
    '<td style="vertical-align:middle;">' +
    '<div style="font-family:Georgia,\'Times New Roman\',serif;font-weight:700;font-size:16px;color:#FFFFFF;">Checklist Giám sát Thi công</div>' +
    '<div style="font-size:11px;color:#C9D3EA;margin-top:2px;">Nhà ga T2 · Da Nang International Terminal</div>' +
    "</td></tr></table>" +
    "</td></tr></table>"
  );
}

function emailMetaAndStats(data) {
  return (
    '<table role="presentation" width="100%" style="border-collapse:collapse;background:' + COLOR.bg + ';border:1px solid ' + COLOR.border + ';border-radius:8px;margin-bottom:16px;font-size:12px;">' +
    '<tr>' +
    '<td style="padding:10px 14px;">Ngày: <b>' + esc(data.ngay) + '</b></td>' +
    '<td style="padding:10px 14px;border-left:1px solid ' + COLOR.border + ';">Ca: <b>' + esc(data.ca) + '</b></td>' +
    '<td style="padding:10px 14px;border-left:1px solid ' + COLOR.border + ';">Người thực hiện: <b>' + esc(data.nguoiThucHien) + '</b></td>' +
    "</tr></table>" +

    '<table role="presentation" width="100%" style="border-collapse:separate;border-spacing:8px 0;margin-bottom:18px;">' +
    "<tr>" +
    '<td style="width:33%;text-align:center;border:1px solid ' + COLOR.border + ';border-radius:8px;padding:14px 4px;"><div style="font-family:Georgia,serif;font-weight:700;font-size:22px;color:' + COLOR.navyDark + ';">' + data.total + '</div><div style="font-size:10.5px;color:' + COLOR.textMuted + ';margin-top:2px;">Tổng số mục</div></td>' +
    '<td style="width:33%;text-align:center;border:1px solid ' + COLOR.border + ';border-radius:8px;padding:14px 4px;"><div style="font-family:Georgia,serif;font-weight:700;font-size:22px;color:' + COLOR.tealText + ';">' + data.dat + '</div><div style="font-size:10.5px;color:' + COLOR.textMuted + ';margin-top:2px;">Đạt</div></td>' +
    '<td style="width:33%;text-align:center;border:1px solid ' + COLOR.border + ';border-radius:8px;padding:14px 4px;"><div style="font-family:Georgia,serif;font-weight:700;font-size:22px;color:' + COLOR.red + ';">' + data.khongDat + '</div><div style="font-size:10.5px;color:' + COLOR.textMuted + ';margin-top:2px;">Không đạt</div></td>' +
    "</tr></table>"
  );
}

function emailFooter() {
  return (
    '<p style="font-size:11.5px;color:' + COLOR.textMuted + ';margin-top:16px;">Báo cáo PDF đầy đủ 20 hạng mục (kèm ảnh minh chứng) được đính kèm trong email này.</p>' +
    "</td></tr></table>" +
    '<p style="font-size:10.5px;color:#9AA3B0;text-align:center;margin-top:14px;">© AHT — Da Nang International Terminal · Email tự động, vui lòng không trả lời.</p>'
  );
}

function renderEmailHtml(data, allPass, failedItems) {
  const bodyOpenWrap =
    '<div style="font-family:Arial,Helvetica,sans-serif;color:' + COLOR.text + ';max-width:640px;margin:0 auto;">' +
    emailHeader() +
    '<table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid ' + COLOR.border + ';border-top:none;border-radius:0 0 10px 10px;">' +
    '<tr><td style="padding:22px;">';

  if (allPass) {
    // ---- TRƯỜNG HỢP 1: TẤT CẢ ĐỀU ĐẠT ----
    return (
      bodyOpenWrap +

      '<table role="presentation" width="100%" style="border-collapse:collapse;background:#EAF7F7;border:1px solid ' + COLOR.teal + ';border-radius:10px;margin-bottom:18px;">' +
      '<tr><td style="padding:16px 18px;text-align:center;">' +
      '<div style="font-family:Georgia,\'Times New Roman\',serif;font-weight:700;font-size:16px;color:' + COLOR.tealText + ';">✓ Tất cả hạng mục đều đạt yêu cầu</div>' +
      '<div style="font-size:12.5px;color:' + COLOR.text + ';margin-top:6px;">Xin chào <b>' + esc(data.nguoiThucHien) + '</b>, checklist giám sát thi công ca <b>' + esc(data.ca) + '</b> ngày <b>' + esc(data.ngay) + '</b> đã hoàn tất — toàn bộ <b>' + data.total + '/' + data.total + ' hạng mục</b> đạt yêu cầu, không phát hiện vấn đề nào cần xử lý.</div>' +
      "</td></tr></table>" +

      emailMetaAndStats(data) +
      emailFooter() +
      "</div>"
    );
  }

  // ---- TRƯỜNG HỢP 2: CÓ HẠNG MỤC KHÔNG ĐẠT — chỉ liệt kê các mục này kèm ảnh ----
  const failRows = failedItems
    .map((it) => {
      const imgHtml = it._cid
        ? '<div style="margin-top:8px;"><img src="cid:' + it._cid + '" width="180" style="border-radius:6px;border:1px solid ' + COLOR.border + ';display:block;"></div>'
        : '<div style="margin-top:6px;font-size:11px;color:' + COLOR.textMuted + ';">(Không có ảnh đính kèm)</div>';
      return (
        '<table role="presentation" width="100%" style="border-collapse:collapse;border:1px solid ' + COLOR.red + ';border-left:4px solid ' + COLOR.red + ';border-radius:8px;margin-bottom:12px;">' +
        '<tr><td style="padding:14px 16px;">' +
        '<div style="display:table;width:100%;">' +
        '<div style="display:table-cell;font-weight:700;color:' + COLOR.navyDark + ';font-size:13px;">#' + esc(it.stt) + " — " + esc(it.hangMuc) + "</div>" +
        '<div style="display:table-cell;text-align:right;white-space:nowrap;vertical-align:top;">' +
        '<span style="display:inline-block;padding:3px 10px;border-radius:16px;background:#FBEEEC;color:' + COLOR.red + ';font-weight:700;font-size:10.5px;">Không đạt</span>' +
        "</div></div>" +
        '<div style="font-size:12px;color:' + COLOR.text + ';margin-top:8px;"><b>Ghi chú:</b> ' + (esc(it.ghiChu) || "—") + "</div>" +
        imgHtml +
        "</td></tr></table>"
      );
    })
    .join("");

  return (
    bodyOpenWrap +

    '<table role="presentation" width="100%" style="border-collapse:collapse;background:#FBEEEC;border:1px solid ' + COLOR.red + ';border-radius:10px;margin-bottom:18px;">' +
    '<tr><td style="padding:16px 18px;text-align:center;">' +
    '<div style="font-family:Georgia,\'Times New Roman\',serif;font-weight:700;font-size:16px;color:' + COLOR.red + ';">⚠ Phát hiện ' + data.khongDat + ' hạng mục không đạt</div>' +
    '<div style="font-size:12.5px;color:' + COLOR.text + ';margin-top:6px;">Xin chào <b>' + esc(data.nguoiThucHien) + '</b>, checklist giám sát thi công ca <b>' + esc(data.ca) + '</b> ngày <b>' + esc(data.ngay) + '</b> phát hiện <b>' + data.khongDat + '/' + data.total + ' hạng mục không đạt</b>, cần được xử lý và theo dõi khắc phục.</div>' +
    "</td></tr></table>" +

    emailMetaAndStats(data) +

    '<div style="font-family:Georgia,\'Times New Roman\',serif;font-weight:700;font-size:13.5px;color:' + COLOR.navyDark + ';margin-bottom:10px;">Danh sách hạng mục không đạt</div>' +

    failRows +

    emailFooter() +
    "</div>"
  );
}

