# local-lead-empire

九州・四国・中国地方の **市町村 × ニッチ業種** SEO サイトを 1 つの
Astro プロジェクト内にサブディレクトリ方式で量産するための基盤です。

- 1 つのドメイン (`machi-no-pro.com`) 配下に複数サイトをホスト
- URL 例: `machi-no-pro.com/miyazaki/aircon-bunkai/`
- 各サイトは Markdown ベースの記事 + 共通レイアウト + 構造化データ
- 静的書き出し → Cloudflare Pages へ配信

---

## クイックスタート

```sh
# 開発
npm run dev          # http://localhost:4321/miyazaki/aircon-bunkai/

# 本番ビルド
npm run build        # ./dist/ に書き出し

# ビルド成果物のプレビュー
npm run preview
```

Node.js は 20 以上を推奨。本リポジトリは Node 22+ 環境で動作確認済み。

---

## ディレクトリ構成

```
local-lead-empire/
├ src/
│  ├ content.config.ts             … Content Collections スキーマ
│  ├ content/
│  │  └ sites/
│  │     └ miyazaki-aircon/        … サイト1つ = 1ディレクトリ
│  │        ├ _meta.json           … サイトメタ情報（後述）
│  │        ├ index.md             … トップページ
│  │        ├ areas/               … 市内地区別ページ
│  │        ├ symptoms/            … 症状別ページ
│  │        └ services/            … サービス別ページ
│  ├ layouts/SiteLayout.astro      … 共通レイアウト
│  ├ components/
│  │  ├ Header.astro               … ロゴ + 電話CTA + フォームCTA
│  │  ├ Footer.astro               … 運営者情報・特商法・プライバシー
│  │  ├ ContactForm.astro          … Google Forms 埋め込み枠
│  │  ├ StructuredData.astro       … LocalBusiness/Service/Article/FAQ/Breadcrumb
│  │  └ SEO.astro                  … title/description/canonical/OGP/Twitter
│  ├ pages/
│  │  ├ index.astro                … 内部用インデックス（noindex）
│  │  └ [site]/[...slug].astro     … 動的ルーティング
│  ├ lib/
│  │  ├ sites.ts                   … _meta.json 読み込みヘルパ
│  │  └ site-url.ts                … SITE_URL 解決
│  └ styles/global.css
├ public/
│  ├ _headers                      … Cloudflare Pages のキャッシュ設定
│  ├ _redirects
│  ├ robots.txt
│  └ favicon.svg
├ functions/_middleware.ts         … *.pages.dev に X-Robots-Tag を付与
├ astro.config.mjs
├ tsconfig.json                    … strict
├ package.json
└ .env.example
```

---

## URL ルーティングの仕組み

`src/pages/[site]/[...slug].astro` 1 つで、すべてのサイト・全記事を
静的書き出しします。

各サイトの URL は `_meta.json` の `basePath` で決まります。

| `_meta.json` の `basePath`  | コンテンツのファイル          | 生成 URL                                       |
| --------------------------- | ----------------------------- | ---------------------------------------------- |
| `miyazaki/aircon-bunkai`    | `index.md`                    | `/miyazaki/aircon-bunkai/`                     |
| `miyazaki/aircon-bunkai`    | `symptoms/kabi-nioi.md`       | `/miyazaki/aircon-bunkai/symptoms/kabi-nioi/`  |
| `amakusa/jokasou`           | `areas/hondo.md`              | `/amakusa/jokasou/areas/hondo/`                |

`[site]` は `basePath` の最初のセグメント、`[...slug]` は残り全部 + 記事の
相対パスです。

---

## 新しいサイトを追加する手順

1. `src/content/sites/<siteKey>/` ディレクトリを作成
   （例: `src/content/sites/amakusa-jokasou/`）

2. `_meta.json` をコピーして編集:

   ```json
   {
     "siteKey": "amakusa-jokasou",
     "basePath": "amakusa/jokasou",
     "siteName": "天草浄化槽サポート",
     "siteShortName": "天草浄化槽サポート",
     "tagline": "...",
     "city": "天草市",
     "prefecture": "熊本県",
     "niche": "浄化槽清掃",
     "areaServed": ["天草市", "天草市本渡町"],
     "phone": "050-XXXX-XXXX",
     "phoneHoursLabel": "受付 9:00-18:00",
     "priceRangeLabel": "定期清掃 12,000円〜",
     "responseLabel": "最短即日対応",
     "contactFormUrl": "",
     "owner": {
       "name": "...",
       "address": "...",
       "email": "..."
     },
     "legal": {
       "tokushohoUrl": "/amakusa/jokasou/legal/tokushoho/",
       "privacyUrl": "/amakusa/jokasou/legal/privacy/"
     },
     "ogImage": "/og/amakusa-jokasou.png"
   }
   ```

3. `index.md` を作成（必須フロントマターは下表）

4. `npm run dev` で `http://localhost:4321/<basePath>/` が出ることを確認

---

## 記事を追加する手順

`src/content/sites/<siteKey>/` 配下に Markdown を置くだけで
動的ルートが自動生成されます。

