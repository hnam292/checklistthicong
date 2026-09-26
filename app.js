// ==========================================================
// Checklist Giám sát Thi công — AHT
// Toàn bộ logic phía frontend. Giao tiếp với Google Apps Script
// qua APPS_SCRIPT_URL (khai báo trong config.js).
// ==========================================================

const STORAGE_KEY = "aht_checklist_session";

const state = {
  loggedIn: false,
  nhanSu: [],       // [{stt, ten, email}]
  danhMuc: [],       // [{stt, hangMuc}]
  items: [],         // working checklist items with status/ghiChu/anh
};

// ---------- Helpers DOM ----------
const $ = (id) => document.getElementById(id);
const overlay = $("overlay");
const overlayText = $("overlayText");
const toastEl = $("toast");

function showOverlay(text) {
  overlayText.textContent = text || "Đang xử lý...";
  overlay.classList.remove("hidden");
}
function hideOverlay() {
  overlay.classList.add("hidden");
}
function showToast(message, isError) {
  toastEl.textContent = message;
  toastEl.classList.toggle("error", !!isError);
  toastEl.classList.remove("hidden");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.add("hidden"), 3200);
}

function showView(name) {
  ["login", "checklist", "complete"].forEach((v) => {
    $("view-" + v).classList.toggle("hidden", v !== name);
  });
}

// ---------- Networking ----------
// Apps Script Web App: dùng Content-Type "text/plain" trên POST để
// tránh trình duyệt gửi preflight OPTIONS (Apps Script không xử lý OPTIONS).
function callApi(payload) {
  return fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  }).then((res) => {
    if (!res.ok) throw new Error("Lỗi máy chủ (" + res.status + ")");
    return res.json();
  });
}

function fetchInitData() {
  return fetch(APPS_SCRIPT_URL + "?action=init").then((res) => {
    if (!res.ok) throw new Error("Lỗi máy chủ (" + res.status + ")");
    return res.json();
  });
}

// ---------- Session ----------
function saveSession() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ loggedIn: true }));
  } catch (e) { /* ignore */ }
}
function clearSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) { /* ignore */ }
}
function hasSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw && JSON.parse(raw).loggedIn === true;
  } catch (e) {
    return false;
  }
}

// ---------- Login ----------
$("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const username = $("username").value.trim();
  const password = $("password").value;
  const errEl = $("loginError");
  errEl.classList.add("hidden");

  if (!username || !password) return;

  showOverlay("Đang đăng nhập...");
  callApi({ action: "login", username, password })
    .then((res) => {
      if (res.success) {
        saveSession();
        return enterChecklist();
      } else {
        errEl.textContent = res.message || "Sai tên đăng nhập hoặc mật khẩu.";
        errEl.classList.remove("hidden");
      }
    })
    .catch((err) => {
      errEl.textContent = "Không kết nối được máy chủ. Vui lòng thử lại.";
      errEl.classList.remove("hidden");
      console.error(err);
    })
    .finally(hideOverlay);
});

$("logoutBtn").addEventListener("click", function () {
  clearSession();
  location.reload();
});

// ---------- Enter checklist screen: load NhanSu + DanhMuc, render ----------
function enterChecklist() {
  showOverlay("Đang tải dữ liệu checklist...");
  return fetchInitData()
    .then((res) => {
      if (!res.success) throw new Error(res.error || "Không tải được dữ liệu");
      state.nhanSu = res.nhanSu || [];
      state.danhMuc = res.danhMuc || [];
      state.items = state.danhMuc.map((d) => ({
        stt: d.stt,
        hangMuc: d.hangMuc,
        tinhTrang: null,   // 'Đạt' | 'Không đạt'
        ghiChu: "",
        anhBase64: null,
      }));

      populateNguoiThucHien();
      $("fieldNgay").value = todayISO();
      renderItems();
      updateProgress();
      showView("checklist");
    })
    .catch((err) => {
      showToast("Không tải được dữ liệu checklist. Vui lòng thử lại.", true);
      console.error(err);
    })
    .finally(hideOverlay);
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}
function formatDateVN(iso) {
  const [y, m, d] = iso.split("-");
  return d + "/" + m + "/" + y;
}

function populateNguoiThucHien() {
  const sel = $("fieldNguoiThucHien");
  sel.innerHTML = '<option value="" disabled selected>Chọn tên theo danh sách</option>';
  state.nhanSu.forEach((ns) => {
    const opt = document.createElement("option");
    opt.value = ns.ten;
    opt.dataset.email = ns.email || "";
    opt.textContent = ns.ten;
    sel.appendChild(opt);
  });
}

// ---------- Nhóm hạng mục theo khoảng STT (khớp cấu trúc checklist gốc) ----------
// Nếu DanhMuc thực tế không khớp các khoảng này, các mục còn lại tự
// rơi vào nhóm "Nội dung khác" — không làm hỏng giao diện.
const CATEGORY_RANGES = [
  { title: "Phạm vi & Kiểm soát Thi công", from: 1, to: 4 },
  { title: "An toàn & Trải nghiệm Hành khách", from: 5, to: 9 },
  { title: "Môi trường & Vệ sinh", from: 10, to: 11 },
  { title: "Phòng cháy chữa cháy (PCCC)", from: 12, to: 16 },
  { title: "Che chắn & Bảo vệ Công trường", from: 17, to: 20 },
];

