#!/usr/bin/env node
/**
 * 新都市×業種サイトの雛形を生成する。
 *
 * 使い方:
 *   node scripts/new-site.mjs \
 *     --city kochi \
 *     --service aircon-bunkai \
 *     --city-jp 高知市 \
 *     --prefecture 高知県 \
 *     --template miyazaki-aircon
 *
 * 必須:
 *   --city         新都市のkebab-caseキー（例: kochi, uto, tokushima）
 *   --service      業種キー（aircon-bunkai / jokasou / akiya-kanri など）
 *   --city-jp      新都市の日本語表記（例: 高知市）
 *   --prefecture   都道府県（例: 高知県）
 *   --template     既存サイトのsiteKey（例: miyazaki-aircon）
 *
 * オプション:
 *   --site-name    siteName を明示（既定: 「{city-jp}{業種名}サポート」）
 *   --short-name   siteShortName を明示（既定: 「まちのプロ｜{city-jp}{業種短名}」）
 *   --phone        専用電話番号（既定: プレースホルダ）
 *   --force        既存サイトを上書き
 *
 * 生成内容:
 *   src/content/sites/{city}-{service-short}/
 *     ├ _meta.json          # テンプレからコピー＋都市情報を差し替え
 *     └ index.md            # スタブ（タイトル・description のみ）
 *
 * 既存テンプレの areas/columns/symptoms/services は意図的にコピーしない。
 * 各都市で40%以上の差別化が必要なため、Claudeに別途生成依頼するのが安全。
 */
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITES_DIR = resolve(ROOT, 'src', 'content', 'sites');

// ---------- CLI 引数パース ----------
function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (!k.startsWith('--')) continue;
    const key = k.slice(2);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = v;
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv);

const required = ['city', 'service', 'city-jp', 'prefecture', 'template'];
const missing = required.filter((k) => !args[k]);
if (missing.length > 0) {
  console.error(`❌ 必須引数が不足: ${missing.join(', ')}`);
  console.error('使い方は scripts/new-site.mjs 冒頭のコメントを参照');
  process.exit(1);
}

const cityKey = args.city;
const serviceKey = args.service;
const cityJp = args['city-jp'];
const prefecture = args.prefecture;
const templateKey = args.template;

// 業種キー → 短縮形（siteKey用）の対応
const SERVICE_SHORT = {
  'aircon-bunkai': 'aircon',
  'jokasou': 'jokasou',
  'akiya-kanri': 'akiya',
  'kusakari': 'kusakari',
  'fuyouhin': 'fuyouhin',
};

// 業種キー → 日本語名・短名の対応
const SERVICE_LABELS = {
  'aircon-bunkai': { full: 'エアコン分解洗浄', short: 'エアコン' },
  'jokasou': { full: '浄化槽清掃', short: '浄化槽' },
  'akiya-kanri': { full: '空き家管理', short: '空き家' },
  'kusakari': { full: '草刈り', short: '草刈り' },
  'fuyouhin': { full: '不用品回収', short: '不用品' },
};

const serviceShort = SERVICE_SHORT[serviceKey] ?? serviceKey;
const serviceLabel = SERVICE_LABELS[serviceKey];
if (!serviceLabel) {
  console.warn(`⚠️  業種ラベル未定義: ${serviceKey}。汎用表記で続行します。`);
}

const newSiteKey = `${cityKey}-${serviceShort}`;
const newSitePath = resolve(SITES_DIR, newSiteKey);
const templatePath = resolve(SITES_DIR, templateKey);

// ---------- 検証 ----------
if (!existsSync(templatePath)) {
  console.error(`❌ テンプレートサイトが見つかりません: ${templateKey}`);
  console.error(`   利用可能: ${(await listDirs(SITES_DIR)).join(', ')}`);
  process.exit(1);
}

if (existsSync(newSitePath) && !args.force) {
  console.error(`❌ サイトが既に存在: ${newSiteKey}`);
  console.error('   上書きするには --force を付けてください');
  process.exit(1);
}

// ---------- テンプレ _meta.json 読み込み ----------
const templateMetaPath = resolve(templatePath, '_meta.json');
const templateMetaRaw = await readFile(templateMetaPath, 'utf-8');
const templateMeta = JSON.parse(templateMetaRaw);

// テンプレ元の都市名を後で置換するため記録
const oldCityJp = templateMeta.city;
const oldPrefecture = templateMeta.prefecture;

// ---------- 新サイトの _meta.json 構築 ----------
const newMeta = JSON.parse(JSON.stringify(templateMeta)); // deep copy

newMeta.siteKey = newSiteKey;
newMeta.basePath = `${cityKey}/${serviceKey}`;
newMeta.city = cityJp;
newMeta.prefecture = prefecture;
newMeta.niche = serviceLabel?.full ?? templateMeta.niche;

// 表示名
newMeta.siteName = args['site-name']
  ?? `${cityJp}${serviceLabel?.full ?? '業者'}サポート`;
newMeta.siteShortName = args['short-name']
  ?? `まちのプロ｜${cityJp}${serviceLabel?.short ?? ''}`;

// 専用電話番号（指定なければプレースホルダ）
newMeta.phone = args.phone ?? '050-0000-0000';

