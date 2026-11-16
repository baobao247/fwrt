
'use strict';
/* ==================================================================
Fwrt v8.6 — Edge full customization (routing, styles, label size)
================================================================== */
const $ = id => document.getElementById(id);
const click = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
const safeStorage = {
get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (_) { return d; } },
set(k, v) {
try { localStorage.setItem(k, v); return true; }
catch (err) { warnStorageFull(err); return false; }
},
remove(k) { try { localStorage.removeItem(k); return true; } catch (_) { return false; } }
};
let _storageWarnShown = false;
function warnStorageFull(err) {
if (_storageWarnShown) return; // chỉ cảnh báo 1 lần mỗi phiên, tránh spam
_storageWarnShown = true;
console.error('localStorage lỗi:', err);
showError('Bộ nhớ trình duyệt đã đầy hoặc bị chặn — tự động lưu/sao lưu có thể không hoạt động. Hãy dùng nút "Xuất file" → JSON để lưu thủ công.');
}
function showError(msg) {
const b = $('errorBanner');
if (!b) { console.error(msg); return; }
b.style.display = 'block';
b.textContent = 'Lỗi: ' + msg + '  (nhấn để ẩn)';
b.onclick = () => { b.style.display = 'none'; };
}
window.addEventListener('error', e => {
try { showError((e.message || 'unknown') + ' @ ' + (e.filename || '?') + ':' + (e.lineno || '?')); } catch (_) {}
});
const NS = 'http://www.w3.org/2000/svg';
const FONT = "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif";
const GRID = 20, MIN_FONT = 5, MAX_FONT = 72;
const svgEl = (tag, attrs = {}) => {
const e = document.createElementNS(NS, tag);
for (const k in attrs) e.setAttribute(k, attrs[k]);
return e;
};
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => 'n' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/* ---------- Custom Modal ---------- */
let dlgResolver = null;
let dlgKind = 'alert';
function showDialog(opts) {
return new Promise(resolve => {
dlgResolver = resolve;
dlgKind = opts.kind || 'alert';
const modal = $('dlgModal');
if (!modal) { resolve(null); return; }
$('dlgTitle').textContent = opts.title || 'Thông báo';
$('dlgMessage').textContent = opts.message || '';
const inp = $('dlgInput');
if (dlgKind === 'prompt') { inp.style.display = 'block'; inp.value = opts.defaultValue || ''; }
else { inp.style.display = 'none'; }
$('dlgCancel').style.display = dlgKind === 'alert' ? 'none' : 'inline-flex';
$('dlgOk').textContent = opts.okText || (dlgKind === 'confirm' ? 'Đồng ý' : 'OK');
$('dlgCancel').textContent = opts.cancelText || 'Huỷ';
modal.classList.add('show');
setTimeout(() => {
if (dlgKind === 'prompt') { inp.focus(); inp.select(); }
else { $('dlgOk').focus(); }
}, 40);
});
}
function showConfirm(m, o) { return showDialog(Object.assign({ kind: 'confirm', message: m }, o || {})); }
function showPrompt(m, d, o) { return showDialog(Object.assign({ kind: 'prompt', message: m, defaultValue: d }, o || {})); }
function showAlert(m, o) { return showDialog(Object.assign({ kind: 'alert', message: m }, o || {})); }
function closeDialog(result) {
const modal = $('dlgModal');
if (modal) modal.classList.remove('show');
const r = dlgResolver; dlgResolver = null;
if (r) r(result);
}
function okDialog() {
if (dlgKind === 'prompt') closeDialog($('dlgInput').value);
else closeDialog(true);
}
function cancelDialog() {
if (dlgKind === 'prompt') closeDialog(null);
else if (dlgKind === 'confirm') closeDialog(false);
else closeDialog(true);
}
click('dlgOk', okDialog);
click('dlgCancel', cancelDialog);
click('dlgClose', cancelDialog);
if ($('dlgModal')) {
$('dlgModal').addEventListener('click', e => { if (e.target === $('dlgModal')) cancelDialog(); });
$('dlgInput').addEventListener('keydown', e => {
e.stopPropagation();
if (e.key === 'Enter') { e.preventDefault(); okDialog(); }
if (e.key === 'Escape') { e.preventDefault(); cancelDialog(); }
});
}
let toastTimer = null;
function toast(text, type) {
const t = $('toast');
if (!t) return;
const icons = { success: '✓', warning: '⚠', danger: '✕', info: 'ℹ' };
const cls = type || 'info';
t.className = 'toast ' + cls;
t.querySelector('.toast-icon').textContent = icons[cls] || 'ℹ';
t.querySelector('.toast-text').textContent = text;
t.classList.add('show');
clearTimeout(toastTimer);
toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}
/* ---------- SHAPES ---------- */
const SHAPES = {
rect:              { label: 'Chữ nhật', w: 172, h: 70, fill: '#dbeafe', stroke: '#2563eb' },
rect_round:        { label: 'Chữ nhật bo góc', w: 172, h: 70, fill: '#dbeafe', stroke: '#2563eb' },
square:            { label: 'Vuông', w: 90, h: 90, fill: '#dbeafe', stroke: '#2563eb' },
oval:              { label: 'Bầu dục', w: 152, h: 56, fill: '#dcfce7', stroke: '#16a34a' },
circle:            { label: 'Tròn', w: 76, h: 76, fill: '#f1f5f9', stroke: '#64748b' },
diamond:           { label: 'Thoi', w: 164, h: 104, fill: '#fef3c7', stroke: '#d97706' },
triangle:          { label: 'Tam giác', w: 120, h: 100, fill: '#fef3c7', stroke: '#d97706' },
triangle_down:     { label: 'Tam giác ngược', w: 120, h: 100, fill: '#fef3c7', stroke: '#d97706' },
triangle_left:     { label: 'Tam giác trái', w: 110, h: 100, fill: '#fef3c7', stroke: '#d97706' },
triangle_right:    { label: 'Tam giác phải', w: 110, h: 100, fill: '#fef3c7', stroke: '#d97706' },
pentagon:          { label: 'Ngũ giác', w: 110, h: 100, fill: '#e0e7ff', stroke: '#4f46e5' },
hexagon:           { label: 'Lục giác', w: 130, h: 100, fill: '#e0e7ff', stroke: '#4f46e5' },
heptagon:          { label: 'Thất giác', w: 110, h: 100, fill: '#e0e7ff', stroke: '#4f46e5' },
octagon:           { label: 'Bát giác', w: 110, h: 100, fill: '#e0e7ff', stroke: '#4f46e5' },
star:              { label: 'Ngôi sao', w: 110, h: 110, fill: '#fef3c7', stroke: '#d97706' },
parallelogram:     { label: 'Bình hành', w: 172, h: 70, fill: '#f3e8ff', stroke: '#9333ea' },
parallelogram_inv: { label: 'Bình hành ngược', w: 172, h: 70, fill: '#f3e8ff', stroke: '#9333ea' },
trapezoid:         { label: 'Thang', w: 172, h: 70, fill: '#f5f5f4', stroke: '#78716c' },
trapezoid_inv:     { label: 'Thang ngược', w: 172, h: 70, fill: '#f5f5f4', stroke: '#78716c' },
cross:             { label: 'Chữ thập', w: 90, h: 90, fill: '#fee2e2', stroke: '#dc2626' },
chevron:           { label: 'Chevron', w: 140, h: 70, fill: '#dbeafe', stroke: '#2563eb' },
arrow_right:       { label: 'Mũi tên phải', w: 160, h: 60, fill: '#dbeafe', stroke: '#2563eb' },
arrow_left:        { label: 'Mũi tên trái', w: 160, h: 60, fill: '#dbeafe', stroke: '#2563eb' },
arrow_up:          { label: 'Mũi tên lên', w: 60, h: 160, fill: '#dbeafe', stroke: '#2563eb' },
arrow_down:        { label: 'Mũi tên xuống', w: 60, h: 160, fill: '#dbeafe', stroke: '#2563eb' },
arrow_double:      { label: 'Mũi tên 2 chiều', w: 180, h: 60, fill: '#dbeafe', stroke: '#2563eb' },
document:          { label: 'Tài liệu', w: 172, h: 80, fill: '#fce7f3', stroke: '#db2777' },
cylinder:          { label: 'Trụ', w: 152, h: 90, fill: '#cffafe', stroke: '#0891b2' },
predefined:        { label: 'Định nghĩa', w: 184, h: 70, fill: '#dbeafe', stroke: '#2563eb' },
note:              { label: 'Ghi chú', w: 162, h: 80, fill: '#fefce8', stroke: '#ca8a04' },
internal_storage:  { label: 'Lưu nội bộ', w: 166, h: 82, fill: '#f1f5f9', stroke: '#64748b' },
stored_data:       { label: 'Dữ liệu lưu', w: 172, h: 70, fill: '#cffafe', stroke: '#0891b2' },
manual_input:      { label: 'Nhập tay', w: 172, h: 70, fill: '#fef3c7', stroke: '#d97706' },
display:           { label: 'Màn hình', w: 172, h: 70, fill: '#f3e8ff', stroke: '#9333ea' },
delay:             { label: 'Trễ', w: 172, h: 70, fill: '#fee2e2', stroke: '#dc2626' },
loop_limit:        { label: 'Giới hạn lặp', w: 172, h: 70, fill: '#e0e7ff', stroke: '#4f46e5' },
merge:             { label: 'Hợp nhất', w: 100, h: 84, fill: '#fce7f3', stroke: '#db2777' },
or_node:           { label: 'OR', w: 76, h: 76, fill: '#dcfce7', stroke: '#16a34a' },
summing:           { label: 'Tổng', w: 76, h: 76, fill: '#fee2e2', stroke: '#dc2626' },
offpage:           { label: 'Off-page', w: 154, h: 82, fill: '#dcfce7', stroke: '#16a34a' },
annotation:        { label: 'Chú thích', w: 154, h: 82, fill: 'transparent', stroke: '#64748b' },
tag:               { label: 'Thẻ (Tag)', w: 176, h: 64, fill: '#e0e7ff', stroke: '#4f46e5', capStart: 'point', capEnd: 'round' },
};
const GROUPS = {
'Cơ bản':     ['rect', 'rect_round', 'square', 'oval', 'circle', 'diamond', 'triangle', 'triangle_down', 'triangle_left', 'triangle_right'],
'Đa giác':    ['pentagon', 'hexagon', 'heptagon', 'octagon', 'star'],
'Đặc biệt':   ['parallelogram', 'parallelogram_inv', 'trapezoid', 'trapezoid_inv', 'cross', 'chevron', 'tag'],
'Mũi tên':    ['arrow_right', 'arrow_left', 'arrow_up', 'arrow_down', 'arrow_double'],
'Tiêu chuẩn': ['document', 'cylinder', 'predefined', 'note', 'internal_storage', 'stored_data', 'manual_input'],
'Quy trình':  ['display', 'delay', 'loop_limit', 'merge', 'or_node', 'summing', 'offpage', 'annotation'],
};
/* Các kiểu đầu/đuôi khả dụng cho hình "Thẻ (Tag)" — có thể chọn riêng từng đầu hoặc dùng chung 1 kiểu */
const CAP_STYLES = [
{ v: 'point', label: 'Nhọn (mũi tên)' },
{ v: 'round', label: 'Bo tròn' },
{ v: 'flat',  label: 'Thẳng (vuông)' },
];
function regularPolygon(cx, cy, rx, ry, n) {
const pts = [];
for (let i = 0; i < n; i++) {
const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
pts.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
}
let d = 'M ' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2);
for (let i = 1; i < pts.length; i++) d += ' L ' + pts[i][0].toFixed(2) + ' ' + pts[i][1].toFixed(2);
return d + ' Z';
}
function starPath(cx, cy, rx, ry, points, innerRatio) {
const pts = [];
const n = points * 2;
for (let i = 0; i < n; i++) {
const r = i % 2 === 0 ? 1 : innerRatio;
const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
pts.push([cx + Math.cos(angle) * rx * r, cy + Math.sin(angle) * ry * r]);
}
let d = 'M ' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2);
for (let i = 1; i < pts.length; i++) d += ' L ' + pts[i][0].toFixed(2) + ' ' + pts[i][1].toFixed(2);
return d + ' Z';
}
/* Vẽ hình "Thẻ (Tag)": đầu (trái) và đuôi (phải) có thể tách riêng kiểu (nhọn / bo tròn / thẳng)
   hoặc dùng chung 1 kiểu — tuỳ theo lựa chọn của người dùng trên từng node (n.capStart / n.capEnd). */
