// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync, readFileSync } from 'fs';
import { resolve, join } from 'path';

// サイトマップ用: コンテンツファイルの updatedDate / pubDate を URL にマッピング
// URL例: /miyazaki/aircon-bunkai/columns/diy-vs-pro/
// ファイル: src/content/sites/miyazaki-aircon/columns/diy-vs-pro.md
function buildLastmodMap() {
  const map = new Map();
  const sitesDir = resolve('./src/content/sites');
  const dateRe = /(?:updatedDate|pubDate):\s*(\d{4}-\d{2}-\d{2})/g;

  try {
    for (const site of readdirSync(sitesDir)) {
      const metaPath = join(sitesDir, site, '_meta.json');
      let basePath = '';
      try {
        const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
        basePath = '/' + meta.basePath.replace(/^\/|\/$/g, '') + '/';
      } catch { continue; }

      const siteDir = join(sitesDir, site);
      for (const sub of readdirSync(siteDir)) {
        const subDir = join(siteDir, sub);
        try {
          if (!readdirSync(subDir)) continue;
        } catch { continue; }
        for (const file of readdirSync(subDir)) {
          if (!file.endsWith('.md')) continue;
          const slug = file.replace(/\.md$/, '');
          const content = readFileSync(join(subDir, file), 'utf8');
          const url = sub === 'index'
            ? basePath
            : `${basePath}${sub}/${slug}/`;

          let date = null;
          let m;
          dateRe.lastIndex = 0;
          while ((m = dateRe.exec(content)) !== null) {
            if (!date || m[1] > date) date = m[1]; // updatedDate を優先
          }
          if (date) map.set(url, date);
        }
      }
      // index.md
      try {
        const idx = readFileSync(join(siteDir, 'index.md'), 'utf8');
        let date = null, m;
        dateRe.lastIndex = 0;
        while ((m = dateRe.exec(idx)) !== null) {
          if (!date || m[1] > date) date = m[1];
        }
        if (date) map.set(basePath, date);
      } catch { /* no index.md */ }
    }
  } catch { /* sitesDir not found during type-check */ }
  return map;
}

const lastmodMap = buildLastmodMap();
const TODAY = new Date().toISOString().split('T')[0];

const SITE_URL = process.env.SITE_URL ?? 'https://machi-no-pro.com';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      // ルート / は内部用 noindex インデックスのため除外
      filter: (page) => {
        const url = new URL(page);
        if (url.pathname === '/') return false;
        if (url.pathname.startsWith('/admin/')) return false;
        if (url.pathname.startsWith('/legal/')) return false;
        return true;
      },
      serialize(item) {
        const url = new URL(item.url);
        const parts = url.pathname.replace(/^\/|\/$/g, '').split('/');
        // /city/niche/ → トップページ（最重要）
        const isTop = parts.length === 2;
        // /city/niche/areas|symptoms|services/slug → 中ページ
        const isMid = parts.length === 4 && ['areas', 'symptoms', 'services'].includes(parts[2]);
        // /city/niche/columns/slug → コラム（SEO集客記事）
        const isColumn = parts.length === 4 && parts[2] === 'columns';

        return {
          ...item,
          priority: isTop ? 1.0 : isMid ? 0.8 : isColumn ? 0.7 : 0.6,
          changefreq: isTop ? 'weekly' : 'monthly',
          lastmod: lastmodMap.get(url.pathname) ?? TODAY,
        };
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