// 都市依存値はプレースホルダにリセット
newMeta.geo = { latitude: 0, longitude: 0 };
newMeta.tagline = `${cityJp}の${serviceLabel?.full ?? '業者'}を、安心・丁寧にサポート`;

// OG画像パスは新キーに合わせる（実画像は別途用意）
newMeta.ogImage = `/og/${newSiteKey}.svg`;

// 既存の都市名混在を発見して TODO 付きで残す
// 単純置換だと「鹿児島県」のような owner.address まで書き換わるので、
// 限定的に「タグライン」「お客様の声」「お困りごと」など、本文系のみ置換対象
const TEXT_FIELDS_TO_SCAN = [
  'tagline',
  'responseLabel',
  'priceRangeLabel',
  'achievementsLabel',
  'achievementsNote',
];
for (const f of TEXT_FIELDS_TO_SCAN) {
  if (typeof newMeta[f] === 'string' && oldCityJp) {
    newMeta[f] = newMeta[f].replaceAll(oldCityJp, cityJp);
  }
}

// 配列内のテキスト（worries, voices, flow.description, areas.outsideCity 等）も
// 都市名は書き換えるが、地区名は手動で書き直す必要がある
function scrubCityRefs(obj) {
  if (Array.isArray(obj)) {
    return obj.map(scrubCityRefs);
  }
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = scrubCityRefs(v);
    }
    return out;
  }
  if (typeof obj === 'string' && oldCityJp) {
    return obj.replaceAll(oldCityJp, cityJp);
  }
  return obj;
}

// 都市名のみシンプル置換。地区名は手動修正必須。
newMeta.worries = scrubCityRefs(newMeta.worries);
newMeta.flow = scrubCityRefs(newMeta.flow);
newMeta.voices = scrubCityRefs(newMeta.voices);
if (newMeta.areas?.outsideCity) {
  newMeta.areas.outsideCity = scrubCityRefs(newMeta.areas.outsideCity);
}

// areas.cityWards は地区名なので手動書き換え対象 → プレースホルダに置換
if (newMeta.areas?.cityWards) {
  newMeta.areas.cityWards = [
    { name: '【TODO地区1】', areaKey: 'todo-area-1' },
    { name: '【TODO地区2】', areaKey: 'todo-area-2' },
    { name: '【TODO地区3】', areaKey: 'todo-area-3' },
  ];
}

// ---------- 新サイトディレクトリ作成 ----------
await mkdir(newSitePath, { recursive: true });

// _meta.json 書き込み
const newMetaPath = resolve(newSitePath, '_meta.json');
await writeFile(newMetaPath, JSON.stringify(newMeta, null, 2) + '\n', 'utf-8');

// index.md スタブ作成
const today = new Date().toISOString().slice(0, 10);
const indexMd = `---
title: ${cityJp}の${serviceLabel?.full ?? '業者'}｜${newMeta.siteName}
description: ${cityJp}の${serviceLabel?.full ?? '業者'}を、地元密着で承ります。【TODO: 都市固有の特徴を踏まえた120字以内のdescに書き換える】
city: ${cityJp}
niche: ${newMeta.niche}
pubDate: ${today}
updatedDate: ${today}
author: 野中倫太郎
pageType: top
---

# ${cityJp}の${serviceLabel?.full ?? '業者'}

【TODO: ${cityJp}の地理・気候・人口動態の固有事情を踏まえた導入文を書く。最低300字以上で、テンプレ元の${oldCityJp}と内容が40%以上異なるようにする】
`;
await writeFile(resolve(newSitePath, 'index.md'), indexMd, 'utf-8');

// ---------- ヘルパー ----------
async function listDirs(dir) {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

// ---------- 完了サマリ ----------
console.log('');
console.log(`✅ サイト雛形を生成しました: ${newSiteKey}`);
console.log('');
console.log('📁 生成ファイル:');
console.log(`   ${newSitePath}/_meta.json`);
console.log(`   ${newSitePath}/index.md`);
console.log('');
console.log('🔧 手動編集が必要な項目（_meta.json）:');
console.log('   - geo.latitude / geo.longitude  ← 0,0 をプレースホルダで設定済');
console.log('   - phone                         ← 050-0000-0000 のまま (専用番号取得後に差し替え)');
console.log('   - areas.cityWards               ← 【TODO地区1〜3】を実在の地区名に置換');
console.log('   - priceTable / options          ← 地域相場に合わせて調整');
console.log('   - trustBadges                   ← 「●●件」を実数に置換');
console.log('   - voices                        ← 仮アリアスを地区固有のものに置換');
console.log('');
console.log('📄 index.md 本文:');
console.log(`   テンプレ元(${templateKey})と40%以上異なる地域固有の導入文を執筆`);
console.log('');
console.log('🆕 追加ページ（areas / columns / symptoms / services）:');
console.log('   Claudeに「新サイト『' + newSiteKey + '』を' + (templateKey) + 'を参考に拡張」と依頼');
console.log(`   推奨構成: areas 8本, columns 8本, symptoms 5本, services 3本`);
console.log('');
console.log('🚀 次のコマンド:');
console.log('   npm run dev    # 開発確認');
console.log('   npm run build  # ビルド検証');
console.log('');
