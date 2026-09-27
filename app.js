// ==========================================================
// Checklist Giám sát Thi công — AHT
// Toàn bộ logic phía frontend. Giao tiếp với Google Apps Script
// qua APPS_SCRIPT_URL (khai báo trong config.js).
// ==========================================================

const STORAGE_KEY = "aht_checklist_session";

const state = {
  loggedIn: false,
  role: "staff", // 'staff' | 'admin' — vai trò đang chọn ở tab đăng nhập
  user: { name: "", email: "" }, // người thực hiện = người đăng nhập (từ tab TaiKhoan)
  danhMuc: [],       // [{stt, hangMuc}]
  items: [],         // working checklist items with status/ghiChu/anh
  admin: {
    missing: [],
    failed: [],
    selectedIds: new Set(),
  },
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
  ["login", "checklist", "complete", "admin"].forEach((v) => {
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
function saveSession(role, user) {
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ loggedIn: true, role: role, name: user && user.name, email: user && user.email })
    );
  } catch (e) { /* ignore */ }
}
function clearSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) { /* ignore */ }
}
function getSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && parsed.loggedIn ? parsed : null;
  } catch (e) {
    return null;
  }
}

// ---------- Role tabs (màn đăng nhập) ----------
$("roleTabStaff").addEventListener("click", () => setLoginRole("staff"));
$("roleTabAdmin").addEventListener("click", () => setLoginRole("admin"));

function setLoginRole(role) {
  state.role = role;
  $("roleTabStaff").classList.toggle("active", role === "staff");
  $("roleTabAdmin").classList.toggle("active", role === "admin");
  $("loginSubmitBtn").textContent = role === "admin" ? "Đăng nhập Quản trị" : "Đăng nhập";
  $("loginError").classList.add("hidden");
}

