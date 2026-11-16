/* ==================================================================
TEMPLATES — default routing to orthogonal
================================================================== */
const TEMPLATES = {
flow:      { icon: '🌊', label: 'Quy trình cơ bản' },
process:   { icon: '⚙️', label: 'Quy trình nghiệp vụ' },
org:       { icon: '🏢', label: 'Sơ đồ tổ chức' },
mindmap:   { icon: '🧠', label: 'Mind map' },
swim:      { icon: '🏊', label: 'Swimlane' },
decision:  { icon: '🔀', label: 'Cây quyết định' },
lifecycle: { icon: '🔄', label: 'Vòng đời' },
kanban:    { icon: '📋', label: 'Kanban board' },
timeline:  { icon: '📅', label: 'Timeline' },
bpmn:      { icon: '📊', label: 'BPMN rút gọn' },
auth:      { icon: '🔐', label: 'Xác thực & Đăng nhập (Auth Flow)' },
};
async function applyTemplate(key) {
if (nodes.length) {
const ok = await showConfirm('Chèn mẫu sẽ thay thế toàn bộ nội dung trang hiện tại.', { title: 'Chèn mẫu', okText: 'Chèn' });
if (!ok) return;
}
nodes = []; edges = [];
clearSelection();
const mkNode = (type, x, y, text) => {
const base = SHAPES[type] || SHAPES.rect;
const n = addNode(type, x + base.w / 2, y + base.h / 2, text);
n.x = x; n.y = y;
return n;
};
const mkEdge = (from, to, opts) => {
edges.push(Object.assign({
id: uid(), from: from.id, to: to.id,
fromSide: 'auto', toSide: 'auto', label: '', color: '#7c869e',
width: 2, arrowEnd: true, arrowStart: false,
arrowStyle: 'solid', routing: 'orthogonal', cornerRadius: 12,
lineStyle: 'solid', labelFontSize: 11.5, labelColor: '#475569',
labelBold: false, labelItalic: false, labelBg: true
}, opts || {}));
};
try {
if (key === 'auth') {
const a = mkNode('oval', 240, 40, 'Người dùng truy cập');
const b = mkNode('diamond', 250, 150, 'Đã có Token?');
const c = mkNode('rect', 80, 280, 'Chuyển hướng Login');
const d = mkNode('rect', 80, 390, 'Nhập Email & Mật khẩu');
const e = mkNode('diamond', 90, 500, 'Thông tin đúng?');
const f = mkNode('rect', 240, 620, 'Tạo JWT & Lưu Cookie');
const g = mkNode('rect', 400, 280, 'Kiểm tra Token hết hạn');
const h = mkNode('oval', 240, 740, 'Vào Dashboard thành công');
mkEdge(a, b);
mkEdge(b, g, { label: 'Có token', color: '#16a34a' });
mkEdge(b, c, { label: 'Chưa có', color: '#dc2626' });
mkEdge(c, d);
mkEdge(d, e);
mkEdge(e, f, { label: 'Đúng', color: '#16a34a' });
mkEdge(e, d, { label: 'Sai (Thử lại)', color: '#dc2626', lineStyle: 'dashed' });
mkEdge(g, h, { label: 'Còn hạn', color: '#16a34a' });
mkEdge(g, c, { label: 'Hết hạn', color: '#dc2626' });
mkEdge(f, h);
} else if (key === 'flow') {
const a = mkNode('oval', 200, 40, 'Bắt đầu');
const b = mkNode('rect', 200, 140, 'Nhập dữ liệu');
const c = mkNode('diamond', 210, 250, 'Hợp lệ?');
const d = mkNode('rect', 200, 400, 'Xử lý');
const e = mkNode('document', 200, 510, 'Xuất kết quả');
const f = mkNode('oval', 200, 630, 'Kết thúc');
const err = mkNode('rect', 440, 260, 'Báo lỗi');
mkEdge(a, b); mkEdge(b, c);
mkEdge(c, d, { label: 'Có', color: '#16a34a' });
mkEdge(c, err, { fromSide: 'right', toSide: 'left', label: 'Không', color: '#dc2626' });
mkEdge(err, b, { fromSide: 'left', toSide: 'right', color: '#dc2626', lineStyle: 'dashed' });
mkEdge(d, e); mkEdge(e, f);
} else if (key === 'process') {
const start = mkNode('oval', 50, 60, 'Bắt đầu');
const n1 = mkNode('rect', 50, 160, 'Tiếp nhận');
const n2 = mkNode('diamond', 60, 270, 'Xét duyệt?');
const n3 = mkNode('rect', 50, 410, 'Xử lý');
const n4 = mkNode('rect', 50, 510, 'Kiểm tra');
const n5 = mkNode('document', 50, 610, 'Lưu hồ sơ');
const end = mkNode('oval', 50, 720, 'Kết thúc');
const reject = mkNode('rect', 300, 300, 'Từ chối');
mkEdge(start, n1); mkEdge(n1, n2);
mkEdge(n2, n3, { label: 'Duyệt', color: '#16a34a' });
mkEdge(n2, reject, { fromSide: 'right', toSide: 'left', label: 'Không', color: '#dc2626' });
mkEdge(reject, n1, { fromSide: 'left', toSide: 'right', lineStyle: 'dashed', color: '#dc2626' });
mkEdge(n3, n4); mkEdge(n4, n5); mkEdge(n5, end);
} else if (key === 'org') {
const ceo = mkNode('rect_round', 300, 30, 'Giám đốc');
const cto = mkNode('rect_round', 100, 180, 'Kỹ thuật');
const cfo = mkNode('rect_round', 300, 180, 'Tài chính');
const cmo = mkNode('rect_round', 500, 180, 'Marketing');
const e1 = mkNode('rect_round', 30, 330, 'Dev');
const e2 = mkNode('rect_round', 200, 330, 'QA');
const e3 = mkNode('rect_round', 380, 330, 'Kế toán');
const e4 = mkNode('rect_round', 550, 330, 'Sales');
mkEdge(ceo, cto); mkEdge(ceo, cfo); mkEdge(ceo, cmo);
mkEdge(cto, e1); mkEdge(cto, e2); mkEdge(cfo, e3); mkEdge(cmo, e4);
} else if (key === 'mindmap') {
const center = mkNode('oval', 300, 280, 'Ý tưởng\nchính');
center.fill = '#fce7f3'; center.stroke = '#db2777';
[{label:'Ý 1',x:60,y:100},{label:'Ý 2',x:540,y:100},{label:'Ý 3',x:60,y:460},{label:'Ý 4',x:540,y:460},{label:'Ý 5',x:300,y:500}]
.forEach(b => { const n = mkNode('oval', b.x, b.y, b.label); mkEdge(center, n, { routing: 'curve' }); });
} else if (key === 'swim') {
const lanes = ['Khách hàng', 'Hệ thống', 'Nhân viên'];
const laneW = 240, laneH = 520;
lanes.forEach((name, i) => {
const rect = mkNode('rect', i * laneW, 40, name);
rect.w = laneW - 20; rect.h = laneH;
rect.fill = 'transparent'; rect.stroke = '#94a3b8';
rect.strokeWidth = 1.5; rect.fontSize = 16;
rect.hAlign = 'center'; rect.vAlign = 'top';
rect.locked = true;
});
const a = mkNode('oval', 60, 90, 'Yêu cầu');
const b = mkNode('rect', 300, 90, 'Xử lý');
const c = mkNode('rect', 540, 90, 'Phê duyệt');
const d = mkNode('oval', 540, 420, 'Hoàn tất');
const e = mkNode('diamond', 300, 280, 'Duyệt?');
mkEdge(a, b); mkEdge(b, c); mkEdge(c, d); mkEdge(b, e);
mkEdge(e, c, { label: 'OK', color: '#16a34a' });
mkEdge(e, b, { fromSide: 'left', toSide: 'left', label: 'Lỗi', color: '#dc2626', lineStyle: 'dashed' });
} else if (key === 'decision') {
const root = mkNode('diamond', 300, 40, 'Bắt đầu?');
const n1 = mkNode('diamond', 100, 220, 'ĐK A?');
const n2 = mkNode('diamond', 500, 220, 'ĐK B?');
const r1 = mkNode('rect', 30, 400, 'Kết quả 1');
const r2 = mkNode('rect', 200, 400, 'Kết quả 2');
const r3 = mkNode('rect', 430, 400, 'Kết quả 3');
const r4 = mkNode('rect', 600, 400, 'Kết quả 4');
mkEdge(root, n1, { label: 'Có' });
mkEdge(root, n2, { label: 'Không' });
mkEdge(n1, r1); mkEdge(n1, r2); mkEdge(n2, r3); mkEdge(n2, r4);
} else if (key === 'lifecycle') {
const labels = ['Ý tưởng', 'Thiết kế', 'Xây dựng', 'Kiểm thử', 'Triển khai', 'Vận hành'];
const colors = ['#dcfce7','#dbeafe','#fef3c7','#fce7f3','#f3e8ff','#cffafe'];
const strokes = ['#16a34a','#2563eb','#d97706','#db2777','#9333ea','#0891b2'];
const cx = 350, cy = 300, r = 200;
const ring = [];
for (let i = 0; i < 6; i++) {
const ang = (i / 6) * Math.PI * 2 - Math.PI / 2;
const n = mkNode('oval', cx + Math.cos(ang) * r - 76, cy + Math.sin(ang) * r - 28, labels[i]);
n.fill = colors[i]; n.stroke = strokes[i];
ring.push(n);
}
for (let i = 0; i < 6; i++) mkEdge(ring[i], ring[(i + 1) % 6], { color: '#94a3b8', routing: 'curve' });
} else if (key === 'kanban') {
const cols = ['Cần làm', 'Đang làm', 'Chờ duyệt', 'Hoàn thành'];
const colors = ['#fee2e2','#fef3c7','#dbeafe','#dcfce7'];
const strokes = ['#dc2626','#d97706','#2563eb','#16a34a'];
const colW = 200, colH = 500;
cols.forEach((name, i) => {
const rect = mkNode('rect', 30 + i * (colW + 20), 30, name);
rect.w = colW; rect.h = colH;
rect.fill = colors[i]; rect.stroke = strokes[i];
rect.strokeWidth = 1.5; rect.fontSize = 15;
rect.hAlign = 'center'; rect.vAlign = 'top';
rect.locked = true;
});
for (let i = 0; i < 3; i++) {
const card = mkNode('rect_round', 45 + i * (colW + 20), 90, 'Task ' + (i + 1));
card.w = colW - 30; card.h = 60; card.fill = '#ffffff'; card.stroke = strokes[i];
}
} else if (key === 'timeline') {
const events = [
{ label: 'Khởi đầu', color: '#dcfce7', stroke: '#16a34a' },
{ label: 'Sự kiện 1', color: '#dbeafe', stroke: '#2563eb' },
{ label: 'Sự kiện 2', color: '#fef3c7', stroke: '#d97706' },
{ label: 'Sự kiện 3', color: '#fce7f3', stroke: '#db2777' },
{ label: 'Kết thúc', color: '#fee2e2', stroke: '#dc2626' }
];
const spanW = 140, gap = 40, startX = 40, midY = 250;
const prev = [];
events.forEach((ev, i) => {
const n = mkNode(i === 0 || i === events.length - 1 ? 'oval' : 'rect', startX + i * (spanW + gap), midY, ev.label);
n.fill = ev.color; n.stroke = ev.stroke;
if (i > 0) mkEdge(prev[prev.length - 1], n, { color: '#94a3b8' });
prev.push(n);
});
} else if (key === 'bpmn') {
const start = mkNode('circle', 60, 200, ''); start.w = 50; start.h = 50;
const t1 = mkNode('rect', 160, 180, 'Nhận yêu cầu');
const t2 = mkNode('rect', 380, 180, 'Phê duyệt');
const gw = mkNode('diamond', 600, 180, 'OK?');
const t3 = mkNode('rect', 800, 100, 'Chấp nhận');
const t4 = mkNode('rect', 800, 280, 'Từ chối');
const end1 = mkNode('circle', 1000, 120, ''); end1.w = 50; end1.h = 50;
const end2 = mkNode('circle', 1000, 300, ''); end2.w = 50; end2.h = 50;
mkEdge(start, t1); mkEdge(t1, t2); mkEdge(t2, gw);
mkEdge(gw, t3, { label: 'Có', color: '#16a34a' });
mkEdge(gw, t4, { label: 'Không', color: '#dc2626' });
mkEdge(t3, end1); mkEdge(t4, end2);
} else { toast('Mẫu không tồn tại', 'danger'); return; }
render();
setTimeout(fitView, 60);
pushHistory();
toast('Đã chèn mẫu · ' + (TEMPLATES[key] ? TEMPLATES[key].label : key), 'success');
} catch (err) {
console.error(err);
toast('Lỗi khi chèn mẫu: ' + err.message, 'danger');
}
}