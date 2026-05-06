/**
 * SITE_URL を一元的に解決するヘルパ。
 * - 本番: 環境変数 SITE_URL（例: https://machi-no-pro.com）
 * - 未設定時: astro.config.mjs と揃えたデフォルト
 *
 * astro.config.mjs と二重で参照しているのは、Astro 側 `site` は
 * ビルド時のサイトマップ生成等に使われ、こちらはランタイム描画で
 * canonical/OGP に埋め込むため。
 */
export const SITE_URL =
  process.env.SITE_URL ?? 'https://machi-no-pro.com';
