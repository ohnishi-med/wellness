/**
 * Spring Ohnishi Mainichi Kidney Clinic - Private Services Site Logic
 */

// Google Apps Script (GAS) WebアプリのデプロイURL
// スプレッドシート連携完了後にここにURLを設定します
const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbywspkSLotKKwJbvO3PQmfMyxEyzEgkvkb2U2_cheE5Efl2zubFTj7od-bsqFKsQc8p/exec';

document.addEventListener('DOMContentLoaded', () => {
  initMenuFetcher();
});

/**
 * 1. GAS API または menu_fallback.json から自由診療メニューを取得し、UIを動的に生成する
 */
async function initMenuFetcher() {
  const container = document.getElementById('menu-container');
  const generalContainer = document.getElementById('general-menu-container');
  if (!container) return;

  let rawMenuItems = null;

  // 1. まずGAS APIからの取得を試みる
  if (GAS_API_URL) {
    try {
      const response = await fetch(`${GAS_API_URL}?v=${new Date().getTime()}`);
      if (response.ok) {
        rawMenuItems = await response.json();
        console.log('Successfully fetched menu data from GAS API.');
      } else {
        console.warn(`GAS API returned status ${response.status}. Falling back to local fallback JSON.`);
      }
    } catch (error) {
      console.warn('Failed to fetch from GAS API. Falling back to local fallback JSON:', error);
    }
  }

  // 2. GAS APIが未設定、または取得失敗した場合はローカルの menu_fallback.json を読み込む
  if (!rawMenuItems) {
    try {
      const response = await fetch(`data/menu_fallback.json?v=${new Date().getTime()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch local fallback menu: ${response.status}`);
      }
      rawMenuItems = await response.json();
      console.log('Successfully fetched menu data from local fallback JSON.');
    } catch (error) {
      console.error('Error fetching fallback menu:', error);
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--color-primary-dark); font-weight: 500; grid-column: 1 / -1;">
          メニュー情報の読み込みに失敗しました。お電話にて直接お問い合わせください。
        </div>
      `;
      if (generalContainer) {
        generalContainer.innerHTML = '';
      }
      return;
    }
  }

  // 3. 表示中ステータスのものだけをフィルタリング
  const activeItems = rawMenuItems.filter(item => item.status !== '非表示');

  // 4. group ごとにデータを分離
  const wellnessItems = activeItems.filter(item => item.group === '自由診療');
  const generalItems = activeItems.filter(item => item.group === '一般健診・書類');

  // ① 自由診療（美容・点滴等）エリアの描画
  setupCategoryTabs(wellnessItems);
  renderMenu(wellnessItems, 'all');

  // ② 一般健診・検査・書類代エリアの描画
  renderGeneralMenu(generalItems);
}

/**
 * カテゴリタブの生成（自由診療用）
 */
function setupCategoryTabs(menuItems) {
  const tabsContainer = document.getElementById('category-tabs');
  if (!tabsContainer) return;

  // 既存の動的追加ボタン（「すべて」以外）をクリア
  const existingBtns = tabsContainer.querySelectorAll('.tab-btn:not([data-category="all"])');
  existingBtns.forEach(btn => btn.remove());

  // 重複しないカテゴリを抽出
  const categories = [...new Set(menuItems.map(item => item.category))].filter(Boolean);

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
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const selectedCategory = button.getAttribute('data-category');
      renderMenu(menuItems, selectedCategory);
    });
  });
}

/**
 * 自由診療メニュー（カード形式）のレンダリング
 */
function renderMenu(menuItems, category) {
  const container = document.getElementById('menu-container');
  if (!container) return;

  const filteredItems = category === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === category);

  container.innerHTML = ''; // クリア

  if (filteredItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--color-text-light); grid-column: 1 / -1;">
        現在掲載可能なメニューがありません。
      </div>
    `;
    return;
  }

  filteredItems.forEach(item => {
    const card = document.createElement('div');
    const isFeatured = item.featured === true;
    card.className = isFeatured ? 'menu-card featured' : 'menu-card';
    card.id = `menu-${item.id}`;

    const badgeHtml = item.badge ? `<span class="menu-badge">${item.badge}</span>` : '';
    
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

  setupAccordion();
}

/**
 * 2. 一般健診・検査・書類代のレンダリング（アコーディオン＋料金テーブル）
 */
function renderGeneralMenu(generalItems) {
  const container = document.getElementById('general-menu-container');
  if (!container) return;

  container.innerHTML = ''; // クリア

  if (generalItems.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--color-text-light);">
        現在掲載可能な項目はありません。
      </div>
    `;
    return;
  }

  // カテゴリごとにグループ化
  const groupedItems = {};
  generalItems.forEach(item => {
    if (!groupedItems[item.category]) {
      groupedItems[item.category] = [];
    }
    groupedItems[item.category].push(item);
  });

  // カテゴリ順にアコーディオンを生成
  const categories = Object.keys(groupedItems);
  categories.forEach(category => {
    const items = groupedItems[category];
    const wrapper = document.createElement('div');
    wrapper.className = 'general-cat-wrapper';

    // テーブルの中身（行）を作成
    let tableRows = '';
    items.forEach(item => {
      tableRows += `
        <tr>
          <td>
            <div style="font-weight: 600; color: var(--color-text);">${item.title}</div>
            ${item.description ? `<div style="font-size: 0.8rem; color: var(--color-text-light); margin-top: 4px;">${item.description}</div>` : ''}
          </td>
          <td class="price-cell">${item.price}</td>
        </tr>
      `;
    });

    wrapper.innerHTML = `
      <button class="general-cat-header">${category}</button>
      <div class="general-cat-content">
        <div class="general-table-container">
          <table class="general-table">
            <thead>
              <tr>
                <th>項目名 / 概要</th>
                <th style="text-align: right;">料金（自費）</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.appendChild(wrapper);
  });

  // 一般自費アコーディオンのトグル制御イベント設定
  setupGeneralAccordion();
}

/**
 * 自由診療アコーディオンの開閉トグル
 */
function setupAccordion() {
  const cards = document.querySelectorAll('.menu-card');
  cards.forEach(card => {
    const btn = card.querySelector('.menu-accordion-btn');
    const body = card.querySelector('.menu-detail-body');
    if (!btn || !body) return;

    // 重複バインド防止
    btn.replaceWith(btn.cloneNode(true));
    const newBtn = card.querySelector('.menu-accordion-btn');

    newBtn.addEventListener('click', () => {
      const isActive = card.classList.contains('active');
      const arrow = newBtn.querySelector('.arrow');

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

/**
 * 一般自費アコーディオンの開閉トグル
 */
function setupGeneralAccordion() {
  const wrappers = document.querySelectorAll('.general-cat-wrapper');
  wrappers.forEach(wrapper => {
    const header = wrapper.querySelector('.general-cat-header');
    const content = wrapper.querySelector('.general-cat-content');
    if (!header || !content) return;

    header.addEventListener('click', () => {
      const isActive = wrapper.classList.contains('active');
      
      // 他のカテゴリをすべて閉じる（オプション: お好みでアコーディオン風に一箇所のみ開く挙動に）
      // wrappers.forEach(w => {
      //   w.classList.remove('active');
      //   w.querySelector('.general-cat-content').style.maxHeight = '0px';
      // });

      if (!isActive) {
        wrapper.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
      } else {
        wrapper.classList.remove('active');
        content.style.maxHeight = '0px';
      }
    });
  });
}
