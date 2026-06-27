/**
 * Spring Ohnishi Mainichi Kidney Clinic - Private Services Site Logic
 */

// Google Apps Script (GAS) WebアプリのデプロイURL
// スプレッドシート連携完了後にここにURLを設定します
const GAS_API_URL = '';

document.addEventListener('DOMContentLoaded', () => {
  initMenuFetcher();
});

/**
 * 1. GAS API または menu_fallback.json から自由診療メニューを取得し、UIを動的に生成する
 */
async function initMenuFetcher() {
  const container = document.getElementById('menu-container');
  if (!container) return;

  let menuItems = null;

  // 1. まずGAS APIからの取得を試みる
  if (GAS_API_URL) {
    try {
      const response = await fetch(`${GAS_API_URL}?v=${new Date().getTime()}`);
      if (response.ok) {
        menuItems = await response.json();
        console.log('Successfully fetched menu data from GAS API.');
      } else {
        console.warn(`GAS API returned status ${response.status}. Falling back to local fallback JSON.`);
      }
    } catch (error) {
      console.warn('Failed to fetch from GAS API. Falling back to local fallback JSON:', error);
    }
  }

  // 2. GAS APIが未設定、または取得失敗した場合はローカルの menu_fallback.json を読み込む
  if (!menuItems) {
    try {
      const response = await fetch(`data/menu_fallback.json?v=${new Date().getTime()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch local fallback menu: ${response.status}`);
      }
      menuItems = await response.json();
      console.log('Successfully fetched menu data from local fallback JSON.');
    } catch (error) {
      console.error('Error fetching fallback menu:', error);
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--color-primary-dark); font-weight: 500; grid-column: 1 / -1;">
          メニュー情報の読み込みに失敗しました。お電話にて直接お問い合わせください。
        </div>
      `;
      return;
    }
  }

  // カテゴリタブの動的生成およびメニューの描画
  setupCategoryTabs(menuItems);
  renderMenu(menuItems, 'all');
}

/**
 * カテゴリタブの生成
 */
function setupCategoryTabs(menuItems) {
  const tabsContainer = document.getElementById('category-tabs');
  if (!tabsContainer) return;

  // 重複しないカテゴリを抽出
  const categories = [...new Set(menuItems.map(item => item.category))].filter(Boolean);

  // すべて ボタン以外の既存ボタンをクリアしないように、動的カテゴリボタンを追加
  categories.forEach(category => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.setAttribute('data-category', category);
    btn.textContent = category;
    tabsContainer.appendChild(btn);
  });

  // タブ切り替えのクリックイベント設定
  const tabButtons = tabsContainer.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // アクティブ状態の切り替え
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const selectedCategory = button.getAttribute('data-category');
      renderMenu(menuItems, selectedCategory);
    });
  });
}

/**
 * メニューカードのレンダリング
 */
function renderMenu(menuItems, category) {
  const container = document.getElementById('menu-container');
  if (!container) return;

  // フィルター処理
  const filteredItems = category === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === category);

  container.innerHTML = ''; // Clear container

  if (filteredItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--color-text-light); grid-column: 1 / -1;">
        該当するメニューがありません。
      </div>
    `;
    return;
  }

  filteredItems.forEach(item => {
    const card = document.createElement('div');
    const isFeatured = item.featured === true;
    card.className = isFeatured ? 'menu-card featured' : 'menu-card';
    card.id = `menu-${item.id}`;

    // バッジ
    const badgeHtml = item.badge ? `<span class="menu-badge">${item.badge}</span>` : '';
    
    // 詳細の有無
    const detailHtml = item.detail ? `
      <button class="menu-accordion-btn">
        <span>詳細を見る</span>
        <span class="arrow">▼</span>
      </button>
      <div class="menu-detail-body">
        <div class="menu-detail-content">
          <div class="detail-title">施術詳細・注意事項</div>
          <div>${item.detail}</div>
        </div>
      </div>
    ` : '';

    card.innerHTML = `
      <div class="menu-card-header">
        <div class="menu-meta-row">
          <span class="menu-category">${item.category}</span>
          ${badgeHtml}
        </div>
        <h3 class="menu-title">${item.title}</h3>
        <p class="menu-desc">${item.description || ''}</p>
        <div class="menu-price-container">
          <span class="price-label">料金</span>
          <span class="price-value">${item.price}</span>
        </div>
      </div>
      ${detailHtml}
    `;

    container.appendChild(card);
  });

  // アコーディオン開閉のバインド
  setupAccordion();
}

/**
 * 詳細アコーディオンの開閉トグル
 */
function setupAccordion() {
  const cards = document.querySelectorAll('.menu-card');

  cards.forEach(card => {
    const btn = card.querySelector('.menu-accordion-btn');
    const body = card.querySelector('.menu-detail-body');
    if (!btn || !body) return;

    btn.addEventListener('click', () => {
      const isActive = card.classList.contains('active');
      const arrow = btn.querySelector('.arrow');

      if (!isActive) {
        card.classList.add('active');
        body.style.maxHeight = body.scrollHeight + 'px';
        if (arrow) arrow.textContent = '▲';
      } else {
        card.classList.remove('active');
        body.style.maxHeight = '0px';
        if (arrow) arrow.textContent = '▼';
      }
    });
  });
}