// ---------- Login ----------
$("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const username = $("username").value.trim();
  const password = $("password").value;
  const errEl = $("loginError");
  errEl.classList.add("hidden");

  if (!username || !password) return;

  const isAdmin = state.role === "admin";
  showOverlay("Đang đăng nhập...");
  callApi({ action: isAdmin ? "adminLogin" : "login", username, password })
    .then((res) => {
      if (res.success) {
        saveSession(state.role, { name: res.name, email: res.email });
        state.user = { name: res.name, email: res.email };
        return isAdmin ? enterAdmin() : enterChecklist();
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
$("adminLogoutBtn").addEventListener("click", function () {
  clearSession();
  location.reload();
});

// ---------- Enter checklist screen: load DanhMuc, render ----------
function enterChecklist() {
  showOverlay("Đang tải dữ liệu checklist...");
  return fetchInitData()
    .then((res) => {
      if (!res.success) throw new Error(res.error || "Không tải được dữ liệu");
      state.danhMuc = res.danhMuc || [];
      state.items = state.danhMuc.map((d) => ({
        stt: d.stt,
        hangMuc: d.hangMuc,
        tinhTrang: null,   // 'Đạt' | 'Không đạt'
        ghiChu: "",
        anhList: [],       // mảng base64 — cho phép nhiều ảnh minh chứng mỗi hạng mục
      }));

      $("fieldNguoiThucHienDisplay").textContent = state.user.name || "—";
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
const MAX_PHOTOS_PER_ITEM = 5;

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
        '<div class="item-text"></div>' +
        '<div class="item-status-dot" title="Chưa chấm"></div>';
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
        '<div class="photo-label">Ảnh minh chứng (bắt buộc, tối đa ' + MAX_PHOTOS_PER_ITEM + ' ảnh)</div>' +
        '<div class="photo-btn-row">' +
        '<button type="button" class="photo-btn photo-btn-camera">📷 Chụp ảnh</button>' +
        '<button type="button" class="photo-btn photo-btn-library">🖼️ Thư viện</button>' +
        "</div>" +
        '<input type="file" accept="image/*" capture="environment" multiple class="photo-input-camera">' +
        '<input type="file" accept="image/*" multiple class="photo-input-library">' +
        '<div class="photo-gallery"></div>';
      card.appendChild(failPanel);

      const textarea = failPanel.querySelector("textarea");
      textarea.addEventListener("input", () => {
        item.ghiChu = textarea.value;
      });

      const photoGallery = failPanel.querySelector(".photo-gallery");
      const inputCamera = failPanel.querySelector(".photo-input-camera");
      const inputLibrary = failPanel.querySelector(".photo-input-library");

      function handlePhotoFiles(fileList, sourceInput) {
        const files = Array.from(fileList || []);
        if (!files.length) return;

        const remainingSlots = MAX_PHOTOS_PER_ITEM - item.anhList.length;
        if (remainingSlots <= 0) {
          showToast("Mỗi hạng mục tối đa " + MAX_PHOTOS_PER_ITEM + " ảnh.", true);
          sourceInput.value = "";
          return;
        }
        const toAdd = files.slice(0, remainingSlots);
        if (files.length > toAdd.length) {
          showToast("Chỉ thêm được " + toAdd.length + " ảnh (tối đa " + MAX_PHOTOS_PER_ITEM + " ảnh/hạng mục).", true);
        }

        Promise.all(toAdd.map((f) => compressImage(f, 1000, 0.7))).then((base64List) => {
          item.anhList.push(...base64List);
          renderPhotoGallery(item, photoGallery);
          sourceInput.value = ""; // cho phép chọn/chụp lại từ cùng nguồn lần sau
        });
      }

      failPanel.querySelector(".photo-btn-camera").addEventListener("click", () => inputCamera.click());
      failPanel.querySelector(".photo-btn-library").addEventListener("click", () => inputLibrary.click());
      inputCamera.addEventListener("change", (e) => handlePhotoFiles(e.target.files, inputCamera));
      inputLibrary.addEventListener("change", (e) => handlePhotoFiles(e.target.files, inputLibrary));

      renderPhotoGallery(item, photoGallery);

      wrap.appendChild(card);

      // lưu tham chiếu để cập nhật giao diện khi status đổi
      item._el = { card, btnDat, btnFail, failPanel, statusDot: top.querySelector(".item-status-dot") };
      item._group = group;
      card.classList.add("card-pending");
    });
  });
}

// Vẽ lại dải ảnh thumbnail của 1 hạng mục — mỗi ảnh có nút × để xoá riêng.
function renderPhotoGallery(item, galleryEl) {
  galleryEl.innerHTML = "";
  item.anhList.forEach((base64, photoIdx) => {
    const wrap = document.createElement("div");
    wrap.className = "photo-thumb-wrap";

    const img = document.createElement("img");
    img.className = "photo-thumb";
    img.src = base64;
    img.alt = "Ảnh minh chứng " + (photoIdx + 1);
    wrap.appendChild(img);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "photo-remove-btn";
    removeBtn.setAttribute("aria-label", "Xoá ảnh này");
    removeBtn.innerHTML = ICON_CROSS;
    removeBtn.addEventListener("click", () => {
      item.anhList.splice(photoIdx, 1);
      renderPhotoGallery(item, galleryEl);
    });
    wrap.appendChild(removeBtn);

    galleryEl.appendChild(wrap);
  });
}

function setStatus(idx, status, group) {
  const item = state.items[idx];
  item.tinhTrang = status;
  const { card, btnDat, btnFail, failPanel, statusDot } = item._el;
  btnDat.classList.toggle("active", status === "Đạt");
  btnFail.classList.toggle("active", status === "Không đạt");
  failPanel.classList.toggle("hidden", status !== "Không đạt");
  card.classList.remove("card-dat", "card-khongdat", "card-pending");
  card.classList.add(status === "Đạt" ? "card-dat" : "card-khongdat");
  statusDot.className = "item-status-dot " + (status === "Đạt" ? "dot-dat" : "dot-khongdat");
  statusDot.innerHTML = status === "Đạt" ? ICON_CHECK : ICON_CROSS;
  statusDot.title = status;

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
  const nguoiThucHien = state.user.name;
  const email = state.user.email || "";

  if (!ngay || !ca || !nguoiThucHien) {
    errEl.textContent = "Vui lòng nhập đầy đủ Ngày và Ca.";
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

  const thieuAnh = state.items.find((i) => i.tinhTrang === "Không đạt" && (!i.anhList || !i.anhList.length));
  if (thieuAnh) {
    errEl.textContent = "Hạng mục #" + thieuAnh.stt + " (Không đạt) cần thêm ít nhất 1 ảnh minh chứng.";
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
      anhList: i.tinhTrang === "Không đạt" ? i.anhList : [],
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

// ============ ADMIN ============

const CA_LIST = [
  "Ca sáng (06:00–14:00)",
  "Ca chiều (14:00–22:00)",
  "Ca đêm (22:00–06:00)",
];

function enterAdmin() {
  showView("admin");
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 6);
  $("adminTuNgay").value = toISO(weekAgo);
  $("adminDenNgay").value = toISO(today);
  state.admin.selectedIds = new Set();
  return loadAdminStats();
}

function toISO(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mm + "-" + dd;
}

$("adminFilterBtn").addEventListener("click", loadAdminStats);

function loadAdminStats() {
  const tuNgay = $("adminTuNgay").value;
  const denNgay = $("adminDenNgay").value;
  if (!tuNgay || !denNgay) {
    showToast("Vui lòng chọn đủ Từ ngày và Đến ngày.", true);
    return;
  }
  state.admin.selectedIds = new Set();
  showOverlay("Đang tải thống kê...");
  return callApi({ action: "adminStats", tuNgay, denNgay })
    .then((res) => {
      if (!res.success) throw new Error(res.message || "Không tải được thống kê");
      state.admin.missing = res.missing || [];
      state.admin.failed = res.failedItems || [];
      renderAdminMissing();
      renderAdminFailed();
      renderAdminComposeToggle();
      $("adminComposePanel").classList.add("hidden");
    })
    .catch((err) => {
      showToast(err.message || "Không tải được thống kê.", true);
      console.error(err);
    })
    .finally(hideOverlay);
}

function renderAdminMissing() {
  const box = $("adminMissingBox");
  const missing = state.admin.missing;

  if (!missing.length) {
    box.innerHTML = '<div class="admin-empty-note">Không có ca nào bị thiếu checklist trong khoảng đã chọn.</div>';
    return;
  }

  // nhóm theo ngày
  const byDate = {};
  missing.forEach((m) => {
    if (!byDate[m.ngay]) byDate[m.ngay] = [];
    byDate[m.ngay].push(m.ca);
  });

  let html = "";
  Object.keys(byDate).forEach((ngay) => {
    html += '<div class="admin-missing-day">' +
      '<div class="admin-missing-date">' + escHtml(ngay) + '</div>' +
      '<div class="admin-missing-chips">' +
      byDate[ngay].map((ca) => '<span class="admin-chip">' + escHtml(ca) + '</span>').join("") +
      "</div></div>";
  });
  box.innerHTML = html;
}

function escHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function renderAdminFailed() {
  const box = $("adminFailedBox");
  const items = state.admin.failed;

  if (!items.length) {
    box.innerHTML = '<div class="admin-empty-note">Không có hạng mục Không đạt nào trong khoảng đã chọn.</div>';
    return;
  }

  let html =
    '<div class="admin-failed-toolbar">' +
    '<label><input type="checkbox" id="adminSelectAll"> Chọn tất cả (' + items.length + ' mục)</label>' +
    '<span id="adminSelectedCount">Đã chọn 0</span>' +
    "</div>";

  items.forEach((it) => {
    const photos = it.anhBase64List || [];
    const thumbs = photos.length
      ? '<div class="admin-failed-thumbs">' +
        photos
          .slice(0, 3)
          .map((src) => '<img class="admin-failed-thumb" src="' + src + '" alt="Ảnh minh chứng">')
          .join("") +
        (photos.length > 3 ? '<div class="admin-failed-thumb-more">+' + (photos.length - 3) + "</div>" : "") +
        "</div>"
      : '<div class="admin-failed-thumbs"><div class="admin-failed-thumb"></div></div>';
    html +=
      '<div class="admin-failed-card">' +
      '<input type="checkbox" class="admin-item-check" data-id="' + it.id + '">' +
      thumbs +
      '<div class="admin-failed-body">' +
      '<div class="admin-failed-title">#' + escHtml(it.stt) + " — " + escHtml(it.hangMuc) + "</div>" +
      '<div class="admin-failed-meta">' + escHtml(it.ngay) + " · " + escHtml(it.ca) + " · " + escHtml(it.nguoiThucHien) + "</div>" +
      (it.ghiChu ? '<div class="admin-failed-note">' + escHtml(it.ghiChu) + "</div>" : "") +
      "</div></div>";
  });

  box.innerHTML = html;

  $("adminSelectAll").addEventListener("change", (e) => {
    const checked = e.target.checked;
    document.querySelectorAll(".admin-item-check").forEach((cb) => {
      cb.checked = checked;
      toggleAdminSelect(cb.dataset.id, checked);
    });
    updateAdminSelectedCount();
    renderAdminComposeToggle();
  });

  document.querySelectorAll(".admin-item-check").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      toggleAdminSelect(e.target.dataset.id, e.target.checked);
      updateAdminSelectedCount();
      renderAdminComposeToggle();
    });
  });
}

