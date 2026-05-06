#!/usr/bin/env node
/**
 * src/assets/images/ にプレースホルダ SVG を一括生成する。
 *
 * 各 SVG は:
 *   - ブランド配色（青系グラデ＋オレンジアクセント）
 *   - 用途ラベル（"Hero" / "Before #1" / "STEP 3" 等）
 *   - 推奨ファイル名・地域名（宮崎市）を含む副ラベル
 *
 * 後で実写真に差し替えるとき、同じファイル名で .jpg を src/assets/images/ に
 * 上書きすれば import パスを変更せずに置換できる（拡張子変更時はコンポーネント側も更新）。
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(ROOT, '..', 'src', 'assets', 'images');

const PRIMARY_700 = '#1E40AF';
const PRIMARY_500 = '#0EA5E9';
const PRIMARY_900 = '#1E3A8A';
const ACCENT = '#F97316';
const WARN = '#F59E0B';
const SUCCESS = '#10B981';
const SLATE_200 = '#E2E8F0';

/**
 * 共通のラベル付きプレースホルダ SVG。
 *
 * @param {object} opt
 * @param {number} opt.w - viewBox width（実寸）
 * @param {number} opt.h - viewBox height（実寸）
 * @param {string} opt.label - 大ラベル
 * @param {string} opt.sublabel - 副ラベル
 * @param {string} [opt.tag] - 左上の小タグ（Before/After/STEP1 等）
 * @param {string} [opt.tagColor] - タグ背景色
 * @param {string} [opt.gradTo] - 背景グラデの終点色
 */
function placeholder({
  w,
  h,
  label,
  sublabel,
  tag,
  tagColor = PRIMARY_700,
  gradFrom = PRIMARY_500,
  gradTo = PRIMARY_900,
}) {
  const labelFs = Math.max(28, Math.round(Math.min(w, h) * 0.07));
  const subFs = Math.max(14, Math.round(Math.min(w, h) * 0.035));
  const tagFs = Math.max(12, Math.round(Math.min(w, h) * 0.028));
  const tagPad = Math.max(8, Math.round(Math.min(w, h) * 0.018));
  const tagH = tagFs + tagPad * 2;
  const tagW = tag ? tag.length * tagFs * 0.85 + tagPad * 2 : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${gradFrom}"/>
      <stop offset="100%" stop-color="${gradTo}"/>
    </linearGradient>
    <pattern id="grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  ${tag ? `<rect x="${Math.round(w * 0.03)}" y="${Math.round(h * 0.04)}" width="${Math.round(tagW)}" height="${tagH}" rx="6" fill="${tagColor}"/>
  <text x="${Math.round(w * 0.03 + tagPad)}" y="${Math.round(h * 0.04 + tagH / 2 + tagFs * 0.35)}"
        font-family="'Noto Sans JP','Hiragino Sans',sans-serif"
        font-size="${tagFs}" font-weight="700" fill="#FFFFFF">${tag}</text>` : ''}
  <text x="50%" y="46%" text-anchor="middle"
        font-family="'Noto Sans JP','Hiragino Sans',sans-serif"
        font-size="${labelFs}" font-weight="700" fill="#FFFFFF">${label}</text>
  <text x="50%" y="58%" text-anchor="middle"
        font-family="'Noto Sans JP','Hiragino Sans',sans-serif"
        font-size="${subFs}" font-weight="500" fill="rgba(255,255,255,0.8)">${sublabel}</text>
</svg>
`;
}

/**
 * Before/After 専用テンプレ（ラベル＋雰囲気の違いを色で表現）。
 */
function beforeAfter({ w, h, kind, n, caption }) {
  if (kind === 'before') {
    return placeholder({
      w, h,
      label: `Before #${n}`,
      sublabel: `宮崎市・${caption}（施工前）`,
      tag: 'BEFORE',
      tagColor: WARN,
      gradFrom: '#475569',
      gradTo: '#1E293B',
    });
  }
  return placeholder({
    w, h,
    label: `After #${n}`,
    sublabel: `宮崎市・${caption}（施工後）`,
    tag: 'AFTER',
    tagColor: SUCCESS,
    gradFrom: PRIMARY_500,
    gradTo: PRIMARY_900,
  });
}

