/**
 * Cloudflare Pages Middleware
 *
 * 役割:
 * - *.pages.dev プレビューに X-Robots-Tag: noindex, nofollow を付与
 *   (本番ドメイン machi-no-pro.com には付与しない)
 *
 * 配置: プロジェクトルート /functions/_middleware.ts
 *   ビルド成果物 /dist とは独立に Cloudflare Pages が自動的に
 *   Workers として配信する。
 */

export const onRequest: PagesFunction = async ({ request, next }) => {
  const url = new URL(request.url);
  const response = await next();
  if (url.hostname.endsWith('.pages.dev')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
};
