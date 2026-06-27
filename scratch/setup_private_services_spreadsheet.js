/**
 * 春日部大西毎日腎クリニック 自由診療サイト
 * スプレッドシート初期セットアップ用スクリプト
 * 
 * 【使い方】
 * 1. 空の Google スプレッドシートを作成します。
 * 2. メニューから「拡張機能」 ＞ 「Apps Script」を開きます。
 * 3. 元からあるコードを消去し、このコードをすべて貼り付けます。
 * 4. 保存（Ctrl+S）し、上部の実行ボタン（関数名: initSpreadsheet）を押します。
 * 5. 実行が完了すると、A列にstatusが入った自由診療メニュー管理シートが自動構築されます。
 */

function initSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  
  // シートをクリア
  sheet.clear();
  sheet.clearConditionalFormatRules();
  
  // 1. ヘッダー行の設定 (statusを先頭のA列に配置)
  var headers = [
    'status',
    'id', 
    'category', 
    'title', 
    'price', 
    'description', 
    'detail', 
    'featured', 
    'badge'
  ];
  sheet.appendRow(headers);
  
  // ヘッダーデザイン調整
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f3f3f3');
  headerRange.setHorizontalAlignment('center');
  
  // 2. 初期メニューデータ (フォールバックの初期サンプル)
  var initialMenu = [
    [
      '表示中',
      'placenta-injection',
      '美容注射・点滴',
      'プラセンタ注射',
      '1,500円（税込）/ 1本',
      '疲労回復、免疫力向上、美肌効果に優れたプラセンタエキスを注射します。',
      '厚生労働省認可の安全な国産ヒトプラセンタ製剤を使用します。所要時間: 約5分。初回は医師による診察が必要です。主な副作用: 注射部位の軽度の赤みや硬結など。',
      true, // featured (チェックボックスが入る)
      'おすすめ'
    ],
    [
      '表示中',
      'vitamin-c-drip',
      '美容注射・点滴',
      '高濃度ビタミンC点滴',
      '8,500円（税込）/ 12.5g',
      '強力な抗酸化作用により、美白・美肌効果、免疫機能強化、エイジングケアに最適です。',
      'ビタミンCを高濃度で点滴し、体内の細胞に直接届けます。所要時間: 約40〜60分。初回のみG6PDスクリーニング検査（別料金）が必要となる場合があります。主な副作用: 血管痛、口渇など。',
      false,
      ''
    ],
    [
      '表示中',
      'medical-multivitamin',
      'サプリメント',
      '医療用マルチビタミン',
      '3,200円（税込）/ 30日分',
      '市販品よりも含有量が高く、吸収効率にこだわった医療用サプリメントです。',
      '毎日の健康維持や肌荒れ改善をサポートします。医師の診察に基づいて処方・販売いたします。',
      false,
      '人気'
    ],
    [
      '表示中',
      'tumor-marker',
      '検査・健診',
      'がん腫瘍マーカー検査（血液検査）',
      '5,500円（税込）',
      '血液採取のみで、がんのリスクを早期段階でスクリーニングする検査です。',
      '男性用・女性用それぞれの基本セット（CEA, AFP, CA19-9等）をご用意。人間ドックや一般健診のオプションとしても追加可能です。所要時間: 約10分（結果は後日郵送）。',
      false,
      ''
    ]
  ];
  
  for (var i = 0; i < initialMenu.length; i++) {
    sheet.appendRow(initialMenu[i]);
  }
  
  var maxRows = 100; // 100行目までルールを事前適用
  
  // A列（status: 掲載ステータス）のドロップダウン設定 (1列目)
  var statusRange = sheet.getRange(2, 1, maxRows - 1);
  var statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['表示中', '非表示'], true)
    .setAllowInvalid(false)
    .setHelpText('ステータスを「表示中」または「非表示」から選んでください。')
    .build();
  statusRange.setDataValidation(statusRule);
  
  // C列（category: 診療カテゴリ）のドロップダウン設定 (3列目)
  var categoryRange = sheet.getRange(2, 3, maxRows - 1);
  var categoryRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['美容注射・点滴', 'サプリメント', '検査・健診', 'その他'], true)
    .setAllowInvalid(false) // リスト外の入力を禁止
    .setHelpText('診療カテゴリを選択肢から選んでください。')
    .build();
  categoryRange.setDataValidation(categoryRule);
  
  // H列（featured: おすすめ表示）のチェックボックス設定 (8列目)
  var featuredRange = sheet.getRange(2, 8, maxRows - 1);
  featuredRange.insertCheckboxes();
  
  // 列幅を調整
  sheet.setColumnWidth(1, 100);  // status (A)
  sheet.setColumnWidth(2, 150);  // id (B)
  sheet.setColumnWidth(3, 150);  // category (C)
  sheet.setColumnWidth(4, 200);  // title (D)
  sheet.setColumnWidth(5, 200);  // price (E)
  sheet.setColumnWidth(6, 300);  // description (F)
  sheet.setColumnWidth(7, 350);  // detail (G)
  sheet.setColumnWidth(8, 80);   // featured (H)
  sheet.setColumnWidth(9, 100);  // badge (I)
  
  Logger.log('スプレッドシートの初期セットアップが完了しました！');
}