function toggleAdminSelect(id, checked) {
  if (checked) state.admin.selectedIds.add(id);
  else state.admin.selectedIds.delete(id);
}

function updateAdminSelectedCount() {
  const countEl = $("adminSelectedCount");
  if (countEl) countEl.textContent = "Đã chọn " + state.admin.selectedIds.size;
}

function renderAdminComposeToggle() {
  const wrap = $("adminFailedBox");
  let btnWrap = document.getElementById("adminComposeBtnWrap");
  const hasSelection = state.admin.selectedIds.size > 0;

  if (!state.admin.failed.length) {
    if (btnWrap) btnWrap.remove();
    return;
  }

  if (!btnWrap) {
    btnWrap = document.createElement("div");
    btnWrap.id = "adminComposeBtnWrap";
    btnWrap.className = "admin-compose-btn-wrap";
    btnWrap.innerHTML = '<button type="button" id="adminOpenComposeBtn" class="btn btn-primary btn-block">Soạn email cho mục đã chọn</button>';
    wrap.after(btnWrap);
    btnWrap.querySelector("#adminOpenComposeBtn").addEventListener("click", openAdminCompose);
  }

  const btn = btnWrap.querySelector("#adminOpenComposeBtn");
  btn.disabled = !hasSelection;
  btn.textContent = hasSelection
    ? "Soạn email cho " + state.admin.selectedIds.size + " mục đã chọn"
    : "Chọn ít nhất 1 hạng mục để gửi email";
}

