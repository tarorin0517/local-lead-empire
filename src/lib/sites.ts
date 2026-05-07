/**
 * サイトごとの _meta.json を束ねて読み込むヘルパ。
 * import.meta.glob は Vite の機能でビルド時に静的解決される。
 */

const metaModules = import.meta.glob<{ default: SiteMetaRaw }>(
  '../content/sites/*/_meta.json',
  { eager: true, import: 'default' },
);

export interface SiteOwner {
  name: string;
  address: string;
  email: string;
}

export interface SiteLegalLinks {
  tokushohoUrl: string;
  privacyUrl: string;
}

export interface SiteGeo {
  latitude: number;
  longitude: number;
}

export interface TrustBadge {
  label: string;
  value: string;
}

export interface BeforeAfterItem {
  caption: string;
  beforeAlt: string;
  afterAlt: string;
}

export interface ReasonItem {
  title: string;
  description: string;
}

export interface PriceRow {
  plan: string;
  first: string;
  additional: string;
}

export interface OptionItem {
  name: string;
  price: string;
}

export interface FlowStep {
  title: string;
  description: string;
}

export interface AreaWardItem {
  name: string;
  /** 地区別ページのスラッグ。設定されていれば AreaList でリンク化される。 */
  areaKey?: string;
}

export interface AreasGroup {
  cityWards: AreaWardItem[];
  outsideCity: string[];
}

export interface VoiceItem {
  alias: string;
  area: string;
  date: string;
  body: string;
  note?: string;
}

export interface CtaCopy {
  phonePrimary: string;
  phoneSecondary: string;
  formPrimary: string;
  lineLabel: string;
}

export interface SiteMetaRaw {
  siteKey: string;
  basePath: string;
  siteName: string;
  siteShortName?: string;
  tagline: string;
  city: string;
  prefecture?: string;
  niche: string;
  areaServed?: string[];

  phone: string;
  phoneHoursLabel?: string;
  openingHours?: string[];
  lineUrl?: string;
  contactFormUrl?: string;

  responseLabel?: string;
  priceRangeLabel?: string;
  priceRangeStructured?: string;
  achievementsLabel?: string;
  achievementsNote?: string;

  geo?: SiteGeo;
  sameAs?: string[];

  owner: SiteOwner;
  legal: SiteLegalLinks;
  insurance?: string[];

  ogImage?: string;
  logoPath?: string;

  trustBadges?: TrustBadge[];
  worries?: string[];
  beforeAfter?: BeforeAfterItem[];
  reasons?: ReasonItem[];
  priceTable?: PriceRow[];
  priceNote?: string;
  options?: OptionItem[];
  flow?: FlowStep[];
  areas?: AreasGroup;
  voices?: VoiceItem[];
  ctaCopy?: CtaCopy;
}

export interface SiteMeta extends SiteMetaRaw {
  /** "miyazaki" — basePath の最初のセグメント。動的ルーティングの [site] に対応 */
  firstSegment: string;
  /** "aircon-bunkai" や "areas/foo" のようなセグメント配列 */
  basePathSegments: string[];
  /** 末尾スラッシュ付きの URL パス: "/miyazaki/aircon-bunkai/" */
  baseUrlPath: string;
}

/**
 * 環境変数で運営者情報を上書きできるようにする
 * （PII を _meta.json にコミットしたくない場合に利用）。
 */
function applyOwnerOverrides(owner: SiteOwner): SiteOwner {
  return {
    name: process.env.SITE_OWNER_NAME ?? owner.name,
    address: process.env.SITE_OWNER_ADDRESS ?? owner.address,
    email: process.env.SITE_OWNER_EMAIL ?? owner.email,
  };
}

function normalize(raw: SiteMetaRaw): SiteMeta {
  const segments = raw.basePath.split('/').filter(Boolean);
  if (segments.length < 1) {
    throw new Error(
      `[sites] _meta.json の basePath は最低1セグメント必要です: ${raw.siteKey}`,
    );
  }
  return {
    ...raw,
    owner: applyOwnerOverrides(raw.owner),
    firstSegment: segments[0]!,
    basePathSegments: segments,
    baseUrlPath: `/${segments.join('/')}/`,
  };
}

const allSites: SiteMeta[] = Object.values(metaModules).map(normalize);

export function getAllSites(): SiteMeta[] {
  return allSites;
}

export function getSiteByKey(siteKey: string): SiteMeta | undefined {
  return allSites.find((s) => s.siteKey === siteKey);
}

/**
 * 最初のサイトを返す。legal/tokushoho など、サイト共通の運営者情報を
 * 出力するページで使う。複数サイトを 1 ドメインで運営しても、運営者は
 * 同一前提のため、最初のサイトの owner / legal で代表させる。
 */
export function getPrimarySite(): SiteMeta {
  const first = allSites[0];
  if (!first) throw new Error('[sites] _meta.json が 1 つも見つかりません');
  return first;
}

/**
 * Content Collection のエントリ ID から、所属サイトと相対パスを返す。
 *
 * Astro 6 の glob loader は index.md を "siteKey/index" ではなく
 * "siteKey" として登録するため、両形式に対応する。
 */
export function resolveEntry(entryId: string): {
  site: SiteMeta;
  relativePath: string;
  isIndex: boolean;
} | null {
  for (const site of allSites) {
    if (entryId === site.siteKey) {
      return { site, relativePath: '', isIndex: true };
    }
    const prefix = `${site.siteKey}/`;
    if (entryId.startsWith(prefix)) {
      const rel = entryId.slice(prefix.length);
      const isIndex = rel === 'index' || rel.endsWith('/index');
      let relativePath = isIndex ? rel.replace(/\/?index$/, '') : rel;
      relativePath = relativePath.replace(/^(areas|services|symptoms)\//, '');
      return { site, relativePath, isIndex };
    }
  }
  return null;
}

/**
 * 公開 URL（末尾スラッシュ付き）を組み立てる。
 */
export function buildUrlPath(site: SiteMeta, relativePath: string): string {
  if (!relativePath) return site.baseUrlPath;
  return `${site.baseUrlPath}${relativePath}/`;
}

/**
 * canonical URL を絶対 URL で返す。
 */
export function buildCanonical(siteUrl: string, urlPath: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}${urlPath}`;
}

/**
 * tel: リンク用に電話番号から区切り文字を除去。
 */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