const beforeAfterCaptions = {
  1: 'ファン部分のカビ除去',
  2: '熱交換器の汚れ除去',
  3: 'ドレンパンの汚れ除去',
};

const flowSteps = {
  1: { label: 'STEP1 ご予約', sub: '宮崎市・お問い合わせ' },
  2: { label: 'STEP2 養生', sub: '宮崎市・床と家具を保護' },
  3: { label: 'STEP3 分解', sub: '宮崎市・取り外しと分解' },
  4: { label: 'STEP4 洗浄', sub: '宮崎市・高圧洗浄と乾燥' },
  5: { label: 'STEP5 完了', sub: '宮崎市・動作確認と引渡' },
};

const files = [];

// Hero (1920x1080)
files.push({
  name: 'hero.svg',
  svg: placeholder({
    w: 1920,
    h: 1080,
    label: '宮崎市・エアコン分解洗浄',
    sublabel: '1台目 9,800円〜（税込）／即日対応・損害保険加入',
    tag: 'HERO',
    tagColor: ACCENT,
    gradFrom: PRIMARY_500,
    gradTo: PRIMARY_900,
  }),
});

// Before/After ×3 (800x600)
for (let i = 1; i <= 3; i++) {
  files.push({
    name: `before-${i}.svg`,
    svg: beforeAfter({ w: 800, h: 600, kind: 'before', n: i, caption: beforeAfterCaptions[i] }),
  });
  files.push({
    name: `after-${i}.svg`,
    svg: beforeAfter({ w: 800, h: 600, kind: 'after', n: i, caption: beforeAfterCaptions[i] }),
  });
}

// Flow steps ×5 (400x400)
for (let i = 1; i <= 5; i++) {
  const step = flowSteps[i];
  files.push({
    name: `flow-${i}.svg`,
    svg: placeholder({
      w: 400,
      h: 400,
      label: step.label,
      sublabel: step.sub,
      tag: `STEP${i}`,
      tagColor: PRIMARY_700,
      gradFrom: PRIMARY_500,
      gradTo: PRIMARY_900,
    }),
  });
}

// 補助画像（現状未使用だが将来の差し替え用に枠を確保）
const aux = [
  { name: 'work-cleaning.svg', w: 800, h: 600, label: '作業中（高圧洗浄）', sub: '宮崎市・分解洗浄の作業風景', tag: 'WORK' },
  { name: 'work-protection.svg', w: 800, h: 600, label: '養生作業', sub: '宮崎市・床と家具の保護', tag: 'PROTECT' },
  { name: 'staff.svg', w: 800, h: 600, label: 'スタッフ', sub: '宮崎市・地元密着スタッフ', tag: 'STAFF' },
  { name: 'handover.svg', w: 800, h: 600, label: '完了・お引渡し', sub: '宮崎市・動作確認と引渡', tag: 'DONE' },
];
for (const a of aux) {
  files.push({
    name: a.name,
    svg: placeholder({
      w: a.w, h: a.h, label: a.label, sublabel: a.sub, tag: a.tag,
      tagColor: PRIMARY_700, gradFrom: PRIMARY_500, gradTo: PRIMARY_900,
    }),
  });
}

// OG (1200x630) — public/og 側に既存だが、src/assets 側にも配置（コンポーネント import 用途）
files.push({
  name: 'og.svg',
  svg: placeholder({
    w: 1200,
    h: 630,
    label: '宮崎市のエアコン分解洗浄',
    sublabel: '1台目 9,800円〜・即日対応・損害保険加入｜まちのプロ',
    tag: 'OG',
    tagColor: ACCENT,
    gradFrom: PRIMARY_500,
    gradTo: PRIMARY_900,
  }),
});

await mkdir(OUT, { recursive: true });
for (const f of files) {
  await writeFile(resolve(OUT, f.name), f.svg, 'utf8');
}
console.log(`generated ${files.length} files in ${OUT}`);
