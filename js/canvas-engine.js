/* ==================================================================
BUILD EDGE PATH — 4 routing modes, supports corner radius
================================================================== */
function buildOrthogonalPolyline(p1, s1, p2, s2, offset) {
offset = offset || 0;
const gap = Math.max(22, Math.min(34, 8 + offset * 0.25));
const e1 = shiftPt(p1, s1, gap);
const e2 = shiftPt(p2, s2, gap);
const h1 = s1 === 'left' || s1 === 'right';
const h2 = s2 === 'left' || s2 === 'right';
const pts = [p1, e1];
if (h1 && h2) {
// Cả 2 theo phương ngang → dịch đoạn dọc ở giữa
const baseX = (e1.x + e2.x) / 2;
// Nếu 2 đầu đối diện nhau, offset theo trục dọc để tách song song
const mx = baseX + offset;
pts.push({ x: mx, y: e1.y }, { x: mx, y: e2.y });
} else if (!h1 && !h2) {
// Cả 2 theo phương dọc → dịch đoạn ngang ở giữa
const baseY = (e1.y + e2.y) / 2;
const my = baseY + offset;
pts.push({ x: e1.x, y: my }, { x: e2.x, y: my });
} else if (h1) {
// Ra ngang, vào dọc
pts.push({ x: e2.x + offset, y: e1.y });
} else {
// Ra dọc, vào ngang
pts.push({ x: e1.x, y: e2.y + offset });
}
pts.push(e2, p2);
// Loại bỏ điểm trùng
const filt = [pts[0]];
for (let i = 1; i < pts.length; i++) {
const l = filt[filt.length - 1];
if (Math.abs(pts[i].x - l.x) > 0.5 || Math.abs(pts[i].y - l.y) > 0.5) filt.push(pts[i]);
}
return filt;
}
function buildEdgePath(p1, s1, p2, s2, routing, cornerRadius, offset) {
cornerRadius = cornerRadius || 0;
offset = offset || 0;
if (routing === 'straight') {
// Thẳng: vẫn offset nhẹ nếu song song
const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
// Dịch vuông góc với hướng
const dx = p2.x - p1.x, dy = p2.y - p1.y;
const L = Math.hypot(dx, dy) || 1;
const nx = -dy / L * offset, ny = dx / L * offset;
return { d: 'M ' + p1.x + ' ' + p1.y + ' L ' + (p2.x + nx) + ' ' + (p2.y + ny), mid: { x: mx + nx / 2, y: my + ny / 2 } };
}
if (routing === 'orthogonal' || routing === 'orthogonal_rounded') {
const filt = buildOrthogonalPolyline(p1, s1, p2, s2, offset);
const mid = polylineMidpoint(filt);
if (routing === 'orthogonal' || cornerRadius <= 0 || filt.length < 3) {
let dstr = 'M ' + filt[0].x + ' ' + filt[0].y;
for (let i = 1; i < filt.length; i++) dstr += ' L ' + filt[i].x + ' ' + filt[i].y;
return { d: dstr, mid, filt };
}
// Bo góc: dùng quadratic ở mỗi góc, bán kính giới hạn theo độ dài 2 đoạn kề
let d = 'M ' + filt[0].x + ' ' + filt[0].y;
for (let i = 1; i < filt.length - 1; i++) {
const prev = filt[i - 1], cur = filt[i], next = filt[i + 1];
const dPrev = Math.hypot(cur.x - prev.x, cur.y - prev.y);
const dNext = Math.hypot(next.x - cur.x, next.y - cur.y);
const r = Math.min(cornerRadius, dPrev / 2, dNext / 2);
const t1 = dPrev > 0 ? r / dPrev : 0;
const before = { x: cur.x - (cur.x - prev.x) * t1, y: cur.y - (cur.y - prev.y) * t1 };
const t2 = dNext > 0 ? r / dNext : 0;
const after = { x: cur.x + (next.x - cur.x) * t2, y: cur.y + (next.y - cur.y) * t2 };
d += ' L ' + before.x.toFixed(2) + ' ' + before.y.toFixed(2);
d += ' Q ' + cur.x + ' ' + cur.y + ' ' + after.x.toFixed(2) + ' ' + after.y.toFixed(2);
}
d += ' L ' + filt[filt.length - 1].x + ' ' + filt[filt.length - 1].y;
return { d, mid, filt };
}
// Curve: kiểm soát độ dài control point theo HƯỚNG của port, không theo khoảng cách thô
const dx = p2.x - p1.x, dy = p2.y - p1.y;
const dist = Math.hypot(dx, dy);
const h1 = s1 === 'left' || s1 === 'right';
const h2 = s2 === 'left' || s2 === 'right';
let d1, d2;
if (h1 && h2)      { d1 = Math.max(36, Math.abs(dx) * 0.5); d2 = Math.max(36, Math.abs(dx) * 0.5); }
else if (!h1 && !h2){ d1 = Math.max(36, Math.abs(dy) * 0.5); d2 = Math.max(36, Math.abs(dy) * 0.5); }
else                { d1 = Math.max(36, Math.min(dist * 0.5, (h1 ? Math.abs(dx) : Math.abs(dy)) + 30));
d2 = Math.max(36, Math.min(dist * 0.5, (h2 ? Math.abs(dx) : Math.abs(dy)) + 30)); }
d1 = Math.min(d1, 200); d2 = Math.min(d2, 200);
const c1 = shiftPt(p1, s1, d1);
const c2 = shiftPt(p2, s2, d2);
// Offset cho curve: dịch vuông góc với đường nối
const L = dist || 1;
const nx = -dy / L * offset * 0.6, ny = dx / L * offset * 0.6;
const midBase = { x: (p1.x + 3 * c1.x + 3 * c2.x + p2.x) / 8, y: (p1.y + 3 * c1.y + 3 * c2.y + p2.y) / 8 };
return {
d: 'M ' + p1.x + ' ' + p1.y +
' C ' + (c1.x + nx) + ' ' + (c1.y + ny) + ' ' +
(c2.x + nx) + ' ' + (c2.y + ny) + ' ' + p2.x + ' ' + p2.y,
mid: { x: midBase.x + nx, y: midBase.y + ny }
};
}
/* ==================================================================
OBSTACLE AVOIDANCE
================================================================== */
function segmentIntersectsRect(x1, y1, x2, y2, rect) {
// Chỉ check segment axis-aligned (vuông góc/horizontal)
if (Math.abs(x1 - x2) > 0.5 && Math.abs(y1 - y2) > 0.5) return false;
const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);
if (maxX < rect.x || minX > rect.x + rect.w) return false;
if (maxY < rect.y || minY > rect.y + rect.h) return false;
if (Math.abs(x1 - x2) < 0.5) {
return x1 >= rect.x && x1 <= rect.x + rect.w &&
maxY >= rect.y && minY <= rect.y + rect.h;
}
return y1 >= rect.y && y1 <= rect.y + rect.h &&
maxX >= rect.x && minX <= rect.x + rect.w;
}
function avoidObstacles(filt, obstacles, padding) {
if (!filt || filt.length < 2 || !obstacles.length) return filt;
padding = padding == null ? 14 : padding;
const result = [filt[0]];
for (let i = 1; i < filt.length; i++) {
const p1 = result[result.length - 1];
const p2 = filt[i];
let bestDetour = null;
let bestDist = Infinity;
for (const o of obstacles) {
const r = { x: o.x - padding, y: o.y - padding,
w: o.w + padding * 2, h: o.h + padding * 2 };
if (!segmentIntersectsRect(p1.x, p1.y, p2.x, p2.y, r)) continue;
// Cần detour
if (Math.abs(p1.y - p2.y) < 0.5) {
// Đường ngang → vòng trên hoặc dưới
const topY = r.y;
const botY = r.y + r.h;
const dTop = Math.abs(p1.y - topY);
const dBot = Math.abs(p1.y - botY);
const detourY = dTop < dBot ? topY : botY;
const dist = Math.min(dTop, dBot);
if (dist < bestDist) {
bestDist = dist;
bestDetour = { axis: 'y', value: detourY };
}
} else if (Math.abs(p1.x - p2.x) < 0.5) {
// Đường dọc → vòng trái hoặc phải
const leftX = r.x;
const rightX = r.x + r.w;
const dL = Math.abs(p1.x - leftX);
const dR = Math.abs(p1.x - rightX);
const detourX = dL < dR ? leftX : rightX;
const dist = Math.min(dL, dR);
if (dist < bestDist) {
bestDist = dist;
bestDetour = { axis: 'x', value: detourX };
}
}
}
if (bestDetour) {
if (bestDetour.axis === 'y') {
result.push({ x: p1.x, y: bestDetour.value });
result.push({ x: p2.x, y: bestDetour.value });
} else {
result.push({ x: bestDetour.value, y: p1.y });
result.push({ x: bestDetour.value, y: p2.y });
}
}
result.push(p2);
}
// Lọc điểm trùng
const filt2 = [result[0]];
for (let i = 1; i < result.length; i++) {
const l = filt2[filt2.length - 1];
if (Math.abs(result[i].x - l.x) > 0.5 || Math.abs(result[i].y - l.y) > 0.5) {
filt2.push(result[i]);
}
}
return filt2;
}
function polylineMidpoint(filt) {
let total = 0;
for (let i = 1; i < filt.length; i++) total += Math.hypot(filt[i].x - filt[i-1].x, filt[i].y - filt[i-1].y);
const target = total / 2;
let acc = 0;
for (let i = 1; i < filt.length; i++) {
const seg = Math.hypot(filt[i].x - filt[i-1].x, filt[i].y - filt[i-1].y);
if (acc + seg >= target) {
const t = seg > 0 ? (target - acc) / seg : 0;
return { x: filt[i-1].x + (filt[i].x - filt[i-1].x) * t, y: filt[i-1].y + (filt[i].y - filt[i-1].y) * t };
}
acc += seg;
}
return filt[filt.length - 1];
}
function polylinePoint(filt, ratio) {
let total = 0;
for (let i = 1; i < filt.length; i++) total += Math.hypot(filt[i].x - filt[i-1].x, filt[i].y - filt[i-1].y);
const target = total * ratio;
let acc = 0;
for (let i = 1; i < filt.length; i++) {
const seg = Math.hypot(filt[i].x - filt[i-1].x, filt[i].y - filt[i-1].y);
if (acc + seg >= target) {
const t = seg > 0 ? (target - acc) / seg : 0;
return { x: filt[i-1].x + (filt[i].x - filt[i-1].x) * t, y: filt[i-1].y + (filt[i].y - filt[i-1].y) * t };
}
acc += seg;
}
return filt[filt.length - 1];
}
const getNode = id => nodes.find(n => n.id === id);
const getEdge = id => edges.find(e => e.id === id);
function pushRecentColor(fill, stroke) {
const key = fill + '|' + stroke;
recentColors = recentColors.filter(c => c.fill + '|' + c.stroke !== key);
recentColors.unshift({ fill, stroke });
recentColors = recentColors.slice(0, 16);
safeStorage.set('fwrt-recent-colors', JSON.stringify(recentColors));
}
/* ==================================================================
RENDER
================================================================== */
function isNodeInViewport(n, margin) {
margin = margin == null ? 240 : margin;
const r = canvasWrap.getBoundingClientRect();
const x1 = (-view.x) / view.k - margin;
const y1 = (-view.y) / view.k - margin;
const x2 = (r.width - view.x) / view.k + margin;
const y2 = (r.height - view.y) / view.k + margin;
return !(n.x + n.w < x1 || n.x > x2 || n.y + n.h < y1 || n.y > y2);
}
function render(skipInspector) {
if (!viewport) return;
_perfStartTime = performance.now();
_portData = precomputePorts();  viewport.setAttribute('transform', 'translate(' + view.x + ' ' + view.y + ') scale(' + view.k + ')');
edgesLayer.textContent = '';
nodesLayer.textContent = '';
overlayLayer.textContent = '';
if (groupsLayer) groupsLayer.textContent = '';
const isMobile = document.body.classList.contains('is-mobile');
const cullThreshold = isMobile ? 60 : 120;
const cull = nodes.length > cullThreshold;
groups.forEach(g => {
const el = makeGroupEl(g);
if (el && groupsLayer) groupsLayer.appendChild(el);
});
edges.forEach(e => {
if (cull) {
const a = getNode(e.from), b = getNode(e.to);
if (a && b && !isNodeInViewport(a) && !isNodeInViewport(b)) return;
}
const el = makeEdgeEl(e);
if (el) edgesLayer.appendChild(el);
});
nodes.forEach(n => {
if (cull && !isNodeInViewport(n)) return;
const el = makeNodeEl(n);
if (el) {
if (!skipInspector) {
// đánh dấu node mới tạo bằng data attribute
el.dataset._fresh = '0';
}
nodesLayer.appendChild(el);
}
});  drawOverlay();
updateGrid();
if (skipInspector) updateMinimapViewportOnly(); else drawMinimap();
if (!skipInspector) updateInspector();
const pct = Math.round(view.k * 100) + '%';
if (zoomLabel) zoomLabel.textContent = pct;
if (zoomLabel2) zoomLabel2.textContent = pct;
if (statNodes) statNodes.textContent = nodes.length;
if (statEdges) statEdges.textContent = edges.length;
const _dt = performance.now() - _perfStartTime;
if (_showPerfBadge) {
const badge = $('perfBadge');
if (badge) {
badge.innerHTML = '⚡ <b>' + _dt.toFixed(1) + 'ms</b> · ' + nodes.length + ' node · ' + edges.length + ' nối';
badge.classList.add('show');
}
}
}function makeNodeEl(n) {
const layer = getLayer(n.layerId || 'default');
if (layer && !layer.visible) return null;
const layerLocked = !!(layer && layer.locked);
const g = svgEl('g', {
class: 'node' + (selected.nodes.has(n.id) ? ' selected' : '') + ((n.locked || layerLocked) ? ' locked' : '') + (n.sticky ? ' sticky' : '') + (n._fresh ? ' appearing' : ''),
'data-id': n.id
});
if (linkTargetId === n.id) {
const hp = shapePaths(n.type, n.x - 5, n.y - 5, n.w + 10, n.h + 10, n)[0];
g.appendChild(svgEl('path', { d: hp, class: 'target-highlight' }));
}
const paths = shapePaths(n.type, n.x, n.y, n.w, n.h, n);
paths.forEach((d, i) => {
g.appendChild(svgEl('path', {
d, class: i === 0 ? 'node-shape' : '',
fill: i === 0 ? n.fill : 'none',
stroke: n.stroke, 'stroke-width': n.strokeWidth || 2,
'stroke-linejoin': 'round', 'stroke-linecap': 'round'
}));
});
if (selected.nodes.has(n.id)) {
const b = shapePaths(n.type, n.x - 3, n.y - 3, n.w + 6, n.h + 6, n)[0];
g.appendChild(svgEl('path', { d: b, class: 'sel-outline' }));
}
const layout = computeTextLayout(n);
if (layout) {
const fs = layout.fs, lines = layout.lines, weight = layout.weight;
const fstyle = layout.fstyle, lineH = layout.lineH;
const totalH = (lines.length - 1) * lineH;
const vAlign = n.vAlign || 'middle';
let startY = n.y + n.h / 2 - totalH / 2;
if (vAlign === 'top') startY = n.y + 8 + fs * 0.5;
else if (vAlign === 'bottom') startY = n.y + n.h - 8 - totalH - fs * 0.5;
const hAlign = n.hAlign || 'center';
const pad = shapeInnerPad(n.type, n.w, n.h, n);
let tx = n.x + n.w / 2, anchor = 'middle';
if (hAlign === 'left') { tx = n.x + pad; anchor = 'start'; }
else if (hAlign === 'right') { tx = n.x + n.w - pad; anchor = 'end'; }
const t = svgEl('text', {
x: tx, y: startY, 'text-anchor': anchor,
'dominant-baseline': 'middle', 'font-size': fs, 'font-family': FONT,
'font-weight': weight, 'font-style': fstyle || 'normal',
fill: n.textColor || '#1e2433',
style: 'pointer-events:none;user-select:none'
});
lines.forEach((ln, i) => {
const ts = svgEl('tspan', { x: tx, dy: i === 0 ? 0 : lineH });
ts.textContent = ln;
t.appendChild(ts);
});
g.appendChild(t);
}
if (n.icon) {
const iconSize = Math.min(18, n.h * 0.4);
const bx = n.x + iconSize * 0.75;
const by = n.y + iconSize * 0.75;
const tIcon = svgEl('text', {
x: bx, y: by,
'text-anchor': 'middle',
'dominant-baseline': 'middle',
'font-size': iconSize,
'font-family': FONT,
class: 'node-icon',
style: 'pointer-events:none;user-select:none'
});
tIcon.textContent = n.icon;
g.appendChild(tIcon);
}
if (!n.locked && !n.sticky) {
['top', 'right', 'bottom', 'left'].forEach(side => {
const p = portPos(n, side);
const pg = svgEl('g', { class: 'port', 'data-side': side, 'data-node': n.id });
pg.appendChild(svgEl('circle', { cx: p.x, cy: p.y, r: 12, fill: 'transparent', 'pointer-events': 'all' }));
pg.appendChild(svgEl('circle', {
cx: p.x, cy: p.y, r: 5, class: 'port-dot',
fill: '#fff', stroke: n.stroke, 'stroke-width': 2, 'pointer-events': 'none'
}));
g.appendChild(pg);
});
}
if (n.locked) {
const bx = n.x + n.w - 10, by = n.y + 10;
const lk = svgEl('g', { class: 'lock-badge' });
lk.appendChild(svgEl('circle', { cx: bx, cy: by, r: 9, fill: '#fff', stroke: '#94a3b8', 'stroke-width': 1.5 }));
const t = svgEl('text', {
x: bx, y: by + 1, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
'font-size': 11, fill: '#64748b', style: 'user-select:none;pointer-events:none'
});
t.textContent = '🔒';
lk.appendChild(t);
g.appendChild(lk);
}
return g;
}
function makeEdgeEl(ed) {
const g = svgEl('g', { class: 'edge' + (selected.edges.has(ed.id) ? ' selected' : ''), 'data-id': ed.id });
const a = getNode(ed.from), b = getNode(ed.to);
if (!a || !b) return null;
const la = getLayer(a.layerId || 'default');
const lb = getLayer(b.layerId || 'default');
if ((la && !la.visible) || (lb && !lb.visible)) return null;
const sides = autoSides(a, b);
const s1 = (ed.fromSide && ed.fromSide !== 'auto') ? ed.fromSide : sides[0];
const s2 = (ed.toSide && ed.toSide !== 'auto') ? ed.toSide : sides[1];
const { slot1, total1, slot2, total2 } = getEffectivePortSlots(ed);
const p1 = portPosWithSlot(a, s1, slot1, total1);
const p2 = portPosWithSlot(b, s2, slot2, total2);
const routing = ed.routing || 'orthogonal';
const cornerRadius = ed.cornerRadius != null ? ed.cornerRadius : 12;
const parallelOffset = getParallelOffset(ed, edges);
let built = buildEdgePath(p1, s1, p2, s2, routing, cornerRadius, parallelOffset);
// Avoid obstacles (chỉ với routing gấp, không áp dụng cho curve/straight)
if ((routing === 'orthogonal' || routing === 'orthogonal_rounded') && built && built.filt && built.filt.length >= 2) {
const obstacles = nodes.filter(n =>
n.id !== ed.from && n.id !== ed.to &&
n.fill !== 'transparent' &&
(getLayer(n.layerId || 'default') || { visible: true }).visible
);
if (obstacles.length) {
const padded = avoidObstacles(built.filt, obstacles, 14);
if (padded.length !== built.filt.length) {
// Rebuild path từ filt mới
if (routing === 'orthogonal' || cornerRadius <= 0) {
let dstr = 'M ' + padded[0].x + ' ' + padded[0].y;
for (let i = 1; i < padded.length; i++) dstr += ' L ' + padded[i].x + ' ' + padded[i].y;
built = { d: dstr, mid: polylineMidpoint(padded), filt: padded };
} else {
let d = 'M ' + padded[0].x + ' ' + padded[0].y;
for (let i = 1; i < padded.length - 1; i++) {
const prev = padded[i - 1], cur = padded[i], next = padded[i + 1];
const dPrev = Math.hypot(cur.x - prev.x, cur.y - prev.y);
const dNext = Math.hypot(next.x - cur.x, next.y - cur.y);
const r = Math.min(cornerRadius, dPrev / 2, dNext / 2);
const t1 = dPrev > 0 ? r / dPrev : 0;
const before = { x: cur.x - (cur.x - prev.x) * t1, y: cur.y - (cur.y - prev.y) * t1 };
const t2 = dNext > 0 ? r / dNext : 0;
const after = { x: cur.x + (next.x - cur.x) * t2, y: cur.y + (next.y - cur.y) * t2 };
d += ' L ' + before.x.toFixed(2) + ' ' + before.y.toFixed(2);
d += ' Q ' + cur.x + ' ' + cur.y + ' ' + after.x.toFixed(2) + ' ' + after.y.toFixed(2);
}
d += ' L ' + padded[padded.length - 1].x + ' ' + padded[padded.length - 1].y;
built = { d: d, mid: polylineMidpoint(padded), filt: padded };
}
}
}
}  const color = ed.color || '#7c869e';
const width = ed.width || 2;
g.appendChild(svgEl('path', { d: built.d, class: 'hit' }));
const lineAttrs = { d: built.d, class: 'line', stroke: color, 'stroke-width': width };
const endStyle = ed.arrowStyle || 'solid';
const startStyle = ed.arrowStyleStart || endStyle;
if (ed.arrowEnd !== false) lineAttrs['marker-end'] = 'url(#' + getMarker(color, endStyle) + ')';
if (ed.arrowStart === true) lineAttrs['marker-start'] = 'url(#' + getMarker(color, startStyle) + ')';
const lineStyle = ed.lineStyle || (ed.dashed ? 'dashed' : 'solid');
if (lineStyle === 'dashed') lineAttrs['stroke-dasharray'] = '8 6';
else if (lineStyle === 'dotted') lineAttrs['stroke-dasharray'] = '2 4';
else if (lineStyle === 'dashdot') lineAttrs['stroke-dasharray'] = '8 4 2 4';
g.appendChild(svgEl('path', lineAttrs));
if (ed.label) {
const fs = clamp(ed.labelFontSize || 11.5, 5, 72);
const weight = ed.labelBold ? 700 : 500;
const fstyle = ed.labelItalic ? 'italic' : 'normal';
setMeasureFont(fs, weight, fstyle);
const tw = _mctx.measureText(ed.label).width;
const lh = fs * 1.35;
const pad = ed.labelBg !== false ? 5 : 2;
const t = clamp(ed.labelT != null ? ed.labelT : 0.5, 0, 1);
let lp = built.mid;
if (built.filt) {
lp = polylinePoint(built.filt, t);
} else if (routing === 'straight') {
lp = { x: p1.x + (p2.x - p1.x) * t, y: p1.y + (p2.y - p1.y) * t };
}
const lg = svgEl('g', { class: 'label-group' });
if (ed.labelBg !== false) {
lg.appendChild(svgEl('rect', {
class: 'label-bg',
x: lp.x - tw / 2 - pad, y: lp.y - lh / 2 - 2,
width: tw + pad * 2, height: lh + 4, rx: 6,
fill: darkMode ? '#1f2738' : '#fff',
stroke: darkMode ? '#2a3145' : '#e3e7f0', 'stroke-width': 1
}));
}
const tEl = svgEl('text', {
x: lp.x, y: lp.y, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
fill: ed.labelColor || (darkMode ? '#a8b0c4' : '#475569'),
'font-size': fs, 'font-weight': weight, 'font-style': fstyle, 'font-family': FONT
});
tEl.textContent = ed.label;
lg.appendChild(tEl);
g.appendChild(lg);
}
return g;
}
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
function handlePos(n, h) {
const x = n.x, y = n.y, w = n.w, hh = n.h;
switch (h) {
case 'nw': return { x, y };
case 'n':  return { x: x + w / 2, y };
case 'ne': return { x: x + w, y };
case 'e':  return { x: x + w, y: y + hh / 2 };
case 'se': return { x: x + w, y: y + hh };
case 's':  return { x: x + w / 2, y: y + hh };
case 'sw': return { x, y: y + hh };
case 'w':  return { x, y: y + hh / 2 };
}
return { x, y };
}
function drawOverlay() {
if (currentGuides.length) {
currentGuides.forEach(gd => {
if (gd.type === 'v') {
overlayLayer.appendChild(svgEl('line', { x1: gd.x, y1: gd.y1, x2: gd.x, y2: gd.y2, class: 'guide-line', 'stroke-width': 1 / view.k }));
} else if (gd.type === 'h') {
overlayLayer.appendChild(svgEl('line', { x1: gd.x1, y1: gd.y, x2: gd.x2, y2: gd.y, class: 'guide-line', 'stroke-width': 1 / view.k }));
} else if (gd.type === 'spacingH') {
const yy = gd.y, tk = 5 / view.k;
overlayLayer.appendChild(svgEl('line', { x1: gd.x1, y1: yy, x2: gd.x2, y2: yy, class: 'guide-line', 'stroke-width': 1.4 / view.k }));
overlayLayer.appendChild(svgEl('line', { x1: gd.x1, y1: yy - tk, x2: gd.x1, y2: yy + tk, class: 'guide-tick' }));
overlayLayer.appendChild(svgEl('line', { x1: gd.x2, y1: yy - tk, x2: gd.x2, y2: yy + tk, class: 'guide-tick' }));
overlayLayer.appendChild(svgEl('text', {
x: (gd.x1 + gd.x2) / 2, y: yy - 8 / view.k, 'text-anchor': 'middle',
class: 'guide-spacing-label', 'font-size': 10 / view.k
})).textContent = gd.gap + 'px';
} else if (gd.type === 'spacingV') {
const xx = gd.x, tk = 5 / view.k;
overlayLayer.appendChild(svgEl('line', { x1: xx, y1: gd.y1, x2: xx, y2: gd.y2, class: 'guide-line', 'stroke-width': 1.4 / view.k }));
overlayLayer.appendChild(svgEl('line', { x1: xx - tk, y1: gd.y1, x2: xx + tk, y2: gd.y1, class: 'guide-tick' }));
overlayLayer.appendChild(svgEl('line', { x1: xx - tk, y1: gd.y2, x2: xx + tk, y2: gd.y2, class: 'guide-tick' }));
overlayLayer.appendChild(svgEl('text', {
x: xx + 8 / view.k, y: (gd.y1 + gd.y2) / 2, 'text-anchor': 'start', 'dominant-baseline': 'middle',
class: 'guide-spacing-label', 'font-size': 10 / view.k
})).textContent = gd.gap + 'px';
}
});
}
if (drag && drag.type === 'link') {
const a = getNode(drag.from);
if (a) {
const s1 = drag.fromSide === 'auto' ? 'right' : drag.fromSide;
const p1 = portPos(a, s1);
const snapped = !!drag.snapPos;
const p2 = snapped ? drag.snapPos : drag.cursor;
const col = snapped ? '#16a34a' : '#4f46e5';
// Vẽ path cong nhẹ cho preview
const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
overlayLayer.appendChild(svgEl('path', {
d: 'M ' + p1.x + ' ' + p1.y + ' Q ' + mx + ' ' + my + ' ' + p2.x + ' ' + p2.y,
stroke: col, 'stroke-width': 2.4, fill: 'none',
'stroke-dasharray': '7 5', 'pointer-events': 'none',
'stroke-linecap': 'round', opacity: .9
}));
// Điểm xuất phát
overlayLayer.appendChild(svgEl('circle', {
cx: p1.x, cy: p1.y, r: 5, fill: col, 'pointer-events': 'none'
}));
// Điểm kết thúc
overlayLayer.appendChild(svgEl('circle', {
cx: p2.x, cy: p2.y, r: snapped ? 8 : 6, fill: col, opacity: .9, 'pointer-events': 'none'
}));
// Halo quanh điểm kết thúc — vòng ngoài
overlayLayer.appendChild(svgEl('circle', {
cx: p2.x, cy: p2.y, r: snapped ? 14 : 11,
fill: 'none', stroke: col, 'stroke-width': snapped ? 2.2 : 1.5,
opacity: snapped ? .7 : .4, 'pointer-events': 'none'
}));
// Nếu đã snap, thêm 1 vòng pulse nhỏ
if (snapped) {
overlayLayer.appendChild(svgEl('circle', {
cx: p2.x, cy: p2.y, r: 20,
fill: 'none', stroke: col, 'stroke-width': 1,
opacity: .25, 'pointer-events': 'none',
'stroke-dasharray': '3 4'
}));
}
}
}
if (drag && drag.type === 'rubber') {
const r = drag.rect;
overlayLayer.appendChild(svgEl('rect', {
x: Math.min(r.x1, r.x2), y: Math.min(r.y1, r.y2),
width: Math.abs(r.x2 - r.x1), height: Math.abs(r.y2 - r.y1),
fill: 'rgba(79,70,229,.08)', stroke: '#4f46e5',
'stroke-width': 1 / view.k, 'stroke-dasharray': (5 / view.k) + ' ' + (4 / view.k),
'pointer-events': 'none'
}));
}
if (selected.nodes.size === 1 && selected.edges.size === 0 && !drag) {
const n = getNode([...selected.nodes][0]);
if (n && !n.locked) {
const s = 9 / view.k, sw = 1.6 / view.k;
HANDLES.forEach(h => {
const p = handlePos(n, h);
overlayLayer.appendChild(svgEl('rect', {
x: p.x - s / 2, y: p.y - s / 2, width: s, height: s,
rx: 2 / view.k, class: 'handle', 'data-handle': h, 'stroke-width': sw
}));
});
}
}
/* Tay cầm kéo dài/lệch đoạn giữa connector — cho 1 đường nối đang chọn, cho phép kéo sang
   trái/phải/trên/dưới (tuỳ hướng đoạn giữa) để tuỳ chỉnh tuyến đi mà không cần thêm node trung gian. */
if (selected.edges.size === 1 && selected.nodes.size === 0 && (!drag || drag.type === 'edge-bend')) {
const ed = getEdge([...selected.edges][0]);
if (ed) {
const geom = computeEdgeGeom(ed);
if (geom && geom.built && geom.built.mid) {
const mp = geom.built.mid;
const r = 7 / view.k, sw = 2 / view.k;
overlayLayer.appendChild(svgEl('circle', {
cx: mp.x, cy: mp.y, r: r + 6 / view.k, class: 'edge-bend-handle-ring'
}));
overlayLayer.appendChild(svgEl('circle', {
cx: mp.x, cy: mp.y, r, class: 'edge-bend-handle', 'stroke-width': sw,
'data-edge-bend': ed.id
}));
}
}
}
}
function updateGrid() {
if (!canvasWrap || !chkGrid) return;
const on = chkGrid.checked && view.k > 0.35;
canvasWrap.style.backgroundImage = on ? 'radial-gradient(circle,var(--grid-dot) 1px,transparent 1px)' : 'none';
canvasWrap.style.backgroundSize = (GRID * view.k) + 'px ' + (GRID * view.k) + 'px';
canvasWrap.style.backgroundPosition = view.x + 'px ' + view.y + 'px';
}
function updateMinimapViewportOnly() {
const vp = minimapSvg && minimapSvg.querySelector('.minimap-viewport');
if (!vp) { drawMinimap(); return; }
const W = minimap.clientWidth || 200, H = minimap.clientHeight || 140;
if (!nodes.length) return;
const b = contentBounds();
const pad = 12;
const s = Math.min((W - pad * 2) / Math.max(1, b.w), (H - pad * 2) / Math.max(1, b.h));
const ox = (W - b.w * s) / 2 - b.x * s;
const oy = (H - b.h * s) / 2 - b.y * s;
const r = canvasWrap.getBoundingClientRect();
const vx1 = (0 - view.x) / view.k, vy1 = (0 - view.y) / view.k;
const vx2 = (r.width - view.x) / view.k, vy2 = (r.height - view.y) / view.k;
vp.setAttribute('x', ox + vx1 * s);
vp.setAttribute('y', oy + vy1 * s);
vp.setAttribute('width', (vx2 - vx1) * s);
vp.setAttribute('height', (vy2 - vy1) * s);
}
function drawMinimap() {
if (!minimap || !minimapSvg) return;
const W = minimap.clientWidth || 200;
const H = minimap.clientHeight || 140;
minimapSvg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
minimapSvg.textContent = '';
if (!nodes.length) {
const t = svgEl('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-size': 10, fill: '#b9c2d6' });
t.textContent = 'Chưa có nội dung';
minimapSvg.appendChild(t);
return;
}
const b = contentBounds();
const pad = 12;
const s = Math.min((W - pad * 2) / Math.max(1, b.w), (H - pad * 2) / Math.max(1, b.h));
const ox = (W - b.w * s) / 2 - b.x * s;
const oy = (H - b.h * s) / 2 - b.y * s;
edges.forEach(e => {
const a = getNode(e.from), c = getNode(e.to);
if (!a || !c) return;
minimapSvg.appendChild(svgEl('line', {
x1: ox + (a.x + a.w / 2) * s, y1: oy + (a.y + a.h / 2) * s,
x2: ox + (c.x + c.w / 2) * s, y2: oy + (c.y + c.h / 2) * s,
stroke: e.color || '#7c869e', 'stroke-width': 1, opacity: .55
}));
});
nodes.forEach(n => {
// Bỏ node thuộc layer ẩn
const l = getLayer(n.layerId || 'default');
if (l && !l.visible) return;
// Alpha giảm cho layer không active
const isActiveLayer = (n.layerId || 'default') === currentLayerId;
const layerAlpha = isActiveLayer ? 1 : 0.55;
const isSel = selected.nodes.has(n.id);
minimapSvg.appendChild(svgEl('rect', {
x: ox + n.x * s, y: oy + n.y * s,
width: Math.max(2, n.w * s), height: Math.max(2, n.h * s), rx: 1.5,
fill: isSel ? '#4f46e5' : (n.fill === 'transparent' ? '#e3e7f0' : n.fill),
'fill-opacity': isSel ? 1 : layerAlpha,
stroke: isSel ? '#4f46e5' : (n.stroke || '#7c869e'), 'stroke-width': 0.8
}));
});
// Vẽ group outline
groups.forEach(g => {
const gb = getGroupBounds(g);
if (!gb) return;
minimapSvg.appendChild(svgEl('rect', {
x: ox + gb.x * s, y: oy + gb.y * s,
width: gb.w * s, height: gb.h * s,
rx: 4, fill: g.color || '#eef0ff', 'fill-opacity': 0.4,
stroke: g.color || '#4f46e5', 'stroke-width': 0.9
}));
});
const r = canvasWrap.getBoundingClientRect();
const vx1 = (0 - view.x) / view.k;
const vy1 = (0 - view.y) / view.k;
const vx2 = (r.width - view.x) / view.k;
const vy2 = (r.height - view.y) / view.k;
minimapSvg.appendChild(svgEl('rect', {
class: 'minimap-viewport',
x: ox + vx1 * s, y: oy + vy1 * s,
width: (vx2 - vx1) * s, height: (vy2 - vy1) * s, rx: 2
}));
}
let minimapDrag = false;
if (minimap) {
minimap.addEventListener('pointerdown', e => {
minimapDrag = true;
centerFromMinimap(e);
try { minimap.setPointerCapture(e.pointerId); } catch (_) {}
});
minimap.addEventListener('pointermove', e => { if (minimapDrag) centerFromMinimap(e); });
minimap.addEventListener('pointerup', e => {
minimapDrag = false;
try { minimap.releasePointerCapture(e.pointerId); } catch (_) {}
});
}
function centerFromMinimap(e) {
if (!nodes.length || !minimap) return;
const r = minimap.getBoundingClientRect();
const mx = e.clientX - r.left, my = e.clientY - r.top;
const W = r.width, H = r.height;
const b = contentBounds();
const pad = 12;
const s = Math.min((W - pad * 2) / Math.max(1, b.w), (H - pad * 2) / Math.max(1, b.h));
const ox = (W - b.w * s) / 2 - b.x * s;
const oy = (H - b.h * s) / 2 - b.y * s;
const wx = (mx - ox) / s, wy = (my - oy) / s;
const cw = canvasWrap.clientWidth, chh = canvasWrap.clientHeight;
view.x = cw / 2 - wx * view.k;
view.y = chh / 2 - wy * view.k;
render(true);
}
function toWorld(e) {
const r = canvasWrap.getBoundingClientRect();
return { x: (e.clientX - r.left - view.x) / view.k, y: (e.clientY - r.top - view.y) / view.k };
}
function centerWorld() {
const r = canvasWrap.getBoundingClientRect();
return { x: (r.width / 2 - view.x) / view.k, y: (r.height / 2 - view.y) / view.k };
}
let history = [], hIndex = -1;
const snapshot = () => JSON.stringify({ nodes, edges, groups, layers });
function pushHistory() {
const s = snapshot();
if (history[hIndex] === s) return;
history = history.slice(0, hIndex + 1);
history.push(s);
if (history.length > 150) history.shift();
hIndex = history.length - 1;
updateUndoButtons();
autoSave();
}
function applySnapshot(s) {
const d = JSON.parse(s);
nodes = d.nodes || [];
edges = d.edges || [];
groups = d.groups || [];
layers = d.layers || [];
selected.nodes.clear(); selected.edges.clear();
render();
}
function undo() { if (hIndex > 0) { hIndex--; applySnapshot(history[hIndex]); updateUndoButtons(); } }
function redo() { if (hIndex < history.length - 1) { hIndex++; applySnapshot(history[hIndex]); updateUndoButtons(); } }
function updateUndoButtons() {
const bu = $('btnUndo'), br = $('btnRedo');
if (bu) bu.disabled = hIndex <= 0;
if (br) br.disabled = hIndex >= history.length - 1;
}
function addNode(type, cx, cy, text) {
const s = SHAPES[type] || SHAPES.rect;
const template = getStyleTemplate();
let W = s.w, H = s.h;
let fill = s.fill, stroke = s.stroke;
let textColor = '#1e2433', fontSize = 14, strokeWidth = 2;
let bold = false, italic = false, autoFit = true;
let hAlign = 'center', vAlign = 'middle';
if (template) {
fill = template.fill; stroke = template.stroke; strokeWidth = template.strokeWidth;
textColor = template.textColor; fontSize = template.fontSize;
bold = template.bold; italic = template.italic; autoFit = template.autoFit;
hAlign = template.hAlign; vAlign = template.vAlign;
if (template.srcType === type && template.w && template.h) { W = template.w; H = template.h; }
}
const n = {
id: uid(), type,
x: Math.round(cx - W / 2), y: Math.round(cy - H / 2),
w: W, h: H,
text: text !== undefined ? text : '',
fill, stroke, textColor, fontSize, strokeWidth,
bold, italic, autoFit, hAlign, vAlign, locked: false
};
n.layerId = currentLayerId || 'default';
n.tags = [];
n.groupId = null;
if (s.capStart) n.capStart = s.capStart;
if (s.capEnd) n.capEnd = s.capEnd;
if (type === 'tag') n.capLinked = s.capStart === s.capEnd;
if (snapToGrid) { n.x = Math.round(n.x / GRID) * GRID; n.y = Math.round(n.y / GRID) * GRID; }
nodes.push(n);
n._fresh = true;
setTimeout(() => { n._fresh = false; }, 300);
return n;
}
function addEdge(from, to, fromSide, toSide) {
if (from === to) return;
const dup = edges.find(e => e.from === from && e.to === to &&
(e.fromSide || 'auto') === (fromSide || 'auto') &&
(e.toSide || 'auto') === (toSide || 'auto'));
if (dup) return;
const base = Object.assign({
lineStyle: 'solid', routing: 'orthogonal', cornerRadius: 12,
arrowStyle: 'solid', arrowEnd: true, arrowStart: false,
labelFontSize: 11.5, labelColor: '#475569', labelBold: false, labelItalic: false, labelBg: true
}, lastEdgeStyle || {});
edges.push(Object.assign({
id: uid(), from, to,
fromSide: fromSide || 'auto', toSide: toSide || 'auto',
label: '', color: '#7c869e', width: 2
}, base));
}
function deleteSelection() {
if (!selected.nodes.size && !selected.edges.size) return;
const delNodes = new Set(selected.nodes);
edges = edges.filter(e => !delNodes.has(e.from) && !delNodes.has(e.to) && !selected.edges.has(e.id));
nodes = nodes.filter(n => !delNodes.has(n.id));
// Cập nhật groups: bỏ node đã xoá, xoá group rỗng
groups.forEach(g => {
g.memberIds = g.memberIds.filter(id => !delNodes.has(id));
});
groups = groups.filter(g => g.memberIds.length > 0);
selected.nodes.clear(); selected.edges.clear();
render(); pushHistory();
}
function duplicateSelection() {
if (!selected.nodes.size) return;
const map = new Map();
const newIds = [];
[...selected.nodes].forEach(id => {
const n = getNode(id);
if (!n) return;
const c = JSON.parse(JSON.stringify(n));
c.id = uid(); c.x += 32; c.y += 32;
c.groupId = null;
map.set(id, c.id);
nodes.push(c); newIds.push(c.id);
});
edges.filter(e => map.has(e.from) && map.has(e.to)).forEach(e => {
edges.push(Object.assign({}, e, { id: uid(), from: map.get(e.from), to: map.get(e.to) }));
});
selected.nodes.clear();
newIds.forEach(i => selected.nodes.add(i));
render(); pushHistory();
}
function selectAll() {
selected.nodes.clear(); selected.edges.clear();
nodes.forEach(n => selected.nodes.add(n.id));
render();
}
function clearSelection() {
const sel = [...selected.nodes].map(getNode).filter(Boolean);
if (sel.length >= 1) captureStyleFrom(sel[sel.length - 1]);
const esel = [...selected.edges].map(getEdge).filter(Boolean);
if (esel.length >= 1) captureEdgeStyle(esel[0]);
selected.nodes.clear(); selected.edges.clear();
}
function copySelection() {
if (!selected.nodes.size && !selected.edges.size) return;
clipboard = {
nodes: [...selected.nodes].map(id => JSON.parse(JSON.stringify(getNode(id)))),
edges: edges.filter(e =>
(selected.nodes.has(e.from) && selected.nodes.has(e.to)) || selected.edges.has(e.id)
).map(e => JSON.parse(JSON.stringify(e)))
};
toast('Đã sao chép', 'success');
}
function cutSelection() { if (selected.nodes.size || selected.edges.size) { copySelection(); deleteSelection(); } }
function pasteClipboard() {
if (!clipboard || (!clipboard.nodes.length && !clipboard.edges.length)) return;
const idMap = new Map();
const newIds = [];
const newEdgeIds = [];
(clipboard.nodes || []).forEach(n => {
const c = JSON.parse(JSON.stringify(n));
c.id = uid(); c.x += 40; c.y += 40;
idMap.set(n.id, c.id);
nodes.push(c); newIds.push(c.id);
});
(clipboard.edges || []).forEach(e => {
const newFrom = idMap.get(e.from) || e.from;
const newTo = idMap.get(e.to) || e.to;
if (newFrom === e.from && newTo === e.to && !idMap.size) return;
const ce = Object.assign({}, e, { id: uid(), from: newFrom, to: newTo });
edges.push(ce); newEdgeIds.push(ce.id);
});
clipboard.nodes = (clipboard.nodes || []).map(n => { n.x += 40; n.y += 40; return n; });
clearSelection();
newIds.forEach(id => selected.nodes.add(id));
newEdgeIds.forEach(id => selected.edges.add(id));
render(); pushHistory();
}
function copyFormat() {
const sel = [...selected.nodes].map(getNode).filter(Boolean);
if (!sel.length) { toast('Chưa chọn hình', 'warning'); return; }
const n = sel[0];
styleClipboard = {
fill: n.fill, stroke: n.stroke, strokeWidth: n.strokeWidth,
textColor: n.textColor, fontSize: n.fontSize,
bold: n.bold, italic: n.italic, autoFit: n.autoFit,
hAlign: n.hAlign, vAlign: n.vAlign
};
toast('Đã sao chép định dạng', 'success');
}
function pasteFormat() {
if (!styleClipboard) { toast('Chưa có định dạng', 'warning'); return; }
if (!selected.nodes.size) { toast('Chưa chọn hình', 'warning'); return; }
selected.nodes.forEach(id => {
const n = getNode(id);
if (n) Object.assign(n, JSON.parse(JSON.stringify(styleClipboard)));
});
render(); pushHistory();
toast('Đã dán định dạng cho ' + selected.nodes.size + ' hình', 'success');
}
function bringToFront(ids) {
const set = new Set(ids);
const moved = nodes.filter(n => set.has(n.id));
nodes = nodes.filter(n => !set.has(n.id)).concat(moved);
render(); pushHistory();
}
function sendToBack(ids) {
const set = new Set(ids);
const moved = nodes.filter(n => set.has(n.id));
nodes = moved.concat(nodes.filter(n => !set.has(n.id)));
render(); pushHistory();
}
function bringForward(ids) {
const set = new Set(ids);
for (let i = nodes.length - 2; i >= 0; i--) {
if (set.has(nodes[i].id) && !set.has(nodes[i+1].id)) {
const tmp = nodes[i]; nodes[i] = nodes[i+1]; nodes[i+1] = tmp;
}
}
render(); pushHistory();
}
function sendBackward(ids) {
const set = new Set(ids);
for (let i = 1; i < nodes.length; i++) {
if (set.has(nodes[i].id) && !set.has(nodes[i-1].id)) {
const tmp = nodes[i]; nodes[i] = nodes[i-1]; nodes[i-1] = tmp;
}
}
render(); pushHistory();
}
function alignNodes(mode) {
const sel = [...selected.nodes].map(getNode).filter(Boolean).filter(n => !n.locked);
if (sel.length < 2) {
if (sel.length === 1) toast('Cần chọn ít nhất 2 hình để căn chỉnh', 'warning');
return;
}
// Dùng toạ độ đã làm tròn để tránh lệch nửa pixel khi tính biên/tâm — giúp căn chuẩn xác hơn
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
let sumCx = 0, sumCy = 0;
sel.forEach(n => {
const nx = Math.round(n.x), ny = Math.round(n.y), nw = Math.round(n.w), nh = Math.round(n.h);
minX = Math.min(minX, nx); maxX = Math.max(maxX, nx + nw);
minY = Math.min(minY, ny); maxY = Math.max(maxY, ny + nh);
sumCx += nx + nw / 2; sumCy += ny + nh / 2;
});
const cx = Math.round(sumCx / sel.length), cy = Math.round(sumCy / sel.length);
switch (mode) {
case 'left': sel.forEach(n => n.x = minX); break;
case 'hcenter': sel.forEach(n => n.x = Math.round(cx - n.w / 2)); break;
case 'right': sel.forEach(n => n.x = Math.round(maxX - n.w)); break;
case 'top': sel.forEach(n => n.y = minY); break;
case 'vcenter': sel.forEach(n => n.y = Math.round(cy - n.h / 2)); break;
case 'bottom': sel.forEach(n => n.y = Math.round(maxY - n.h)); break;
case 'distH': {
if (sel.length < 3) { toast('Cần ít nhất 3 hình để phân bố đều', 'warning'); return; }
const sorted = [...sel].sort((a, b) => a.x - b.x);
const totalW = sorted.reduce((s, n) => s + Math.round(n.w), 0);
const gap = (maxX - minX - totalW) / (sorted.length - 1);
let x = minX; sorted.forEach(n => { n.x = Math.round(x); x += Math.round(n.w) + gap; });
break;
}
case 'distV': {
if (sel.length < 3) { toast('Cần ít nhất 3 hình để phân bố đều', 'warning'); return; }
const sorted = [...sel].sort((a, b) => a.y - b.y);
const totalH = sorted.reduce((s, n) => s + Math.round(n.h), 0);
const gap = (maxY - minY - totalH) / (sorted.length - 1);
let y = minY; sorted.forEach(n => { n.y = Math.round(y); y += Math.round(n.h) + gap; });
break;
}
}
// Nếu bật snap lưới thì căn xong vẫn bám lưới cho chuẩn
if (snapToGrid) sel.forEach(n => { n.x = Math.round(n.x / GRID) * GRID; n.y = Math.round(n.y / GRID) * GRID; });
render(); pushHistory();
}
/* Kéo dài thêm hình theo 1 trong 4 hướng (trái/phải/trên/dưới) một lượng px do người dùng chọn,
   trong khi vẫn giữ nguyên cạnh đối diện — dùng cho việc nới rộng hình nhanh không cần kéo chuột. */
