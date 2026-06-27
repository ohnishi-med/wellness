# AGENTS.md — private-services-site（自由診療専用ページ）

## プロジェクト概要

クリニックの自由診療（注射・点滴、サプリメント、美容等）を魅力的に伝えるための専用サイトです。
Googleスプレッドシートからメニューや価格表データをGAS経由で動的ロードする構造を持ちます。

- **本番URL**: `https://wellness.mainichi.clinic/`
- **デプロイ方式**: GitHub Actions + FTP Deploy

---

## 技術スタック

- **フロントエンド**: HTML5, Vanilla CSS (プレミアムな高級感のある明るいデザイン、微細アニメーション付き), Vanilla JS (非同期データフェッチ、カテゴリタブ切り替えなど)
- **データソース**: Googleスプレッドシート（GASウェブアプリによるCORS対応JSON配信）
- **ビルドツール**: Python スクリプト (`tools/build.py`) による `src` から `dist` へのコピー
- **CI/CD**: GitHub Actions (`.github/workflows/deploy.yml`)

---

## フォルダ構成

```text
private-services-site/
├── .github/
│   └── workflows/
│       └── deploy.yml          # FTP自動デプロイ設定
├── src/                        # ソースコード
│   ├── index.html              # メインHTML
│   ├── assets/
│   │   ├── style.css           # プレミアムデザインCSS
│   │   └── app.js              # フロントエンドロジック
│   └── data/
│       └── menu_fallback.json  # バックアップメニューデータ
├── tools/
│   └── build.py                # ビルドスクリプト
├── AGENTS.md                   # プロジェクトルール（本ファイル）
├── requirements.md             # 要件定義書
└── devlog.md                   # 開発履歴
```

---

## 重要なルール

- **高級感あるデザイン**: 自費診療にふさわしいプレミアムな美しさ（シャンパンゴールド `#d4af37` をアクセントに、オフホワイト背景、細身の明朝・ゴシック系フォント）を適用します。
- **データローディングの安定性**: 万が一Google APIがダウンしても、フォールバックの `menu_fallback.json` を非同期で読み込んで表示が崩れない安全設計にします。
- **モバイル対応**: スマートフォンでの閲覧に最適化した、使いやすいカテゴリ切り替えタブとアコーディオンリストを実装します。

---

*最終更新: 2026-06-27*
