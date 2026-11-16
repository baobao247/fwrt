/* ==================================================================
VALIDATE FLOWCHART
================================================================== */
function validateFlowchart() {
const issues = [];
const inDeg = new Map(), outDeg = new Map();
nodes.forEach(n => { inDeg.set(n.id, 0); outDeg.set(n.id, 0); });
edges.forEach(e => {
if (outDeg.has(e.from)) outDeg.set(e.from, outDeg.get(e.from) + 1);
if (inDeg.has(e.to)) inDeg.set(e.to, inDeg.get(e.to) + 1);
});
// 1. Node mồ côi
nodes.forEach(n => {
if (inDeg.get(n.id) === 0 && outDeg.get(n.id) === 0 && !n.sticky) {
issues.push({
severity: 'warn', icon: '⚠',
text: 'Node mồ côi: "' + (n.text || '(không tên)') + '" không có nối nào',
nodeId: n.id,
});
}
});
// 2. Node treo (chỉ vào, không ra — trừ oval)
nodes.forEach(n => {
if (inDeg.get(n.id) > 0 && outDeg.get(n.id) === 0 && n.type !== 'oval' && !n.sticky) {
issues.push({
severity: 'info', icon: 'ℹ',
text: 'Node treo: "' + (n.text || '(không tên)') + '" chỉ có vào, không có ra',
nodeId: n.id,
});
}
});
// 3. Node rỗng text
nodes.forEach(n => {
if ((!n.text || !n.text.trim()) && !n.sticky) {
issues.push({
severity: 'warn', icon: '⚠',
text: 'Node không có nội dung: ' + (SHAPES[n.type] ? SHAPES[n.type].label : n.type),
nodeId: n.id,
});
}
});
// 4. Trùng text
const textMap = new Map();
nodes.forEach(n => {
if (!n.text || !n.text.trim()) return;
const k = n.text.trim().toLowerCase();
if (!textMap.has(k)) textMap.set(k, []);
textMap.get(k).push(n);
});
textMap.forEach((arr) => {
if (arr.length > 1) {
issues.push({
severity: 'info', icon: 'ℹ',
text: 'Có ' + arr.length + ' node cùng nội dung: "' + arr[0].text.trim() + '"',
nodeIds: arr.map(n => n.id),
});
}
});
// 5. Chu trình (back edge)
const adj = new Map();
nodes.forEach(n => adj.set(n.id, []));
edges.forEach(e => { if (adj.has(e.from)) adj.get(e.from).push(e.to); });
const color = new Map();
nodes.forEach(n => color.set(n.id, 0)); // 0=WHITE, 1=GRAY, 2=BLACK
const cycleEdges = new Set();
const dfs = (u) => {
color.set(u, 1);
for (const v of adj.get(u) || []) {
if (color.get(v) === 1) {
const ed = edges.find(e => e.from === u && e.to === v);
if (ed) cycleEdges.add(ed.id);
} else if (color.get(v) === 0) {
dfs(v);
}
}
color.set(u, 2);
};
nodes.forEach(n => { if (color.get(n.id) === 0) dfs(n.id); });
if (cycleEdges.size > 0) {
issues.push({
severity: 'info', icon: '🔄',
text: 'Có ' + cycleEdges.size + ' đường nối tạo chu trình (vòng lặp)',
edgeIds: [...cycleEdges],
});
}
// 6. Edge trùng hướng
const edgeKeyMap = new Map();
edges.forEach(e => {
const k = e.from + '::' + e.to;
if (!edgeKeyMap.has(k)) edgeKeyMap.set(k, []);
edgeKeyMap.get(k).push(e);
});
edgeKeyMap.forEach((arr) => {
if (arr.length > 1) {
issues.push({
severity: 'info', icon: 'ℹ',
text: 'Có ' + arr.length + ' đường nối cùng hướng giữa 2 node',
edgeIds: arr.map(e => e.id),
});
}
});
return issues;
}
function showValidatePanel() {
const issues = validateFlowchart();
let panel = document.getElementById('validatePanel');
if (!panel) {
panel = document.createElement('div');
panel.className = 'validate-panel';
panel.id = 'validatePanel';
document.body.appendChild(panel);
}
panel.innerHTML = '';
const header = document.createElement('div');
header.className = 'validate-header';
const h = document.createElement('h3');
h.textContent = '📋 Kiểm tra lưu đồ';
header.appendChild(h);
const closeBtn = document.createElement('button');
closeBtn.className = 'modal-close';
closeBtn.textContent = '✕';
closeBtn.style.fontSize = '18px';
closeBtn.onclick = () => panel.classList.remove('show');
header.appendChild(closeBtn);
panel.appendChild(header);
const body = document.createElement('div');
body.className = 'validate-body';
if (!issues.length) {
body.innerHTML = '<div class="validate-empty">✓<br><br>Không phát hiện vấn đề nào!</div>';
} else {
issues.forEach(iss => {
const item = document.createElement('div');
item.className = 'validate-item severity-' + iss.severity;
const ic = document.createElement('span');
ic.className = 'vi-icon'; ic.textContent = iss.icon;
const tx = document.createElement('div');
tx.className = 'vi-text'; tx.textContent = iss.text;
item.appendChild(ic); item.appendChild(tx);
item.addEventListener('click', () => {
if (iss.nodeId) {
const n = getNode(iss.nodeId);
if (n) {
clearSelection();
selected.nodes.add(n.id);
centerOnNode(n);
render();
}
} else if (iss.nodeIds && iss.nodeIds.length) {
clearSelection();
iss.nodeIds.forEach(id => selected.nodes.add(id));
const n = getNode(iss.nodeIds[0]);
if (n) centerOnNode(n);
render();
} else if (iss.edgeIds && iss.edgeIds.length) {
clearSelection();
iss.edgeIds.forEach(id => selected.edges.add(id));
render();
}
});
body.appendChild(item);
});
}
panel.appendChild(body);
panel.classList.add('show');
}
/* ==================================================================
AUTO-NUMBER
================================================================== */
function autoNumberNodes(styleKey, mode) {
styleKey = styleKey || 'dot';
mode = mode || 'bfs';
const style = NUMBER_STYLES[styleKey] || NUMBER_STYLES.dot;
const targets = selected.nodes.size > 0
? nodes.filter(n => selected.nodes.has(n.id))
: nodes.slice();
if (!targets.length) { toast('Không có node nào', 'warning'); return; }
const targetSet = new Set(targets.map(n => n.id));
const inDeg = new Map();
targets.forEach(n => inDeg.set(n.id, 0));
edges.forEach(e => {
if (!targetSet.has(e.from) || !targetSet.has(e.to)) return;
inDeg.set(e.to, inDeg.get(e.to) + 1);
});
let roots = targets.filter(n => inDeg.get(n.id) === 0);
roots.sort((a, b) => a.y - b.y || a.x - b.x);
if (!roots.length) {
const sorted = [...targets].sort((a, b) => a.y - b.y || a.x - b.x);
roots = [sorted[0]];
}
const order = [];
const visited = new Set();
if (mode === 'bfs') {
const queue = [...roots];
while (queue.length) {
queue.sort((a, b) => (a.y - b.y) || (a.x - b.x));
const cur = queue.shift();
if (!cur || visited.has(cur.id)) continue;
visited.add(cur.id);
order.push(cur);
const nexts = [];
edges.forEach(e => {
if (e.from !== cur.id) return;
const nx = getNode(e.to);
if (!nx || !targetSet.has(nx.id) || visited.has(nx.id)) return;
nexts.push(nx);
});
nexts.sort((a, b) => a.x - b.x || a.y - b.y);
nexts.forEach(nx => { if (!visited.has(nx.id)) queue.push(nx); });
}
} else {
const dfsRec = (node) => {
if (!node || visited.has(node.id)) return;
visited.add(node.id);
order.push(node);
const nexts = [];
edges.forEach(e => {
if (e.from !== node.id) return;
const nx = getNode(e.to);
if (!nx || !targetSet.has(nx.id) || visited.has(nx.id)) return;
nexts.push(nx);
});
nexts.sort((a, b) => a.x - b.x || a.y - b.y);
nexts.forEach(dfsRec);
};
roots.forEach(dfsRec);
}
const remaining = targets.filter(n => !visited.has(n.id));
remaining.sort((a, b) => a.y - b.y || a.x - b.x);
remaining.forEach(n => { order.push(n); visited.add(n.id); });
const stripPrefix = (txt) => String(txt || '')
.replace(/^\s*(?:\d+\s*[\.\)\]]\s*|[①-⑳]\s*|\(?\d+\)\s*|\[\d+\]\s*)/, '').trim();
order.forEach((node, i) => {
node.text = style.format(i + 1) + stripPrefix(node.text);
});
render(); pushHistory();
toast('Đã đánh số ' + order.length + ' node · ' + styleKey.toUpperCase(), 'success');
}
/* ==================================================================
STICKY NOTE
================================================================== */
function addStickyNote() {
const c = centerWorld();
addStickyNoteAt(c);
}
function addStickyNoteAt(p) {
const W = 180, H = 120;
const n = {
id: uid(), type: 'rect_round',
x: Math.round(p.x - W / 2), y: Math.round(p.y - H / 2),
w: W, h: H,
text: 'Ghi chú...',
fill: '#fef08a', stroke: '#ca8a04',
textColor: '#713f12', fontSize: 13, strokeWidth: 0,
bold: false, italic: false, autoFit: true,
hAlign: 'left', vAlign: 'top',
locked: false, sticky: true,
};
if (snapToGrid) { n.x = Math.round(n.x / GRID) * GRID; n.y = Math.round(n.y / GRID) * GRID; }
nodes.push(n);
clearSelection();
selected.nodes.add(n.id);
render(); pushHistory();
focusInspectorText(n.id);
toast('Đã thêm sticky note', 'success');
}
/* ==================================================================
GROUP
================================================================== */
const GROUP_COLORS = ['#dbeafe', '#dcfce7', '#fef3c7', '#fce7f3', '#f3e8ff', '#cffafe'];
function getGroupOfNode(n) {
if (!n || !n.groupId) return null;
return groups.find(g => g.id === n.groupId) || null;
}
function getGroupBounds(g) {
const members = g.memberIds.map(getNode).filter(Boolean);
if (!members.length) return null;
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
members.forEach(n => {
minX = Math.min(minX, n.x);
minY = Math.min(minY, n.y);
maxX = Math.max(maxX, n.x + n.w);
maxY = Math.max(maxY, n.y + n.h);
});
return { x: minX - 22, y: minY - 32, w: maxX - minX + 44, h: maxY - minY + 54 };
}
function createGroupFromSelection() {
const ids = [...selected.nodes];
if (ids.length < 2) { toast('Cần chọn ít nhất 2 node', 'warning'); return; }
// Loại bỏ node đã thuộc group khác (giữ node tự do)
const freeIds = ids.filter(id => {
const n = getNode(id);
return n && !n.groupId;
});
if (freeIds.length < 2) { toast('Các node đã thuộc nhóm khác', 'warning'); return; }
const gid = 'g' + Date.now() + Math.random().toString(36).slice(2, 6);
const color = GROUP_COLORS[groups.length % GROUP_COLORS.length];
const name = getGroupName();
groups.push({ id: gid, name: name, color: color, memberIds: [...freeIds] });
freeIds.forEach(nid => { const n = getNode(nid); if (n) n.groupId = gid; });
render(); pushHistory();
toast('Đã tạo nhóm "' + name + '"', 'success');
}
function getGroupName() {
return 'Nhóm ' + (groups.length + 1);
}
async function createGroupFromSelectionAsync() {
const ids = [...selected.nodes];
if (ids.length < 2) { toast('Cần chọn ít nhất 2 node', 'warning'); return; }
const freeIds = ids.filter(id => {
const n = getNode(id);
return n && !n.groupId;
});
if (freeIds.length < 2) { toast('Các node đã thuộc nhóm khác', 'warning'); return; }
const name = await showPrompt('Tên nhóm:', 'Nhóm ' + (groups.length + 1), { title: 'Tạo nhóm', okText: 'Tạo' });
if (name === null) return;
const gid = 'g' + Date.now() + Math.random().toString(36).slice(2, 6);
const color = GROUP_COLORS[groups.length % GROUP_COLORS.length];
groups.push({ id: gid, name: name.trim() || 'Nhóm', color: color, memberIds: [...freeIds] });
freeIds.forEach(nid => { const n = getNode(nid); if (n) n.groupId = gid; });
render(); pushHistory();
toast('Đã tạo nhóm "' + name + '"', 'success');
}
function ungroupSelection() {
const ids = [...selected.nodes];
if (!ids.length) { toast('Chưa chọn node', 'warning'); return; }
const groupIds = new Set();
ids.forEach(id => {
const n = getNode(id);
if (n && n.groupId) groupIds.add(n.groupId);
});
if (!groupIds.size) { toast('Node không thuộc nhóm nào', 'warning'); return; }
groupIds.forEach(gid => {
const g = groups.find(x => x.id === gid);
if (!g) return;
g.memberIds.forEach(nid => {
const n = getNode(nid);
if (n) n.groupId = null;
});
groups = groups.filter(x => x.id !== gid);
});
render(); pushHistory();
toast('Đã bỏ nhóm', 'success');
}
function makeGroupEl(g) {
const b = getGroupBounds(g);
if (!b) return null;
// Bỏ qua nếu tất cả node con đều ẩn
const anyVisible = g.memberIds.some(id => {
const n = getNode(id);
if (!n) return false;
const l = getLayer(n.layerId || 'default');
return !l || l.visible;
});
if (!anyVisible) return null;
const el = svgEl('g', { class: 'group-container', 'data-id': g.id });
el.appendChild(svgEl('rect', {
x: b.x, y: b.y, width: b.w, height: b.h,
rx: 18, fill: g.color || '#eef0ff', 'fill-opacity': 0.35,
stroke: g.color || '#4f46e5', 'stroke-width': 1.5,
'stroke-dasharray': '6 4', 'stroke-opacity': 0.7,
'pointer-events': 'none'
}));
const t = svgEl('text', {
x: b.x + 12, y: b.y + 22,
'font-size': 12.5, 'font-family': FONT,
'font-weight': 700, fill: g.color || '#4f46e5',
'pointer-events': 'none', 'user-select': 'none'
});
t.textContent = '📦 ' + g.name;
el.appendChild(t);
return el;
}
/* ==================================================================
LAYER
================================================================== */
function isNodeLocked(n) {
if (!n) return true;
if (n.locked) return true;
const l = getLayer(n.layerId || 'default');
if (l && l.locked) return true;
return false;
}
function addLayer() {
showPrompt('Tên layer mới:', 'Layer ' + (layers.length + 1), { title: 'Thêm layer', okText: 'Tạo' })
.then(name => {
if (name === null) return;
const lid = 'l' + Date.now() + Math.random().toString(36).slice(2, 6);
layers.push({ id: lid, name: (name || '').trim() || ('Layer ' + layers.length), visible: true, locked: false });
invalidateLayerCache();
currentLayerId = lid;
render(); pushHistory();
showLayersPanel();
toast('Đã thêm layer', 'success');
});
}
function removeLayer(lid) {
if (lid === 'default') { toast('Không thể xoá layer mặc định', 'warning'); return; }
const idx = layers.findIndex(l => l.id === lid);
if (idx < 0) return;
// Chuyển node sang default
nodes.forEach(n => { if ((n.layerId || 'default') === lid) n.layerId = 'default'; });
layers.splice(idx, 1);
invalidateLayerCache();
if (currentLayerId === lid) currentLayerId = 'default';
render(); pushHistory();
showLayersPanel();
toast('Đã xoá layer', 'success');
}
function showLayersPanel() {
let panel = document.getElementById('layersPanel');
if (!panel) {
panel = document.createElement('div');
panel.className = 'layers-panel';
panel.id = 'layersPanel';
document.body.appendChild(panel);
}
// Toggle nếu đang mở
if (panel.classList.contains('show') && panel.dataset.justOpened !== '1') {
panel.classList.remove('show');
return;
}
panel.dataset.justOpened = '';
panel.innerHTML = '';
const header = document.createElement('div');
header.className = 'layers-header';
header.innerHTML = '<h3>📚 Layers</h3>';
const closeBtn = document.createElement('button');
closeBtn.className = 'modal-close';
closeBtn.textContent = '✕';
closeBtn.style.fontSize = '18px';
closeBtn.onclick = () => panel.classList.remove('show');
header.appendChild(closeBtn);
panel.appendChild(header);
const body = document.createElement('div');
body.className = 'layers-body';
layers.forEach(l => {
const row = document.createElement('div');
row.className = 'layer-row' + (l.id === currentLayerId ? ' active' : '');
// Visible toggle
const vis = document.createElement('button');
vis.className = 'layer-icon';
vis.textContent = l.visible ? '👁' : '🚫';
vis.title = l.visible ? 'Ẩn layer' : 'Hiện layer';
vis.addEventListener('click', ev => {
ev.stopPropagation();
l.visible = !l.visible;
render();
showLayersPanel();
});
row.appendChild(vis);
// Lock toggle
const lock = document.createElement('button');
lock.className = 'layer-icon';
lock.textContent = l.locked ? '🔒' : '🔓';
lock.title = l.locked ? 'Mở khoá layer' : 'Khoá layer';
lock.addEventListener('click', ev => {
ev.stopPropagation();
l.locked = !l.locked;
render();
showLayersPanel();
});
row.appendChild(lock);
// Name
const name = document.createElement('span');
name.className = 'layer-name';
name.textContent = l.name;
name.addEventListener('click', () => {
currentLayerId = l.id;
showLayersPanel();
toast('Đang vẽ ở layer: ' + l.name, 'info');
});
name.addEventListener('dblclick', ev => {
ev.stopPropagation();
showPrompt('Đổi tên layer:', l.name, { title: 'Đổi tên', okText: 'Lưu' })
.then(v => {
if (v !== null && v.trim()) { l.name = v.trim(); render(); showLayersPanel(); }
});
});
row.appendChild(name);
// Count
const cnt = document.createElement('span');
cnt.className = 'layer-count';
cnt.textContent = nodes.filter(n => (n.layerId || 'default') === l.id).length;
row.appendChild(cnt);
// Delete (trừ default)
if (l.id !== 'default') {
const del = document.createElement('button');
del.className = 'layer-icon';
del.textContent = '✕';
del.title = 'Xoá layer';
del.addEventListener('click', ev => {
ev.stopPropagation();
removeLayer(l.id);
});
row.appendChild(del);
}
body.appendChild(row);
});
const addBtn = document.createElement('button');
addBtn.className = 'layer-add';
addBtn.textContent = '+ Thêm layer';
addBtn.addEventListener('click', addLayer);
body.appendChild(addBtn);
panel.appendChild(body);
panel.classList.add('show');
}
/* ==================================================================
TAG + SEARCH NÂNG CAO
================================================================== */
function parseSearchQuery(q) {
const tokens = String(q || '').trim().split(/\s+/).filter(Boolean);
const filters = [];
const textTokens = [];
tokens.forEach(t => {
const m = t.match(/^(tag|type|color|layer):(.+)$/i);
if (m) filters.push({ key: m[1].toLowerCase(), value: m[2].toLowerCase() });
else textTokens.push(t.toLowerCase());
});
return { filters, textTokens };
}
function nodeMatchesQuery(n, parsed) {
for (const f of parsed.filters) {
if (f.key === 'type') {
if ((n.type || '').toLowerCase() !== f.value) return false;
} else if (f.key === 'tag') {
const tags = (n.tags || []).map(t => t.toLowerCase());
if (!tags.includes(f.value)) return false;
} else if (f.key === 'color') {
const fill = (n.fill || '').toLowerCase();
const stroke = (n.stroke || '').toLowerCase();
if (fill !== f.value && stroke !== f.value) return false;
} else if (f.key === 'layer') {
const l = getLayer(n.layerId || 'default');
const lname = (l ? l.name : '').toLowerCase();
const lid = (n.layerId || 'default').toLowerCase();
if (lname.indexOf(f.value) < 0 && lid !== f.value) return false;
}
}
if (parsed.textTokens.length) {
const shapeLabel = SHAPES[n.type] ? SHAPES[n.type].label : '';
const hay = ((n.text || '') + ' ' + (n.tags || []).join(' ') + ' ' + shapeLabel).toLowerCase();
for (const t of parsed.textTokens) {
if (hay.indexOf(t) < 0) return false;
}
}
return true;
}
function exportMermaid() {
if (!nodes.length) { toast('Chưa có nội dung', 'warning'); return; }
const idMap = new Map();
nodes.forEach((n, i) => idMap.set(n.id, 'N' + i));
let s = 'flowchart TD\n';
nodes.forEach(n => {
const id = idMap.get(n.id);
const rawLabel = (n.text || '').replace(/[\r\n]+/g, ' ').replace(/"/g, "'").trim();
const label = rawLabel || ' ';
let open = '[', close = ']';
switch (n.type) {
case 'oval': case 'circle': open = '(['; close = '])'; break;
case 'diamond': open = '{'; close = '}'; break;
case 'parallelogram': open = '[/'; close = '/]'; break;
case 'hexagon': open = '{{'; close = '}}'; break;
case 'cylinder': open = '[('; close = ')]'; break;
case 'predefined': open = '[['; close = ']]'; break;
case 'offpage': case 'annotation': open = '>'; close = ']'; break;
case 'or_node': case 'summing': case 'merge': open = '(('; close = '))'; break;
}
s += '    ' + id + open + '"' + label + '"' + close + '\n';
});
edges.forEach(e => {
const f = idMap.get(e.from), t = idMap.get(e.to);
if (!f || !t) return;
const lab = e.label ? '|"' + e.label.replace(/["\n|]/g, '') + '"|' : '';
let arr = '-->';
if ((e.lineStyle && e.lineStyle !== 'solid') || e.dashed) arr = '-.->';
if (e.arrowEnd === false) arr = (e.lineStyle && e.lineStyle !== 'solid') || e.dashed ? '-.-' : '---';
s += '    ' + f + ' ' + arr + lab + ' ' + t + '\n';
});
const styleGroups = new Map();
nodes.forEach(n => {
const key = n.fill + '|' + n.stroke;
if (!styleGroups.has(key)) styleGroups.set(key, []);
styleGroups.get(key).push(idMap.get(n.id));
});
let i = 0;
styleGroups.forEach((ids, key) => {
const parts = key.split('|');
const cls = 's' + (i++);
s += '    classDef ' + cls + ' fill:' + parts[0] + ',stroke:' + parts[1] + ',color:#1e2433;\n';
s += '    class ' + ids.join(',') + ' ' + cls + ';\n';
});
downloadBlob(new Blob([s], { type: 'text/plain;charset=utf-8' }), 'fwrt-flowchart.mmd');
toast('Đã xuất Mermaid', 'success');
}
/* ==================================================================
POINTER
================================================================== */
let _touchPointers = new Map();
let _pinchState = null;
function startPinch() {
const pts = [..._touchPointers.values()];
if (pts.length < 2) return;
const [a, b] = pts;
_pinchState = {
dist: Math.hypot(b.x - a.x, b.y - a.y),
cx: (a.x + b.x) / 2,
cy: (a.y + b.y) / 2,
k: view.k,
vx: view.x,
vy: view.y,
};
drag = null;
}
if (svg) {
svg.addEventListener('pointerdown', e => {
if (e.pointerType === 'touch') {
_touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
if (_touchPointers.size === 2) {
e.preventDefault();
startPinch();
return;
}
}
onPointerDown(e);
});
svg.addEventListener('pointermove', e => {
if (e.pointerType === 'touch' && _touchPointers.has(e.pointerId)) {
_touchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
if (_pinchState && _touchPointers.size >= 2) {
e.preventDefault();
const pts = [..._touchPointers.values()];
const [a, b] = pts;
const newDist = Math.hypot(b.x - a.x, b.y - a.y);
const newCx = (a.x + b.x) / 2;
const newCy = (a.y + b.y) / 2;
const factor = _pinchState.dist > 0 ? newDist / _pinchState.dist : 1;
const newK = clamp(_pinchState.k * factor, 0.12, 4);
const r = canvasWrap.getBoundingClientRect();
// Zoom quanh tâm pinch, đồng thời pan theo tâm
const mx1 = _pinchState.cx - r.left;
const my1 = _pinchState.cy - r.top;
const mx2 = newCx - r.left;
const my2 = newCy - r.top;
const wx = (mx1 - _pinchState.vx) / _pinchState.k;
const wy = (my1 - _pinchState.vy) / _pinchState.k;
view.k = newK;
view.x = mx2 - wx * newK;
view.y = my2 - wy * newK;
renderRAF(true);
return;
}
}
onPointerMove(e);
});
const _endPtr = e => {
if (e.pointerType === 'touch') {
_touchPointers.delete(e.pointerId);
if (_touchPointers.size < 2) _pinchState = null;
}
onPointerUp(e);
};
svg.addEventListener('pointerup', _endPtr);
svg.addEventListener('pointercancel', _endPtr);
}
function closestOf(t, sel) { return (t && t.closest) ? t.closest(sel) : null; }
function highlightConnections(nodeId) {
if (!nodeId) {
svg.classList.remove('has-highlight');
nodesLayer.querySelectorAll('.hl').forEach(el => el.classList.remove('hl'));
edgesLayer.querySelectorAll('.hl').forEach(el => el.classList.remove('hl'));
return;
}
const related = new Set([nodeId]);
const edgeIds = new Set();
edges.forEach(e => {
if (e.from === nodeId) { related.add(e.to); edgeIds.add(e.id); }
if (e.to === nodeId)   { related.add(e.from); edgeIds.add(e.id); }
});
svg.classList.add('has-highlight');
nodesLayer.querySelectorAll('.node').forEach(el => {
el.classList.toggle('hl', related.has(el.dataset.id));
});
edgesLayer.querySelectorAll('.edge').forEach(el => {
el.classList.toggle('hl', edgeIds.has(el.dataset.id));
});
}
if (svg) {
svg.addEventListener('mouseover', e => {
if (drag) return;
const nodeEl = closestOf(e.target, '.node');
if (nodeEl) highlightConnections(nodeEl.dataset.id);
});
svg.addEventListener('mouseout', e => {
if (drag) return;
const fromNode = closestOf(e.target, '.node');
if (!fromNode) return;
const toNode = e.relatedTarget && e.relatedTarget.closest
? e.relatedTarget.closest('.node')
: null;
if (toNode && toNode === fromNode) return;
highlightConnections(null);
});
svg.addEventListener('pointerdown', () => { highlightConnections(null); }, true);
}
function onPointerDown(e) {
if (e.button === 2) return;
const t = e.target;
const handleEl = closestOf(t, '.handle');
const edgeBendEl = closestOf(t, '.edge-bend-handle');
const portEl = closestOf(t, '.port');
const nodeEl = closestOf(t, '.node');
const edgeEl = closestOf(t, '.edge');
const isEmpty = !handleEl && !edgeBendEl && !portEl && !nodeEl && !edgeEl;
const wantPan = (e.button === 1) || (e.button === 0 && spaceDown) ||
(e.button === 0 && isEmpty && !e.shiftKey);
if (wantPan) {
e.preventDefault();
if (e.button === 0 && !spaceDown && !e.shiftKey && (selected.nodes.size || selected.edges.size)) {
clearSelection();
render();
}
drag = { type: 'pan', sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
svg.classList.add('panning');
safeCapture(e.pointerId);
return;
}
if (handleEl) {
e.preventDefault();
const n = getNode([...selected.nodes][0]);
if (!n || n.locked) return;
drag = { type: 'resize', handle: handleEl.dataset.handle, id: n.id, orig: { x: n.x, y: n.y, w: n.w, h: n.h }, start: toWorld(e), moved: false };
safeCapture(e.pointerId);
return;
}
if (edgeBendEl) {
e.preventDefault();
const id = edgeBendEl.dataset.edgeBend;
const ed = getEdge(id);
if (!ed) return;
const geom = computeEdgeGeom(ed);
if (!geom) return;
const axis = edgeOffsetAxis(geom.s1, geom.s2, geom.routing, geom.p1, geom.p2);
drag = { type: 'edge-bend', id, axis, orig: ed.bendOffset || 0, start: toWorld(e), moved: false };
safeCapture(e.pointerId);
return;
}
if (portEl) {
e.preventDefault();
const fromId = portEl.dataset.node;
const fromSide = portEl.dataset.side;
const srcNode = getNode(fromId);
if (!srcNode || srcNode.locked) return;
drag = { type: 'link', from: fromId, fromSide, cursor: toWorld(e) };
linkTargetId = null;
svg.classList.add('linking');
safeCapture(e.pointerId);
render(true);
return;
}
if (nodeEl) {
e.preventDefault();
const id = nodeEl.dataset.id;
const clickedNode = getNode(id);
// Chặn layer khoá
if (isNodeLocked(clickedNode)) {
toast('Node thuộc layer đã khoá', 'warning');
return;
}
// Nếu node thuộc group → tự động chọn cả group (trừ khi shift)
if (!e.shiftKey && clickedNode && clickedNode.groupId) {
const g = groups.find(x => x.id === clickedNode.groupId);
if (g) {
clearSelection();
g.memberIds.forEach(mid => {
const mn = getNode(mid);
if (mn && !isNodeLocked(mn)) selected.nodes.add(mid);
});
}
}
const alreadySelected = selected.nodes.has(id) && selected.nodes.size === 1;
if (e.shiftKey) {
if (selected.nodes.has(id)) selected.nodes.delete(id);
else selected.nodes.add(id);
} else if (!selected.nodes.has(id)) {
clearSelection();
selected.nodes.add(id);
}
selected.edges.clear();
render();
if (e.altKey && selected.nodes.size) duplicateSelection();
drag = {
type: 'node', start: toWorld(e), moved: false,
pendingEditId: (alreadySelected && !e.shiftKey) ? id : null,
origins: [...selected.nodes].map(i => { const n = getNode(i); return { id: i, x: n.x, y: n.y }; })
};
safeCapture(e.pointerId);
return;
}
/* Label drag */
const labelEl = closestOf(t, '.label-group');
if (labelEl) {
e.preventDefault();
const edgeId = labelEl.closest('.edge').dataset.id;
if (edgeId) {
drag = { type: 'edge-label', id: edgeId, moved: false };
safeCapture(e.pointerId);
return;
}
}
if (edgeEl) {
e.preventDefault();
const id = edgeEl.dataset.id;
// Ctrl + click: chèn node vào giữa đường nối
if (e.ctrlKey || e.metaKey) {
const ed = getEdge(id);
if (ed) {
const a = getNode(ed.from), b = getNode(ed.to);
if (a && b) {
const sides = autoSides(a, b);
const s1 = (ed.fromSide && ed.fromSide !== 'auto') ? ed.fromSide : sides[0];
const s2 = (ed.toSide && ed.toSide !== 'auto') ? ed.toSide : sides[1];
const p1 = portPos(a, s1), p2 = portPos(b, s2);
const routing = ed.routing || 'orthogonal';
const parallelOffset = getParallelOffset(ed, edges);
const built = buildEdgePath(p1, s1, p2, s2, routing, ed.cornerRadius != null ? ed.cornerRadius : 12, parallelOffset);
const mid = built.mid;
// Tạo node mới tại midpoint
const nn = addNode(lastCreatedShape, mid.x, mid.y, '');
// Copy style mềm từ node nguồn
nn.fill = a.fill; nn.stroke = a.stroke;
nn.textColor = a.textColor;
// Cắt edge cũ, tạo 2 edge mới
edges = edges.filter(x => x.id !== id);
addEdge(ed.from, nn.id, ed.fromSide, 'auto');
addEdge(nn.id, ed.to, 'auto', ed.toSide);
clearSelection();
selected.nodes.add(nn.id);
render(); pushHistory();
focusInspectorText(nn.id);
toast('Đã chèn node vào đường nối', 'success');
return;
}
}
}
if (!e.shiftKey) clearSelection();
selected.edges.add(id);
selected.nodes.clear();
render();
return;
}
if (e.button === 0 && isEmpty && e.shiftKey) {
const p = toWorld(e);
drag = { type: 'rubber', rect: { x1: p.x, y1: p.y, x2: p.x, y2: p.y }, additive: false };
safeCapture(e.pointerId);
render();
}
}
function safeCapture(pointerId) { try { svg.setPointerCapture(pointerId); } catch (_) {} }
let _renderRAFpending = false;
function renderRAF(skipInspector) {
if (_renderRAFpending) return;
_renderRAFpending = true;
_renderRAF = requestAnimationFrame(() => {
_renderRAFpending = false;
render(skipInspector);
});
}
function onPointerMove(e) {
if (!drag) return;
if (drag.type === 'pan') {
view.x = drag.ox + (e.clientX - drag.sx);
view.y = drag.oy + (e.clientY - drag.sy);
renderRAF(true);
return;
}
const p = toWorld(e);
if (drag.type === 'node') {
const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
if (!drag.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
drag.moved = true;
drag.pendingEditId = null;
}
if (drag.moved) {
drag.origins.forEach(o => {
const n = getNode(o.id);
if (!n || n.locked) return;
let nx = o.x + dx, ny = o.y + dy;
if (snapToGrid) { nx = Math.round(nx / GRID) * GRID; ny = Math.round(ny / GRID) * GRID; }
n.x = nx; n.y = ny;
});
if (chkGuides && chkGuides.checked) {
const draggedNodes = [...selected.nodes].map(getNode).filter(Boolean);
currentGuides = computeGuides(draggedNodes);
if (currentGuides.length && !snapToGrid) {
const threshold = 5;
draggedNodes.forEach(dn => {
currentGuides.forEach(gd => {
if (gd.type === 'v') {
[dn.x, dn.x + dn.w / 2, dn.x + dn.w].forEach(v => { if (Math.abs(v - gd.x) < threshold) dn.x += gd.x - v; });
} else if (gd.type === 'h') {
[dn.y, dn.y + dn.h / 2, dn.y + dn.h].forEach(v => { if (Math.abs(v - gd.y) < threshold) dn.y += gd.y - v; });
}
});
});
}
} else currentGuides = [];
renderRAF(true);
}
return;
}
if (drag.type === 'edge-bend') {
drag.moved = true;
const ed = getEdge(drag.id);
if (!ed) return;
const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
const delta = dx * drag.axis.x + dy * drag.axis.y;
ed.bendOffset = clamp(drag.orig + delta, -600, 600);
renderRAF(true);
return;
}
if (drag.type === 'resize') {
drag.moved = true;
const n = getNode(drag.id);
if (!n) return;
const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
const o = drag.orig;
let x = o.x, y = o.y, w = o.w, h = o.h;
if (drag.handle.indexOf('e') >= 0) w = Math.max(30, o.w + dx);
if (drag.handle.indexOf('s') >= 0) h = Math.max(30, o.h + dy);
if (drag.handle.indexOf('w') >= 0) { w = Math.max(30, o.w - dx); x = o.x + (o.w - w); }
if (drag.handle.indexOf('n') >= 0) { h = Math.max(30, o.h - dy); y = o.y + (o.h - h); }
if (snapToGrid) {
x = Math.round(x / GRID) * GRID; y = Math.round(y / GRID) * GRID;
w = Math.round(w / GRID) * GRID; h = Math.round(h / GRID) * GRID;
}
n.x = x; n.y = y; n.w = w; n.h = h;
renderRAF(true);
return;
}
if (drag.type === 'link') {
drag.cursor = p;
const el = document.elementFromPoint(e.clientX, e.clientY);
const tgtPort = el && el.closest ? el.closest('.port') : null;
const tgt = el && el.closest ? el.closest('.node') : null;
let target = null;
if (tgt && tgt.dataset.id !== drag.from) {
const tgtObj = getNode(tgt.dataset.id);
if (tgtObj && !tgtObj.sticky) target = tgt.dataset.id;
}
linkTargetId = target;    // Snap vào port gần nhất
if (target) {
const node = getNode(target);
if (node) {
if (tgtPort && tgtPort.dataset.node === target) {
drag.snapSide = tgtPort.dataset.side;
drag.snapPos = portPos(node, drag.snapSide);
} else {
const np = findNearestPort(node, p);
drag.snapSide = np.side;
drag.snapPos = np.pos;
}
}
} else {
drag.snapSide = null;
drag.snapPos = null;
}
renderRAF(true);
return;
}
if (drag.type === 'edge-label') {
drag.moved = true;
const ed = getEdge(drag.id);
if (!ed) return;
const a = getNode(ed.from), b = getNode(ed.to);
if (!a || !b) return;
const sides = autoSides(a, b);
const s1 = (ed.fromSide && ed.fromSide !== 'auto') ? ed.fromSide : sides[0];
const s2 = (ed.toSide && ed.toSide !== 'auto') ? ed.toSide : sides[1];
// Dùng đúng slot như makeEdgeEl
const { slot1, total1, slot2, total2 } = getEffectivePortSlots(ed);
const p1 = portPosWithSlot(a, s1, slot1, total1);
const p2 = portPosWithSlot(b, s2, slot2, total2);
const routing = ed.routing || 'orthogonal';
const parallelOffset = getParallelOffset(ed, edges);
if (routing === 'orthogonal' || routing === 'orthogonal_rounded') {
const filt = buildOrthogonalPolyline(p1, s1, p2, s2, parallelOffset);
let bestT = 0.5, bestD = Infinity;
for (let i = 0; i <= 30; i++) {
const tt = i / 30;
const pt = polylinePoint(filt, tt);
const d = (pt.x - p.x) ** 2 + (pt.y - p.y) ** 2;
if (d < bestD) { bestD = d; bestT = tt; }
}
ed.labelT = bestT;
} else {
const dx = p2.x - p1.x, dy = p2.y - p1.y;
const L2 = dx * dx + dy * dy;
ed.labelT = L2 > 0 ? clamp(((p.x - p1.x) * dx + (p.y - p1.y) * dy) / L2, 0, 1) : 0.5;
}
render(true);
return;
}
if (drag.type === 'rubber') {
drag.rect.x2 = p.x; drag.rect.y2 = p.y;
render(true);
return;
}
}
function onPointerUp(e) {
if (!drag) return;
const d = drag;
drag = null;
currentGuides = [];
svg.classList.remove('panning', 'linking');
try { svg.releasePointerCapture(e.pointerId); } catch (_) {}
if (d.type === 'edge-label') {
if (d.moved) pushHistory();
render();
return;
}
if (d.type === 'node') {
if (d.moved) pushHistory();
render();
if (!d.moved && d.pendingEditId) {
const n = getNode(d.pendingEditId);
if (n && !n.locked) focusInspectorText(n.id);
}
return;
}
if (d.type === 'resize') {
if (d.moved) pushHistory();
render();
return;
}
if (d.type === 'edge-bend') {
if (d.moved) pushHistory();
render();
return;
}
if (d.type === 'link') {
const el = document.elementFromPoint(e.clientX, e.clientY);
const tgtNode = el && el.closest ? el.closest('.node') : null;
const tgtPort = el && el.closest ? el.closest('.port') : null;
let targetId = null, targetSide = 'auto';
if (tgtPort) {
targetId = tgtPort.dataset.node;
targetSide = tgtPort.dataset.side;
} else if (tgtNode) {
const tgtObj = getNode(tgtNode.dataset.id);
if (tgtObj && !tgtObj.sticky) {
targetId = tgtNode.dataset.id;
// Ưu tiên side đã snap khi kéo, nếu không thì tìm gần nhất
if (d.snapSide && d.snapSide !== null) targetSide = d.snapSide;
else {
const node = getNode(targetId);
if (node) targetSide = findNearestPort(node, d.cursor).side;
}
}
}
linkTargetId = null;
if (targetId && targetId !== d.from) {
addEdge(d.from, targetId, d.fromSide, targetSide);
pushHistory();
} else if (!targetId) {
const src = getNode(d.from);
if (src) {
const p = d.cursor;
const srcPort = portPos(src, d.fromSide === 'auto' ? 'right' : d.fromSide);
const dist = Math.hypot(p.x - srcPort.x, p.y - srcPort.y);
if (dist > 30) {
const nn = addNode(lastCreatedShape, p.x, p.y);
if (snapToGrid) { nn.x = Math.round(nn.x / GRID) * GRID; nn.y = Math.round(nn.y / GRID) * GRID; }
addEdge(d.from, nn.id, d.fromSide, 'auto');
clearSelection();
selected.nodes.add(nn.id);
pushHistory();
}
}
}
render();
return;
}
if (d.type === 'rubber') {
const r = d.rect;
const rx1 = Math.min(r.x1, r.x2), rx2 = Math.max(r.x1, r.x2);
const ry1 = Math.min(r.y1, r.y2), ry2 = Math.max(r.y1, r.y2);
if (rx2 - rx1 > 4 || ry2 - ry1 > 4) {
if (!d.additive) clearSelection();
nodes.forEach(n => {
if (n.x < rx2 && n.x + n.w > rx1 && n.y < ry2 && n.y + n.h > ry1) selected.nodes.add(n.id);
});
}
render();
return;
}
render();
}
if (svg) {
svg.addEventListener('dblclick', e => {
const edgeBendEl = closestOf(e.target, '.edge-bend-handle');
if (edgeBendEl) {
const ed = getEdge(edgeBendEl.dataset.edgeBend);
if (ed) { ed.bendOffset = 0; render(); pushHistory(); toast('Đã reset độ lệch đường nối', 'success'); }
return;
}
const nodeEl = closestOf(e.target, '.node');
if (nodeEl) {
const n = getNode(nodeEl.dataset.id);
if (n && !n.locked) {
if (!selected.nodes.has(n.id) || selected.nodes.size !== 1) {
clearSelection();
selected.nodes.add(n.id);
selected.edges.clear();
render();
}
focusInspectorText(n.id);
}
return;
}
const edgeEl = closestOf(e.target, '.edge');
if (edgeEl) {
const ed = getEdge(edgeEl.dataset.id);
if (ed) {
showPrompt('Nhãn cho đường nối:', ed.label || '', { title: 'Nhãn', okText: 'Lưu' })
.then(v => { if (v !== null) { ed.label = v; render(); pushHistory(); } });
}
return;
}
const p = toWorld(e);
const n = addNode(lastCreatedShape, p.x, p.y);
clearSelection();
selected.nodes.add(n.id);
render(); pushHistory();
});
}
function focusInspectorText(nodeId) {
const n = getNode(nodeId);
if (!n) return;
const ta = $('i-text');
if (!ta || ta.dataset.nodeId !== nodeId) updateInspector();
requestAnimationFrame(() => {
const ta2 = $('i-text');
if (ta2 && ta2.dataset.nodeId === nodeId) {
if (inspector) inspector.scrollTop = 0;
ta2.focus(); ta2.select();
ta2.classList.remove('flash-focus');
void ta2.offsetWidth;
ta2.classList.add('flash-focus');
}
});
}
if (canvasWrap) {
canvasWrap.addEventListener('wheel', e => {
e.preventDefault();
const r = canvasWrap.getBoundingClientRect();
const mx = e.clientX - r.left, my = e.clientY - r.top;
const oldK = view.k;
const factor = Math.exp(-e.deltaY * 0.0016);
const k = clamp(oldK * factor, 0.12, 4);
view.x = mx - (mx - view.x) * (k / oldK);
view.y = my - (my - view.y) * (k / oldK);
view.k = k;
render(true);
}, { passive: false });
}
function hideCtxMenu() { if (ctxMenu) { ctxMenu.classList.remove('show'); ctxMenu.innerHTML = ''; } }
document.addEventListener('pointerdown', e => { if (ctxMenu && !ctxMenu.contains(e.target)) hideCtxMenu(); }, true);
document.addEventListener('pointerdown', e => {
if (!searchPanel || !searchPanel.classList.contains('show')) return;
if (searchPanel.contains(e.target)) return;
if (e.target.closest && e.target.closest('#btnSearch')) return;
closeSearch();
}, true);
if (svg) {
svg.addEventListener('contextmenu', e => {
e.preventDefault();
const t = e.target;
const nodeEl = closestOf(t, '.node');
const edgeEl = closestOf(t, '.edge');
if (nodeEl) openNodeCtx(e, nodeEl.dataset.id);
else if (edgeEl) openEdgeCtx(e, edgeEl.dataset.id);
else openCanvasCtx(e);
});
}
function buildCtx(items, e) {
if (!ctxMenu) return;
ctxMenu.innerHTML = '';
items.forEach(it => {
if (!it) return;
if (it.type === 'sep') {
const d = document.createElement('div'); d.className = 'ctx-sep';
ctxMenu.appendChild(d); return;
}
if (it.type === 'header') {
const h = document.createElement('div'); h.className = 'ctx-header';
h.textContent = it.label; ctxMenu.appendChild(h); return;
}
if (it.type === 'swatches') {
const row = document.createElement('div');
row.className = 'ctx-swatches' + (it.recent ? ' recent' : '') + (it.labelColors ? ' label-colors' : '');
it.colors.forEach(c => {
const sw = document.createElement('div');
sw.className = 'sw';
if (typeof c === 'object') sw.style.background = 'linear-gradient(135deg, ' + c.fill + ' 55%, ' + c.stroke + ' 55%)';
else sw.style.background = c;
if (typeof c === 'string' && (c === '#ffffff' || c === '#fff')) {
sw.style.border = '2px solid #cbd5e1';
}
sw.title = typeof c === 'object' ? c.fill + ' / ' + c.stroke : c;
sw.addEventListener('click', () => { it.onPick(c); hideCtxMenu(); });
row.appendChild(sw);
});
ctxMenu.appendChild(row); return;
}
if (it.type === 'shapes') {
const grid = document.createElement('div'); grid.className = 'ctx-shapes';
const typeList = it.list || Object.keys(SHAPES);
typeList.forEach(k => {
const v = SHAPES[k]; if (!v) return;
const el = document.createElement('div');
el.className = 'ctx-shape';
el.title = v.label;
const paths = shapePaths(k, 1, 1, 22, 14);
const pathSvg = paths.map((d, i) =>
'<path d="' + d + '" fill="' + (i === 0 && v.fill !== 'transparent' ? v.fill : 'none') +
'" stroke="' + v.stroke + '" stroke-width="1.4" stroke-linejoin="round"/>').join('');
el.innerHTML = '<svg viewBox="0 0 24 16" width="22" height="15">' + pathSvg + '</svg>';
el.addEventListener('click', () => { it.onPick(k); hideCtxMenu(); });
grid.appendChild(el);
});
ctxMenu.appendChild(grid); return;
}
if (it.type === 'buttons') {
const row = document.createElement('div');
row.className = 'ctx-buttons' + (it.cols === 4 ? ' cols4' : it.cols === 5 ? ' cols5' : '');
it.buttons.forEach(b => {
const btn = document.createElement('button');
btn.className = 'ctx-btn' + (b.active ? ' active' : '');
btn.innerHTML = b.label; btn.title = b.title || '';
btn.addEventListener('click', () => { b.onClick(); });
row.appendChild(btn);
});
ctxMenu.appendChild(row); return;
}
if (it.type === 'templates') {
const grid = document.createElement('div');
grid.className = 'tpl-grid';
Object.keys(TEMPLATES).forEach(k => {
const v = TEMPLATES[k];
const el = document.createElement('div');
el.className = 'tpl-item';
el.innerHTML = '<span class="tpl-icon">' + v.icon + '</span><span class="tpl-name">' + v.label + '</span>';
el.addEventListener('click', () => { hideCtxMenu(); applyTemplate(k); });
grid.appendChild(el);
});
ctxMenu.appendChild(grid); return;
}
const row = document.createElement('div');
row.className = 'ctx-item' + (it.danger ? ' danger' : '') + (it.disabled ? ' disabled' : '');
row.innerHTML = '<span class="icon">' + (it.icon || '') + '</span><span>' + it.label + '</span>' +
(it.kbd ? '<span class="kbd">' + it.kbd + '</span>' : '');
row.addEventListener('click', () => { if (it.action) it.action(); hideCtxMenu(); });
ctxMenu.appendChild(row);
});
ctxMenu.classList.add('show');
const r = ctxMenu.getBoundingClientRect();
const cx = e ? e.clientX : window.innerWidth / 2;
const cy = e ? e.clientY : window.innerHeight / 2;
const px = Math.min(cx, window.innerWidth - r.width - 8);
const py = Math.min(cy, window.innerHeight - r.height - 8);
ctxMenu.style.left = Math.max(8, px) + 'px';
ctxMenu.style.top = Math.max(8, py) + 'px';
}
function openNodeCtx(e, id) {
if (!selected.nodes.has(id)) { clearSelection(); selected.nodes.add(id); render(); }
const n = getNode(id);
if (!n) return;
const ids = [...selected.nodes];
const formatButtons = {
type: 'buttons',
buttons: [
{ label: '<b>B</b>', title: 'Đậm', active: n.bold, onClick: () => { ids.forEach(i => { const nn = getNode(i); if (nn) nn.bold = !nn.bold; }); render(); pushHistory(); hideCtxMenu(); }},
{ label: '<i>I</i>', title: 'Nghiêng', active: n.italic, onClick: () => { ids.forEach(i => { const nn = getNode(i); if (nn) nn.italic = !nn.italic; }); render(); pushHistory(); hideCtxMenu(); }},
{ label: 'AF', title: 'Auto-fit', active: n.autoFit !== false, onClick: () => { ids.forEach(i => { const nn = getNode(i); if (nn) nn.autoFit = !(nn.autoFit !== false); }); render(); pushHistory(); hideCtxMenu(); }},
{ label: 'L', title: 'Căn trái', active: n.hAlign === 'left', onClick: () => { ids.forEach(i => { const nn = getNode(i); if (nn) nn.hAlign = 'left'; }); render(); pushHistory(); hideCtxMenu(); }},
{ label: 'C', title: 'Căn giữa', active: (n.hAlign || 'center') === 'center', onClick: () => { ids.forEach(i => { const nn = getNode(i); if (nn) nn.hAlign = 'center'; }); render(); pushHistory(); hideCtxMenu(); }},
{ label: 'R', title: 'Căn phải', active: n.hAlign === 'right', onClick: () => { ids.forEach(i => { const nn = getNode(i); if (nn) nn.hAlign = 'right'; }); render(); pushHistory(); hideCtxMenu(); }}
]
};
const fontButtons = { type: 'buttons', buttons: Object.keys(FONT_PRESETS).map(k => ({
label: k, title: k + ' (' + FONT_PRESETS[k] + 'px)',
onClick: () => { applyFontPreset(ids, k); hideCtxMenu(); }
})) };
const sizeButtons = { type: 'buttons', buttons: Object.keys(SIZE_PRESETS).map(k => ({
label: k, title: '×' + SIZE_PRESETS[k],
onClick: () => { applySizePreset(ids, k); hideCtxMenu(); }
})) };
if (ids.length > 1) {
const multiItems = [
{ type: 'header', label: 'Đã chọn ' + ids.length + ' hình' },
formatButtons,
{ type: 'header', label: 'Cỡ chữ' }, fontButtons,
{ type: 'header', label: 'Kích thước' }, sizeButtons,
{ type: 'header', label: 'Màu sắc' },
{ type: 'swatches', colors: COLOR_PAIRS, onPick: c => {
ids.forEach(i => { const nn = getNode(i); if (nn) { nn.fill = c.fill; nn.stroke = c.stroke; } });
pushRecentColor(c.fill, c.stroke); render(); pushHistory();
}},
{ type: 'sep' }, { type: 'header', label: 'Căn chỉnh' },
{ icon: '⇤', label: 'Căn trái', action: () => alignNodes('left') },
{ icon: '↔', label: 'Căn giữa ngang', action: () => alignNodes('hcenter') },
{ icon: '⇥', label: 'Căn phải', action: () => alignNodes('right') },
{ icon: '⇡', label: 'Căn trên', action: () => alignNodes('top') },
{ icon: '↕', label: 'Căn giữa dọc', action: () => alignNodes('vcenter') },
{ icon: '⇣', label: 'Căn dưới', action: () => alignNodes('bottom') },
{ icon: '⇹', label: 'Phân bố ngang', action: () => alignNodes('distH') },
{ icon: '⇳', label: 'Phân bố dọc', action: () => alignNodes('distV') },
{ type: 'sep' },
{ icon: '⎘', label: 'Nhân bản', kbd: 'Ctrl+D', action: duplicateSelection },
{ icon: '⧉', label: 'Sao chép', kbd: 'Ctrl+C', action: copySelection },
{ icon: '✂', label: 'Cắt', kbd: 'Ctrl+X', action: cutSelection },
{ icon: '🔒', label: 'Khoá / Mở khoá', action: () => {
const anyUnlocked = ids.some(i => { const nn = getNode(i); return nn && !nn.locked; });
ids.forEach(i => { const nn = getNode(i); if (nn) nn.locked = anyUnlocked; });
render(); pushHistory();
}},
{ type: 'sep' },
{ icon: '⤒', label: 'Đưa lên trên cùng', action: () => bringToFront(ids) },
{ icon: '⤓', label: 'Đưa xuống dưới cùng', action: () => sendToBack(ids) },
{ type: 'sep' },
{ icon: '⌖', label: 'Zoom tới vùng chọn', action: () => zoomToSelection() },
{ type: 'sep' },
{ icon: '✕', label: 'Xoá tất cả', kbd: 'Del', danger: true, action: deleteSelection }
];
buildCtx(multiItems, e); return;
}
const items = [
{ icon: '✎', label: 'Sửa văn bản (ở Inspector)', kbd: 'Click / Dbl-click', action: () => focusInspectorText(n.id) },
{ type: 'header', label: 'Định dạng chữ' }, formatButtons,
{ type: 'header', label: 'Cỡ chữ' }, fontButtons,
{ type: 'sep' },
{ type: 'header', label: 'Kích thước' }, sizeButtons,
{ type: 'sep' },
{ type: 'header', label: 'Đổi hình dạng' },
{ type: 'shapes', onPick: k => {
lastCreatedShape = k;
safeStorage.set('fwrt-last-shape', k);
ids.forEach(i => { const nn = getNode(i); if (nn) nn.type = k; });
render(); pushHistory();
}},
{ type: 'header', label: 'Màu sắc' },
{ type: 'swatches', colors: COLOR_PAIRS, onPick: c => {
ids.forEach(i => { const nn = getNode(i); if (nn) { nn.fill = c.fill; nn.stroke = c.stroke; } });
pushRecentColor(c.fill, c.stroke); render(); pushHistory();
}}
];
if (recentColors.length) {
items.push({ type: 'header', label: 'Màu gần đây' });
items.push({ type: 'swatches', colors: recentColors, recent: true, onPick: c => {
ids.forEach(i => { const nn = getNode(i); if (nn) { nn.fill = c.fill; nn.stroke = c.stroke; } });
render(); pushHistory();
}});
}
items.push(
{ type: 'sep' },
{ icon: '⎘', label: 'Nhân bản', kbd: 'Ctrl+D', action: duplicateSelection },
{ icon: '⧉', label: 'Sao chép', kbd: 'Ctrl+C', action: copySelection },
{ icon: '✂', label: 'Cắt', kbd: 'Ctrl+X', action: cutSelection },
{ icon: '📦', label: 'Tạo nhóm từ vùng chọn', action: createGroupFromSelectionAsync },
{ icon: '📂', label: 'Bỏ nhóm', action: ungroupSelection },
{ type: 'sep' },
{ icon: '🎨', label: 'Sao chép định dạng', kbd: 'Ctrl+Alt+C', action: copyFormat },
{ icon: '🖌', label: 'Dán định dạng', kbd: 'Ctrl+Alt+V', action: pasteFormat },
{ icon: n.locked ? '🔓' : '🔒', label: n.locked ? 'Mở khoá' : 'Khoá', action: () => {
ids.forEach(i => { const nn = getNode(i); if (nn) nn.locked = !nn.locked; });
render(); pushHistory();
}},
{ type: 'sep' },
{ icon: '⤒', label: 'Đưa lên trên cùng', action: () => bringToFront(ids) },
{ icon: '↑', label: 'Lên một lớp', action: () => bringForward(ids) },
{ icon: '↓', label: 'Xuống một lớp', action: () => sendBackward(ids) },
{ icon: '⤓', label: 'Đưa xuống dưới cùng', action: () => sendToBack(ids) },
{ type: 'sep' },
{ icon: '✕', label: 'Xoá', kbd: 'Del', danger: true, action: deleteSelection }
);
buildCtx(items, e);
}
/* ==================================================================
EDGE CONTEXT MENU — full customization
================================================================== */
function openEdgeCtx(e, id) {
if (!selected.edges.has(id)) { clearSelection(); selected.edges.add(id); render(); }
const ed = getEdge(id);
if (!ed) return;
const routing = ed.routing || 'orthogonal';
const lineStyle = ed.lineStyle || (ed.dashed ? 'dashed' : 'solid');
const arrStyle = ed.arrowStyle || 'solid';
const labelFS = ed.labelFontSize || 11.5;
buildCtx([
{ icon: '🏷', label: ed.label ? 'Sửa nhãn' : 'Thêm nhãn', action: () => {
showPrompt('Nhãn cho đường nối:', ed.label || '', { title: 'Nhãn', okText: 'Lưu' })
.then(v => { if (v !== null) { ed.label = v; render(); pushHistory(); } });
}},
/* ---- Định tuyến ---- */
{ type: 'header', label: 'Định tuyến' },
{ type: 'buttons', cols: 4, buttons: [
{ label: '〜 Cong', active: routing === 'curve', onClick: () => { ed.routing = 'curve'; render(); pushHistory(); hideCtxMenu(); }},
{ label: '╱ Thẳng', active: routing === 'straight', onClick: () => { ed.routing = 'straight'; render(); pushHistory(); hideCtxMenu(); }},
{ label: '⌐ Gấp', active: routing === 'orthogonal', onClick: () => { ed.routing = 'orthogonal'; render(); pushHistory(); hideCtxMenu(); }},
{ label: '◜ Tròn', title: 'Gấp bo góc', active: routing === 'orthogonal_rounded', onClick: () => { ed.routing = 'orthogonal_rounded'; ed.cornerRadius = ed.cornerRadius || 16; render(); pushHistory(); hideCtxMenu(); }}
]},
/* ---- Đầu/đuôi nối khi trùng cổng với connector khác ---- */
{ type: 'header', label: 'Đầu nối chung cổng' },
{ type: 'buttons', cols: 3, buttons: [
{ label: 'Tự động', title: 'Theo cài đặt chung "Tách mũi"', active: (ed.portSplitMode || 'auto') === 'auto', onClick: () => { ed.portSplitMode = 'auto'; render(); pushHistory(); hideCtxMenu(); }},
{ label: 'Tách riêng', title: 'Luôn chia thành nhiều đầu/đuôi riêng biệt', active: ed.portSplitMode === 'split', onClick: () => { ed.portSplitMode = 'split'; render(); pushHistory(); hideCtxMenu(); }},
{ label: 'Gộp chung', title: 'Luôn gộp về đúng 1 đầu/đuôi tại cổng', active: ed.portSplitMode === 'merge', onClick: () => { ed.portSplitMode = 'merge'; render(); pushHistory(); hideCtxMenu(); }}
]},
(ed.bendOffset ? { icon: '⟲', label: 'Reset độ lệch tuyến (' + Math.round(ed.bendOffset) + 'px)', action: () => { ed.bendOffset = 0; render(); pushHistory(); }} : { type: 'header', label: 'Mẹo: chọn đường nối rồi kéo chấm giữa để tuỳ chỉnh tuyến' }),
/* ---- Kiểu nét ---- */
{ type: 'header', label: 'Kiểu nét' },
{ type: 'buttons', cols: 4, buttons: [
{ label: '━', title: 'Liền', active: lineStyle === 'solid', onClick: () => { ed.lineStyle = 'solid'; ed.dashed = false; render(); pushHistory(); hideCtxMenu(); }},
{ label: '┅', title: 'Đứt', active: lineStyle === 'dashed', onClick: () => { ed.lineStyle = 'dashed'; ed.dashed = true; render(); pushHistory(); hideCtxMenu(); }},
{ label: '┈', title: 'Chấm', active: lineStyle === 'dotted', onClick: () => { ed.lineStyle = 'dotted'; ed.dashed = false; render(); pushHistory(); hideCtxMenu(); }},
{ label: '┉', title: 'Gạch chấm', active: lineStyle === 'dashdot', onClick: () => { ed.lineStyle = 'dashdot'; ed.dashed = false; render(); pushHistory(); hideCtxMenu(); }}
]},
/* ---- Mũi tên vị trí ---- */
{ type: 'header', label: 'Vị trí mũi tên' },
{ type: 'buttons', cols: 4, buttons: [
{ label: '→', title: 'Ở cuối', active: ed.arrowEnd !== false && !ed.arrowStart, onClick: () => { ed.arrowEnd = true; ed.arrowStart = false; render(); pushHistory(); hideCtxMenu(); }},
{ label: '←', title: 'Ở đầu', active: !ed.arrowEnd && ed.arrowStart, onClick: () => { ed.arrowEnd = false; ed.arrowStart = true; render(); pushHistory(); hideCtxMenu(); }},
{ label: '↔', title: 'Cả hai', active: ed.arrowEnd !== false && ed.arrowStart, onClick: () => { ed.arrowEnd = true; ed.arrowStart = true; render(); pushHistory(); hideCtxMenu(); }},
{ label: '—', title: 'Không', active: !ed.arrowEnd && !ed.arrowStart, onClick: () => { ed.arrowEnd = false; ed.arrowStart = false; render(); pushHistory(); hideCtxMenu(); }}
]},
/* ---- Kiểu mũi tên ---- */
{ type: 'header', label: 'Kiểu mũi tên' },
{ type: 'buttons', cols: 5, buttons: [
{ label: '➤', title: 'Đặc', active: arrStyle === 'solid', onClick: () => { ed.arrowStyle = 'solid'; render(); pushHistory(); hideCtxMenu(); }},
{ label: '⌐', title: 'Rỗng', active: arrStyle === 'open', onClick: () => { ed.arrowStyle = 'open'; render(); pushHistory(); hideCtxMenu(); }},
{ label: '◆', title: 'Thoi', active: arrStyle === 'diamond', onClick: () => { ed.arrowStyle = 'diamond'; render(); pushHistory(); hideCtxMenu(); }},
{ label: '●', title: 'Tròn', active: arrStyle === 'circle', onClick: () => { ed.arrowStyle = 'circle'; render(); pushHistory(); hideCtxMenu(); }},
{ label: '▌', title: 'Vạch', active: arrStyle === 'bar', onClick: () => { ed.arrowStyle = 'bar'; render(); pushHistory(); hideCtxMenu(); }}
]},
/* ---- Label formatting ---- */
{ type: 'separator' },
{ type: 'header', label: 'Nhãn · Định dạng' },
{ type: 'buttons', cols: 4, buttons: [
{ label: '<b>B</b>', title: 'Đậm', active: !!ed.labelBold, onClick: () => { ed.labelBold = !ed.labelBold; render(); pushHistory(); hideCtxMenu(); }},
{ label: '<i>I</i>', title: 'Nghiêng', active: !!ed.labelItalic, onClick: () => { ed.labelItalic = !ed.labelItalic; render(); pushHistory(); hideCtxMenu(); }},
{ label: '▣', title: 'Nền', active: ed.labelBg !== false, onClick: () => { ed.labelBg = !(ed.labelBg !== false); render(); pushHistory(); hideCtxMenu(); }},
{ label: '⟲', title: 'Reset nhãn', onClick: () => { ed.labelFontSize = 11.5; ed.labelColor = '#475569'; ed.labelBold = false; ed.labelItalic = false; ed.labelBg = true; render(); pushHistory(); hideCtxMenu(); }}
]},
/* ---- Label font size ---- */
{ type: 'header', label: 'Nhãn · Cỡ chữ' },
{ type: 'buttons', cols: 5, buttons: Object.keys(LABEL_FONT_PRESETS).map(k => ({
label: k, title: LABEL_FONT_PRESETS[k] + 'px',
active: Math.abs(labelFS - LABEL_FONT_PRESETS[k]) < 0.5,
onClick: () => { ed.labelFontSize = LABEL_FONT_PRESETS[k]; render(); pushHistory(); hideCtxMenu(); }
})) },
/* ---- Label color ---- */
{ type: 'header', label: 'Nhãn · Màu chữ' },
{ type: 'swatches', labelColors: true, colors: LABEL_COLORS, onPick: c => { ed.labelColor = c; render(); pushHistory(); }},
/* ---- Edge color ---- */
{ type: 'sep' },
{ type: 'header', label: 'Màu đường' },
{ type: 'swatches', colors: EDGE_COLORS, onPick: c => { ed.color = c; render(); pushHistory(); }},
/* ---- Delete ---- */
{ type: 'sep' },
{ icon: '✕', label: 'Xoá đường nối', kbd: 'Del', danger: true, action: deleteSelection }
], e);
}
function openCanvasCtx(e) {
const items = [];
if (clipboard && (clipboard.nodes.length || clipboard.edges.length)) {
const n = clipboard.nodes.length, e2 = clipboard.edges.length;
items.push({ icon: '⎘', label: 'Dán (' + n + ' hình, ' + e2 + ' nối)', kbd: 'Ctrl+V', action: pasteClipboard });
items.push({ type: 'sep' });
}
const p = toWorld(e);
items.push(
{ type: 'header', label: 'Chèn mẫu' },
{ type: 'templates' },
{ type: 'sep' },
{ type: 'header', label: 'Thêm hình' },
{ type: 'shapes', onPick: k => {
const n = addNode(k, p.x, p.y);
lastCreatedShape = k;
safeStorage.set('fwrt-last-shape', k);
clearSelection();
selected.nodes.add(n.id);
render(); pushHistory();
}},
{ type: 'sep' },
{ type: 'header', label: 'Tiện ích' },
{ icon: '📝', label: 'Thêm sticky note', action: () => addStickyNoteAt(p) },
{ icon: '📦', label: 'Tạo nhóm từ vùng chọn', action: createGroupFromSelectionAsync },
{ icon: '📚', label: 'Mở bảng Layers', action: showLayersPanel },
{ icon: '🔍', label: 'Kiểm tra lưu đồ', action: showValidatePanel },
{ icon: '🔢', label: 'Đánh số tự động (1. 2. 3.)', action: () => autoNumberNodes('dot', 'bfs') },
{ icon: '🔢', label: 'Đánh số (DFS)', action: () => autoNumberNodes('dot', 'dfs') },
{ type: 'sep' },
{ icon: '⌘', label: 'Command Palette', kbd: 'Ctrl+K', action: openCmd },
{ icon: '⛶', label: 'Chọn tất cả', kbd: 'Ctrl+A', action: selectAll },
{ icon: '⌖', label: 'Vừa khung', kbd: 'Ctrl+0', action: fitView },
{ icon: '⊕', label: 'Zoom 100%', action: () => { view.k = 1; render(); } },
{ type: 'sep' },
{ icon: '🔍', label: 'Tìm kiếm', kbd: 'Ctrl+F', action: openSearch },
{ icon: '⚡', label: 'Sắp xếp theo cấu trúc', action: autoLayoutHierarchical },
{ icon: '▦', label: (chkGrid && chkGrid.checked) ? 'Tắt lưới' : 'Bật lưới', action: () => { if (chkGrid) { chkGrid.checked = !chkGrid.checked; updateGrid(); } }},
{ icon: '⌗', label: (chkSnap && chkSnap.checked) ? 'Tắt bám' : 'Bật bám', action: () => { if (chkSnap) { chkSnap.checked = !chkSnap.checked; snapToGrid = chkSnap.checked; } }},
{ icon: '✦', label: (chkGuides && chkGuides.checked) ? 'Tắt guides' : 'Bật guides', action: () => { if (chkGuides) { chkGuides.checked = !chkGuides.checked; currentGuides = []; render(true); } }}
);
buildCtx(items, e);
}
const COMMANDS = [
{ icon: '⊕', label: 'Trang mới', shortcut: 'Ctrl+T', action: addPage },
{ icon: '⎘', label: 'Nhân bản trang hiện tại', shortcut: 'Ctrl+Shift+D', action: () => duplicatePage(activePageId) },
{ icon: '✎', label: 'Đổi tên trang hiện tại', action: () => renamePage(activePageId) },
{ icon: '→', label: 'Trang kế tiếp', shortcut: 'Ctrl+Tab', action: nextPage },
{ icon: '←', label: 'Trang trước', shortcut: 'Ctrl+Shift+Tab', action: prevPage },
{ icon: '▾', label: 'Danh sách tất cả tab', action: openTabDropdown },
{ type: 'sep' },
{ icon: '◀', label: 'Ẩn/Hiện bảng hình', shortcut: 'Ctrl+B', action: togglePalette },
{ icon: '🔍', label: 'Tìm kiếm hình', shortcut: 'Ctrl+F', action: openSearch },
{ icon: '⌖', label: 'Vừa khung', shortcut: 'Ctrl+0', action: fitView },
{ icon: '⌖', label: 'Zoom tới vùng chọn', shortcut: 'Ctrl+Shift+0', action: zoomToSelection },
{ icon: '⊕', label: 'Zoom 100%', action: () => { view.k = 1; render(); } },
{ type: 'sep' },
{ icon: '📊', label: 'Thống kê & Độ phức tạp lưu đồ (McCabe)', shortcut: 'Alt+M', action: showMetricsModal },
{ icon: '💧', label: 'Đóng dấu bản quyền (Watermark)', action: promptWatermark },
{ icon: '⚡', label: 'Sắp xếp theo cấu trúc (BFS)', action: autoLayoutHierarchical },
{ icon: '▦', label: 'Sắp xếp dạng lưới', action: autoLayoutGrid },
{ icon: '🎨', label: 'Sao chép định dạng', shortcut: 'Ctrl+Alt+C', action: copyFormat },
{ icon: '🖌', label: 'Dán định dạng', shortcut: 'Ctrl+Alt+V', action: pasteFormat },
{ type: 'sep' },
{ icon: '▦', label: 'Bật/tắt lưới', action: () => { if (chkGrid) { chkGrid.checked = !chkGrid.checked; updateGrid(); } } },
{ icon: '⌗', label: 'Bật/tắt bám lưới', action: () => { if (chkSnap) { chkSnap.checked = !chkSnap.checked; snapToGrid = chkSnap.checked; } } },
{ icon: '✦', label: 'Bật/tắt alignment guides', action: () => { if (chkGuides) { chkGuides.checked = !chkGuides.checked; currentGuides = []; render(true); } } },
{ icon: '🌙', label: 'Bật/tắt chế độ tối', action: () => { darkMode = !darkMode; safeStorage.set('fwrt-dark', darkMode ? '1' : '0'); applyTheme(); }},
{ icon: '⛶', label: 'Toàn màn hình', shortcut: 'F11', action: toggleFullscreen },
{ type: 'sep' },
{ icon: '⤓', label: 'Xuất PNG', action: () => exportPNG(false) },
{ icon: '⤓', label: 'Xuất PNG nền trong suốt', action: () => exportPNG(true) },
{ icon: '⤓', label: 'Xuất SVG', action: exportSVGFile },
{ icon: '⤓', label: 'Xuất Mermaid', action: exportMermaid },
{ icon: '💾', label: 'Lưu file JSON', shortcut: 'Ctrl+S', action: saveJSON },
{ icon: '📂', label: 'Mở file JSON', action: () => fileInput && fileInput.click() },
{ icon: '🖨', label: 'In / Xuất PDF', shortcut: 'Ctrl+P', action: printFlowchart },
{ type: 'sep' },
{ icon: '📋', label: 'Mẫu: Quy trình cơ bản', action: () => applyTemplate('flow') },
{ icon: '⚙️', label: 'Mẫu: Quy trình nghiệp vụ', action: () => applyTemplate('process') },
{ icon: '🏢', label: 'Mẫu: Sơ đồ tổ chức', action: () => applyTemplate('org') },
{ icon: '🧠', label: 'Mẫu: Mind map', action: () => applyTemplate('mindmap') },
{ icon: '🏊', label: 'Mẫu: Swimlane', action: () => applyTemplate('swim') },
{ icon: '🔀', label: 'Mẫu: Cây quyết định', action: () => applyTemplate('decision') },
{ icon: '🔄', label: 'Mẫu: Vòng đời', action: () => applyTemplate('lifecycle') },
{ icon: '📋', label: 'Mẫu: Kanban', action: () => applyTemplate('kanban') },
{ icon: '📅', label: 'Mẫu: Timeline', action: () => applyTemplate('timeline') },
{ icon: '📊', label: 'Mẫu: BPMN rút gọn', action: () => applyTemplate('bpmn') },
{ type: 'sep' },
{ icon: '📦', label: 'Tạo nhóm từ vùng chọn', action: createGroupFromSelectionAsync },
{ icon: '📂', label: 'Bỏ nhóm khỏi vùng chọn', action: ungroupSelection },
{ icon: '📚', label: 'Mở bảng Layers', action: showLayersPanel },
{ icon: '💾', label: 'Sao lưu / Khôi phục', shortcut: 'Ctrl+Shift+B', action: showBackup },
{ icon: 'ℹ️', label: 'Giới thiệu Fwrt', action: showAbout },
{ type: 'sep' },
{ icon: '⚡', label: 'Toggle hiệu năng (Ctrl+Shift+P)', action: () => {
_showPerfBadge = !_showPerfBadge;
const badge = $('perfBadge');
if (badge) badge.classList.toggle('show', _showPerfBadge);
render(true);
}},
{ type: 'sep' },
{ icon: '🔍', label: 'Kiểm tra lưu đồ', shortcut: 'Ctrl+Shift+V', action: showValidatePanel },
{ icon: '🔢', label: 'Đánh số tự động (1. 2. 3.)', action: () => autoNumberNodes('dot', 'bfs') },
{ icon: '🔢', label: 'Đánh số kiểu (1)', action: () => autoNumberNodes('paren', 'bfs') },
{ icon: '🔢', label: 'Đánh số kiểu [1]', action: () => autoNumberNodes('bracket', 'bfs') },
{ icon: '🔢', label: 'Đánh số kiểu ①②③', action: () => autoNumberNodes('circle', 'bfs') },
{ icon: '📝', label: 'Thêm sticky note', action: addStickyNote },
{ type: 'sep' },
{ icon: '↶', label: 'Hoàn tác', shortcut: 'Ctrl+Z', action: undo },
{ icon: '↷', label: 'Làm lại', shortcut: 'Ctrl+Y', action: redo },
{ icon: '?', label: 'Trợ giúp phím tắt', shortcut: '?', action: openHelp }
];
let cmdFiltered = COMMANDS;
let cmdActiveIdx = 0;
function openCmd() {
if (!cmdOverlay) return;
cmdOverlay.classList.add('show');
if (cmdInput) cmdInput.value = '';
filterCmd('');
setTimeout(() => { if (cmdInput) cmdInput.focus(); }, 30);
}
function closeCmd() { if (cmdOverlay) cmdOverlay.classList.remove('show'); }
function filterCmd(q) {
q = q.trim().toLowerCase();
if (!q) cmdFiltered = COMMANDS;
else cmdFiltered = COMMANDS.filter(c => {
if (c.type === 'sep') return false;
return c.label.toLowerCase().indexOf(q) >= 0 ||
(c.shortcut && c.shortcut.toLowerCase().indexOf(q) >= 0);
});
cmdActiveIdx = 0;
renderCmdList();
}
function renderCmdList() {
if (!cmdList) return;
cmdList.innerHTML = '';
if (!cmdFiltered.length) {
cmdList.innerHTML = '<div class="cmd-empty">Không tìm thấy lệnh phù hợp</div>';
return;
}
cmdFiltered.forEach((c, i) => {
if (c.type === 'sep') return;
const el = document.createElement('div');
el.className = 'cmd-item' + (i === cmdActiveIdx ? ' active' : '');
el.innerHTML = '<span class="cmd-icon">' + (c.icon || '') + '</span>' +
'<span class="cmd-label">' + esc(c.label) + '</span>' +
(c.shortcut ? '<span class="cmd-shortcut">' + c.shortcut + '</span>' : '');
el.addEventListener('click', () => { closeCmd(); c.action(); });
el.addEventListener('mouseenter', () => {
cmdActiveIdx = i;
Array.prototype.forEach.call(cmdList.querySelectorAll('.cmd-item'), (n, j) => {
n.classList.toggle('active', j === i);
});
});
cmdList.appendChild(el);
});
}
if (cmdInput) {
cmdInput.addEventListener('input', e => filterCmd(e.target.value));
cmdInput.addEventListener('keydown', e => {
if (e.key === 'Escape') { closeCmd(); e.preventDefault(); }
else if (e.key === 'ArrowDown') { e.preventDefault(); cmdActiveIdx = Math.min(cmdActiveIdx + 1, cmdFiltered.length - 1); renderCmdList(); }
else if (e.key === 'ArrowUp') { e.preventDefault(); cmdActiveIdx = Math.max(cmdActiveIdx - 1, 0); renderCmdList(); }
else if (e.key === 'Enter') {
e.preventDefault();
const c = cmdFiltered[cmdActiveIdx];
if (c && c.action) { closeCmd(); c.action(); }
}
});
}
if (cmdOverlay) cmdOverlay.addEventListener('click', e => { if (e.target === cmdOverlay) closeCmd(); });
function applyPaletteVisibility() {
document.body.classList.toggle('palette-hidden', paletteHidden);
const btn = $('btnTogglePalette');
if (btn) {
btn.textContent = paletteHidden ? '▶' : '◀';
btn.title = paletteHidden ? 'Hiện bảng hình (Ctrl+B)' : 'Ẩn bảng hình (Ctrl+B)';
}
setTimeout(() => {
if (typeof drawMinimap === 'function') drawMinimap();
if (typeof updateGrid === 'function') updateGrid();
if (typeof updateTabScrollButtons === 'function') updateTabScrollButtons();
}, 260);
}
function togglePalette() {
paletteHidden = !paletteHidden;
safeStorage.set('fwrt-palette-hidden', paletteHidden ? '1' : '0');
applyPaletteVisibility();
toast(paletteHidden ? 'Đã ẩn bảng hình' : 'Đã hiện bảng hình', 'info');
}
click('btnTogglePalette', togglePalette);
window.addEventListener('keydown', e => {
const tag = (e.target.tagName || '').toLowerCase();
const inField = (tag === 'input' || tag === 'textarea' || tag === 'select');
if (e.key === 'Escape') {
if ($('tabDropdown') && $('tabDropdown').classList.contains('show')) { closeTabDropdown(); e.preventDefault(); return; }
const vp = document.getElementById('validatePanel');
if (vp && vp.classList.contains('show')) { vp.classList.remove('show'); e.preventDefault(); return; }
const am = $('aboutModal');
if (am && am.classList.contains('show')) { closeAbout(); e.preventDefault(); return; }
const bm = $('backupModal');
if (bm && bm.classList.contains('show')) { closeBackup(); e.preventDefault(); return; }
const lm = document.getElementById('layersPanel');
if (lm && lm.classList.contains('show')) { lm.classList.remove('show'); e.preventDefault(); return; }
if ($('dlgModal') && $('dlgModal').classList.contains('show')) { cancelDialog(); e.preventDefault(); return; }
if (cmdOverlay && cmdOverlay.classList.contains('show')) { closeCmd(); e.preventDefault(); return; }
const mm = $('metricsModal'); if (mm && mm.classList.contains('show')) { closeMetricsModal(); e.preventDefault(); return; }
if (searchPanel && searchPanel.classList.contains('show')) { closeSearch(); e.preventDefault(); return; }
}
if (inField) { if (e.key === 'Escape') e.target.blur(); return; }
const ctrl = e.ctrlKey || e.metaKey, shift = e.shiftKey, alt = e.altKey;
if (!ctrl && !shift && !alt && (e.key === 'a' || e.key === 'A') && !inField) {
e.preventDefault();
const c = centerWorld();
const n = addNode(lastCreatedShape, c.x, c.y);
clearSelection();
selected.nodes.add(n.id);
render(); pushHistory();
return;
}
if (!ctrl && !shift && !alt && e.key === '/' && !inField) {
e.preventDefault(); openSearch(); return;
}
if (!ctrl && !shift && !alt && selected.edges.size && ['1','2','3','4'].indexOf(e.key) >= 0 && !inField) {
e.preventDefault();
const r = ['curve', 'straight', 'orthogonal', 'orthogonal_rounded'][parseInt(e.key, 10) - 1];
selected.edges.forEach(id => { const ed = getEdge(id); if (ed) ed.routing = r; });
render(); pushHistory();
toast('Routing → ' + r, 'success');
return;
}
if (e.key === 'Escape' && !inField) {
if (selected.nodes.size || selected.edges.size) {
clearSelection(); render(); e.preventDefault(); return;
}
}
if (ctrl && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmd(); return; }
if (ctrl && e.key.toLowerCase() === 'b') { e.preventDefault(); togglePalette(); return; }
if (ctrl && shift && e.key.toLowerCase() === 'p') {
e.preventDefault();
_showPerfBadge = !_showPerfBadge;
const badge = $('perfBadge');
if (badge) badge.classList.toggle('show', _showPerfBadge);
render(true);
toast(_showPerfBadge ? 'Hiện thông số hiệu năng' : 'Ẩn thông số hiệu năng', 'info');
return;
}
if (ctrl && shift && e.key.toLowerCase() === 'v') { e.preventDefault(); showValidatePanel(); return; }
if (ctrl && shift && e.key === 'Tab') { e.preventDefault(); openTabDropdown(); return; }
if (ctrl && e.key === 'Tab') { e.preventDefault(); if (shift) prevPage(); else nextPage(); return; }
if (ctrl && !shift && !alt && e.key >= '1' && e.key <= '9') {
const i = parseInt(e.key, 10) - 1;
if (i < pages.length) { e.preventDefault(); gotoPageIndex(i); return; }
}
if (e.code === 'Space') { spaceDown = true; e.preventDefault(); return; }
if (ctrl && e.key.toLowerCase() === 'z' && !shift) { e.preventDefault(); undo(); return; }
if (ctrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && shift))) { e.preventDefault(); redo(); return; }
if (ctrl && e.key.toLowerCase() === 'd' && !shift && !alt) { e.preventDefault(); duplicateSelection(); return; }
if (ctrl && shift && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicatePage(activePageId); return; }
if (ctrl && !alt && e.key.toLowerCase() === 'a') { e.preventDefault(); selectAll(); return; }
if (ctrl && !alt && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelection(); return; }
if (ctrl && !alt && e.key.toLowerCase() === 'x') { e.preventDefault(); cutSelection(); return; }
if (ctrl && !alt && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteClipboard(); return; }
if (ctrl && alt && e.key.toLowerCase() === 'c') { e.preventDefault(); copyFormat(); return; }
if (ctrl && alt && e.key.toLowerCase() === 'v') { e.preventDefault(); pasteFormat(); return; }
if (ctrl && e.key.toLowerCase() === 'f') { e.preventDefault(); openSearch(); return; }
if (ctrl && e.key.toLowerCase() === 't') { e.preventDefault(); addPage(); return; }
if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); saveJSON(); return; }
if (ctrl && e.key.toLowerCase() === 'p') { e.preventDefault(); printFlowchart(); return; }
if (ctrl && e.key === '0') { e.preventDefault(); if (shift) zoomToSelection(); else fitView(); return; }
if (ctrl && e.key === '=') { e.preventDefault(); zoomBy(1.2); return; }
if (ctrl && e.key === '-') { e.preventDefault(); zoomBy(1 / 1.2); return; }
if (e.key === 'F11') { e.preventDefault(); toggleFullscreen(); return; }
if (e.altKey && (e.key === 'm' || e.key === 'M')) { e.preventDefault(); showMetricsModal(); return; }
if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); return; }
if (e.key === '?') { e.preventDefault(); openHelp(); return; }
if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) >= 0 && selected.nodes.size) {
e.preventDefault();
const step = shift ? 1 : (snapToGrid ? GRID : 10);
const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
selected.nodes.forEach(id => { const n = getNode(id); if (n && !n.locked) { n.x += dx; n.y += dy; } });
render(true);
clearTimeout(window.__nudgeTimer);
window.__nudgeTimer = setTimeout(pushHistory, 400);
}
});
window.addEventListener('keyup', e => { if (e.code === 'Space') spaceDown = false; });
function toggleFullscreen() {
try {
if (!document.fullscreenElement) document.documentElement.requestFullscreen();
else document.exitFullscreen();
} catch (_) {}
}
/* ==================================================================
BACKUP / RESTORE
================================================================== */
const BACKUP_KEY = 'fwrt-backups';
const BACKUP_MAX = 8;
function listBackups() {
try {
const raw = safeStorage.get(BACKUP_KEY, '[]');
return JSON.parse(raw) || [];
} catch (_) { return []; }
}
function saveBackup(label) {
try {
saveCurrentPage();
const snapshotData = {
ts: Date.now(),
label: label || 'Thủ công',
pages: JSON.parse(JSON.stringify(pages.map(p => ({
id: p.id, name: p.name,
nodes: p.nodes, edges: p.edges,
groups: p.groups || [], layers: p.layers || [],
view: p.view
})))),
activePageId: activePageId
};
let list = listBackups();
list.unshift(snapshotData);
if (list.length > BACKUP_MAX) list = list.slice(0, BACKUP_MAX);
safeStorage.set(BACKUP_KEY, JSON.stringify(list));
return snapshotData;
} catch (err) {
showError('Không lưu được backup: ' + err.message);
return null;
}
}
function restoreBackup(idx) {
const list = listBackups();
const b = list[idx];
if (!b) return;
if (nodes.length || pages.some(p => p.nodes.length)) {
showConfirm('Khôi phục bản backup này? Nội dung hiện tại sẽ bị thay thế.', { title: 'Khôi phục', okText: 'Khôi phục' })
.then(ok => { if (ok) doRestoreBackup(b); });
} else {
doRestoreBackup(b);
}
}
function doRestoreBackup(b) {
try {
// Backup trước khi restore
saveBackup('Trước khi khôi phục');
pages = (b.pages || []).map(p => ({
id: p.id || ('p' + Date.now() + Math.random().toString(36).slice(2, 6)),
name: p.name || 'Trang',
nodes: (p.nodes || []).map(n => { migrateNode(n); return n; }),
edges: (p.edges || []).map(e => { migrateEdge(e); return e; }),
groups: p.groups || [],
layers: p.layers || [{ id: 'default', name: 'Mặc định', visible: true, locked: false }],
view: p.view || { x: 0, y: 0, k: 1 }
}));
activePageId = (b.activePageId && pages.find(p => p.id === b.activePageId)) ? b.activePageId : pages[0].id;
const active = pages.find(p => p.id === activePageId);
nodes = active.nodes; edges = active.edges;
groups = active.groups || [];
layers = active.layers || [{ id: 'default', name: 'Mặc định', visible: true, locked: false }];
view.x = active.view.x; view.y = active.view.y; view.k = active.view.k;
clearSelection();
history = []; hIndex = -1;
renderTabs();
render();
pushHistory();
updateUndoButtons();
setTimeout(fitView, 60);
closeBackup();
toast('Đã khôi phục backup', 'success');
} catch (err) {
showError('Không khôi phục được: ' + err.message);
}
}
function deleteBackup(idx) {
const list = listBackups();
if (idx < 0 || idx >= list.length) return;
list.splice(idx, 1);
safeStorage.set(BACKUP_KEY, JSON.stringify(list));
showBackup();
}
function downloadBackup(idx) {
const list = listBackups();
const b = list[idx];
if (!b) return;
const data = {
app: 'Fwrt', version: 9,
savedAt: new Date(b.ts).toISOString(),
pages: b.pages,
activePageId: b.activePageId
};
downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'fwrt-backup-' + b.ts + '.json');
toast('Đã tải backup', 'success');
}
function formatTimeAgo(ts) {
const diff = Date.now() - ts;
if (diff < 60000) return 'vừa xong';
if (diff < 3600000) return Math.floor(diff / 60000) + ' phút trước';
if (diff < 86400000) return Math.floor(diff / 3600000) + ' giờ trước';
return Math.floor(diff / 86400000) + ' ngày trước';
}
function showBackup() {
const body = $('backupBody');
if (!body) return;
const list = listBackups();
let html = '';
html += '<div style="margin-bottom:14px;display:flex;gap:6px">';
html += '<button id="bk-create" style="flex:1;justify-content:center;padding:9px">💾 Tạo backup ngay</button>';
html += '<button id="bk-clear" style="padding:9px 14px">🗑 Xoá tất cả</button>';
html += '</div>';
if (!list.length) {
html += '<div class="backup-empty">Chưa có backup nào.<br>Bấm "Tạo backup ngay" để lưu snapshot.</div>';
} else {
html += '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.7px;font-weight:700;margin-bottom:8px">' +
list.length + ' bản backup · tối đa ' + BACKUP_MAX + '</div>';
list.forEach((b, i) => {
let n = 0, e = 0;
(b.pages || []).forEach(p => { n += (p.nodes || []).length; e += (p.edges || []).length; });
html += '<div class="backup-row">';
html += '<div class="backup-info">';
html += '<div class="backup-title">' + esc(b.label || 'Không tên') + '</div>';
html += '<div class="backup-meta">' + formatTimeAgo(b.ts) + ' · ' +
(b.pages || []).length + ' trang · ' + n + ' node · ' + e + ' nối</div>';
html += '</div>';
html += '<div class="backup-actions">';
html += '<button data-restore="' + i + '" class="primary">Khôi phục</button>';
html += '<button data-download="' + i + '" title="Tải xuống" aria-label="Tải xuống bản sao lưu">⬇</button>';
html += '<button data-delete="' + i + '" title="Xoá" aria-label="Xoá bản sao lưu">✕</button>';
html += '</div></div>';
});
}
body.innerHTML = html;
const cbtn = $('bk-create');
if (cbtn) cbtn.onclick = () => {
const b = saveBackup('Thủ công');
if (b) { toast('Đã tạo backup', 'success'); showBackup(); }
};
const clbtn = $('bk-clear');
if (clbtn) clbtn.onclick = () => {
showConfirm('Xoá toàn bộ backup? Không hoàn tác được.', { title: 'Xoá backup', okText: 'Xoá' })
.then(ok => { if (ok) { safeStorage.remove(BACKUP_KEY); showBackup(); toast('Đã xoá hết backup', 'success'); } });
};
Array.prototype.forEach.call(body.querySelectorAll('[data-restore]'), b => {
b.onclick = () => restoreBackup(parseInt(b.dataset.restore, 10));
});
Array.prototype.forEach.call(body.querySelectorAll('[data-download]'), b => {
b.onclick = () => downloadBackup(parseInt(b.dataset.download, 10));
});
Array.prototype.forEach.call(body.querySelectorAll('[data-delete]'), b => {
b.onclick = () => deleteBackup(parseInt(b.dataset.delete, 10));
});
$('backupModal').classList.add('show');
}
function closeBackup() { const m = $('backupModal'); if (m) m.classList.remove('show'); }
click('backupClose', closeBackup);
click('btnBackup', showBackup);
if ($('backupModal')) {
$('backupModal').addEventListener('click', e => { if (e.target === $('backupModal')) closeBackup(); });
}
/* ==================================================================
ABOUT MODAL
================================================================== */
function showAbout() {
const body = $('aboutBody');
if (!body) return;
let totalNodes = 0, totalEdges = 0, totalGroups = 0, totalLayers = 0;
pages.forEach(p => {
totalNodes += (p.nodes || []).length;
totalEdges += (p.edges || []).length;
totalGroups += (p.groups || []).length;
totalLayers += (p.layers || []).length;
});
const totalTags = new Set();
pages.forEach(p => (p.nodes || []).forEach(n => (n.tags || []).forEach(t => totalTags.add(t))));
const sizeKB = (JSON.stringify({ pages }).length / 1024).toFixed(1);
body.innerHTML =
'<div class="about-logo">Fw</div>' +
'<div class="about-title">Fwrt</div>' +
'<div class="about-sub">Flowchart Editor · Vibe coded with DeepSeek</div>' +
'<div class="about-stats">' +
'<div class="about-stat"><div class="num">' + pages.length + '</div><div class="lbl">Trang</div></div>' +
'<div class="about-stat"><div class="num">' + totalNodes + '</div><div class="lbl">Node</div></div>' +
'<div class="about-stat"><div class="num">' + totalEdges + '</div><div class="lbl">Đường nối</div></div>' +
'<div class="about-stat"><div class="num">' + totalGroups + '</div><div class="lbl">Nhóm</div></div>' +
'<div class="about-stat"><div class="num">' + totalTags.size + '</div><div class="lbl">Tag</div></div>' +
'<div class="about-stat"><div class="num">' + sizeKB + '</div><div class="lbl">KB</div></div>' +
'</div>' +
'<div class="about-section">' +
'<h4>Phiên bản</h4>' +
'<p>Fwrt <b>v9.0</b> · Build 2026</p>' +
'<p>Font: Inter &amp; Space Grotesk · SVG thuần · Không dependencies</p>' +
'</div>' +
'<div class="about-section">' +
'<h4>Điểm nổi bật</h4>' +
'<p>⚡ 40+ hình dạng · 4 kiểu định tuyến edge · Edge tránh vật cản</p>' +
'<p>📦 Group · 📚 Layer · 🏷 Tag · 🔍 Search nâng cao</p>' +
'<p>💾 Auto-save · ⌨️ 30+ shortcut · 🌙 Dark mode · 📱 Touch support</p>' +
'</div>' +
'<div class="about-section">' +
'<h4>Lối tắt nhanh</h4>' +
'<p><code>Ctrl+K</code> Command Palette · <code>?</code> Trợ giúp đầy đủ</p>' +
'<p><code>Ctrl+Shift+P</code> Perf badge · <code>Ctrl+Shift+V</code> Validate</p>' +
'</div>' +
'<div class="about-section" style="text-align:center;font-size:11.5px;color:var(--muted)">' +
'Vibe coded bởi <b style="color:var(--accent)">bari0xit</b> × DeepSeek' +
'</div>';
$('aboutModal').classList.add('show');
}
function closeAbout() { const m = $('aboutModal'); if (m) m.classList.remove('show'); }
click('aboutClose', closeAbout);
click('btnAbout', showAbout);
if ($('aboutModal')) {
$('aboutModal').addEventListener('click', e => { if (e.target === $('aboutModal')) closeAbout(); });
}
function openSearch() {
if (!searchPanel) return;
if (searchPanel.classList.contains('show')) { closeSearch(); return; }
searchPanel.classList.add('show');
if (searchInput) searchInput.value = '';
renderSearchResults('');
setTimeout(() => { if (searchInput) searchInput.focus(); }, 30);
}
function closeSearch() { if (searchPanel) searchPanel.classList.remove('show'); }
function renderSearchResults(q) {
if (!searchResults) return;
q = String(q || '').trim();
searchResults.innerHTML = '';
if (!q) {
searchResults.innerHTML = '<div class="search-empty">Nhập nội dung để tìm trong ' + nodes.length + ' hình</div>';
return;
}
const parsed = parseSearchQuery(q);
const matches = nodes.filter(n => nodeMatchesQuery(n, parsed));
if (!matches.length) {
searchResults.innerHTML = '<div class="search-empty">Không tìm thấy hình nào</div>';
return;
}
matches.slice(0, 30).forEach(n => {
const el = document.createElement('div');
el.className = 'search-result';
const label = n.text || '(' + (SHAPES[n.type] ? SHAPES[n.type].label : n.type) + ')';
const tagsHtml = (n.tags && n.tags.length)
? '<span class="meta" style="color:#7c3aed;font-weight:600">#' + n.tags.slice(0, 3).map(t => esc(t)).join(' #') + '</span>'
: '<span class="meta">' + (SHAPES[n.type] ? SHAPES[n.type].label : n.type) + '</span>';
el.innerHTML = '<span class="dot" style="background:' + (n.fill === 'transparent' ? '#e3e7f0' : n.fill) + ';border:1px solid ' + n.stroke + '"></span>' +
'<span>' + esc(label.slice(0, 60)) + '</span>' + tagsHtml;
el.addEventListener('click', () => {
clearSelection();
selected.nodes.add(n.id);
centerOnNode(n);
render();
closeSearch();
});
searchResults.appendChild(el);
});
}
function centerOnNode(n) {
const cw = canvasWrap.clientWidth, chh = canvasWrap.clientHeight;
view.x = cw / 2 - (n.x + n.w / 2) * view.k;
view.y = chh / 2 - (n.y + n.h / 2) * view.k;
}
if (searchInput) {
searchInput.addEventListener('input', e => renderSearchResults(e.target.value));
searchInput.addEventListener('keydown', e => {
if (e.key === 'Escape') closeSearch();
if (e.key === 'Enter') {
const first = searchResults.querySelector('.search-result');
if (first) first.click();
}
});
}
function openHelp() {
if (!helpModal) return;
if (helpBody && !helpBody.innerHTML) {
helpBody.innerHTML =
'<div class="shortcut-section"><h3>Đường nối — tuỳ biến</h3>' +
'<div class="shortcut-row"><span>Định tuyến</span><span>Cong · Thẳng · Gấp · Gấp bo góc</span></div>' +
'<div class="shortcut-row"><span>Kiểu nét</span><span>Liền · Đứt · Chấm · Gạch-chấm</span></div>' +
'<div class="shortcut-row"><span>Mũi tên</span><span>Đặc · Rỗng · Thoi · Tròn · Vạch</span></div>' +
'<div class="shortcut-row"><span>Nhãn</span><span>Cỡ chữ · Màu · Đậm · Nghiêng · Nền</span></div>' +
'<div class="shortcut-row"><span>Truy cập nhanh</span><span>Chuột phải vào đường nối</span></div>' +
'<div class="shortcut-row"><span>Mặc định</span><span>Gấp nhọn (orthogonal)</span></div>' +
'<div class="shortcut-row"><span>Chèn node vào đường</span><span>Ctrl + Click đường nối</span></div>' +
'<div class="shortcut-row"><span>Snap port</span><span>Tự động khi hover node khi kéo</span></div>' +
'<div class="shortcut-row"><span>Nhiều đường song song</span><span>Tự động tách 16px</span></div>' +
'<div class="shortcut-row"><span>Nhiều edge cùng port</span><span>Tự động chia đều</span></div>' +
'<div class="shortcut-row"><span>Kéo label edge</span><span>Kéo nhãn dọc theo đường</span></div>' +
'<div class="shortcut-row"><span>Highlight</span><span>Hover node → sáng đường liên quan</span></div>' +
'<div class="shortcut-row"><span>Kiểm tra lưu đồ</span><span>Ctrl+Shift+V</span></div>' +
'<div class="shortcut-row"><span>Đánh số tự động</span><span>Command Palette (Ctrl+K)</span></div>' +
'<div class="shortcut-row"><span>Sticky note</span><span>Chuột phải canvas → Thêm sticky note</span></div>' +
'<div class="shortcut-row"><span>Icon node</span><span>Inspector → chọn emoji</span></div>' +
'<div class="shortcut-row"><span>Nhóm node</span><span>Chọn 2+ node → Chuột phải → Tạo nhóm</span></div>' +
'<div class="shortcut-row"><span>Kéo nhóm</span><span>Kéo 1 node trong nhóm → cả nhóm đi theo</span></div>' +
'<div class="shortcut-row"><span>Layers</span><span>Chuột phải canvas → Mở bảng Layers</span></div>' +
'<div class="shortcut-row"><span>Tag</span><span>Inspector → nhập tag + Enter</span></div>' +
'<div class="shortcut-row"><span>Search nâng cao</span><span>tag:xxx · type:xxx · color:#xxx · layer:xxx</span></div>' +
'<div class="shortcut-row"><span>Toggle hiệu năng</span><span>Ctrl+Shift+P</span></div>' +
'<div class="shortcut-row"><span>Zoom 2 ngón</span><span>Pinch trên touchscreen</span></div>' +
'<div class="shortcut-row"><span>Pan 2 ngón</span><span>Di chuyển 2 ngón trên touchscreen</span></div>' +
'<div class="shortcut-row"><span>Sao lưu / Khôi phục</span><span>Ctrl+Shift+B</span></div>' +
'<div class="shortcut-row"><span>Giới thiệu</span><span>Click nút ℹ topbar</span></div>' +
'<div class="shortcut-row"><span>In nhiều trang A4</span><span>Tự động chia trang khi diagram lớn</span></div></div>' +
'<div class="shortcut-row"><span>Focus tìm kiếm</span><span>/</span></div>' +
'<div class="shortcut-row"><span>Đổi routing edge</span><span>1 2 3 4 (khi chọn edge)</span></div>' +
'<div class="shortcut-row"><span>Bỏ chọn</span><span>Esc</span></div></div>' +      '<div class="shortcut-section"><h3>Thao tác với hình</h3>' +
'<div class="shortcut-row"><span>Click lần 1</span><span>Chọn hình</span></div>' +
'<div class="shortcut-row"><span>Click lần 2 / Dbl-click</span><span>Focus ô Nội dung ở Inspector</span></div>' +
'<div class="shortcut-row"><span>Click vùng trống</span><span>Bỏ chọn</span></div></div>' +
'<div class="shortcut-section"><h3>Thanh tab</h3>' +
'<div class="shortcut-row"><span>Chuyển tab</span><span>Click · Ctrl+1..9</span></div>' +
'<div class="shortcut-row"><span>Danh sách tab</span><span>Nút ▾ hoặc Ctrl+Shift+Tab</span></div>' +
'<div class="shortcut-row"><span>Cuộn tab</span><span>Chuột giữa · kéo vùng trống</span></div></div>' +
'<div class="shortcut-section"><h3>Khác</h3>' +
'<div class="shortcut-row"><span>Command Palette</span><span>Ctrl+K</span></div>' +
'<div class="shortcut-row"><span>Ẩn/hiện bảng hình</span><span>Ctrl+B</span></div>' +
'<div class="shortcut-row"><span>Tìm kiếm</span><span>Ctrl+F</span></div>' +
'<div class="shortcut-row"><span>Copy / Cut / Paste</span><span>Ctrl+C / X / V</span></div>' +
'<div class="shortcut-row"><span>Hoàn tác / Làm lại</span><span>Ctrl+Z / Ctrl+Y</span></div>' +
'<div class="shortcut-row"><span>Lưu / In</span><span>Ctrl+S / Ctrl+P</span></div></div>';
}
helpModal.classList.add('show');
}
function closeHelp() { if (helpModal) helpModal.classList.remove('show'); }
/* ==================================================================
INSPECTOR
================================================================== */
function updateInspector() {
if (!inspector) return;
const nodeSel = [...selected.nodes].map(getNode).filter(Boolean);
const edgeSel = [...selected.edges].map(getEdge).filter(Boolean);
if (nodeSel.length === 1) renderNodeInspector(nodeSel[0]);
else if (edgeSel.length === 1) renderEdgeInspector(edgeSel[0]);
else if (nodeSel.length > 1) renderMultiInspector(nodeSel);
else inspector.innerHTML =
'<div class="empty-state"><span class="big">◈</span>' +
'Chọn một hình hoặc đường nối<br>để chỉnh sửa thuộc tính.<br><br>' +
'<span style="font-size:11.5px;line-height:1.7">' +
'<b>Click lần 1</b> → chọn hình<br>' +
'<b>Click lần 2</b> → focus ô Nội dung<br>' +
'<b>Chuột phải</b> → menu tuỳ chỉnh<br>' +
'<b>Ctrl+B</b> ẩn/hiện bảng hình</span></div>';
}
function renderNodeInspector(n) {
if (!inspector) return;
const layout = computeTextLayout(n);
const usedFs = layout ? layout.fs : (n.fontSize || 14);
const shrunk = layout && layout.fs < (n.fontSize || 14) - 0.1;
const atMin = shrunk && layout.fs <= MIN_FONT + 0.1;
inspector.innerHTML =
'<div class="insp-title">Thuộc tính hình</div>' +
'<label class="fld"><span>Nội dung</span>' +
'<textarea id="i-text" data-node-id="' + n.id + '" rows="3" placeholder="Nhập nội dung…">' + esc(n.text) + '</textarea></label>' +
(shrunk ? '<div style="font-size:11px;color:' + (atMin ? '#dc2626' : '#d97706') + ';background:' + (atMin ? '#fee2e2' : '#fef3c7') + ';border-radius:7px;padding:6px 9px;margin-bottom:11px">' +
(atMin ? '⛔ Chữ ở cỡ tối thiểu' : '⚠ Chữ tự co xuống ' + usedFs.toFixed(1) + 'px') + '</div>' : '') +
'<div class="row2">' +
'<button id="i-bold" style="width:100%;justify-content:center;font-weight:700;' + (n.bold ? 'background:var(--accent-soft);border-color:var(--accent);color:var(--accent)' : '') + '">B</button>' +
'<button id="i-italic" style="width:100%;justify-content:center;font-style:italic;' + (n.italic ? 'background:var(--accent-soft);border-color:var(--accent);color:var(--accent)' : '') + '">I</button></div>' +
'<label class="fld" style="margin-top:11px"><span>Tự động co chữ</span>' +
'<select id="i-autofit"><option value="1" ' + (n.autoFit !== false ? 'selected' : '') + '>Bật</option>' +
'<option value="0" ' + (n.autoFit === false ? 'selected' : '') + '>Tắt</option></select></label>' +
'<div class="row2">' +
'<label class="fld"><span>Căn ngang</span><select id="i-halign">' +
'<option value="left" ' + (n.hAlign === 'left' ? 'selected' : '') + '>Trái</option>' +
'<option value="center" ' + ((n.hAlign || 'center') === 'center' ? 'selected' : '') + '>Giữa</option>' +
'<option value="right" ' + (n.hAlign === 'right' ? 'selected' : '') + '>Phải</option></select></label>' +
'<label class="fld"><span>Căn dọc</span><select id="i-valign">' +
'<option value="top" ' + (n.vAlign === 'top' ? 'selected' : '') + '>Trên</option>' +
'<option value="middle" ' + ((n.vAlign || 'middle') === 'middle' ? 'selected' : '') + '>Giữa</option>' +
'<option value="bottom" ' + (n.vAlign === 'bottom' ? 'selected' : '') + '>Dưới</option></select></label></div>' +
'<label class="fld"><span>Loại hình</span><select id="i-shape">' +
Object.keys(GROUPS).map(gr => {
const opts = GROUPS[gr];
return '<optgroup label="' + gr + '">' +
opts.map(k => '<option value="' + k + '" ' + (k === n.type ? 'selected' : '') + '>' + SHAPES[k].label + '</option>').join('') +
'</optgroup>';
}).join('') +
'</select></label>' +
(n.type === 'tag' ? (
'<div class="insp-title">Đầu · Đuôi (Tag)</div>' +
'<label class="chk" style="margin-bottom:7px"><input type="checkbox" id="i-cap-link" ' + (n.capLinked ? 'checked' : '') + '> Dùng chung 1 kiểu cho cả 2 đầu</label>' +
(n.capLinked ?
'<label class="fld"><span>Kiểu 2 đầu</span><select id="i-cap-both">' +
CAP_STYLES.map(c => '<option value="' + c.v + '" ' + ((n.capStart || 'point') === c.v ? 'selected' : '') + '>' + c.label + '</option>').join('') +
'</select></label>'
:
'<div class="row2">' +
'<label class="fld"><span>Đầu (trái)</span><select id="i-cap-start">' +
CAP_STYLES.map(c => '<option value="' + c.v + '" ' + ((n.capStart || 'point') === c.v ? 'selected' : '') + '>' + c.label + '</option>').join('') +
'</select></label>' +
'<label class="fld"><span>Đuôi (phải)</span><select id="i-cap-end">' +
CAP_STYLES.map(c => '<option value="' + c.v + '" ' + ((n.capEnd || 'round') === c.v ? 'selected' : '') + '>' + c.label + '</option>').join('') +
'</select></label></div>')
) : '') +
'<div class="row2">' +
'<label class="fld"><span>Rộng</span><input type="number" id="i-w" value="' + Math.round(n.w) + '" min="30"></label>' +
'<label class="fld"><span>Cao</span><input type="number" id="i-h" value="' + Math.round(n.h) + '" min="24"></label></div>' +
'<div class="row2">' +
'<label class="fld"><span>X</span><input type="number" id="i-x" value="' + Math.round(n.x) + '"></label>' +
'<label class="fld"><span>Y</span><input type="number" id="i-y" value="' + Math.round(n.y) + '"></label></div>' +
'<div class="insp-title">Kích thước nhanh</div>' +
'<div class="align-grid" style="grid-template-columns:repeat(5,1fr)">' +
Object.keys(SIZE_PRESETS).map(k => '<div class="align-btn" data-size="' + k + '" style="font-size:11px;font-weight:600">' + k + '</div>').join('') +
'</div>' +
'<div class="insp-title">Mở rộng theo hướng</div>' +
'<div class="row2">' +
'<label class="fld"><span>Bước mở rộng (px)</span><input type="number" id="i-ext-amt" value="' + lastExtendAmount + '" min="1" max="2000" step="1"></label>' +
'<span></span></div>' +
'<div class="align-grid" style="grid-template-columns:repeat(4,1fr)">' +
'<div class="align-btn" id="ext-left" title="Kéo dài thêm sang trái" style="font-size:11px">◀ Trái</div>' +
'<div class="align-btn" id="ext-right" title="Kéo dài thêm sang phải" style="font-size:11px">▶ Phải</div>' +
'<div class="align-btn" id="ext-top" title="Kéo dài thêm lên trên" style="font-size:11px">▲ Trên</div>' +
'<div class="align-btn" id="ext-bottom" title="Kéo dài thêm xuống dưới" style="font-size:11px">▼ Dưới</div>' +
'</div>' +
'<div class="insp-title">Màu sắc</div>' +
'<div class="swatch-row" id="i-swatches">' +
COLOR_PAIRS.map(c => '<div class="swatch" data-fill="' + c.fill + '" data-stroke="' + c.stroke + '" style="background:linear-gradient(135deg, ' + c.fill + ' 55%, ' + c.stroke + ' 55%)"></div>').join('') +
'</div>' +
'<div class="row2">' +
'<label class="fld"><span>Nền</span><input type="color" id="i-fill" value="' + (n.fill === 'transparent' ? '#ffffff' : n.fill) + '"></label>' +
'<label class="fld"><span>Viền</span><input type="color" id="i-stroke" value="' + n.stroke + '"></label></div>' +
'<div class="row2">' +
'<label class="fld"><span>Chữ</span><input type="color" id="i-textcolor" value="' + (n.textColor || '#1e2433') + '"></label>' +
'<label class="fld"><span>Cỡ chữ</span><input type="number" id="i-fs" value="' + (n.fontSize || 14) + '" min="5" max="72"></label></div>' +
'<label class="fld"><span>Độ dày viền</span><input type="number" id="i-sw" value="' + (n.strokeWidth || 2) + '" min="0" max="12" step="0.5"></label>' +
'<div class="insp-title">Icon</div>' +
'<div class="icon-picker-grid" id="i-icons">' +
'<div class="icon-picker-item' + (!n.icon ? ' active' : '') + '" data-icon="" title="Không icon" style="font-size:12px;color:var(--muted)">—</div>' +
ICON_PRESETS.map(ic => '<div class="icon-picker-item' + (n.icon === ic ? ' active' : '') + '" data-icon="' + ic + '">' + ic + '</div>').join('') +
'</div>' +
'<button style="width:100%;justify-content:center;margin-bottom:6px" id="i-sticky">' + (n.sticky ? '📝 Bỏ sticky' : '📝 Đặt làm sticky') + '</button>' +
'<div class="insp-title">Tags</div>' +
'<div class="tag-input-wrap"><input type="text" id="i-tag-input" placeholder="Nhập tag + Enter…" value=""></div>' +
'<div class="tag-list" id="i-tag-list">' +
((n.tags && n.tags.length)
? n.tags.map(tag => '<span class="tag-chip">' + esc(tag) + '<span class="tag-remove" data-tag="' + esc(tag) + '" title="Xoá tag">×</span></span>').join('')
: '<span class="tag-empty">Chưa có tag</span>') +
'</div>' +
'<div class="insp-title">Layer</div>' +
'<label class="fld"><span>Thuộc layer</span><select id="i-layer">' +
layers.map(l => '<option value="' + l.id + '" ' + ((n.layerId || 'default') === l.id ? 'selected' : '') + '>' + esc(l.name) + (l.locked ? ' 🔒' : '') + (l.visible ? '' : ' 🚫') + '</option>').join('') +
'</select></label>' +
'<div class="insp-title">Lớp & Khoá</div>' +
'<div class="align-grid">' +
'<div class="align-btn" id="z-front" title="Lên trên cùng">⤒</div>' +
'<div class="align-btn" id="z-fwd" title="Lên một lớp">↑</div>' +
'<div class="align-btn" id="z-bwd" title="Xuống một lớp">↓</div>' +
'<div class="align-btn" id="z-back" title="Xuống dưới cùng">⤓</div></div>' +
'<button style="width:100%;justify-content:center;margin-bottom:6px" id="i-lock">' + (n.locked ? '🔓 Mở khoá' : '🔒 Khoá hình') + '</button>' +
'<button style="width:100%;justify-content:center;margin-bottom:6px" id="i-copyfmt">🎨 Sao chép định dạng</button>' +
'<div class="insp-title">Hành động</div>' +
'<button style="width:100%;justify-content:center" id="i-dup">Nhân bản (Ctrl+D)</button>' +
'<button class="danger" id="i-del">Xoá hình (Del)</button>';
const g = id => $(id);
if (g('i-text')) {
g('i-text').addEventListener('input', ev => { n.text = ev.target.value; render(true); });
g('i-text').addEventListener('change', pushHistory);
g('i-text').addEventListener('keydown', ev => {
ev.stopPropagation();
if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); ev.target.blur(); }
});
}
if (g('i-bold')) g('i-bold').onclick = () => { n.bold = !n.bold; render(); pushHistory(); };
if (g('i-italic')) g('i-italic').onclick = () => { n.italic = !n.italic; render(); pushHistory(); };
if (g('i-autofit')) g('i-autofit').onchange = ev => { n.autoFit = ev.target.value === '1'; render(); pushHistory(); };
if (g('i-halign')) g('i-halign').onchange = ev => { n.hAlign = ev.target.value; render(); pushHistory(); };
if (g('i-valign')) g('i-valign').onchange = ev => { n.vAlign = ev.target.value; render(); pushHistory(); };
if (g('i-shape')) g('i-shape').addEventListener('change', ev => {
n.type = ev.target.value;
if (n.type === 'tag' && !n.capStart && !n.capEnd) {
n.capStart = SHAPES.tag.capStart; n.capEnd = SHAPES.tag.capEnd; n.capLinked = false;
}
lastCreatedShape = n.type;
safeStorage.set('fwrt-last-shape', n.type);
render(); pushHistory();
});
if (g('i-cap-link')) g('i-cap-link').onchange = ev => {
n.capLinked = ev.target.checked;
if (n.capLinked) n.capEnd = n.capStart || 'point';
render(); pushHistory();
};
if (g('i-cap-both')) g('i-cap-both').onchange = ev => {
n.capStart = ev.target.value; n.capEnd = ev.target.value; render(); pushHistory();
};
if (g('i-cap-start')) g('i-cap-start').onchange = ev => { n.capStart = ev.target.value; render(); pushHistory(); };
if (g('i-cap-end')) g('i-cap-end').onchange = ev => { n.capEnd = ev.target.value; render(); pushHistory(); };
[['i-w', 'w', 30], ['i-h', 'h', 24], ['i-x', 'x', -1e5], ['i-y', 'y', -1e5]].forEach(pair => {
const id = pair[0], key = pair[1], min = pair[2];
if (g(id)) {
g(id).addEventListener('input', ev => {
const v = parseFloat(ev.target.value);
if (isNaN(v)) return;
n[key] = min >= 0 ? Math.max(min, v) : v;
render(true);
});
g(id).addEventListener('change', pushHistory);
}
});
Array.prototype.forEach.call(document.querySelectorAll('[data-size]'), b => {
b.onclick = () => applySizePreset([n.id], b.dataset.size);
});
if (g('i-ext-amt')) g('i-ext-amt').addEventListener('input', ev => {
const v = parseFloat(ev.target.value);
if (!isNaN(v) && v > 0) lastExtendAmount = v;
});
if (g('ext-left')) g('ext-left').onclick = () => extendNodes([n.id], 'left', lastExtendAmount);
if (g('ext-right')) g('ext-right').onclick = () => extendNodes([n.id], 'right', lastExtendAmount);
if (g('ext-top')) g('ext-top').onclick = () => extendNodes([n.id], 'top', lastExtendAmount);
if (g('ext-bottom')) g('ext-bottom').onclick = () => extendNodes([n.id], 'bottom', lastExtendAmount);
if (g('i-fill')) {
g('i-fill').addEventListener('input', ev => { n.fill = ev.target.value; render(true); });
g('i-fill').addEventListener('change', () => { pushRecentColor(n.fill, n.stroke); pushHistory(); });
}
if (g('i-stroke')) {
g('i-stroke').addEventListener('input', ev => { n.stroke = ev.target.value; render(true); });
g('i-stroke').addEventListener('change', () => { pushRecentColor(n.fill, n.stroke); pushHistory(); });
}
if (g('i-textcolor')) {
g('i-textcolor').addEventListener('input', ev => { n.textColor = ev.target.value; render(true); });
g('i-textcolor').addEventListener('change', pushHistory);
}
if (g('i-fs')) {
g('i-fs').addEventListener('input', ev => { n.fontSize = clamp(parseFloat(ev.target.value) || 14, 5, 72); render(true); });
g('i-fs').addEventListener('change', pushHistory);
}
if (g('i-sw')) {
g('i-sw').addEventListener('input', ev => { n.strokeWidth = clamp(parseFloat(ev.target.value) || 2, 0, 12); render(true); });
g('i-sw').addEventListener('change', pushHistory);
}
Array.prototype.forEach.call(document.querySelectorAll('#i-swatches .swatch'), sw => {
sw.addEventListener('click', () => {
n.fill = sw.dataset.fill; n.stroke = sw.dataset.stroke;
pushRecentColor(n.fill, n.stroke); render(); pushHistory();
});
});
Array.prototype.forEach.call(document.querySelectorAll('#i-icons .icon-picker-item'), el => {
el.addEventListener('click', () => {
const ic = el.dataset.icon;
n.icon = ic || null;
render(); pushHistory();
});
});
if (g('i-tag-input')) {
g('i-tag-input').addEventListener('keydown', ev => {
ev.stopPropagation();
if (ev.key === 'Enter') {
ev.preventDefault();
const raw = ev.target.value.trim().toLowerCase();
const tag = raw.replace(/[^a-z0-9\-_]/gi, '');
if (!tag) return;
n.tags = n.tags || [];
if (!n.tags.includes(tag)) {
n.tags.push(tag);
_focusTagInput = true;
render(); pushHistory();
} else {
ev.target.value = '';
}
}
});
}
Array.prototype.forEach.call(document.querySelectorAll('#i-tag-list .tag-remove'), el => {
el.addEventListener('click', () => {
const tag = el.dataset.tag;
n.tags = (n.tags || []).filter(t => t !== tag);
_focusTagInput = true;
render(); pushHistory();
});
});
if (_focusTagInput) {
_focusTagInput = false;
requestAnimationFrame(() => {
const inp = document.getElementById('i-tag-input');
if (inp) inp.focus();
});
}
if (g('i-layer')) {
g('i-layer').addEventListener('change', ev => {
n.layerId = ev.target.value;
render(); pushHistory();
});
}
if (g('i-sticky')) g('i-sticky').onclick = () => {
n.sticky = !n.sticky;
if (n.sticky) {
if (!n.fill || n.fill === '#dbeafe') n.fill = '#fef08a';
if (!n.stroke || n.stroke === '#2563eb') n.stroke = '#ca8a04';
if (!n.textColor || n.textColor === '#1e2433') n.textColor = '#713f12';
}
render(); pushHistory();
};
if (g('z-front')) g('z-front').onclick = () => bringToFront([n.id]);
if (g('z-fwd')) g('z-fwd').onclick = () => bringForward([n.id]);
if (g('z-bwd')) g('z-bwd').onclick = () => sendBackward([n.id]);
if (g('z-back')) g('z-back').onclick = () => sendToBack([n.id]);
if (g('i-lock')) g('i-lock').onclick = () => { n.locked = !n.locked; render(); pushHistory(); };
if (g('i-copyfmt')) g('i-copyfmt').onclick = copyFormat;
if (g('i-dup')) g('i-dup').onclick = duplicateSelection;
if (g('i-del')) g('i-del').onclick = deleteSelection;
}
function renderMultiInspector(sel) {
if (!inspector) return;
inspector.innerHTML =
'<div class="insp-title">Đã chọn ' + sel.length + ' hình</div>' +
'<div class="align-grid">' +
'<div class="align-btn" id="a-left" title="Căn trái">⇤</div>' +
'<div class="align-btn" id="a-hc" title="Căn giữa ngang">↔</div>' +
'<div class="align-btn" id="a-right" title="Căn phải">⇥</div>' +
'<div class="align-btn" id="a-top" title="Căn trên">⇡</div>' +
'<div class="align-btn" id="a-vc" title="Căn giữa dọc">↕</div>' +
'<div class="align-btn" id="a-bottom" title="Căn dưới">⇣</div></div>' +
'<div class="align-grid" style="grid-template-columns:1fr 1fr">' +
'<div class="align-btn" id="a-dh">⇹ Phân bố ngang</div>' +
'<div class="align-btn" id="a-dv">⇳ Phân bố dọc</div></div>' +
'<div class="insp-title">Kích thước nhanh</div>' +
'<div class="align-grid" style="grid-template-columns:repeat(5,1fr)">' +
Object.keys(SIZE_PRESETS).map(k => '<div class="align-btn" data-size="' + k + '" style="font-size:11px;font-weight:600">' + k + '</div>').join('') +
'</div>' +
'<div class="insp-title">Mở rộng theo hướng</div>' +
'<div class="row2">' +
'<label class="fld"><span>Bước mở rộng (px)</span><input type="number" id="i-ext-amt" value="' + lastExtendAmount + '" min="1" max="2000" step="1"></label>' +
'<span></span></div>' +
'<div class="align-grid" style="grid-template-columns:repeat(4,1fr)">' +
'<div class="align-btn" id="ext-left" title="Kéo dài thêm sang trái" style="font-size:11px">◀ Trái</div>' +
'<div class="align-btn" id="ext-right" title="Kéo dài thêm sang phải" style="font-size:11px">▶ Phải</div>' +
'<div class="align-btn" id="ext-top" title="Kéo dài thêm lên trên" style="font-size:11px">▲ Trên</div>' +
'<div class="align-btn" id="ext-bottom" title="Kéo dài thêm xuống dưới" style="font-size:11px">▼ Dưới</div>' +
'</div>' +
'<div class="insp-title">Màu sắc</div>' +
'<div class="swatch-row" id="m-swatches">' +
COLOR_PAIRS.map(c => '<div class="swatch" data-fill="' + c.fill + '" data-stroke="' + c.stroke + '" style="background:linear-gradient(135deg, ' + c.fill + ' 55%, ' + c.stroke + ' 55%)"></div>').join('') +
'</div>' +
'<div class="insp-title">Hành động</div>' +
'<button style="width:100%;justify-content:center;margin-bottom:6px" id="m-pastefmt">🖌 Dán định dạng</button>' +
'<button style="width:100%;justify-content:center;margin-bottom:6px" id="m-lock">🔒 Khoá / Mở khoá</button>' +
'<button style="width:100%;justify-content:center" id="m-dup">Nhân bản (Ctrl+D)</button>' +
'<button class="danger" id="m-del">Xoá tất cả (Del)</button>';
const g = id => $(id);
if (g('a-left')) g('a-left').onclick = () => alignNodes('left');
if (g('a-hc')) g('a-hc').onclick = () => alignNodes('hcenter');
if (g('a-right')) g('a-right').onclick = () => alignNodes('right');
if (g('a-top')) g('a-top').onclick = () => alignNodes('top');
if (g('a-vc')) g('a-vc').onclick = () => alignNodes('vcenter');
if (g('a-bottom')) g('a-bottom').onclick = () => alignNodes('bottom');
if (g('a-dh')) g('a-dh').onclick = () => alignNodes('distH');
if (g('a-dv')) g('a-dv').onclick = () => alignNodes('distV');
Array.prototype.forEach.call(document.querySelectorAll('[data-size]'), b => {
b.onclick = () => applySizePreset(sel.map(n => n.id), b.dataset.size);
});
if (g('i-ext-amt')) g('i-ext-amt').addEventListener('input', ev => {
const v = parseFloat(ev.target.value);
if (!isNaN(v) && v > 0) lastExtendAmount = v;
});
const multiIds = sel.map(n => n.id);
if (g('ext-left')) g('ext-left').onclick = () => extendNodes(multiIds, 'left', lastExtendAmount);
if (g('ext-right')) g('ext-right').onclick = () => extendNodes(multiIds, 'right', lastExtendAmount);
if (g('ext-top')) g('ext-top').onclick = () => extendNodes(multiIds, 'top', lastExtendAmount);
if (g('ext-bottom')) g('ext-bottom').onclick = () => extendNodes(multiIds, 'bottom', lastExtendAmount);
if (g('m-pastefmt')) g('m-pastefmt').onclick = pasteFormat;
if (g('m-lock')) g('m-lock').onclick = () => {
const anyUnlocked = sel.some(n => !n.locked);
sel.forEach(n => { n.locked = anyUnlocked; });
render(); pushHistory();
};
if (g('m-dup')) g('m-dup').onclick = duplicateSelection;
if (g('m-del')) g('m-del').onclick = deleteSelection;
Array.prototype.forEach.call(document.querySelectorAll('#m-swatches .swatch'), sw => {
sw.addEventListener('click', () => {
sel.forEach(n => { n.fill = sw.dataset.fill; n.stroke = sw.dataset.stroke; });
pushRecentColor(sw.dataset.fill, sw.dataset.stroke);
render(); pushHistory();
});
});
}
/* ==================================================================
EDGE INSPECTOR — full customization
================================================================== */
function renderEdgeInspector(ed) {
if (!inspector) return;
const routing = ed.routing || 'orthogonal';
const lineStyle = ed.lineStyle || (ed.dashed ? 'dashed' : 'solid');
const arrStyle = ed.arrowStyle || 'solid';
const labelFS = ed.labelFontSize || 11.5;
const cornerR = ed.cornerRadius != null ? ed.cornerRadius : 12;
inspector.innerHTML =
'<div class="insp-title">Thuộc tính đường nối</div>' +
'<label class="fld"><span>Nhãn</span>' +
'<input type="text" id="e-label" value="' + esc(ed.label || '') + '" placeholder="VD: Có / Không"></label>' +
'<div class="insp-title">Định tuyến</div>' +
'<div class="align-grid cols4" id="e-routing">' +
'<div class="align-btn sm' + (routing === 'curve' ? ' active' : '') + '" data-v="curve" title="Cong">〜 Cong</div>' +
'<div class="align-btn sm' + (routing === 'straight' ? ' active' : '') + '" data-v="straight" title="Thẳng">╱ Thẳng</div>' +
'<div class="align-btn sm' + (routing === 'orthogonal' ? ' active' : '') + '" data-v="orthogonal" title="Gấp nhọn">⌐ Gấp</div>' +
'<div class="align-btn sm' + (routing === 'orthogonal_rounded' ? ' active' : '') + '" data-v="orthogonal_rounded" title="Gấp bo góc">◜ Bo</div>' +
'</div>' +
'<label class="fld" id="e-corner-wrap" style="' + (routing === 'orthogonal_rounded' ? '' : 'display:none') + '">' +
'<span>Bán kính góc · ' + cornerR + 'px</span>' +
'<input type="range" id="e-corner" min="0" max="40" step="1" value="' + cornerR + '">' +
'</label>' +
'<div class="insp-title">Kiểu nét</div>' +
'<div class="align-grid cols4" id="e-linestyle">' +
'<div class="align-btn' + (lineStyle === 'solid' ? ' active' : '') + '" data-v="solid" title="Liền">━</div>' +
'<div class="align-btn' + (lineStyle === 'dashed' ? ' active' : '') + '" data-v="dashed" title="Đứt">┅</div>' +
'<div class="align-btn' + (lineStyle === 'dotted' ? ' active' : '') + '" data-v="dotted" title="Chấm">┈</div>' +
'<div class="align-btn' + (lineStyle === 'dashdot' ? ' active' : '') + '" data-v="dashdot" title="Gạch-chấm">┉</div>' +
'</div>' +
'<div class="row2">' +
'<label class="fld"><span>Màu đường</span><input type="color" id="e-color" value="' + (ed.color || '#7c869e') + '"></label>' +
'<label class="fld"><span>Độ dày</span><input type="number" id="e-width" value="' + (ed.width || 2) + '" min="1" max="10" step="0.5"></label>' +
'</div>' +
'<div class="insp-title">Mũi tên · Vị trí</div>' +
'<div class="align-grid cols4" id="e-arrowpos">' +
'<div class="align-btn' + (ed.arrowEnd !== false && !ed.arrowStart ? ' active' : '') + '" data-v="end" title="Ở cuối">→</div>' +
'<div class="align-btn' + (!ed.arrowEnd && ed.arrowStart ? ' active' : '') + '" data-v="start" title="Ở đầu">←</div>' +
'<div class="align-btn' + (ed.arrowEnd !== false && ed.arrowStart ? ' active' : '') + '" data-v="both" title="Cả hai">↔</div>' +
'<div class="align-btn' + (!ed.arrowEnd && !ed.arrowStart ? ' active' : '') + '" data-v="none" title="Không">—</div>' +
'</div>' +
'<div class="insp-title">Mũi tên · Kiểu</div>' +
'<div class="align-grid cols4" id="e-arrstyle">' +
'<div class="align-btn' + (arrStyle === 'solid' ? ' active' : '') + '" data-v="solid" title="Đặc">➤</div>' +
'<div class="align-btn' + (arrStyle === 'open' ? ' active' : '') + '" data-v="open" title="Rỗng">⌐</div>' +
'<div class="align-btn' + (arrStyle === 'diamond' ? ' active' : '') + '" data-v="diamond" title="Thoi">◆</div>' +
'<div class="align-btn' + (arrStyle === 'circle' ? ' active' : '') + '" data-v="circle" title="Tròn">●</div>' +
'</div>' +
'<div class="insp-title">Nhãn · Định dạng</div>' +
'<div class="row2">' +
'<button id="e-lb" style="width:100%;justify-content:center;font-weight:700;' + (ed.labelBold ? 'background:var(--accent-soft);border-color:var(--accent);color:var(--accent)' : '') + '">B</button>' +
'<button id="e-li" style="width:100%;justify-content:center;font-style:italic;' + (ed.labelItalic ? 'background:var(--accent-soft);border-color:var(--accent);color:var(--accent)' : '') + '">I</button>' +
'</div>' +
'<label class="fld" style="margin-top:11px"><span>Nền nhãn</span>' +
'<select id="e-lbg">' +
'<option value="1" ' + (ed.labelBg !== false ? 'selected' : '') + '>Có nền</option>' +
'<option value="0" ' + (ed.labelBg === false ? 'selected' : '') + '>Không nền</option>' +
'</select></label>' +
'<label class="fld"><span>Cỡ chữ nhãn · ' + labelFS + 'px</span>' +
'<input type="number" id="e-lfs" value="' + labelFS + '" min="5" max="72" step="0.5">' +
'</label>' +
'<div class="align-grid cols5" id="e-lfspresets">' +
Object.keys(LABEL_FONT_PRESETS).map(k =>
'<div class="align-btn sm' + (Math.abs(labelFS - LABEL_FONT_PRESETS[k]) < 0.5 ? ' active' : '') + '" data-v="' + LABEL_FONT_PRESETS[k] + '" title="' + LABEL_FONT_PRESETS[k] + 'px">' + k + '</div>'
).join('') +
'</div>' +
'<label class="fld"><span>Màu chữ nhãn</span><input type="color" id="e-lcolor" value="' + (ed.labelColor && ed.labelColor !== '#ffffff' ? ed.labelColor : '#475569') + '"></label>' +
'<div class="insp-title">Nối vào</div>' +
'<div class="row2">' +
'<label class="fld"><span>Đầu nối</span><select id="e-from">' +
['auto','top','right','bottom','left'].map(s => '<option value="' + s + '" ' + ((ed.fromSide || 'auto') === s ? 'selected' : '') + '>' + ({auto:'Tự động',top:'Trên',right:'Phải',bottom:'Dưới',left:'Trái'}[s]) + '</option>').join('') +
'</select></label>' +
'<label class="fld"><span>Cuối nối</span><select id="e-to">' +
['auto','top','right','bottom','left'].map(s => '<option value="' + s + '" ' + ((ed.toSide || 'auto') === s ? 'selected' : '') + '>' + ({auto:'Tự động',top:'Trên',right:'Phải',bottom:'Dưới',left:'Trái'}[s]) + '</option>').join('') +
'</select></label>' +
'</div>' +
'<div class="insp-title">Đầu nối chung cổng</div>' +
'<div class="align-grid cols3" id="e-portmode">' +
'<div class="align-btn sm' + ((ed.portSplitMode || 'auto') === 'auto' ? ' active' : '') + '" data-v="auto" title="Theo cài đặt chung">Tự động</div>' +
'<div class="align-btn sm' + (ed.portSplitMode === 'split' ? ' active' : '') + '" data-v="split" title="Luôn chia nhiều đầu/đuôi riêng">Tách riêng</div>' +
'<div class="align-btn sm' + (ed.portSplitMode === 'merge' ? ' active' : '') + '" data-v="merge" title="Luôn gộp về 1 đầu/đuôi">Gộp chung</div>' +
'</div>' +
'<div class="insp-title">Tuyến đi · Độ lệch đoạn giữa</div>' +
'<label class="fld"><span>Lệch · ' + Math.round(ed.bendOffset || 0) + 'px</span>' +
'<input type="range" id="e-bend" min="-300" max="300" step="1" value="' + (ed.bendOffset || 0) + '"></label>' +
'<button id="e-bend-reset" style="width:100%;justify-content:center">⟲ Reset độ lệch</button>' +
'<div class="insp-title">Hành động</div>' +
'<button class="danger" id="e-del">Xoá đường nối (Del)</button>';
const g = id => $(id);
if (g('e-label')) {
g('e-label').addEventListener('input', ev => { ed.label = ev.target.value; render(true); });
g('e-label').addEventListener('change', pushHistory);
}
/* Routing buttons */
Array.prototype.forEach.call(document.querySelectorAll('#e-routing .align-btn'), b => {
b.onclick = () => {
ed.routing = b.dataset.v;
render(); pushHistory();
};
});
/* Corner radius slider */
if (g('e-corner')) {
g('e-corner').addEventListener('input', ev => {
ed.cornerRadius = parseFloat(ev.target.value) || 0;
render(true);
const span = g('e-corner-wrap') ? g('e-corner-wrap').querySelector('span') : null;
if (span) span.textContent = 'Bán kính góc · ' + ed.cornerRadius + 'px';
});
g('e-corner').addEventListener('change', pushHistory);
}
/* Line style */
Array.prototype.forEach.call(document.querySelectorAll('#e-linestyle .align-btn'), b => {
b.onclick = () => {
ed.lineStyle = b.dataset.v;
ed.dashed = (b.dataset.v === 'dashed');
render(); pushHistory();
};
});
/* Arrow position */
Array.prototype.forEach.call(document.querySelectorAll('#e-arrowpos .align-btn'), b => {
b.onclick = () => {
const v = b.dataset.v;
ed.arrowEnd = (v === 'end' || v === 'both');
ed.arrowStart = (v === 'start' || v === 'both');
render(); pushHistory();
};
});
/* Arrow style */
Array.prototype.forEach.call(document.querySelectorAll('#e-arrstyle .align-btn'), b => {
b.onclick = () => {
ed.arrowStyle = b.dataset.v;
render(); pushHistory();
};
});
/* Label bold/italic/bg */
if (g('e-lb')) g('e-lb').onclick = () => { ed.labelBold = !ed.labelBold; render(); pushHistory(); };
if (g('e-li')) g('e-li').onclick = () => { ed.labelItalic = !ed.labelItalic; render(); pushHistory(); };
if (g('e-lbg')) g('e-lbg').onchange = ev => { ed.labelBg = ev.target.value === '1'; render(); pushHistory(); };
/* Label font size */
if (g('e-lfs')) {
g('e-lfs').addEventListener('input', ev => {
ed.labelFontSize = clamp(parseFloat(ev.target.value) || 11.5, 5, 72);
render(true);
});
g('e-lfs').addEventListener('change', pushHistory);
}
Array.prototype.forEach.call(document.querySelectorAll('#e-lfspresets .align-btn'), b => {
b.onclick = () => {
ed.labelFontSize = parseFloat(b.dataset.v);
render(); pushHistory();
};
});
/* Label color */
if (g('e-lcolor')) {
g('e-lcolor').addEventListener('input', ev => { ed.labelColor = ev.target.value; render(true); });
g('e-lcolor').addEventListener('change', pushHistory);
}
/* Edge color / width */
if (g('e-color')) {
g('e-color').addEventListener('input', ev => { ed.color = ev.target.value; render(true); });
g('e-color').addEventListener('change', pushHistory);
}
if (g('e-width')) {
g('e-width').addEventListener('input', ev => { ed.width = clamp(parseFloat(ev.target.value) || 2, 1, 10); render(true); });
g('e-width').addEventListener('change', pushHistory);
}
/* Sides */
if (g('e-from')) g('e-from').addEventListener('change', ev => { ed.fromSide = ev.target.value; render(); pushHistory(); });
if (g('e-to')) g('e-to').addEventListener('change', ev => { ed.toSide = ev.target.value; render(); pushHistory(); });
/* Chế độ đầu nối chung cổng */
Array.prototype.forEach.call(document.querySelectorAll('#e-portmode .align-btn'), b => {
b.onclick = () => {
ed.portSplitMode = b.dataset.v;
render(); pushHistory();
};
});
/* Độ lệch đoạn giữa (bend offset) */
if (g('e-bend')) {
g('e-bend').addEventListener('input', ev => {
ed.bendOffset = parseFloat(ev.target.value) || 0;
render(true);
const span = g('e-bend').previousElementSibling;
if (span) span.textContent = 'Lệch · ' + Math.round(ed.bendOffset) + 'px';
});
g('e-bend').addEventListener('change', pushHistory);
}
if (g('e-bend-reset')) g('e-bend-reset').onclick = () => { ed.bendOffset = 0; render(); pushHistory(); };
if (g('e-del')) g('e-del').onclick = deleteSelection;
}
function paletteIcon(type) {
const iw = 34, ih = 22;
const sh = SHAPES[type];
const paths = shapePaths(type, 2, 2, iw - 4, ih - 4);
const fill0 = sh.fill === 'transparent' ? 'none' : sh.fill;
return '<svg viewBox="0 0 ' + iw + ' ' + ih + '" width="' + iw + '" height="' + ih + '">' +
paths.map((d, i) => '<path d="' + d + '" fill="' + (i === 0 ? fill0 : 'none') + '" stroke="' + sh.stroke +
'" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>').join('') +
'</svg>';
}
function buildPalette() {
if (!paletteEl) return;
paletteEl.innerHTML = '';
Object.keys(GROUPS).forEach(gr => {
const keys = GROUPS[gr];
const group = document.createElement('div');
group.className = 'pal-group';
group.innerHTML =
'<div class="pal-group-header"><span>' + gr + '</span><span class="chev">▾</span></div>' +
'<div class="pal-group-items"></div>';
const items = group.querySelector('.pal-group-items');
keys.forEach(k => {
if (!SHAPES[k]) return;
const v = SHAPES[k];
const el = document.createElement('div');
el.className = 'pal-item';
el.title = v.label;
el.innerHTML = paletteIcon(k);
el.addEventListener('click', () => {
const c = centerWorld();
const n = addNode(k, c.x, c.y);
lastCreatedShape = k;
safeStorage.set('fwrt-last-shape', k);
clearSelection();
selected.nodes.add(n.id);
render(); pushHistory();
});
items.appendChild(el);
});
group.querySelector('.pal-group-header').addEventListener('click', () => group.classList.toggle('collapsed'));
paletteEl.appendChild(group);
});
const hintBox = document.createElement('div');
hintBox.innerHTML = '<div style="font-size:10.5px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--muted);margin:14px 0 8px;">Thao tác</div>' +
'<ul class="hints">' +
'<li>Hover icon để xem tên</li>' +
'<li><b>Click lần 1</b> → chọn hình</li>' +
'<li><b>Click lần 2</b> → focus ô Nội dung</li>' +
'<li><b>Chuột phải đường nối</b> → tuỳ biến</li>' +
'<li>Click <b>vùng trống</b> → bỏ chọn</li>' +
'<li><b>Ctrl+B</b> ẩn/hiện bảng hình</li>' +
'<li>Tạo mới sẽ <b>copy style</b> hình đang chọn</li></ul>';
paletteEl.appendChild(hintBox);
}
function downloadBlob(blob, filename) {
try {
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = filename;
document.body.appendChild(a);
a.click();
setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
} catch (err) { toast('Không thể tải file: ' + err.message, 'danger'); }
}
function contentBounds() {
if (!nodes.length) return { x: 0, y: 0, w: 900, h: 640 };
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
nodes.forEach(n => {
minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
});
return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
function buildExportSVG() {
const pad = 44;
const b = contentBounds();
const W = b.w + pad * 2, H = b.h + pad * 2;
const cloneEdges = edgesLayer.cloneNode(true);
const cloneNodes = nodesLayer.cloneNode(true);
[cloneEdges, cloneNodes].forEach(layer => {
layer.querySelectorAll('.port,.handle,.sel-outline,.target-highlight,.lock-badge').forEach(el => el.remove());
layer.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
});
const out = svgEl('svg', { xmlns: NS, width: W, height: H, viewBox: (b.x - pad) + ' ' + (b.y - pad) + ' ' + W + ' ' + H });
out.appendChild(svgEl('rect', { x: b.x - pad, y: b.y - pad, width: W, height: H, fill: '#ffffff' }));
out.appendChild(defs.cloneNode(true));
const g = svgEl('g');
g.appendChild(cloneEdges);
g.appendChild(cloneNodes);
out.appendChild(g);
return { svg: out, W, H };
}
function exportSVGFile() {
if (!nodes.length) { toast('Chưa có nội dung', 'warning'); return; }
const r = buildExportSVG();
const str = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(r.svg);
downloadBlob(new Blob([str], { type: 'image/svg+xml;charset=utf-8' }), 'fwrt-flowchart.svg');
toast('Đã xuất SVG', 'success');
}
function exportPNG(transparent) {
if (!nodes.length) { toast('Chưa có nội dung', 'warning'); return; }
const r = buildExportSVG();
if (transparent) {
const rect = r.svg.querySelector('rect');
if (rect) rect.remove();
}
const str = new XMLSerializer().serializeToString(r.svg);
const url = URL.createObjectURL(new Blob([str], { type: 'image/svg+xml;charset=utf-8' }));
const img = new Image();
img.onload = () => {
const scale = 2;
const c = document.createElement('canvas');
c.width = Math.round(r.W * scale);
c.height = Math.round(r.H * scale);
const ctx = c.getContext('2d');
if (!transparent) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); }
ctx.drawImage(img, 0, 0, c.width, c.height);
URL.revokeObjectURL(url);
c.toBlob(blob => { downloadBlob(blob, 'fwrt-flowchart.png'); toast('Đã xuất PNG', 'success'); }, 'image/png');
};
img.onerror = () => { URL.revokeObjectURL(url); toast('Không thể xuất PNG', 'danger'); };
img.src = url;
}
function printFlowchart() {
if (!nodes.length) { toast('Chưa có nội dung', 'warning'); return; }
const r = buildExportSVG();
const str = new XMLSerializer().serializeToString(r.svg);
const w = window.open('', '_blank');
if (!w) { toast('Không thể mở cửa sổ in', 'danger'); return; }
// A4 landscape: 297x210mm, margin 10mm → vùng in 277x190mm
// Chia diagram thành lưới các trang, mỗi trang 1 phần SVG
const pad = 44;
const b = contentBounds();
const vw = b.w + pad * 2;
const vh = b.h + pad * 2;
const pageW = 1100;  // px tương đương 277mm ở DPI ~96 (277/25.4*96 ≈ 1047)
const pageH = 720;   // 190mm ≈ 718px
const cols = Math.max(1, Math.ceil(vw / pageW));
const rows = Math.max(1, Math.ceil(vh / pageH));
let pagesHtml = '';
for (let row = 0; row < rows; row++) {
for (let col = 0; col < cols; col++) {
const pageX = b.x - pad + col * pageW;
const pageY = b.y - pad + row * pageH;
// Clone SVG và đổi viewBox cho mỗi trang
const cloneSvg = r.svg.cloneNode(true);
cloneSvg.setAttribute('viewBox', pageX + ' ' + pageY + ' ' + pageW + ' ' + pageH);
cloneSvg.setAttribute('width', pageW);
cloneSvg.setAttribute('height', pageH);
// Đảm bảo nền trắng
const firstRect = cloneSvg.querySelector('rect');
if (firstRect && firstRect.getAttribute('fill') === '#ffffff') {
firstRect.setAttribute('x', pageX);
firstRect.setAttribute('y', pageY);
firstRect.setAttribute('width', pageW);
firstRect.setAttribute('height', pageH);
}
const strPage = new XMLSerializer().serializeToString(cloneSvg);
const pageLabel = (rows * cols > 1) ? ' · Trang ' + (row * cols + col + 1) + '/' + (rows * cols) : '';
pagesHtml += '<div class="print-page">' + strPage + '<div class="print-label">' + esc(document.title) + pageLabel + '</div></div>';
}
}
w.document.write('<!DOCTYPE html><html><head><title>Fwrt Flowchart</title>');
w.document.write('<style>' +
'@page{size:A4 landscape;margin:10mm}' +
'html,body{margin:0;padding:0;font-family:sans-serif}' +
'.print-page{page-break-after:always;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:190mm;position:relative}' +
'.print-page:last-child{page-break-after:auto}' +
'.print-page svg{max-width:100%;max-height:185mm;height:auto}' +
'.print-label{position:absolute;bottom:2mm;right:4mm;font-size:9px;color:#94a3b8;font-family:monospace}' +
'@media screen{body{background:#f1f5f9}.print-page{background:#fff;margin:12px auto;padding:8mm;box-shadow:0 4px 16px rgba(0,0,0,.1);width:277mm;height:190mm}}' +
'@media print{.print-label{display:none}}' +
'</style>');
w.document.write('</head><body>' + pagesHtml + '</body></html>');
w.document.close();
w.onload = () => { setTimeout(() => { w.focus(); w.print(); }, 500); };
const totalPages = rows * cols;
toast('Đang in ' + totalPages + ' trang A4' + (totalPages > 1 ? ' (diagram lớn)' : ''), 'info');
}
function saveJSON() {
saveCurrentPage();
const data = {
app: 'Fwrt', version: 8,
savedAt: new Date().toISOString(),
pages: pages.map(p => ({ id: p.id, name: p.name, nodes: p.nodes, edges: p.edges, groups: p.groups || [], layers: p.layers || [], view: p.view })),
activePageId
};
downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'fwrt-flowchart.json');
toast('Đã lưu JSON', 'success');
}
function migrateNode(n) {
const keyMap = {
terminator: 'oval', process: 'rect', decision: 'diamond', io: 'parallelogram',
preparation: 'hexagon', manual: 'trapezoid', connector: 'circle', database: 'cylinder'
};
if (keyMap[n.type]) n.type = keyMap[n.type];
n.fill = n.fill || '#dbeafe';
n.stroke = n.stroke || '#2563eb';
n.textColor = n.textColor || '#1e2433';
n.fontSize = n.fontSize || 14;
n.strokeWidth = n.strokeWidth == null ? 2 : n.strokeWidth;
if (n.bold === undefined) n.bold = false;
if (n.italic === undefined) n.italic = false;
if (n.autoFit === undefined) n.autoFit = true;
if (!n.hAlign) n.hAlign = 'center';
if (!n.vAlign) n.vAlign = 'middle';
if (n.locked === undefined) n.locked = false;
if (n.sticky === undefined) n.sticky = false;
if (n.icon === undefined) n.icon = null;
if (!n.layerId) n.layerId = 'default';
if (!Array.isArray(n.tags)) n.tags = [];
if (n.groupId === undefined) n.groupId = null;
}
function migrateEdge(e) {
e.color = e.color || '#7c869e';
e.width = e.width || 2;
e.fromSide = e.fromSide || 'auto';
e.toSide = e.toSide || 'auto';
if (e.arrowEnd === undefined) e.arrowEnd = true;
if (e.arrowStart === undefined) e.arrowStart = false;
if (!e.arrowStyle) e.arrowStyle = 'solid';
if (!e.routing) e.routing = 'orthogonal';
if (!e.lineStyle) e.lineStyle = e.dashed ? 'dashed' : 'solid';
if (e.labelFontSize === undefined) e.labelFontSize = 11.5;
if (!e.labelColor) e.labelColor = '#475569';
if (e.labelBold === undefined) e.labelBold = false;
if (e.labelItalic === undefined) e.labelItalic = false;
if (e.labelBg === undefined) e.labelBg = true;
if (e.cornerRadius === undefined) e.cornerRadius = 12;
if (e.bendOffset === undefined) e.bendOffset = 0;
if (!e.portSplitMode) e.portSplitMode = 'auto';
}
function openJSON(text) {
try {
const d = JSON.parse(text);
let loadedPages = [];
if (d.pages && Array.isArray(d.pages) && d.pages.length) {
loadedPages = d.pages.map(p => ({
id: p.id || ('p' + Date.now() + Math.random().toString(36).slice(2, 6)),
name: p.name || 'Trang',
nodes: (p.nodes || []), edges: (p.edges || []),
groups: (p.groups || []),
layers: (p.layers || [{ id: 'default', name: 'Mặc định', visible: true, locked: false }]),
view: p.view || { x: 0, y: 0, k: 1 }
}));    } else if (d.nodes && Array.isArray(d.nodes)) {
loadedPages = [{
id: 'p' + Date.now(), name: 'Trang 1',
nodes: d.nodes, edges: d.edges || [],
view: d.view || { x: 0, y: 0, k: 1 }
}];
} else { throw new Error('Định dạng không hợp lệ'); }
loadedPages.forEach(p => {
p.nodes.forEach(migrateNode);
p.edges.forEach(migrateEdge);
});
pages = loadedPages;
activePageId = (d.activePageId && pages.find(p => p.id === d.activePageId)) ? d.activePageId : pages[0].id;
const active = pages.find(p => p.id === activePageId);
nodes = active.nodes; edges = active.edges;
view.x = active.view.x; view.y = active.view.y; view.k = active.view.k;
clearSelection();
history = []; hIndex = -1;
renderTabs();
render();
pushHistory();
updateUndoButtons();
setTimeout(fitView, 60);
toast('Đã mở ' + pages.length + ' trang', 'success');
} catch (err) { showAlert('Lỗi khi mở file: ' + err.message, { title: 'Lỗi' }); }
}
let autoSaveTimer = null;
function autoSave() {
clearTimeout(autoSaveTimer);
autoSaveTimer = setTimeout(() => {
try {
saveCurrentPage();
const data = {
pages: pages.map(p => ({ id: p.id, name: p.name, nodes: p.nodes, edges: p.edges, view: p.view })),
activePageId
};
safeStorage.set('fwrt-flowchart-v8', JSON.stringify(data));
} catch (_) {}
}, 500);
}
function loadAutoSave() {
try {
const raw = safeStorage.get('fwrt-flowchart-v8', null) ||
safeStorage.get('fwrt-flowchart-v7', null) ||
safeStorage.get('fwrt-flowchart-v6', null) ||
safeStorage.get('fwrt-flowchart-v5', null) ||
safeStorage.get('fwrt-flowchart-v4', null) ||
safeStorage.get('fwrt-flowchart', null);
if (!raw) return false;
const d = JSON.parse(raw);
let loadedPages = [];
if (d.pages && Array.isArray(d.pages) && d.pages.length) {
loadedPages = d.pages.map(p => ({
id: p.id || ('p' + Date.now() + Math.random().toString(36).slice(2, 6)),
name: p.name || 'Trang',
nodes: (p.nodes || []), edges: (p.edges || []),
groups: (p.groups || []),
layers: (p.layers || [{ id: 'default', name: 'Mặc định', visible: true, locked: false }]),
view: p.view || { x: 0, y: 0, k: 1 }
}));    } else if (d.nodes && Array.isArray(d.nodes)) {
loadedPages = [{
id: 'p' + Date.now(), name: 'Trang 1',
nodes: d.nodes, edges: d.edges || [],
view: d.view || { x: 0, y: 0, k: 1 }
}];
} else return false;
if (!loadedPages.length) return false;
loadedPages.forEach(p => {
p.nodes.forEach(migrateNode);
p.edges.forEach(migrateEdge);
});
pages = loadedPages;
activePageId = (d.activePageId && pages.find(p => p.id === d.activePageId)) ? d.activePageId : pages[0].id;
const active = pages.find(p => p.id === activePageId);
if (!active) return false;
nodes = active.nodes; edges = active.edges;
view.x = active.view.x; view.y = active.view.y; view.k = active.view.k;
return true;
} catch (_) { return false; }
}
function fitView() {
if (!nodes.length) {
view.x = canvasWrap.clientWidth / 2;
view.y = canvasWrap.clientHeight / 2;
view.k = 1;
render();
return;
}
const pad = 70;
const b = contentBounds();
const cw = canvasWrap.clientWidth, chh = canvasWrap.clientHeight;
const k = clamp(Math.min((cw - pad * 2) / Math.max(1, b.w), (chh - pad * 2) / Math.max(1, b.h)), 0.12, 2.2);
view.k = k;
view.x = cw / 2 - (b.x + b.w / 2) * k;
view.y = chh / 2 - (b.y + b.h / 2) * k;
render();
}
function zoomToSelection() {
const sel = [...selected.nodes].map(getNode).filter(Boolean);
if (!sel.length) return fitView();
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
sel.forEach(n => {
minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
maxX = Math.max(maxX, n.x + n.w); maxY = Math.max(maxY, n.y + n.h);
});
const b = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
const pad = 90;
const cw = canvasWrap.clientWidth, chh = canvasWrap.clientHeight;
const k = clamp(Math.min((cw - pad * 2) / Math.max(1, b.w), (chh - pad * 2) / Math.max(1, b.h)), 0.12, 4);
view.k = k;
view.x = cw / 2 - (b.x + b.w / 2) * k;
view.y = chh / 2 - (b.y + b.h / 2) * k;
render();
toast('Zoom tới vùng chọn', 'success');
}
function zoomBy(factor) {
const cw = canvasWrap.clientWidth / 2, chh = canvasWrap.clientHeight / 2;
const oldK = view.k;
const k = clamp(oldK * factor, 0.12, 4);
view.x = cw - (cw - view.x) * (k / oldK);
view.y = chh - (chh - view.y) * (k / oldK);
view.k = k;
render(true);
}
function applyTheme() {
document.body.classList.toggle('dark', darkMode);
const btn = $('btnTheme');
if (btn) {
btn.textContent = darkMode ? '☀️' : '🌙';
btn.title = darkMode ? 'Chế độ sáng' : 'Chế độ tối';
}
updateGrid();
render(true);
}
click('btnUndo', undo);
click('btnRedo', redo);
click('btnZoomIn', () => zoomBy(1.2));
click('btnZoomOut', () => zoomBy(1 / 1.2));
click('btnFit', fitView);
click('btnSave', saveJSON);
click('btnPng', () => exportPNG(false));
click('btnOpen', () => fileInput && fileInput.click());
click('btnSearch', openSearch);
click('btnMetrics', showMetricsModal);
click('btnWatermark', promptWatermark);
click('btnReplaceNext', () => {
  const f = $('searchInput') ? $('searchInput').value.trim() : '';
  const r = $('replaceInput') ? $('replaceInput').value : '';
  if (!f) { toast('Nhập từ khóa cần tìm để thay thế', 'warning'); return; }
  batchReplaceText(f, r, false);
});
click('btnReplaceAll', () => {
  const f = $('searchInput') ? $('searchInput').value.trim() : '';
  const r = $('replaceInput') ? $('replaceInput').value : '';
  if (!f) { toast('Nhập từ khóa cần tìm để thay thế', 'warning'); return; }
  batchReplaceText(f, r, false);
});
click('btnCmd', openCmd);
click('btnAddPage', addPage);
click('btnFullscreen', toggleFullscreen);
click('btnTheme', () => {
darkMode = !darkMode;
safeStorage.set('fwrt-dark', darkMode ? '1' : '0');
applyTheme();
});
click('btnHelp', openHelp);
click('btnNew', async () => {
if (nodes.length) {
const ok = await showConfirm('Tạo lưu đồ mới? Nội dung trang hiện tại sẽ bị xoá.', { title: 'Tạo mới', okText: 'Tạo mới' });
if (!ok) return;
}
nodes = []; edges = [];
clearSelection();
view.x = canvasWrap.clientWidth / 2;
view.y = canvasWrap.clientHeight / 2;
view.k = 1;
history = []; hIndex = -1;
render(); pushHistory();
updateUndoButtons();
toast('Đã tạo mới', 'success');
});
click('helpClose', closeHelp);
if (helpModal) helpModal.addEventListener('click', e => { if (e.target === helpModal) closeHelp(); });
click('btnExport', () => {
const btn = $('btnExport');
if (!btn) return;
const r = btn.getBoundingClientRect();
buildCtx([
{ type: 'header', label: 'Xuất file' },
{ icon: '🖼', label: 'PNG (nền trắng)', action: () => exportPNG(false) },
{ icon: '🖼', label: 'PNG (nền trong suốt)', action: () => exportPNG(true) },
{ icon: '📐', label: 'SVG (vector)', action: exportSVGFile },
{ icon: '🧜', label: 'Mermaid (.mmd)', action: exportMermaid },
{ icon: '💾', label: 'JSON (dự án)', action: saveJSON },
{ type: 'sep' },
{ icon: '🖨', label: 'In / Xuất PDF', kbd: 'Ctrl+P', action: printFlowchart }
], { clientX: r.left, clientY: r.bottom + 4 });
});
click('btnAutoLayout', () => {
const btn = $('btnAutoLayout');
if (!btn) return;
const r = btn.getBoundingClientRect();
buildCtx([
{ type: 'header', label: 'Sắp xếp tự động' },
{ icon: '⇣', label: 'Theo cấu trúc (BFS)', action: autoLayoutHierarchical },
{ icon: '▦', label: 'Dạng lưới', action: autoLayoutGrid }
], { clientX: r.left, clientY: r.bottom + 4 });
});
click('btnTemplates', () => {
const btn = $('btnTemplates');
if (!btn) return;
const r = btn.getBoundingClientRect();
buildCtx([
{ type: 'header', label: 'Mẫu có sẵn' },
{ type: 'templates' }
], { clientX: r.left, clientY: r.bottom + 4 });
});
if (fileInput) {
fileInput.addEventListener('change', e => {
const f = e.target.files[0];
if (!f) return;
const reader = new FileReader();
reader.onload = () => openJSON(reader.result);
reader.readAsText(f);
fileInput.value = '';
});
}
if (chkGrid) chkGrid.addEventListener('change', updateGrid);
if (chkSnap) chkSnap.addEventListener('change', () => { snapToGrid = chkSnap.checked; });
if (chkGuides) chkGuides.addEventListener('change', () => { currentGuides = []; render(true); });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
e.preventDefault();
const f = e.dataTransfer.files[0];
if (!f) return;
const reader = new FileReader();
reader.onload = () => openJSON(reader.result);
reader.readAsText(f);
});
function detectMobile() {
return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}
function init() {
click('mmFit', fitView);
click('mmCenter', () => {
if (!nodes.length) return;
const b = contentBounds();
view.x = canvasWrap.clientWidth / 2 - (b.x + b.w / 2) * view.k;
view.y = canvasWrap.clientHeight / 2 - (b.y + b.h / 2) * view.k;
render();
});
if (detectMobile()) {
document.body.classList.add('is-mobile');
}
buildPalette();
let loaded = false;
try { loaded = loadAutoSave(); } catch (_) { loaded = false; }
if (!loaded) {
pages = [newPage('Trang 1')];
activePageId = pages[0].id;
nodes = pages[0].nodes;
edges = pages[0].edges;
view.x = canvasWrap.clientWidth / 2;
view.y = canvasWrap.clientHeight / 2;
view.k = 1;
}
applyTheme();
applyPaletteVisibility();
renderTabs();
render();
pushHistory();
updateUndoButtons();
let _resizeDebounceTimer = null;
window.addEventListener('resize', () => {
updateTabScrollButtons();
clearTimeout(_resizeDebounceTimer);
_resizeDebounceTimer = setTimeout(() => {
drawMinimap();
updateGrid();
}, 150);
});
window.addEventListener('beforeunload', () => {
if (nodes.length || pages.some(p => p.nodes.length)) autoSave();
// Backup cuối khi đóng tab
const last = listBackups()[0];
if (nodes.length && (!last || Date.now() - last.ts > 60000)) {
saveBackup('Trước khi đóng');
}
});
document.addEventListener('visibilitychange', () => { if (document.hidden) autoSave(); });
// Auto-backup mỗi 5 phút nếu có thay đổi
setInterval(() => {
const last = listBackups()[0];
const now = Date.now();
if (nodes.length && (!last || now - last.ts > 5 * 60 * 1000)) {
saveBackup('Tự động ' + new Date().toLocaleTimeString('vi-VN'));
}
}, 5 * 60 * 1000);
}
try { init(); }
catch (err) {
console.error(err);
showError('Khởi tạo: ' + (err.message || 'unknown'));
}