function openAdminCompose() {
  const ids = Array.from(state.admin.selectedIds);
  const selectedItems = state.admin.failed.filter((it) => ids.includes(String(it.id)));
  $("adminComposeSummary").textContent =
    "Đã chọn " + selectedItems.length + " hạng mục: " +
    selectedItems.map((it) => "#" + it.stt).join(", ");
  $("adminRecipientEmail").value = "";
  $("adminMessage").value = "";
  $("adminSendError").classList.add("hidden");
  $("adminComposePanel").classList.remove("hidden");
  $("adminComposePanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

$("adminCancelSendBtn").addEventListener("click", function () {
  $("adminComposePanel").classList.add("hidden");
});

$("adminSendBtn").addEventListener("click", function () {
  const errEl = $("adminSendError");
  errEl.classList.add("hidden");

  const recipientEmail = $("adminRecipientEmail").value.trim();
  const message = $("adminMessage").value.trim();
  const itemIds = Array.from(state.admin.selectedIds).map(Number);

  if (!recipientEmail) {
    errEl.textContent = "Vui lòng nhập email người nhận.";
    errEl.classList.remove("hidden");
    return;
  }
  if (!itemIds.length) {
    errEl.textContent = "Chưa có hạng mục nào được chọn.";
    errEl.classList.remove("hidden");
    return;
  }

  showOverlay("Đang gửi email...");
  callApi({ action: "adminSendEmail", recipientEmail, message, itemIds })
    .then((res) => {
      if (!res.success) throw new Error(res.message || "Gửi email thất bại");
      showToast("Đã gửi email cho " + res.sentCount + " hạng mục.");
      $("adminComposePanel").classList.add("hidden");
    })
    .catch((err) => {
      errEl.textContent = err.message || "Gửi email thất bại. Vui lòng thử lại.";
      errEl.classList.remove("hidden");
      console.error(err);
    })
    .finally(hideOverlay);
});

// ---------- Boot ----------
(function init() {
  if (APPS_SCRIPT_URL.indexOf("PASTE_") === 0) {
    showToast("Chưa cấu hình APPS_SCRIPT_URL trong config.js", true);
  }
  const session = getSession();
  if (session && session.role === "admin") {
    enterAdmin();
  } else if (session) {
    state.user = { name: session.name || "", email: session.email || "" };
    enterChecklist();
  } else {
    showView("login");
  }
})();
