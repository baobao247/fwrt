/* ==================================================================
INNOVATION: DIAGRAM ANALYZER & MCCABE CYCLOMATIC COMPLEXITY
Thống kê, đo lường độ phức tạp McCabe và công cụ Tìm/Thay thế hàng loạt
================================================================== */

function analyzeDiagram() {
  const n = nodes.length;
  const e = edges.length;
  
  if (n === 0) {
    return {
      nodesCount: 0,
      edgesCount: 0,
      componentsCount: 0,
      cyclomatic: 0,
      rating: 'Trống',
      riskClass: 'risk-low',
      recommendation: 'Chưa có node nào trên trang này.',
      typeBreakdown: {},
      deadEnds: [],
      sources: [],
      wordCount: 0,
      charCount: 0
    };
  }

  // Connected components count (P) using Union-Find
  const parent = new Map();
  nodes.forEach(node => parent.set(node.id, node.id));
  function find(x) {
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)));
    return parent.get(x);
  }
  function union(x, y) {
    const rx = find(x), ry = find(y);
    if (rx !== ry) parent.set(rx, ry);
  }

  edges.forEach(edge => {
    if (parent.has(edge.from) && parent.has(edge.to)) {
      union(edge.from, edge.to);
    }
  });

  const roots = new Set();
  nodes.forEach(node => roots.add(find(node.id)));
  const P = roots.size;

  // McCabe Cyclomatic Complexity: M = E - N + 2P
  const M = Math.max(1, e - n + (2 * P));

  let rating = 'Chuẩn (Độ phức tạp thấp)';
  let riskClass = 'risk-low';
  let recommendation = 'Cấu trúc lưu đồ mạch lạc, dễ kiểm thử và vận hành logic.';

  if (M > 20) {
    rating = 'Rất phức tạp (Nguy cơ lỗi cao)';
    riskClass = 'risk-high';
    recommendation = 'Lưu đồ có quá nhiều nhánh điều kiện chồng chéo. Nên tách thành các Sub-Process hoặc module con.';
  } else if (M > 10) {
    rating = 'Trung bình (Độ phân nhánh vừa phải)';
    riskClass = 'risk-medium';
    recommendation = 'Quy trình tương đối phong phú. Cần lưu ý kiểm thử kỹ các nhánh phủ định/ngoại lệ.';
  }

  // Breakdown by shape types
  const typeBreakdown = {};
  let wordCount = 0;
  let charCount = 0;

  nodes.forEach(node => {
    const t = node.type || 'rect';
    typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
    const txt = String(node.text || '').trim();
    if (txt) {
      charCount += txt.length;
      wordCount += txt.split(/\s+/).filter(Boolean).length;
    }
  });

  // Calculate In/Out degrees
  const inDeg = new Map(), outDeg = new Map();
  nodes.forEach(node => { inDeg.set(node.id, 0); outDeg.set(node.id, 0); });
  edges.forEach(edge => {
    if (outDeg.has(edge.from)) outDeg.set(edge.from, outDeg.get(edge.from) + 1);
    if (inDeg.has(edge.to)) inDeg.set(edge.to, inDeg.get(edge.to) + 1);
  });

  const deadEnds = [];
  const sources = [];

  nodes.forEach(node => {
    const outD = outDeg.get(node.id) || 0;
    const inD = inDeg.get(node.id) || 0;
    // Dead-end: has incoming, no outgoing, and not oval terminator or note
    if (inD > 0 && outD === 0 && node.type !== 'oval' && node.type !== 'circle' && !node.sticky) {
      deadEnds.push(node);
    }
    // Source: has outgoing, no incoming, and not oval start
    if (inD === 0 && outD > 0 && node.type !== 'oval' && node.type !== 'circle' && !node.sticky) {
      sources.push(node);
    }
  });

  return {
    nodesCount: n,
    edgesCount: e,
    componentsCount: P,
    cyclomatic: M,
    rating,
    riskClass,
    recommendation,
    typeBreakdown,
    deadEnds,
    sources,
    wordCount,
    charCount
  };
}

