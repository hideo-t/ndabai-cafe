// =============================================================
// んだばいカフェ 商品データ読み込み＋カード生成
// GAS API (doGet) から商品JSONを取得し、ショップに描画
// =============================================================

// ⬇⬇⬇ デプロイした商品API(GAS)のウェブアプリURLを貼り付けてください（gas/SETUP-products.md 参照）
//      空のままだと「準備中」表示になります。
const PRODUCT_API_URL = '';

// タグの色マップ
const TAG_COLORS = {
  '人気':   { bg: '#fef0e0', color: '#c75c2a' },
  '新商品': { bg: '#e8f5e9', color: '#2e7d32' },
  '限定':   { bg: '#fce8e8', color: '#8a3a3a' },
  '季節':   { bg: '#e3f2fd', color: '#0d47a1' },
  '受賞':   { bg: '#faf0d0', color: '#7a6a2a' }
};

function escapeHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function loadProducts() {
  const container = document.getElementById('product-grid');
  if (!container) return;

  if (!PRODUCT_API_URL) {
    container.innerHTML = '<div class="no-products">🌱 商品ページは準備中です。近日公開します。</div>';
    return;
  }

  container.innerHTML = '<div class="loading">商品を読み込み中...</div>';

  try {
    const res = await fetch(PRODUCT_API_URL);
    const data = await res.json();

    if (!data.products || data.products.length === 0) {
      container.innerHTML = '<div class="no-products">現在商品を準備中です</div>';
      return;
    }

    renderCategoryFilter(data.products);
    renderProducts(data.products);
  } catch (err) {
    console.error('商品読み込みエラー:', err);
    container.innerHTML = '<div class="error">商品の読み込みに失敗しました。時間をおいて再度お試しください。</div>';
  }
}

function renderCategoryFilter(products) {
  const filterContainer = document.getElementById('category-filter');
  if (!filterContainer) return;

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  let html = '<button class="filter-btn active" data-cat="all">すべて</button>';
  categories.forEach(cat => {
    html += `<button class="filter-btn" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
  });
  filterContainer.innerHTML = html;

  filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => filterBy(btn.dataset.cat, btn));
  });
}

function filterBy(category, clickedBtn) {
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.display = (category === 'all' || card.dataset.category === category) ? '' : 'none';
  });
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (clickedBtn) clickedBtn.classList.add('active');
}

function renderProducts(products) {
  const container = document.getElementById('product-grid');

  let html = '';
  products.forEach(p => {
    const tags = p.tags ? String(p.tags).split(',').map(t => t.trim()).filter(Boolean) : [];
    const tagHtml = tags.map(tag => {
      const tc = TAG_COLORS[tag] || { bg: '#f0f0f0', color: '#666' };
      return `<span class="product-tag" style="background:${tc.bg};color:${tc.color}">${escapeHtml(tag)}</span>`;
    }).join('');

    const photoHtml = p.photoUrl
      ? `<img src="${escapeHtml(p.photoUrl)}" alt="${escapeHtml(p.name)}" class="product-image" loading="lazy">`
      : `<div class="product-image-placeholder">📷</div>`;

    const buyBtnHtml = p.baseUrl
      ? `<a href="${escapeHtml(p.baseUrl)}" target="_blank" rel="noopener noreferrer" class="buy-btn">購入する →</a>`
      : `<button class="buy-btn disabled" disabled>準備中</button>`;

    const storyHtml = p.story ? `<div class="product-story">${escapeHtml(p.story)}</div>` : '';

    html += `
      <div class="product-card" data-category="${escapeHtml(p.category)}">
        ${photoHtml}
        <div class="product-body">
          <div class="product-tags">${tagHtml}</div>
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-volume">${escapeHtml(p.volume || '')}</div>
          <div class="product-desc">${escapeHtml(p.description)}</div>
          ${storyHtml}
          <div class="product-footer">
            <div class="product-price">¥${Number(p.price).toLocaleString()}<span class="tax">（税込）</span></div>
            ${buyBtnHtml}
          </div>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', loadProducts);
