// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

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
          lastmod: new Date().toISOString().split('T')[0],
        };
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