function showMetricsModal() {
  const m = analyzeDiagram();
  let modal = $('metricsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'metricsModal';
    modal.className = 'modal-bg';
    modal.innerHTML = `
      <div class="modal" style="max-width: 620px;">
        <div class="modal-header">
          <h2>📊 Thống kê & Độ phức tạp Lưu đồ (McCabe Metrics)</h2>
          <button class="modal-close" onclick="closeMetricsModal()" aria-label="Đóng">✕</button>
        </div>
        <div class="modal-body" id="metricsBody"></div>
        <div class="modal-footer" style="display:flex; justify-content:space-between; align-items:center;">
          <button onclick="copyMetricsMarkdown()" style="display:inline-flex; align-items:center; gap:6px;">📋 Sao chép báo cáo Markdown</button>
          <button class="primary" onclick="closeMetricsModal()">Đóng</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) closeMetricsModal(); });
  }

  const typeLabels = {
    rect: 'Hình chữ nhật (Thao tác)',
    oval: 'Hình oval (Bắt đầu / Kết thúc)',
    diamond: 'Hình thoi (Rẽ nhánh điều kiện)',
    document: 'Tài liệu (Document)',
    cylinder: 'Cơ sở dữ liệu (Database)',
    parallelogram: 'Dữ liệu Vào/Ra (I/O)',
    hexagon: 'Chuẩn bị / Hexagon',
    predefined: 'Quy trình con (Sub-process)',
    circle: 'Điểm nối tròn (Connector)'
  };

  let breakdownHtml = '';
  Object.keys(m.typeBreakdown).forEach(type => {
    const lbl = typeLabels[type] || ('Hình: ' + type);
    breakdownHtml += `<tr><td>${lbl}</td><td style="font-weight:700; text-align:right;">${m.typeBreakdown[type]}</td></tr>`;
  });

  const body = $('metricsBody');
  body.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-val">${m.nodesCount}</div>
        <div class="metric-lbl">Tổng số Node</div>
      </div>
      <div class="metric-card">
        <div class="metric-val">${m.edgesCount}</div>
        <div class="metric-lbl">Đường liên kết</div>
      </div>
      <div class="metric-card">
        <div class="metric-val ${m.riskClass}">${m.cyclomatic}</div>
        <div class="metric-lbl">Chỉ số McCabe (M)</div>
      </div>
      <div class="metric-card">
        <div class="metric-val">${m.componentsCount}</div>
        <div class="metric-lbl">Khối độc lập (P)</div>
      </div>
    </div>

    <div style="padding:10px 14px; border-radius:8px; background:var(--hover); border-left:4px solid var(--accent); margin-bottom:14px;">
      <div style="font-weight:700; color:var(--text); margin-bottom:4px;">Đánh giá: <span class="${m.riskClass}">${m.rating}</span></div>
      <div style="font-size:0.85rem; color:var(--muted); line-height:1.4;">${m.recommendation}</div>
    </div>

    <div class="metrics-section-title">Phân bổ loại hình & Nội dung</div>
    <table class="metrics-table">
      <thead><tr><th>Loại phần tử</th><th style="text-align:right;">Số lượng</th></tr></thead>
      <tbody>${breakdownHtml || '<tr><td colspan="2">Chưa có phần tử</td></tr>'}</tbody>
    </table>

    <div style="display:flex; justify-content:space-between; font-size:0.82rem; color:var(--muted); padding:6px 0;">
      <span>Tổng số từ trong lưu đồ: <b style="color:var(--text);">${m.wordCount}</b> từ</span>
      <span>Tổng số ký tự: <b style="color:var(--text);">${m.charCount}</b> ký tự</span>
      <span>Nhánh cụt cần rà soát: <b style="color:var(--danger);">${m.deadEnds.length}</b></span>
    </div>
  `;

  modal.classList.add('show');
}

function closeMetricsModal() {
  const modal = $('metricsModal');
  if (modal) modal.classList.remove('show');
}

function copyMetricsMarkdown() {
  const m = analyzeDiagram();
  const md = [
    '# Báo Cáo Phân Tích Độ Phức Tạp Sơ Đồ (McCabe Cyclomatic)',
    '- **Trang:** ' + (activePageId ? (pages.find(p => p.id === activePageId)?.name || 'Trang hiện tại') : 'Trang 1'),
    '- **Ngày xuất:** ' + new Date().toLocaleString('vi-VN'),
    '',
    '## 1. Chỉ Số Tổng Quan',
    '| Chỉ số | Giá trị | Ý nghĩa |',
    '|---|---|---|',
    '| **Tổng số Node (N)** | ' + m.nodesCount + ' | Số bước/phần tử xử lý |',
    '| **Tổng số Đường nối (E)** | ' + m.edgesCount + ' | Số luồng chuyển giao |',
    '| **Khối độc lập (P)** | ' + m.componentsCount + ' | Số phân vùng cô lập |',
    '| **Độ phức tạp McCabe (M = E - N + 2P)** | **' + m.cyclomatic + '** | ' + m.rating + ' |',
    '',
    '## 2. Nhận Xét & Khuyến Nghị',
    '> ' + m.recommendation,
    '',
    '## 3. Nội Dung Văn Bản',
    '- Tổng số từ: ' + m.wordCount,
    '- Tổng ký tự: ' + m.charCount,
    '- Nhánh cụt (Dead-ends): ' + m.deadEnds.length,
    ''
  ].join('\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(md).then(() => {
      toast('Đã sao chép báo cáo Markdown vào Clipboard', 'success');
    }).catch(() => {
      prompt('Sao chép báo cáo:', md);
    });
  } else {
    prompt('Sao chép báo cáo:', md);
  }
}

