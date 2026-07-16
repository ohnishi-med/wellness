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
  if (!container) return;

  let apiWellnessItems = null;

  // 1. GAS API から自由診療シートのデータを個別に取得する
  if (GAS_API_URL) {
    try {
      // 自由診療シートのフェッチ
      const resWellness = await fetch(`${GAS_API_URL}?sheet=自由診療&v=${new Date().getTime()}`);
      if (resWellness.ok) {
        apiWellnessItems = await resWellness.json();
      }
    } catch (error) {
      console.warn('Failed to fetch from GAS API. Falling back to local fallback JSON:', error);
    }
  }

  let wellnessItems = [];

  // 2. APIからの取得状況に応じてデータを使用、またはローカル fallback JSON で補完
  if (apiWellnessItems) {
    wellnessItems = apiWellnessItems.filter(item => item.status !== '非表示');
    console.log('Successfully loaded menu data from GAS API.');
  } else {
    // API取得失敗、または一部データ欠損時は fallback JSON を読み込む
    try {
      const response = await fetch(`data/menu_fallback.json?v=${new Date().getTime()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch local fallback menu: ${response.status}`);
      }
      const fallbackItems = await response.json();
      const activeFallback = fallbackItems.filter(item => item.status !== '非表示');
      
      wellnessItems = activeFallback.filter(item => item.group !== '一般健診・書類');
      console.log('Loaded menu data from local fallback JSON.');
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

  // ① 自由診療（美容・点滴等）エリアの描画
  setupGroupTabs(wellnessItems);
  renderMenu(wellnessItems, 'all');
}

/**
 * グループタブの生成（自由診療用）
 */
function setupGroupTabs(menuItems) {
  const tabsContainer = document.getElementById('category-tabs');
  if (!tabsContainer) return;

  // 既存 of 動的追加ボタン（「すべて」以外）をクリア
  const existingBtns = tabsContainer.querySelectorAll('.tab-btn:not([data-category="all"])');
  existingBtns.forEach(btn => btn.remove());

  // 重複しないグループを抽出 (ダイエット、増毛、美白、健康増進等)
  const groups = [...new Set(menuItems.map(item => item.group))].filter(Boolean);

  groups.forEach(group => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.setAttribute('data-category', group);
    btn.textContent = group;
    tabsContainer.appendChild(btn);
  });

  // タブ切り替えのクリックイベント設定
  const tabButtons = tabsContainer.querySelectorAll('.tab-btn');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const selectedGroup = button.getAttribute('data-category');
      renderMenu(menuItems, selectedGroup);
    });
  });
}

/**
 * 自由診療メニュー（カード形式）のレンダリング
 */
function renderMenu(menuItems, group) {
  const container = document.getElementById('menu-container');
  if (!container) return;

  const filteredItems = group === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.group === group);

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
    
    // 詳細のフォーマット処理
    const detailContentHtml = formatDetail(item.detail);
    const detailHtml = item.detail ? `
      <button class="menu-accordion-btn">
        <span>詳細・副作用を見る</span>
        <span class="arrow">▼</span>
      </button>
      <div class="menu-detail-body">
        <div class="menu-detail-content">
          ${detailContentHtml}
        </div>
      </div>
    ` : '';

    // 広告ガイドライン対応: 価格とリスクの同一視野明示
    const riskNoticeHtml = item.detail ? `
      <div class="menu-risk-notice">
        ※自由診療にはリスク・副作用があります。詳細は下記をご確認ください。
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
        ${riskNoticeHtml}
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
 * 【詳細テキスト整形ヘルパー】
 * 医療広告ガイドライン対応のため、副作用・リスク部分をパースして強調スタイルを当てはめます
 */
function formatDetail(detailText) {
  if (!detailText) return '';
  
  const lines = detailText.split('\n');
  let formattedHtml = '';
  
  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    
    // 「【タイトル】内容」の形式を検出
    const match = line.match(/^【(.*?)】(.*)$/);
    if (match) {
      const title = match[1];
      const body = match[2];
      const isWarning = title.includes('副作用') || title.includes('注意') || title.includes('リスク') || title.includes('対象外');
      const titleClass = isWarning ? 'detail-section-title warning' : 'detail-section-title';
      const titleIcon = isWarning ? '⚠️ ' : '✦ ';
      
      formattedHtml += `
        <div class="detail-section">
          <div class="${titleClass}">${titleIcon}${title}</div>
          <div class="detail-section-body">${body}</div>
        </div>
      `;
    } else {
      formattedHtml += `
        <div class="detail-section">
          <div class="detail-section-body">${line}</div>
        </div>
      `;
    }
  });
  
  return formattedHtml;
}