function tagPath(x, y, w, h, capStart, capEnd) {
const cy = y + h / 2;
const r = Math.min(h / 2, w / 2);
const pointDepth = Math.min(w * 0.26, h * 0.75);
let leftX, rightX;
if (capStart === 'point') leftX = x + pointDepth;
else if (capStart === 'round') leftX = x + r;
else leftX = x; // flat
if (capEnd === 'point') rightX = x + w - pointDepth;
else if (capEnd === 'round') rightX = x + w - r;
else rightX = x + w; // flat
if (leftX > rightX) { const mid = (leftX + rightX) / 2; leftX = mid; rightX = mid; }
let d = 'M ' + leftX + ' ' + y + ' L ' + rightX + ' ' + y;
if (capEnd === 'point') d += ' L ' + (x + w) + ' ' + cy + ' L ' + rightX + ' ' + (y + h);
else if (capEnd === 'round') d += ' A ' + r + ' ' + r + ' 0 0 1 ' + rightX + ' ' + (y + h);
else d += ' L ' + rightX + ' ' + (y + h);
d += ' L ' + leftX + ' ' + (y + h);
if (capStart === 'point') d += ' L ' + x + ' ' + cy + ' L ' + leftX + ' ' + y + ' Z';
else if (capStart === 'round') d += ' A ' + r + ' ' + r + ' 0 0 1 ' + leftX + ' ' + y + ' Z';
else d += ' Z';
return d;
}
function shapePaths(type, x, y, w, h, node) {
const rr = rad => {
rad = Math.min(rad, w / 2, h / 2);
return 'M ' + (x + rad) + ' ' + y + ' H ' + (x + w - rad) + ' A ' + rad + ' ' + rad + ' 0 0 1 ' + (x + w) + ' ' + (y + rad) +
' V ' + (y + h - rad) + ' A ' + rad + ' ' + rad + ' 0 0 1 ' + (x + w - rad) + ' ' + (y + h) +
' H ' + (x + rad) + ' A ' + rad + ' ' + rad + ' 0 0 1 ' + x + ' ' + (y + h - rad) +
' V ' + (y + rad) + ' A ' + rad + ' ' + rad + ' 0 0 1 ' + (x + rad) + ' ' + y + ' Z';
};
const cx = x + w / 2, cy = y + h / 2;
switch (type) {
case 'rect': return ['M ' + x + ' ' + y + ' H ' + (x + w) + ' V ' + (y + h) + ' H ' + x + ' Z'];
case 'rect_round': return [rr(Math.min(14, w * 0.1, h * 0.2))];
case 'square': return [rr(8)];
case 'oval': return [rr(h / 2)];
case 'circle': return [regularPolygon(cx, cy, w / 2, h / 2, 64)];
case 'diamond': return ['M ' + cx + ' ' + y + ' L ' + (x + w) + ' ' + cy + ' L ' + cx + ' ' + (y + h) + ' L ' + x + ' ' + cy + ' Z'];
case 'triangle': return ['M ' + cx + ' ' + y + ' L ' + (x + w) + ' ' + (y + h) + ' L ' + x + ' ' + (y + h) + ' Z'];
case 'triangle_down': return ['M ' + x + ' ' + y + ' L ' + (x + w) + ' ' + y + ' L ' + cx + ' ' + (y + h) + ' Z'];
case 'triangle_left': return ['M ' + (x + w) + ' ' + y + ' L ' + (x + w) + ' ' + (y + h) + ' L ' + x + ' ' + cy + ' Z'];
case 'triangle_right': return ['M ' + x + ' ' + y + ' L ' + (x + w) + ' ' + cy + ' L ' + x + ' ' + (y + h) + ' Z'];
case 'pentagon': return [regularPolygon(cx, cy, w / 2, h / 2, 5)];
case 'hexagon': return [regularPolygon(cx, cy, w / 2, h / 2, 6)];
case 'heptagon': return [regularPolygon(cx, cy, w / 2, h / 2, 7)];
case 'octagon': return [regularPolygon(cx, cy, w / 2, h / 2, 8)];
case 'star': return [starPath(cx, cy, w / 2, h / 2, 5, 0.42)];
case 'parallelogram': { const o = Math.min(w * 0.18, 26);
return ['M ' + (x + o) + ' ' + y + ' L ' + (x + w) + ' ' + y + ' L ' + (x + w - o) + ' ' + (y + h) + ' L ' + x + ' ' + (y + h) + ' Z']; }
case 'parallelogram_inv': { const o = Math.min(w * 0.18, 26);
return ['M ' + x + ' ' + y + ' L ' + (x + w - o) + ' ' + y + ' L ' + (x + w) + ' ' + (y + h) + ' L ' + (x + o) + ' ' + (y + h) + ' Z']; }
case 'trapezoid': { const o = Math.min(w * 0.14, 26);
return ['M ' + x + ' ' + y + ' L ' + (x + w) + ' ' + y + ' L ' + (x + w - o) + ' ' + (y + h) + ' L ' + (x + o) + ' ' + (y + h) + ' Z']; }
case 'trapezoid_inv': { const o = Math.min(w * 0.14, 26);
return ['M ' + (x + o) + ' ' + y + ' L ' + (x + w - o) + ' ' + y + ' L ' + (x + w) + ' ' + (y + h) + ' L ' + x + ' ' + (y + h) + ' Z']; }
case 'cross': { const c = Math.min(w, h) * 0.28;
return ['M ' + (x + c) + ' ' + y + ' L ' + (x + w - c) + ' ' + y + ' L ' + (x + w - c) + ' ' + (y + c) + ' L ' + (x + w) + ' ' + (y + c) + ' L ' + (x + w) + ' ' + (y + h - c) + ' L ' + (x + w - c) + ' ' + (y + h - c) + ' L ' + (x + w - c) + ' ' + (y + h) + ' L ' + (x + c) + ' ' + (y + h) + ' L ' + (x + c) + ' ' + (y + h - c) + ' L ' + x + ' ' + (y + h - c) + ' L ' + x + ' ' + (y + c) + ' L ' + (x + c) + ' ' + (y + c) + ' Z']; }
case 'chevron': { const c = w * 0.18;
return ['M ' + x + ' ' + y + ' L ' + (x + w - c) + ' ' + y + ' L ' + (x + w) + ' ' + cy + ' L ' + (x + w - c) + ' ' + (y + h) + ' L ' + x + ' ' + (y + h) + ' L ' + (x + c) + ' ' + cy + ' Z']; }
case 'arrow_right': { const bh = Math.max(h * 0.4, 12), hh = h / 2, bw = w * 0.55;
const yT = y + hh - bh / 2, yB = y + hh + bh / 2;
return ['M ' + x + ' ' + yT + ' L ' + (x + bw) + ' ' + yT + ' L ' + (x + bw) + ' ' + y + ' L ' + (x + w) + ' ' + hh + ' L ' + (x + bw) + ' ' + (y + h) + ' L ' + (x + bw) + ' ' + yB + ' L ' + x + ' ' + yB + ' Z']; }
case 'arrow_left': { const bh = Math.max(h * 0.4, 12), hh = h / 2, bw = w * 0.55;
const yT = y + hh - bh / 2, yB = y + hh + bh / 2;
return ['M ' + (x + w) + ' ' + yT + ' L ' + (x + w - bw) + ' ' + yT + ' L ' + (x + w - bw) + ' ' + y + ' L ' + x + ' ' + hh + ' L ' + (x + w - bw) + ' ' + (y + h) + ' L ' + (x + w - bw) + ' ' + yB + ' L ' + (x + w) + ' ' + yB + ' Z']; }
case 'arrow_up': { const bw = Math.max(w * 0.4, 12), cx2 = x + w / 2, bh = h * 0.55;
const xL = cx2 - bw / 2, xR = cx2 + bw / 2;
return ['M ' + xL + ' ' + (y + h) + ' L ' + xL + ' ' + (y + h - bh) + ' L ' + x + ' ' + (y + h - bh) + ' L ' + cx2 + ' ' + y + ' L ' + (x + w) + ' ' + (y + h - bh) + ' L ' + xR + ' ' + (y + h - bh) + ' L ' + xR + ' ' + (y + h) + ' Z']; }
case 'arrow_down': { const bw = Math.max(w * 0.4, 12), cx2 = x + w / 2, bh = h * 0.55;
const xL = cx2 - bw / 2, xR = cx2 + bw / 2;
return ['M ' + xL + ' ' + y + ' L ' + xL + ' ' + (y + bh) + ' L ' + x + ' ' + (y + bh) + ' L ' + cx2 + ' ' + (y + h) + ' L ' + (x + w) + ' ' + (y + bh) + ' L ' + xR + ' ' + (y + bh) + ' L ' + xR + ' ' + y + ' Z']; }
case 'arrow_double': { const bh = Math.max(h * 0.4, 12), hh = h / 2, aw = w * 0.25;
const yT = y + hh - bh / 2, yB = y + hh + bh / 2;
return ['M ' + (x + aw) + ' ' + yT + ' L ' + (x + w - aw) + ' ' + yT + ' L ' + (x + w - aw) + ' ' + y + ' L ' + (x + w) + ' ' + hh + ' L ' + (x + w - aw) + ' ' + (y + h) + ' L ' + (x + w - aw) + ' ' + yB + ' L ' + (x + aw) + ' ' + yB + ' L ' + (x + aw) + ' ' + (y + h) + ' L ' + x + ' ' + hh + ' L ' + (x + aw) + ' ' + y + ' Z']; }
case 'document': { const k = h * 0.22;
return ['M ' + x + ' ' + y + ' L ' + (x + w) + ' ' + y + ' L ' + (x + w) + ' ' + (y + h - k) +
' C ' + (x + w * 0.72) + ' ' + (y + h + k * 0.9) + ' ' + (x + w * 0.28) + ' ' + (y + h - k * 1.9) + ' ' + x + ' ' + (y + h - k) + ' Z']; }
case 'cylinder': { const ry = Math.min(h * 0.16, 18), rx = w / 2;
return ['M ' + x + ' ' + (y + ry) + ' L ' + x + ' ' + (y + h - ry) + ' A ' + rx + ' ' + ry + ' 0 0 0 ' + (x + w) + ' ' + (y + h - ry) +
' L ' + (x + w) + ' ' + (y + ry) + ' A ' + rx + ' ' + ry + ' 0 0 1 ' + x + ' ' + (y + ry) + ' Z',
'M ' + x + ' ' + (y + ry) + ' A ' + rx + ' ' + ry + ' 0 0 0 ' + (x + w) + ' ' + (y + ry)]; }
case 'predefined': { const off = w * 0.11;
return [rr(8), 'M ' + (x + off) + ' ' + y + ' L ' + (x + off) + ' ' + (y + h), 'M ' + (x + w - off) + ' ' + y + ' L ' + (x + w - off) + ' ' + (y + h)]; }
case 'note': { const f = Math.min(w, h) * 0.28;
return ['M ' + x + ' ' + y + ' L ' + (x + w - f) + ' ' + y + ' L ' + (x + w) + ' ' + (y + f) + ' L ' + (x + w) + ' ' + (y + h) + ' L ' + x + ' ' + (y + h) + ' Z',
'M ' + (x + w - f) + ' ' + y + ' L ' + (x + w - f) + ' ' + (y + f) + ' L ' + (x + w) + ' ' + (y + f)]; }
case 'internal_storage':
return [rr(0), 'M ' + (x + w * 0.2) + ' ' + y + ' L ' + (x + w * 0.2) + ' ' + (y + h), 'M ' + x + ' ' + (y + h * 0.25) + ' L ' + (x + w) + ' ' + (y + h * 0.25)];
case 'stored_data': { const c = w * 0.15;
return ['M ' + (x + c) + ' ' + y + ' L ' + (x + w) + ' ' + y + ' L ' + (x + w) + ' ' + (y + h) + ' L ' + (x + c) + ' ' + (y + h) +
' C ' + (x - c * 0.3) + ' ' + (y + h * 0.75) + ' ' + (x - c * 0.3) + ' ' + (y + h * 0.25) + ' ' + (x + c) + ' ' + y + ' Z']; }
case 'manual_input': { const s = h * 0.25;
return ['M ' + x + ' ' + (y + s) + ' L ' + (x + w) + ' ' + y + ' L ' + (x + w) + ' ' + (y + h) + ' L ' + x + ' ' + (y + h) + ' Z']; }
case 'display': { const c = w * 0.15;
return ['M ' + (x + c) + ' ' + y + ' C ' + (x + c) + ' ' + (y + h * 0.4) + ' ' + x + ' ' + (y + h * 0.6) + ' ' + x + ' ' + (y + h) +
' L ' + (x + w) + ' ' + (y + h) + ' C ' + (x + w) + ' ' + (y + h * 0.6) + ' ' + (x + w - c) + ' ' + (y + h * 0.4) + ' ' + (x + w - c) + ' ' + y + ' Z']; }
case 'delay': { const r = h / 2;
return ['M ' + x + ' ' + y + ' L ' + (x + w - r) + ' ' + y + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h) + ' L ' + x + ' ' + (y + h) + ' Z']; }
case 'loop_limit': { const s = w * 0.15;
return ['M ' + x + ' ' + y + ' L ' + (x + w) + ' ' + y + ' L ' + (x + w - s) + ' ' + (y + h) + ' L ' + (x + s) + ' ' + (y + h) + ' Z']; }
case 'merge': return ['M ' + x + ' ' + y + ' L ' + (x + w) + ' ' + y + ' L ' + cx + ' ' + (y + h) + ' Z'];
case 'or_node': { const rx = w / 2, ry = h / 2, s = Math.min(w, h) * 0.22;
return ['M ' + x + ' ' + cy + ' A ' + rx + ' ' + ry + ' 0 1 1 ' + (x + w) + ' ' + cy + ' A ' + rx + ' ' + ry + ' 0 1 1 ' + x + ' ' + cy + ' Z',
'M ' + (cx - s) + ' ' + cy + ' L ' + (cx + s) + ' ' + cy, 'M ' + cx + ' ' + (cy - s) + ' L ' + cx + ' ' + (cy + s)]; }
case 'summing': { const rx = w / 2, ry = h / 2, s = Math.min(w, h) * 0.22;
return ['M ' + x + ' ' + cy + ' A ' + rx + ' ' + ry + ' 0 1 1 ' + (x + w) + ' ' + cy + ' A ' + rx + ' ' + ry + ' 0 1 1 ' + x + ' ' + cy + ' Z',
'M ' + (cx - s) + ' ' + (cy - s) + ' L ' + (cx + s) + ' ' + (cy + s), 'M ' + (cx + s) + ' ' + (cy - s) + ' L ' + (cx - s) + ' ' + (cy + s)]; }
case 'offpage': { const f = h * 0.35;
return ['M ' + x + ' ' + y + ' L ' + (x + w) + ' ' + y + ' L ' + (x + w) + ' ' + (y + h - f) + ' L ' + cx + ' ' + (y + h) + ' L ' + x + ' ' + (y + h - f) + ' Z']; }
case 'annotation': { const ox = w * 0.20;
return ['M ' + (x + w) + ' ' + y + ' L ' + (x + ox) + ' ' + y + ' L ' + (x + ox) + ' ' + (y + h) + ' L ' + (x + w) + ' ' + (y + h)]; }
case 'tag': {
const capStart = (node && node.capStart) || SHAPES.tag.capStart;
const capEnd = (node && node.capEnd) || SHAPES.tag.capEnd;
return [tagPath(x, y, w, h, capStart, capEnd)];
}
}
return [rr(10)];
}
function shapeInnerPad(type, w, h, node) {
const m = Math.min(w, h);
switch (type) {
case 'diamond': return m * 0.28;
case 'circle': return m * 0.22;
case 'oval': return Math.min(w * 0.14, h * 0.14);
case 'triangle': case 'triangle_down': return m * 0.32;
case 'triangle_left': case 'triangle_right': return m * 0.28;
case 'pentagon': case 'heptagon': return m * 0.22;
case 'hexagon': case 'octagon': return m * 0.20;
case 'star': return m * 0.36;
case 'parallelogram': case 'parallelogram_inv': return m * 0.19;
case 'trapezoid': case 'trapezoid_inv': return m * 0.18;
case 'cross': return m * 0.30;
case 'chevron': return m * 0.26;
case 'arrow_right': case 'arrow_left': return w * 0.12;
case 'arrow_up': case 'arrow_down': return h * 0.12;
case 'arrow_double': return w * 0.16;
case 'merge': return m * 0.24;
case 'or_node': case 'summing': return m * 0.32;
case 'delay': return h * 0.10;
case 'display': return m * 0.16;
case 'manual_input': return h * 0.16;
case 'predefined': return w * 0.14;
case 'annotation': return w * 0.24;
case 'internal_storage': return w * 0.26;
case 'stored_data': return w * 0.22;
case 'loop_limit': return w * 0.16;
case 'note': return m * 0.10;
case 'document': return m * 0.12;
case 'offpage': return h * 0.22;
case 'tag': {
const capStart = (node && node.capStart) || 'point';
const capEnd = (node && node.capEnd) || 'round';
const padFor = c => c === 'point' ? w * 0.24 : (c === 'round' ? Math.min(h * 0.5, w * 0.5) * 0.55 : m * 0.14);
return Math.max(padFor(capStart), padFor(capEnd), 10);
}
default: return 14;
}
}
const COLOR_PAIRS = [
{ fill: '#dbeafe', stroke: '#2563eb' }, { fill: '#dcfce7', stroke: '#16a34a' },
{ fill: '#fef3c7', stroke: '#d97706' }, { fill: '#fce7f3', stroke: '#db2777' },
{ fill: '#f3e8ff', stroke: '#9333ea' }, { fill: '#cffafe', stroke: '#0891b2' },
{ fill: '#fee2e2', stroke: '#dc2626' }, { fill: '#f1f5f9', stroke: '#64748b' },
{ fill: '#e0e7ff', stroke: '#4f46e5' }, { fill: '#fefce8', stroke: '#ca8a04' },
];
const EDGE_COLORS = ['#7c869e', '#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea', '#db2777', '#0891b2', '#4f46e5', '#1e2433'];
const LABEL_COLORS = ['#475569', '#1e2433', '#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea', '#db2777', '#0891b2', '#ffffff'];
const SIZE_PRESETS = { XS: 0.55, S: 0.75, M: 1.00, L: 1.35, XL: 1.75 };
const FONT_PRESETS = { XS: 9, S: 11, M: 14, L: 18, XL: 22 };
const LABEL_FONT_PRESETS = { XS: 9, S: 10.5, M: 11.5, L: 14, XL: 18 };
const ICON_PRESETS = ['✓', '✗', '⚠', '🔒', '📁', '💾', '⚙️', '📊', '📝', '🔍', '⭐', '❤️', '🔥', '💡', '❓', '❗', '✨', '🎯', '🚀', '👍', '👎', '⏱', '📅', '📌', '🔔', '💬', '🏆', '🎉'];
const NUMBER_STYLES = {
dot:     { label: '1. ', format: (n) => n + '. ' },
paren:   { label: '(1)', format: (n) => '(' + n + ') ' },
bracket: { label: '[1]', format: (n) => '[' + n + '] ' },
circle:  { label: '①②③', format: (n) => { const arr = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'; return n <= 20 ? arr[n - 1] + ' ' : n + '. '; } },
};
/* ---------- PAGES ---------- */
let pages = [];
let activePageId = null;
let styleClipboard = null;
function newPage(name) {
return {
id: 'p' + Date.now() + Math.random().toString(36).slice(2, 6),
name: name || ('Trang ' + (pages.length + 1)),
nodes: [], edges: [],
groups: [],
layers: [{ id: 'default', name: 'Mặc định', visible: true, locked: false }],
view: { x: 0, y: 0, k: 1 }
};
}
function saveCurrentPage() {
const p = pages.find(x => x.id === activePageId);
if (p) {
p.nodes = nodes; p.edges = edges;
p.groups = groups; p.layers = layers;
p.view = { x: view.x, y: view.y, k: view.k };
}
}
function loadPage(id) {
saveCurrentPage();
activePageId = id;
const p = pages.find(x => x.id === id);
if (!p) return;
nodes = p.nodes; edges = p.edges;
groups = p.groups || [];
layers = p.layers || [{ id: 'default', name: 'Mặc định', visible: true, locked: false }];
view.x = p.view.x; view.y = p.view.y; view.k = p.view.k;
selected.nodes.clear(); selected.edges.clear();
history = []; hIndex = -1;
render();
pushHistory();
updateUndoButtons();
renderTabs();
setTimeout(scrollActiveTabIntoView, 30);
}
function addPage() {
saveCurrentPage();
const p = newPage();
pages.push(p);
loadPage(p.id);
toast('Đã tạo ' + p.name, 'success');
}
function removePage(id) {
if (pages.length <= 1) { toast('Không thể xoá trang cuối', 'warning'); return; }
const idx = pages.findIndex(p => p.id === id);
if (idx < 0) return;
const wasActive = (activePageId === id);
pages.splice(idx, 1);
if (wasActive) loadPage(pages[Math.min(idx, pages.length - 1)].id);
else renderTabs();
toast('Đã đóng tab', 'success');
}
async function renamePage(id) {
const p = pages.find(x => x.id === id);
if (!p) return;
const name = await showPrompt('Đổi tên trang:', p.name, { title: 'Đổi tên', okText: 'Lưu' });
if (name !== null && name.trim()) { p.name = name.trim(); renderTabs(); toast('Đã đổi tên', 'success'); }
}
function duplicatePage(id) {
saveCurrentPage();
const p = pages.find(x => x.id === id);
if (!p) return;
const np = newPage(p.name + ' (copy)');
np.nodes = JSON.parse(JSON.stringify(p.nodes));
const idMap = new Map();
np.nodes.forEach(n => { const old = n.id; n.id = uid(); idMap.set(old, n.id); });
np.edges = JSON.parse(JSON.stringify(p.edges));
np.edges.forEach(e => { e.id = uid(); e.from = idMap.get(e.from) || e.from; e.to = idMap.get(e.to) || e.to; });
np.view = { x: p.view.x, y: p.view.y, k: p.view.k };
pages.push(np);
renderTabs();
toast('Đã nhân bản → ' + np.name, 'success');
}
function reorderPages(dragId, targetId) {
const fromIdx = pages.findIndex(p => p.id === dragId);
const toIdx = pages.findIndex(p => p.id === targetId);
if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
const moved = pages.splice(fromIdx, 1)[0];
pages.splice(toIdx, 0, moved);
renderTabs();
}
function gotoPageIndex(i) {
if (i < 0 || i >= pages.length) return;
if (pages[i].id !== activePageId) loadPage(pages[i].id);
}
function nextPage() { const i = pages.findIndex(p => p.id === activePageId); gotoPageIndex((i + 1) % pages.length); }
function prevPage() { const i = pages.findIndex(p => p.id === activePageId); gotoPageIndex((i - 1 + pages.length) % pages.length); }
function renderTabs() {
const tabsList = $('tabsList');
if (!tabsList) return;
tabsList.innerHTML = '';
pages.forEach((p, i) => {
const el = document.createElement('div');
el.className = 'tab' + (p.id === activePageId ? ' active' : '');
el.draggable = true;
el.dataset.pageId = p.id;
el.title = p.name + (i + 1 <= 9 ? '  (Ctrl+' + (i + 1) + ')' : '');
const nameSpan = document.createElement('span');
nameSpan.className = 'tab-name';
nameSpan.textContent = p.name;
el.appendChild(nameSpan);
if (pages.length > 1) {
const closeBtn = document.createElement('span');
closeBtn.className = 'tab-close';
closeBtn.textContent = '×';
closeBtn.title = 'Đóng tab';
closeBtn.addEventListener('pointerdown', ev => ev.stopPropagation());
closeBtn.addEventListener('pointerup', ev => { ev.stopPropagation(); ev.preventDefault(); removePage(p.id); });
closeBtn.addEventListener('click', ev => { ev.stopPropagation(); ev.preventDefault(); });
el.appendChild(closeBtn);
}
el.addEventListener('click', ev => {
if (ev.target.classList.contains('tab-close')) return;
if (p.id !== activePageId) loadPage(p.id);
});
el.addEventListener('auxclick', ev => {
if (ev.button === 1 && pages.length > 1) { ev.preventDefault(); removePage(p.id); }
});
el.addEventListener('dblclick', ev => {
if (ev.target.classList.contains('tab-close')) return;
renamePage(p.id);
});
el.addEventListener('contextmenu', ev => { ev.preventDefault(); showTabContextMenu(ev, p.id); });
el.addEventListener('dragstart', ev => {
ev.dataTransfer.effectAllowed = 'move';
try { ev.dataTransfer.setData('text/plain', p.id); } catch (_) {}
el.classList.add('dragging');
});
el.addEventListener('dragend', () => el.classList.remove('dragging'));
el.addEventListener('dragover', ev => { ev.preventDefault(); el.classList.add('drag-over'); });
el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
el.addEventListener('drop', ev => {
ev.preventDefault();
el.classList.remove('drag-over');
const draggedId = ev.dataTransfer.getData('text/plain');
if (draggedId && draggedId !== p.id) reorderPages(draggedId, p.id);
});
tabsList.appendChild(el);
});
updateTabScrollButtons();
setTimeout(scrollActiveTabIntoView, 20);
updateTabDropdownBtnState();
}
function scrollActiveTabIntoView() {
const tabsList = $('tabsList');
if (!tabsList) return;
const activeEl = tabsList.querySelector('.tab.active');
if (activeEl && activeEl.scrollIntoView) {
try { activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); } catch (_) {}
}
setTimeout(updateTabScrollButtons, 260);
}
function updateTabScrollButtons() {
const tabsList = $('tabsList');
const leftBtn = $('tabScrollLeft');
const rightBtn = $('tabScrollRight');
if (!tabsList || !leftBtn || !rightBtn) return;
const hasOverflow = tabsList.scrollWidth > tabsList.clientWidth + 2;
const atStart = tabsList.scrollLeft <= 2;
const atEnd = tabsList.scrollLeft + tabsList.clientWidth >= tabsList.scrollWidth - 2;
leftBtn.classList.toggle('visible', hasOverflow && !atStart);
rightBtn.classList.toggle('visible', hasOverflow && !atEnd);
leftBtn.disabled = atStart;
rightBtn.disabled = atEnd;
}
function updateTabDropdownBtnState() {
const btn = $('tabDropdownBtn');
if (!btn) return;
btn.classList.toggle('visible', pages.length > 1);
}
function scrollTabsBy(dir) {
const tabsList = $('tabsList');
if (!tabsList) return;
const amount = Math.max(120, tabsList.clientWidth * 0.6);
tabsList.scrollBy({ left: dir * amount, behavior: 'smooth' });
setTimeout(updateTabScrollButtons, 260);
}
click('tabScrollLeft', () => scrollTabsBy(-1));
click('tabScrollRight', () => scrollTabsBy(1));
(function attachTabsWheel() {
const tabsList = $('tabsList');
if (!tabsList) return;
tabsList.addEventListener('wheel', e => {
if (tabsList.scrollWidth <= tabsList.clientWidth + 2) return;
if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
tabsList.scrollLeft += e.deltaY;
e.preventDefault();
updateTabScrollButtons();
}
}, { passive: false });
tabsList.addEventListener('scroll', updateTabScrollButtons, { passive: true });
})();
(function attachDragScroll() {
const tabsList = $('tabsList');
if (!tabsList) return;
let isDragging = false;
let startX = 0, startScrollLeft = 0;
tabsList.addEventListener('pointerdown', e => {
if (e.target !== tabsList) return;
if (e.button !== 0) return;
isDragging = true;
startX = e.clientX;
startScrollLeft = tabsList.scrollLeft;
tabsList.classList.add('dragging');
try { tabsList.setPointerCapture(e.pointerId); } catch (_) {}
});
tabsList.addEventListener('pointermove', e => {
if (!isDragging) return;
const dx = e.clientX - startX;
tabsList.scrollLeft = startScrollLeft - dx;
updateTabScrollButtons();
});
const endDrag = (e) => {
if (!isDragging) return;
isDragging = false;
tabsList.classList.remove('dragging');
try { tabsList.releasePointerCapture(e.pointerId); } catch (_) {}
};
tabsList.addEventListener('pointerup', endDrag);
tabsList.addEventListener('pointercancel', endDrag);
})();
function openTabDropdown() {
const dd = $('tabDropdown');
const btn = $('tabDropdownBtn');
if (!dd || !btn) return;
if (dd.classList.contains('show')) { closeTabDropdown(); return; }
dd.innerHTML = '';
const header = document.createElement('div');
header.className = 'tab-dropdown-header';
header.innerHTML = '<span>Danh sách tab</span><span class="count">' + pages.length + ' trang</span>';
dd.appendChild(header);
pages.forEach((p, i) => {
const item = document.createElement('div');
item.className = 'tab-dropdown-item' + (p.id === activePageId ? ' active' : '');
item.innerHTML =
'<span class="num">' + (i + 1 <= 9 ? (i + 1) : '·') + '</span>' +
'<span class="name">' + esc(p.name) + '</span>' +
(pages.length > 1 ? '<span class="close" title="Đóng tab">×</span>' : '');
item.addEventListener('click', ev => {
if (ev.target.classList.contains('close')) {
ev.stopPropagation();
removePage(p.id);
setTimeout(openTabDropdown, 10);
return;
}
if (p.id !== activePageId) loadPage(p.id);
closeTabDropdown();
});
item.addEventListener('contextmenu', ev => {
ev.preventDefault();
closeTabDropdown();
showTabContextMenu(ev, p.id);
});
dd.appendChild(item);
});
if (pages.length > 1) {
const sep = document.createElement('div');
sep.className = 'tab-dropdown-sep';
dd.appendChild(sep);
const addItem = document.createElement('div');
addItem.className = 'tab-dropdown-item';
addItem.innerHTML = '<span class="num">+</span><span class="name" style="color:var(--accent);font-weight:600">Trang mới</span>';
addItem.addEventListener('click', () => { addPage(); closeTabDropdown(); });
dd.appendChild(addItem);
}
const r = btn.getBoundingClientRect();
dd.classList.add('show');
const ddRect = dd.getBoundingClientRect();
const left = Math.min(r.left, window.innerWidth - ddRect.width - 8);
const top = r.bottom + 4;
dd.style.left = Math.max(8, left) + 'px';
dd.style.top = top + 'px';
dd.style.maxHeight = Math.min(window.innerHeight - top - 16, 500) + 'px';
}
function closeTabDropdown() {
const dd = $('tabDropdown');
if (dd) dd.classList.remove('show');
}
click('tabDropdownBtn', openTabDropdown);
document.addEventListener('pointerdown', e => {
const dd = $('tabDropdown');
if (!dd || !dd.classList.contains('show')) return;
if (dd.contains(e.target)) return;
if (e.target.closest && e.target.closest('#tabDropdownBtn')) return;
closeTabDropdown();
}, true);
document.addEventListener('keydown', e => {
if (e.key === 'Escape') {
const dd = $('tabDropdown');
if (dd && dd.classList.contains('show')) { closeTabDropdown(); e.preventDefault(); }
}
});
window.addEventListener('resize', () => {
updateTabScrollButtons();
closeTabDropdown();
});
function showTabContextMenu(e, id) {
const idx = pages.findIndex(p => p.id === id);
const items = [
{ icon: '✎', label: 'Đổi tên', action: () => renamePage(id) },
{ icon: '⎘', label: 'Nhân bản trang', action: () => duplicatePage(id) },
{ icon: '⊕', label: 'Trang mới (bên phải)', action: () => {
saveCurrentPage();
const np = newPage();
pages.splice(idx + 1, 0, np);
renderTabs();
loadPage(np.id);
}},
{ type: 'sep' },
{ icon: '←', label: 'Đóng các tab bên trái', action: () => closeOtherPages(id, 'left') },
{ icon: '→', label: 'Đóng các tab bên phải', action: () => closeOtherPages(id, 'right') },
{ icon: '✕', label: 'Đóng các tab khác', action: () => closeOtherPages(id, 'all') },
{ type: 'sep' },
{ icon: '✕', label: 'Đóng trang', danger: true, disabled: pages.length <= 1, action: () => removePage(id) },
];
buildCtx(items, e);
}
function closeOtherPages(id, dir) {
const idx = pages.findIndex(p => p.id === id);
if (idx < 0) return;
if (dir === 'all') pages = [pages[idx]];
else if (dir === 'left') pages = pages.slice(idx);
else if (dir === 'right') pages = pages.slice(0, idx + 1);
if (!pages.find(p => p.id === activePageId)) activePageId = pages[0].id;
const active = pages.find(p => p.id === activePageId);
nodes = active.nodes; edges = active.edges;
view.x = active.view.x; view.y = active.view.y; view.k = active.view.k;
renderTabs();
render();
toast('Đã đóng tab', 'success');
}
/* ---------- State ---------- */
let nodes = [], edges = [];
const selected = { nodes: new Set(), edges: new Set() };
const view = { x: 0, y: 0, k: 1 };
let drag = null, spaceDown = false, snapToGrid = false;
let clipboard = null, linkTargetId = null;
let recentColors = [];
try { recentColors = JSON.parse(safeStorage.get('fwrt-recent-colors', '[]')) || []; } catch (_) { recentColors = []; }
let currentGuides = [];
let darkMode = safeStorage.get('fwrt-dark', '0') === '1';
let lastCreatedShape = safeStorage.get('fwrt-last-shape', 'rect');
let lastEdgeStyle = {};
try { lastEdgeStyle = JSON.parse(safeStorage.get('fwrt-last-edge-style', '{}')) || {}; } catch (_) { lastEdgeStyle = {}; }
let lastStyle = {};
try { lastStyle = JSON.parse(safeStorage.get('fwrt-last-style', '{}')) || {}; } catch (_) { lastStyle = {}; }
let paletteHidden = safeStorage.get('fwrt-palette-hidden', '0') === '1';
let _portData = null;
let groups = [];
let layers = [{ id: 'default', name: 'Mặc định', visible: true, locked: false }];
let currentLayerId = 'default';
let _layerMapCache = null, _layerMapCacheRef = null;
function getLayer(id) {
if (_layerMapCacheRef !== layers) {
_layerMapCache = new Map(layers.map(l => [l.id, l]));
_layerMapCacheRef = layers;
}
return _layerMapCache.get(id);
}
function invalidateLayerCache() { _layerMapCacheRef = null; }
let _focusTagInput = false;
let _renderRAF = null;
let _measureCache = new Map();
let _showPerfBadge = false;
let _perfStartTime = 0;
function captureStyleFrom(node) {
if (!node) return;
lastStyle = {
fill: node.fill, stroke: node.stroke, strokeWidth: node.strokeWidth,
textColor: node.textColor, fontSize: node.fontSize,
bold: node.bold, italic: node.italic, autoFit: node.autoFit,
hAlign: node.hAlign, vAlign: node.vAlign,
w: node.w, h: node.h, srcType: node.type
};
safeStorage.set('fwrt-last-style', JSON.stringify(lastStyle));
}
function captureEdgeStyle(edge) {
if (!edge) return;
lastEdgeStyle = {
color: edge.color, width: edge.width, lineStyle: edge.lineStyle,
routing: edge.routing, cornerRadius: edge.cornerRadius,
arrowStyle: edge.arrowStyle, arrowEnd: edge.arrowEnd, arrowStart: edge.arrowStart,
labelFontSize: edge.labelFontSize, labelColor: edge.labelColor,
labelBold: edge.labelBold, labelItalic: edge.labelItalic, labelBg: edge.labelBg
};
safeStorage.set('fwrt-last-edge-style', JSON.stringify(lastEdgeStyle));
}
function getStyleTemplate() {
const sel = [...selected.nodes].map(getNode).filter(Boolean);
if (sel.length >= 1) {
const n = sel[sel.length - 1];
return {
fill: n.fill, stroke: n.stroke, strokeWidth: n.strokeWidth,
textColor: n.textColor, fontSize: n.fontSize,
bold: n.bold, italic: n.italic, autoFit: n.autoFit,
hAlign: n.hAlign, vAlign: n.vAlign, w: n.w, h: n.h, srcType: n.type
};
}
if (lastStyle && lastStyle.fill) return lastStyle;
return null;
}
/* ---------- DOM ---------- */
const svg = $('svg');
const defs = $('defs');
const viewport = $('viewport');
const edgesLayer = $('edgesLayer');
const nodesLayer = $('nodesLayer');
const overlayLayer = $('overlayLayer');
const groupsLayer = $('groupsLayer');
const canvasWrap = $('canvasWrap');
const inspector = $('inspector');
const paletteEl = $('palette');
const fileInput = $('fileInput');
const zoomLabel = $('zoomLabel');
const zoomLabel2 = $('zoomLabel2');
const statNodes = $('statNodes');
const statEdges = $('statEdges');
const chkGrid = $('chkGrid');
const chkSnap = $('chkSnap');
const chkGuides = $('chkGuides');
const ctxMenu = $('ctxMenu');
const minimap = $('minimap');
const minimapSvg = $('minimapSvg');
const searchPanel = $('searchPanel');
const searchInput = $('searchInput');
const searchResults = $('searchResults');
const helpModal = $('helpModal');
const helpBody = $('helpBody');
const cmdOverlay = $('cmdOverlay');
const cmdInput = $('cmdInput');
const cmdList = $('cmdList');
const markerCache = new Map();
let markerCounter = 0;
function getMarker(color, style) {
style = style || 'solid';
const key = color + '|' + style;
if (markerCache.has(key)) return markerCache.get(key);
const safe = color.replace(/[^a-z0-9]/gi, '');
const id = 'ar-' + safe + '-' + style + '-' + (markerCounter++);
const m = svgEl('marker', {
id, viewBox: '0 0 10 10', refX: 9, refY: 5,
markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse', markerUnits: 'strokeWidth'
});
if (style === 'open') {
m.appendChild(svgEl('path', { d: 'M 0 1 L 9.5 5 L 0 9', fill: 'none', stroke: color, 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
} else if (style === 'diamond') {
m.appendChild(svgEl('path', { d: 'M 0 5 L 5 1 L 10 5 L 5 9 Z', fill: color }));
} else if (style === 'circle') {
m.appendChild(svgEl('circle', { cx: 5, cy: 5, r: 4, fill: color }));
} else if (style === 'bar') {
m.appendChild(svgEl('rect', { x: 3, y: 1, width: 3, height: 8, fill: color }));
} else {
m.appendChild(svgEl('path', { d: 'M 0 1 L 9.5 5 L 0 9 z', fill: color }));
}
defs.appendChild(m);
markerCache.set(key, id);
return id;
}
const _mctx = document.createElement('canvas').getContext('2d');
function setMeasureFont(fontSize, weight, style) {
_mctx.font = ((style || '') + ' ' + (weight || 500) + ' ' + fontSize + 'px ' + FONT).trim();
}
const _origMeasureText = _mctx.measureText.bind(_mctx);
_mctx.measureText = function(text) {
const key = _mctx.font + '|' + text;
const cached = _measureCache.get(key);
if (cached !== undefined) return cached;
const m = _origMeasureText(text);
// Chỉ lưu width (đủ dùng)
const result = { width: m.width };
if (_measureCache.size > 4000) _measureCache.clear();
_measureCache.set(key, result);
return result;
};function wrapText(text, maxWidth, fontSize, weight, style) {
setMeasureFont(fontSize, weight, style);
const out = [];
String(text ?? '').split('\n').forEach(para => {
if (!para) { out.push(''); return; }
const words = para.split(/\s+/);
let line = '';
for (let wi = 0; wi < words.length; wi++) {
const w = words[wi];
const test = line ? line + ' ' + w : w;
if (_mctx.measureText(test).width > maxWidth) {
if (line) { out.push(line); line = ''; }
if (_mctx.measureText(w).width > maxWidth) {
let chunk = '';
for (let ci = 0; ci < w.length; ci++) {
const ch = w[ci];
const t = chunk + ch;
if (_mctx.measureText(t).width > maxWidth && chunk) { out.push(chunk); chunk = ch; }
else chunk = t;
}
line = chunk;
} else line = w;
} else line = test;
}
if (line) out.push(line);
});
return out.length ? out : [''];
}
function computeTextLayout(n) {
if (!n.text || !n.text.length) return null;
const weight = n.bold ? 700 : 500;
const fstyle = n.italic ? 'italic' : '';
const pad = shapeInnerPad(n.type, n.w, n.h, n);
const maxW = Math.max(16, n.w - pad * 2);
const maxH = Math.max(12, n.h - pad * 2);
let fs = clamp(n.fontSize || 14, MIN_FONT, MAX_FONT);
let lines = [];
if (n.autoFit !== false) {
let guard = 0;
while (fs > MIN_FONT && guard++ < 300) {
lines = wrapText(n.text, maxW, fs, weight, fstyle);
setMeasureFont(fs, weight, fstyle);
let maxLineW = 0;
for (let i = 0; i < lines.length; i++) {
const w = _mctx.measureText(lines[i]).width;
if (w > maxLineW) maxLineW = w;
}
const lineH = fs * 1.28;
const totalH = lines.length * lineH;
if (totalH <= maxH && maxLineW <= maxW + 0.5) break;
fs -= 0.5;
}
if (fs < MIN_FONT) fs = MIN_FONT;
}
lines = wrapText(n.text, maxW, fs, weight, fstyle);
let lineH = fs * 1.3;
const needed = lines.length * lineH;
if (needed > maxH && lines.length > 1) lineH = Math.max(fs * 0.9, maxH / lines.length);
return { fs, lines, weight, fstyle, lineH };
}
function portPos(n, side) {
switch (side) {
case 'top':    return { x: n.x + n.w / 2, y: n.y };
case 'right':  return { x: n.x + n.w,     y: n.y + n.h / 2 };
case 'bottom': return { x: n.x + n.w / 2, y: n.y + n.h };
case 'left':   return { x: n.x,           y: n.y + n.h / 2 };
}
return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}
function autoSides(a, b) {
const dx = (b.x + b.w / 2) - (a.x + a.w / 2);
const dy = (b.y + b.h / 2) - (a.y + a.h / 2);
// Overlap thực tế giữa 2 hình (âm nếu không chồng)
const hOverlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
const vOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
const hRatio = hOverlap / Math.max(1, Math.min(a.w, b.w));
const vRatio = vOverlap / Math.max(1, Math.min(a.h, b.h));
// Xếp chồng dọc rõ rệt → dùng top/bottom
if (hRatio > 0.55 && Math.abs(dy) > 10) {
return dy > 0 ? ['bottom', 'top'] : ['top', 'bottom'];
}
// Xếp chồng ngang rõ rệt → dùng left/right
if (vRatio > 0.55 && Math.abs(dx) > 10) {
return dx > 0 ? ['right', 'left'] : ['left', 'right'];
}
// Chéo: chọn cặp port có khoảng cách ngắn nhất (có phạt cặp cùng phía)
let best = null, bestScore = Infinity;
const SIDES = ['top', 'right', 'bottom', 'left'];
for (const sA of SIDES) {
const pa = portPos(a, sA);
for (const sB of SIDES) {
const pb = portPos(b, sB);
let score = Math.hypot(pa.x - pb.x, pa.y - pb.y);
// Phạt cặp cùng phía / không đối diện (tạo đường vòng xấu)
const opposite = (sA === 'top' && sB === 'bottom') || (sA === 'bottom' && sB === 'top') ||
(sA === 'left' && sB === 'right') || (sA === 'right' && sB === 'left');
if (!opposite) score += 60;
if (sA === sB) score += 120;
if (score < bestScore) { bestScore = score; best = [sA, sB]; }
}
}
return best || (Math.abs(dx) > Math.abs(dy)
? (dx > 0 ? ['right', 'left'] : ['left', 'right'])
: (dy > 0 ? ['bottom', 'top'] : ['top', 'bottom']));
}
/* Tìm port gần nhất của 1 node so với 1 điểm */
function findNearestPort(node, pt) {
let best = 'top', bestD = Infinity;
['top', 'right', 'bottom', 'left'].forEach(s => {
const p = portPos(node, s);
const d = (p.x - pt.x) ** 2 + (p.y - pt.y) ** 2;
if (d < bestD) { bestD = d; best = s; }
});
return { side: best, pos: portPos(node, best), dist: Math.sqrt(bestD) };
}
/* Đếm vị trí của edge trong nhóm song song (cùng cặp node) */
function getParallelOffset(ed, allEdges) {
const keyOf = (a, b) => (a < b ? a + '\u0000' + b : b + '\u0000' + a);
const k = keyOf(ed.from, ed.to);
const group = allEdges.filter(e => keyOf(e.from, e.to) === k)
.sort((a, b) => (a.id < b.id ? -1 : 1));
let base = 0;
if (group.length > 1) {
const idx = group.findIndex(e => e.id === ed.id);
const mid = (group.length - 1) / 2;
base = (idx - mid) * 16;
}
// Độ lệch thủ công do người dùng kéo tay cầm giữa đường nối (kéo dài đoạn giữa sang trái/phải/lên/xuống)
return base + (ed.bendOffset || 0);
}
/* Trục mà giá trị offset sẽ dịch chuyển theo, dùng để quy đổi thao tác kéo chuột (dx, dy) thành
   một giá trị offset hợp lệ cho buildEdgePath — cho phép "kéo dài" đoạn giữa connector theo đúng hướng. */
function edgeOffsetAxis(s1, s2, routing, p1, p2) {
if (routing === 'straight') {
const dx = p2.x - p1.x, dy = p2.y - p1.y;
const L = Math.hypot(dx, dy) || 1;
return { x: -dy / L, y: dx / L };
}
const h1 = s1 === 'left' || s1 === 'right';
const h2 = s2 === 'left' || s2 === 'right';
if (h1 && h2) return { x: 1, y: 0 };
if (!h1 && !h2) return { x: 0, y: 1 };
if (h1) return { x: 1, y: 0 };
return { x: 0, y: 1 };
}
/* Tính slot cổng (port) hiệu lực cho từng đầu của 1 đường nối — có thể ghi đè riêng lẻ qua
   ed.portSplitMode ('auto' theo checkbox chung / 'split' luôn tách / 'merge' luôn gộp về 1 điểm) */
function getEffectivePortSlots(ed) {
const splitEnabledGlobal = $('chkSplitPorts') ? $('chkSplitPorts').checked : true;
const mode = ed.portSplitMode || 'auto';
const useSplit = mode === 'split' ? true : (mode === 'merge' ? false : splitEnabledGlobal);
let slot1 = 0, total1 = 1, slot2 = 0, total2 = 1;
if (useSplit && _portData && _portData.portSlots) {
const pS1 = _portData.portSlots.get(ed.id + '::f');
const pS2 = _portData.portSlots.get(ed.id + '::t');
if (pS1) { slot1 = pS1.slot; total1 = pS1.total; }
if (pS2) { slot2 = pS2.slot; total2 = pS2.total; }
}
return { slot1, total1, slot2, total2 };
}
/* Hình học cơ bản (không obstacle-avoidance) của 1 đường nối — dùng cho tay cầm kéo bend và các thao tác phụ */
function computeEdgeGeom(ed) {
const a = getNode(ed.from), b = getNode(ed.to);
if (!a || !b) return null;
const sides = autoSides(a, b);
const s1 = (ed.fromSide && ed.fromSide !== 'auto') ? ed.fromSide : sides[0];
const s2 = (ed.toSide && ed.toSide !== 'auto') ? ed.toSide : sides[1];
const { slot1, total1, slot2, total2 } = getEffectivePortSlots(ed);
const p1 = portPosWithSlot(a, s1, slot1, total1);
const p2 = portPosWithSlot(b, s2, slot2, total2);
const routing = ed.routing || 'orthogonal';
const cornerRadius = ed.cornerRadius != null ? ed.cornerRadius : 12;
const parallelOffset = getParallelOffset(ed, edges);
const built = buildEdgePath(p1, s1, p2, s2, routing, cornerRadius, parallelOffset);
return { a, b, s1, s2, p1, p2, routing, cornerRadius, parallelOffset, built };
}
/* Chia đều port khi nhiều edge cùng vào 1 cạnh */
function precomputePorts() {
const groups = new Map();
edges.forEach(e => {
const a = getNode(e.from), b = getNode(e.to);
if (!a || !b) return;
const la = getLayer(a.layerId || 'default');
const lb = getLayer(b.layerId || 'default');
if ((la && !la.visible) || (lb && !lb.visible)) return;
const auto = autoSides(a, b);
const s1 = (e.fromSide && e.fromSide !== 'auto') ? e.fromSide : auto[0];
const s2 = (e.toSide && e.toSide !== 'auto') ? e.toSide : auto[1];
const k1 = e.from + '::' + s1;
const k2 = e.to + '::' + s2;
if (!groups.has(k1)) groups.set(k1, []);
if (!groups.has(k2)) groups.set(k2, []);
groups.get(k1).push({ eid: e.id, isFrom: true });
groups.get(k2).push({ eid: e.id, isFrom: false });
});
const portSlots = new Map();
groups.forEach((list, key) => {
list.sort((a, b) => a.eid < b.eid ? -1 : 1);
const parts = key.split('::');
const side = parts[1];
list.forEach((it, i) => {
const k = it.eid + '::' + (it.isFrom ? 'f' : 't');
portSlots.set(k, { side, slot: i, total: list.length });
});
});
return { portSlots };
}
function portPosWithSlot(n, side, slot, total) {
const base = portPos(n, side);
if (!total || total <= 1) return base;
const span = (side === 'top' || side === 'bottom') ? n.w : n.h;
const spacing = Math.min(20, Math.max(9, span / (total + 1)));
const idx = slot - (total - 1) / 2;
const offset = idx * spacing;
if (side === 'top' || side === 'bottom') return { x: base.x + offset, y: base.y };
return { x: base.x, y: base.y + offset };
}
function shiftPt(p, side, d) {
switch (side) {
case 'top':    return { x: p.x, y: p.y - d };
case 'bottom': return { x: p.x, y: p.y + d };
case 'left':   return { x: p.x - d, y: p.y };
case 'right':  return { x: p.x + d, y: p.y };
}
return p;
}