// BATCH FIND & REPLACE
function batchReplaceText(findText, replaceText, matchCase = false) {
  if (!findText) {
    toast('Vui lòng nhập từ khóa cần tìm để thay thế', 'warning');
    return 0;
  }
  let count = 0;
  pushHistory();
  nodes.forEach(n => {
    if (typeof n.text === 'string' && n.text) {
      let matched = false;
      if (matchCase) {
        if (n.text.includes(findText)) {
          n.text = n.text.split(findText).join(replaceText);
          matched = true;
        }
      } else {
        const regex = new RegExp(findText.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&'), 'gi');
        if (regex.test(n.text)) {
          n.text = n.text.replace(regex, replaceText);
          matched = true;
        }
      }
      if (matched) count++;
    }
  });

  edges.forEach(e => {
    if (typeof e.label === 'string' && e.label) {
      let matched = false;
      if (matchCase) {
        if (e.label.includes(findText)) {
          e.label = e.label.split(findText).join(replaceText);
          matched = true;
        }
      } else {
        const regex = new RegExp(findText.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&'), 'gi');
        if (regex.test(e.label)) {
          e.label = e.label.replace(regex, replaceText);
          matched = true;
        }
      }
      if (matched) count++;
    }
  });

  if (count > 0) {
    render();
    toast('Đã thay thế tại ' + count + ' vị trí!', 'success');
  } else {
    toast('Không tìm thấy từ khóa khớp để thay thế', 'info');
  }
  return count;
}

// WATERMARK OVERLAY
let _watermarkText = '';
function setWatermark(text) {
  _watermarkText = String(text || '').trim();
  let wmEl = $('canvasWatermark');
  if (!_watermarkText) {
    if (wmEl) wmEl.remove();
    return;
  }
  if (!wmEl) {
    wmEl = document.createElement('div');
    wmEl.id = 'canvasWatermark';
    wmEl.className = 'watermark-overlay';
    canvasWrap.appendChild(wmEl);
  }
  wmEl.textContent = _watermarkText;
}

function promptWatermark() {
  showPrompt('Nhập chữ đóng dấu bản quyền / watermark (để trống để xóa):', _watermarkText || 'DRAFT - BẢN THẢO').then(val => {
    if (val !== null) {
      setWatermark(val);
      toast(val ? 'Đã bật đóng dấu: ' + val : 'Đã xóa watermark', 'info');
    }
  });
}