let lastExtendAmount = 20;
function extendNodes(ids, dir, amt) {
amt = Math.max(1, Number(amt) || 20);
let changed = false;
ids.forEach(id => {
const n = getNode(id);
if (!n || n.locked) return;
if (dir === 'left') { n.x -= amt; n.w += amt; }
else if (dir === 'right') { n.w += amt; }
else if (dir === 'top') { n.y -= amt; n.h += amt; }
else if (dir === 'bottom') { n.h += amt; }
n.w = Math.max(30, Math.round(n.w));
n.h = Math.max(24, Math.round(n.h));
n.x = Math.round(n.x); n.y = Math.round(n.y);
changed = true;
});
if (!changed) return;
render(); pushHistory();
}
function applySizePreset(ids, sizeKey) {
const factor = SIZE_PRESETS[sizeKey];
if (!factor) return;
ids.forEach(id => {
const n = getNode(id);
if (!n || n.locked) return;
const base = SHAPES[n.type] || SHAPES.rect;
n.w = Math.round(base.w * factor);
n.h = Math.round(base.h * factor);
});
render(); pushHistory();
toast('Kích thước · ' + sizeKey, 'success');
}
function applyFontPreset(ids, sizeKey) {
const fs = FONT_PRESETS[sizeKey];
if (!fs) return;
ids.forEach(id => {
const n = getNode(id);
if (n) { n.fontSize = fs; n.autoFit = true; }
});
render(); pushHistory();
}
function computeGuides(draggedNodes) {
const threshold = 6;
const spacingThreshold = 8;
const draggedIds = new Set(draggedNodes.map(n => n.id));
const others = nodes.filter(n => !draggedIds.has(n.id));
const guides = [];
const seenV = new Set(), seenH = new Set();
for (const dn of draggedNodes) {
const dnLeft = dn.x, dnCx = dn.x + dn.w / 2, dnRight = dn.x + dn.w;
const dnTop = dn.y, dnCy = dn.y + dn.h / 2, dnBottom = dn.y + dn.h;
for (const o of others) {
const oLeft = o.x, oCx = o.x + o.w / 2, oRight = o.x + o.w;
const oTop = o.y, oCy = o.y + o.h / 2, oBottom = o.y + o.h;
[[dnLeft, oLeft], [dnCx, oCx], [dnRight, oRight]].forEach(pair => {
const dv = pair[0], ov = pair[1];
if (Math.abs(dv - ov) < threshold && !seenV.has(ov)) {
seenV.add(ov);
guides.push({ type: 'v', x: ov, y1: Math.min(dnTop, oTop) - 20, y2: Math.max(dnBottom, oBottom) + 20 });
}
});
[[dnTop, oTop], [dnCy, oCy], [dnBottom, oBottom]].forEach(pair => {
const dv = pair[0], ov = pair[1];
if (Math.abs(dv - ov) < threshold && !seenH.has(ov)) {
seenH.add(ov);
guides.push({ type: 'h', y: ov, x1: Math.min(dnLeft, oLeft) - 20, x2: Math.max(dnRight, oRight) + 20 });
}
});
}
/* Đường gióng khoảng cách đều (spacing) — phát hiện khi hình đang kéo nằm giữa 2 hình khác
   trên cùng hàng/cột với khoảng cách 2 bên gần bằng nhau, giúp căn khoảng cách đều nhanh chóng
   giống Figma/Sketch. Chỉ hiển thị gợi ý, không tự snap để tránh giật hình ngoài ý muốn. */
const rowMates = others.filter(o => Math.min(o.y + o.h, dnBottom) - Math.max(o.y, dnTop) > 4);
let leftN = null, rightN = null;
rowMates.forEach(o => {
if (o.x + o.w <= dnLeft + 0.5 && (!leftN || o.x + o.w > leftN.x + leftN.w)) leftN = o;
if (o.x >= dnRight - 0.5 && (!rightN || o.x < rightN.x)) rightN = o;
});
if (leftN && rightN) {
const gapL = dnLeft - (leftN.x + leftN.w);
const gapR = rightN.x - dnRight;
if (gapL >= 0 && gapR >= 0 && Math.abs(gapL - gapR) < spacingThreshold) {
const midY = Math.max(Math.min(leftN.y + leftN.h, dnBottom, rightN.y + rightN.h) - Math.max(leftN.y, dnTop, rightN.y), 0) > 0
? (Math.max(leftN.y, dnTop, rightN.y) + Math.min(leftN.y + leftN.h, dnBottom, rightN.y + rightN.h)) / 2 : dnCy;
guides.push({ type: 'spacingH', y: midY, x1: leftN.x + leftN.w, x2: dnLeft, gap: Math.round(gapL) });
guides.push({ type: 'spacingH', y: midY, x1: dnRight, x2: rightN.x, gap: Math.round(gapR) });
}
}
const colMates = others.filter(o => Math.min(o.x + o.w, dnRight) - Math.max(o.x, dnLeft) > 4);
let topN = null, botN = null;
colMates.forEach(o => {
if (o.y + o.h <= dnTop + 0.5 && (!topN || o.y + o.h > topN.y + topN.h)) topN = o;
if (o.y >= dnBottom - 0.5 && (!botN || o.y < botN.y)) botN = o;
});
if (topN && botN) {
const gapT = dnTop - (topN.y + topN.h);
const gapB = botN.y - dnBottom;
if (gapT >= 0 && gapB >= 0 && Math.abs(gapT - gapB) < spacingThreshold) {
const midX = Math.max(Math.min(topN.x + topN.w, dnRight, botN.x + botN.w) - Math.max(topN.x, dnLeft, botN.x), 0) > 0
? (Math.max(topN.x, dnLeft, botN.x) + Math.min(topN.x + topN.w, dnRight, botN.x + botN.w)) / 2 : dnCx;
guides.push({ type: 'spacingV', x: midX, y1: topN.y + topN.h, y2: dnTop, gap: Math.round(gapT) });
guides.push({ type: 'spacingV', x: midX, y1: dnBottom, y2: botN.y, gap: Math.round(gapB) });
}
}
}
return guides;
}
function autoLayoutHierarchical() {
if (nodes.length === 0) { toast('Không có hình để sắp xếp', 'warning'); return; }
const outgoing = new Map(), incoming = new Map();
nodes.forEach(n => { outgoing.set(n.id, []); incoming.set(n.id, []); });
edges.forEach(e => {
if (outgoing.has(e.from) && incoming.has(e.to)) {
outgoing.get(e.from).push(e.to);
incoming.get(e.to).push(e.from);
}
});
let roots = nodes.filter(n => incoming.get(n.id).length === 0);
if (!roots.length) roots = [nodes[0]];
const layer = new Map();
const visited = new Set();
const queue = [];
roots.forEach(r => { layer.set(r.id, 0); queue.push(r.id); });
let safety = 0;
while (queue.length && safety++ < nodes.length * 20) {
const id = queue.shift();
if (visited.has(id)) continue;
visited.add(id);
const l = layer.get(id);
const outs = outgoing.get(id) || [];
for (const to of outs) {
if (!layer.has(to) || layer.get(to) < l + 1) { layer.set(to, l + 1); queue.push(to); }
}
}
let maxL = 0;
layer.forEach(v => { if (v > maxL) maxL = v; });
nodes.forEach(n => { if (!layer.has(n.id)) layer.set(n.id, maxL + 1); });
const byLayer = new Map();
nodes.forEach(n => {
const l = layer.get(n.id);
if (!byLayer.has(l)) byLayer.set(l, []);
byLayer.get(l).push(n);
});
const sortedKeys = [...byLayer.keys()].sort((a, b) => a - b);
sortedKeys.forEach(k => byLayer.get(k).sort((a, b) => a.x - b.x));
const colGap = 40, rowGap = 40;
let anchorX = 0;
nodes.forEach(n => { anchorX += n.x + n.w / 2; });
anchorX = anchorX / nodes.length || 0;
let curY = 0;
sortedKeys.forEach(k => {
const arr = byLayer.get(k);
const maxH = Math.max.apply(null, arr.map(n => n.h));
const totalW = arr.reduce((s, n) => s + n.w, 0) + (arr.length - 1) * colGap;
let curX = anchorX - totalW / 2;
arr.forEach(n => {
n.x = Math.round(curX);
n.y = Math.round(curY + (maxH - n.h) / 2);
curX += n.w + colGap;
});
curY += maxH + rowGap;
});
render(); pushHistory();
setTimeout(fitView, 60);
toast('Đã sắp xếp theo cấu trúc', 'success');
}
function autoLayoutGrid() {
if (!nodes.length) return;
const cols = Math.ceil(Math.sqrt(nodes.length));
const colGap = 40, rowGap = 40;
let maxW = 0, maxH = 0;
nodes.forEach(n => { maxW = Math.max(maxW, n.w); maxH = Math.max(maxH, n.h); });
nodes.forEach((n, i) => {
const c = i % cols, r = Math.floor(i / cols);
n.x = c * (maxW + colGap);
n.y = r * (maxH + rowGap);
});
render(); pushHistory();
setTimeout(fitView, 60);
toast('Đã xếp dạng lưới', 'success');
}