function groupItems(items) {
  const groups = CATEGORY_RANGES.map((c) => ({ title: c.title, indices: [] }));
  const other = { title: "Nội dung khác", indices: [] };
  items.forEach((it, idx) => {
    const stt = Number(it.stt);
    const catIdx = CATEGORY_RANGES.findIndex((c) => stt >= c.from && stt <= c.to);
    if (catIdx >= 0) groups[catIdx].indices.push(idx);
    else other.indices.push(idx);
  });
  if (other.indices.length) groups.push(other);
  return groups.filter((g) => g.indices.length);
}

const ICON_CHECK =
  '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 7.5L5.3 10.3L11.5 3.7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_CROSS =
  '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3L11 11M11 3L3 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_CAMERA =
  '<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 5.5C2 4.7 2.7 4 3.5 4H5L5.8 2.5H9.2L10 4H11.5C12.3 4 13 4.7 13 5.5V11C13 11.8 12.3 12.5 11.5 12.5H3.5C2.7 12.5 2 11.8 2 11V5.5Z" stroke="currentColor" stroke-width="1.3"/><circle cx="7.5" cy="8.2" r="2.3" stroke="currentColor" stroke-width="1.3"/></svg>';

// ---------- Render checklist items (nhóm theo hạng mục) ----------
function renderItems() {
  const wrap = $("itemsList");
  wrap.innerHTML = "";

  const groups = groupItems(state.items);

  groups.forEach((group) => {
    const doneInGroup = group.indices.filter((i) => state.items[i].tinhTrang).length;

    const groupHeader = document.createElement("div");
    groupHeader.className = "category-header";
    groupHeader.innerHTML =
      '<span class="category-title"></span>' +
      '<span class="category-count">' + doneInGroup + "/" + group.indices.length + "</span>";
    groupHeader.querySelector(".category-title").textContent = group.title;
    wrap.appendChild(groupHeader);
    group._headerEl = groupHeader;

    group.indices.forEach((idx) => {
      const item = state.items[idx];

      const card = document.createElement("div");
      card.className = "item-card";

      const top = document.createElement("div");
      top.className = "item-top";
      top.innerHTML =
        '<div class="item-num">' + item.stt + '</div>' +
        '<div class="item-text"></div>';
      top.querySelector(".item-text").textContent = item.hangMuc;
      card.appendChild(top);

      const actions = document.createElement("div");
      actions.className = "item-actions";

      const btnDat = document.createElement("button");
      btnDat.type = "button";
      btnDat.className = "status-btn dat";
      btnDat.innerHTML = '<span class="status-icon">' + ICON_CHECK + "</span> Đạt";
      btnDat.addEventListener("click", () => setStatus(idx, "Đạt", group));

      const btnFail = document.createElement("button");
      btnFail.type = "button";
      btnFail.className = "status-btn khongdat";
      btnFail.innerHTML = '<span class="status-icon">' + ICON_CROSS + "</span> Không đạt";
      btnFail.addEventListener("click", () => setStatus(idx, "Không đạt", group));

      actions.appendChild(btnDat);
      actions.appendChild(btnFail);
      card.appendChild(actions);

      const failPanel = document.createElement("div");
      failPanel.className = "fail-panel hidden";
      failPanel.innerHTML =
        '<label>Ghi chú (bắt buộc)</label>' +
        '<textarea placeholder="Mô tả lý do không đạt..." rows="2"></textarea>' +
        '<button type="button" class="photo-btn"><span class="status-icon">' + ICON_CAMERA + '</span> Thêm ảnh minh chứng (bắt buộc)</button>' +
        '<input type="file" accept="image/*" capture="environment" class="photo-input">' +
        '<img class="photo-preview hidden" alt="Ảnh minh chứng">';
      card.appendChild(failPanel);

      const textarea = failPanel.querySelector("textarea");
      textarea.addEventListener("input", () => {
        item.ghiChu = textarea.value;
      });

      const photoBtn = failPanel.querySelector(".photo-btn");
      const photoInput = failPanel.querySelector(".photo-input");
      const photoPreview = failPanel.querySelector(".photo-preview");
      photoBtn.addEventListener("click", () => photoInput.click());
      photoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        compressImage(file, 1000, 0.7).then((base64) => {
          item.anhBase64 = base64;
          photoPreview.src = base64;
          photoPreview.classList.remove("hidden");
          photoBtn.innerHTML = '<span class="status-icon">' + ICON_CHECK + "</span> Đã thêm ảnh (chạm để đổi)";
        });
      });

      wrap.appendChild(card);

      // lưu tham chiếu để cập nhật giao diện khi status đổi
      item._el = { card, btnDat, btnFail, failPanel };
      item._group = group;
    });
  });
}