| 配置場所                | 役割     | URL 例                                                |
| ----------------------- | -------- | ----------------------------------------------------- |
| `index.md`              | トップ   | `/<basePath>/`                                        |
| `areas/<slug>.md`       | 地区別   | `/<basePath>/areas/<slug>/`                           |
| `symptoms/<slug>.md`    | 症状別   | `/<basePath>/symptoms/<slug>/`                        |
| `services/<slug>.md`    | サービス | `/<basePath>/services/<slug>/`                        |

### 必須フロントマター

```yaml
---
title: ...               # SEO用タイトル（60字以内推奨）
description: ...         # メタディスクリプション（120字以内推奨）
city: 宮崎市             # 必須
niche: エアコン分解洗浄  # 必須
pubDate: 2026-05-06      # 必須
author: 運営者本名       # 必須

# 任意
updatedDate: 2026-06-01
area: 佐土原町
symptom: カビ臭
pageType: article        # top | article | service | area | symptom
faqs:                    # ある記事には FAQPage 構造化データを自動付与
  - question: ...
    answer: ...
draft: true              # true なら出力しない
---
```

スキーマは `src/content.config.ts` で定義しており、規約違反は
ビルド時に必ずエラーになります。

---

## SEO・構造化データ

| ページ種別      | 自動出力される JSON-LD                     |
| --------------- | ------------------------------------------ |
| トップ          | LocalBusiness + Service + (FAQ) + Breadcrumb |
| 記事            | LocalBusiness + Service + Article + Breadcrumb |
| FAQ あり        | 上記 + FAQPage                             |

`canonical` / OGP / Twitter Cards / `robots` メタは `src/components/SEO.astro`
が自動付与します。サイトマップは `@astrojs/sitemap` でビルド時に生成され、
`dist/sitemap-index.xml` に出ます。ルート `/` は noindex のため
サイトマップから除外しています。

---

## 環境変数

`.env.example` をコピーして `.env` に。

| 変数               | 用途                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| `SITE_URL`         | 本番ドメイン（既定: `https://machi-no-pro.com`）。canonical/OGP/sitemap に反映 |
| `SITE_OWNER_NAME`  | 運営者本名（_meta.json より優先。PII を Git に置きたくない場合）         |
| `SITE_OWNER_ADDRESS` | 所在地                                                                 |
| `SITE_OWNER_EMAIL` | 連絡先メール                                                             |

Cloudflare Pages 側でも同名の環境変数を設定すれば、本番ビルドに反映されます。

---

## Cloudflare Pages へのデプロイ

1. **GitHub と接続**
   - Pages > Create a project > Connect to Git
   - リポジトリ: `local-lead-empire`
   - Production branch: `main`

2. **ビルド設定**
   - Framework preset: **Astro**
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node.js version: `20` 以上

3. **環境変数**
   - 上記 `SITE_URL` などを Production / Preview それぞれに設定

4. **カスタムドメイン**
   - `machi-no-pro.com` を Custom domains に追加
   - Cloudflare の DNS で proxied で当てる

5. **プレビュー (`*.pages.dev`) の noindex**
   - `functions/_middleware.ts` がホスト名を見て自動で
     `X-Robots-Tag: noindex, nofollow` を付与する。設定不要。

---

## 法務・E-E-A-T 運用ルール（コンテンツ作成チェックリスト）

このサイト群は **自社サービスサイト型** として運用します。
記事生成（Claude Code 等）の際は以下を必ず守ってください。

- ✅ フッターに運営者情報（本名・所在地・連絡先）を必ず表示する
- ✅ 「特定商取引法に基づく表記」「プライバシーポリシー」へのリンクを表示する
- ✅ 各サイトはステマ規制（景品表示法）対応のため、運営者を冒頭で明示する
- ❌ 「業界 No.1」「最安値」「絶対」「100% 保証」など、根拠のない誇大表現は使わない
- ❌ 複数業者を比較ランキング化する構造にしない（自社紹介としての構造を維持）
- ❌ 体験談・口コミの捏造禁止。掲載する場合は出典・取得日・本人の同意を確認
- ❌ 医療・法律・金融の YMYL 領域では断定的な助言は書かない

> ⚠️ 上記 NG ワード（「業界 No.1」「最安値」など）はコンテンツ生成時の
> 自動チェック対象です。Claude Code でドラフトを書くとき、これらの
> リストをプロンプト先頭に「禁止ワード」として渡してください。

---

## よく使うコマンド

| Command                | Action                                          |
| ---------------------- | ----------------------------------------------- |
| `npm install`          | 依存をインストール                              |
| `npm run dev`          | 開発サーバ起動 (`localhost:4321`)               |
| `npm run build`        | `./dist/` へ静的書き出し                        |
| `npm run preview`      | ビルド成果物をプレビュー                        |
| `npx astro sync`       | Content Collections の型を再生成                |

---

## 次にやること（次セッション）

- [ ] 宮崎×エアコンの本記事（地区別・症状別・サービス別）を投入
- [ ] 運営者情報（実名・所在地・メール）を `_meta.json` または環境変数に設定
- [ ] Google Forms の埋め込み URL を `_meta.json` の `contactFormUrl` に設定
- [ ] 電話番号を実番号に差し替え
- [ ] OG 画像 `/public/og/miyazaki-aircon.png` を作成
- [ ] Cloudflare Pages にデプロイ・カスタムドメイン接続
- [ ] Search Console / Bing Webmaster Tools にサイトマップ登録