function setStatus(idx, status, group) {
  const item = state.items[idx];
  item.tinhTrang = status;
  const { card, btnDat, btnFail, failPanel } = item._el;
  btnDat.classList.toggle("active", status === "Đạt");
  btnFail.classList.toggle("active", status === "Không đạt");
  failPanel.classList.toggle("hidden", status !== "Không đạt");
  card.classList.remove("card-dat", "card-khongdat");
  card.classList.add(status === "Đạt" ? "card-dat" : "card-khongdat");

  if (group && group._headerEl) {
    const doneInGroup = group.indices.filter((i) => state.items[i].tinhTrang).length;
    group._headerEl.querySelector(".category-count").textContent = doneInGroup + "/" + group.indices.length;
  }

  updateProgress();
}

function updateProgress() {
  const total = state.items.length;
  const done = state.items.filter((i) => i.tinhTrang).length;
  $("progressCount").textContent = done + "/" + total;
  $("progressFill").style.width = (total ? Math.round((done / total) * 100) : 0) + "%";
}

// nén ảnh trước khi gửi lên (đảm bảo dung lượng nhỏ, gửi ổn định trên 4G)
function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- Submit ----------
$("submitBtn").addEventListener("click", function () {
  const errEl = $("submitError");
  errEl.classList.add("hidden");

  const ngay = $("fieldNgay").value;
  const ca = $("fieldCa").value;
  const nguoiSel = $("fieldNguoiThucHien");
  const nguoiThucHien = nguoiSel.value;
  const email = nguoiSel.selectedOptions[0] ? nguoiSel.selectedOptions[0].dataset.email : "";

  if (!ngay || !ca || !nguoiThucHien) {
    errEl.textContent = "Vui lòng nhập đầy đủ Ngày, Ca và Người thực hiện.";
    errEl.classList.remove("hidden");
    return;
  }

  const chuaChamIdx = state.items.findIndex((i) => !i.tinhTrang);
  if (chuaChamIdx !== -1) {
    errEl.textContent = "Còn " + (state.items.length - state.items.filter((i) => i.tinhTrang).length) + " hạng mục chưa được chấm.";
    errEl.classList.remove("hidden");
    scrollToItem(chuaChamIdx);
    return;
  }

  const thieuGhiChu = state.items.find((i) => i.tinhTrang === "Không đạt" && !i.ghiChu.trim());
  if (thieuGhiChu) {
    errEl.textContent = "Hạng mục #" + thieuGhiChu.stt + " (Không đạt) cần nhập Ghi chú.";
    errEl.classList.remove("hidden");
    return;
  }

  const thieuAnh = state.items.find((i) => i.tinhTrang === "Không đạt" && !i.anhBase64);
  if (thieuAnh) {
    errEl.textContent = "Hạng mục #" + thieuAnh.stt + " (Không đạt) cần thêm ảnh minh chứng.";
    errEl.classList.remove("hidden");
    return;
  }

  const payload = {
    action: "submit",
    ngay: formatDateVN(ngay),
    ca,
    nguoiThucHien,
    email,
    items: state.items.map((i) => ({
      stt: i.stt,
      hangMuc: i.hangMuc,
      tinhTrang: i.tinhTrang,
      ghiChu: i.ghiChu || "",
      anhBase64: i.tinhTrang === "Không đạt" ? i.anhBase64 : null,
    })),
  };

  showOverlay("Đang gửi báo cáo...");
  callApi(payload)
    .then((res) => {
      if (!res.success) throw new Error(res.message || "Gửi báo cáo thất bại");
      showComplete({ ngay: payload.ngay, ca, nguoiThucHien, email, ...res });
    })
    .catch((err) => {
      showToast(err.message || "Gửi báo cáo thất bại. Vui lòng thử lại.", true);
      console.error(err);
    })
    .finally(hideOverlay);
});

function scrollToItem(idx) {
  const item = state.items[idx];
  if (item && item._el) {
    item._el.card.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function showComplete(data) {
  $("completeMeta").textContent = data.ca + " · " + data.ngay + "\n" + data.nguoiThucHien;
  $("statDat").textContent = data.dat;
  $("statKhongDat").textContent = data.khongDat;
  $("statTotal").textContent = data.total;
  $("completeEmail").textContent = data.email || "(chưa có email)";
  $("completeCcNote").textContent = data.ccSent ? " và quản lý phụ trách" : "";
  showView("complete");
}

$("newChecklistBtn").addEventListener("click", function () {
  enterChecklist();
});
$("homeBtn").addEventListener("click", function () {
  showView("checklist");
  enterChecklist();
});

// ---------- Boot ----------
(function init() {
  if (APPS_SCRIPT_URL.indexOf("PASTE_") === 0) {
    showToast("Chưa cấu hình APPS_SCRIPT_URL trong config.js", true);
  }
  if (hasSession()) {
    enterChecklist();
  } else {
    showView("login");
  }
})();
