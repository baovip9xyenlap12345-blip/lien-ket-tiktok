// Ket noi WordPress qua REST API bang "Application Password" (Mat khau ung dung)
// Tai khoan lay tu bien moi truong, KHONG bao gio ghi thang vao ma nguon.
//   WP_URL           = https://ten-mien-cua-ban
//   WP_USERNAME      = ten dang nhap WordPress
//   WP_APP_PASSWORD  = chuoi 24 ky tu WordPress cap (co the giu nguyen khoang trang)

const WP_URL = (process.env.WP_URL || '').trim().replace(/\/+$/, '');
const WP_USERNAME = (process.env.WP_USERNAME || '').trim();
// WordPress hien thi mat khau ung dung theo dang "abcd efgh ..." - bo khoang trang truoc khi dung
const WP_APP_PASSWORD = (process.env.WP_APP_PASSWORD || '').replace(/\s+/g, '');
const WP_TIMEOUT_MS = parseInt(process.env.WP_TIMEOUT_MS || '20000', 10);

// Cac truong cho phep sua - chan viec gui bua field la vao WordPress
const ACCOUNT_FIELDS = ['name', 'first_name', 'last_name', 'nickname', 'email', 'url', 'description', 'locale'];
const SETTINGS_FIELDS = [
  'title', 'description', 'email', 'timezone', 'date_format', 'time_format',
  'start_of_week', 'language', 'use_smilies', 'default_category', 'default_post_format',
  'posts_per_page', 'show_on_front', 'page_on_front', 'page_for_posts', 'default_ping_status',
  'default_comment_status', 'site_icon', 'site_logo',
];

export class WpError extends Error {
  constructor(message, status = 502, code = '') {
    super(message);
    this.name = 'WpError';
    this.status = status;
    this.code = code;
  }
}

export function wpConfigured() {
  return !!(WP_URL && WP_USERNAME && WP_APP_PASSWORD);
}

// Trang thai cau hinh - KHONG tra ve mat khau that, chi tra do dai de kiem tra da dan du chua
export function wpStatus() {
  return {
    configured: wpConfigured(),
    url: WP_URL || null,
    username: WP_USERNAME || null,
    appPasswordLength: WP_APP_PASSWORD.length,
    appPasswordMasked: WP_APP_PASSWORD ? '•'.repeat(WP_APP_PASSWORD.length) : null,
    missing: [
      !WP_URL && 'WP_URL',
      !WP_USERNAME && 'WP_USERNAME',
      !WP_APP_PASSWORD && 'WP_APP_PASSWORD',
    ].filter(Boolean),
  };
}

function authHeader() {
  return 'Basic ' + Buffer.from(`${WP_USERNAME}:${WP_APP_PASSWORD}`).toString('base64');
}

// Doi loi ky thuat cua WordPress thanh cau tieng Viet de hieu
function friendlyError(status, code, message) {
  if (status === 401) {
    return 'Sai ten dang nhap hoac mat khau ung dung. Hay tao lai mat khau ung dung trong WordPress (Users > Profile > Application Passwords).';
  }
  if (status === 403) {
    if (code) {
      // Co ma loi cua WordPress -> dung la van de quyen han
      return 'Tai khoan nay khong du quyen (can vai tro Quan tri vien - Administrator) de xem/sua muc nay.';
    }
    // Khong co ma loi WordPress -> nhieu kha nang bi chan trươc khi toi WordPress
    return 'Bi tu choi (403) truoc khi toi duoc WordPress. Thuong do tuong lua/CDN/proxy cua mang dang chay may chu nay chan, hoac plugin bao mat (Wordfence, iThemes...) chan REST API. Thu chay "npm run wp:check" tren may khac de doi chieu.';
  }
  if (status === 404 && (code === 'rest_no_route' || !code)) {
    return 'Khong tim thay REST API tai dia chi nay. Hay kiem tra WP_URL va bat Duong dan tinh (Settings > Permalinks) trong WordPress.';
  }
  if (status === 429) return 'WordPress dang chan vi goi qua nhieu lan, thu lai sau vai phut.';
  return message || `WordPress tra ve loi ${status}`;
}

// Goi REST API cua WordPress. path bat dau bang "/" tinh tu goc /wp-json
export async function wpFetch(path, { method = 'GET', body, query } = {}) {
  if (!wpConfigured()) {
    const missing = wpStatus().missing.join(', ');
    throw new WpError(`Chua cau hinh ket noi WordPress (thieu: ${missing}). Hay dien vao file .env roi khoi dong lai may chu.`, 500, 'wp_not_configured');
  }

  let url;
  try {
    url = new URL(WP_URL + '/wp-json' + path);
  } catch {
    throw new WpError(`WP_URL khong hop le: "${WP_URL}". Vi du dung: https://buihuubao.vn`, 500, 'wp_bad_url');
  }
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), WP_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(url, {
      method,
      headers: {
        Authorization: authHeader(),
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ac.signal,
      redirect: 'follow',
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new WpError(`Ket noi toi ${WP_URL} qua ${WP_TIMEOUT_MS / 1000}s khong phan hoi.`, 504, 'wp_timeout');
    }
    throw new WpError(`Khong ket noi duoc toi ${WP_URL} (${err.cause?.code || err.message}). Kiem tra ten mien, HTTPS va tuong lua.`, 502, 'wp_unreachable');
  } finally {
    clearTimeout(timer);
  }

  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* khong phai JSON */ }

  if (!resp.ok) {
    const code = data?.code || '';
    const msg = data?.message || (text.trim().startsWith('<') ? '' : text.slice(0, 200));
    throw new WpError(friendlyError(resp.status, code, msg), resp.status, code);
  }
  if (data === null && text.trim().startsWith('<')) {
    throw new WpError('Dia chi nay tra ve HTML chu khong phai REST API. Kiem tra lai WP_URL.', 502, 'wp_not_json');
  }
  return data;
}

// Chi giu lai nhung truong duoc phep sua
function pick(obj, allowed) {
  const out = {};
  for (const k of allowed) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

// ---- Thong tin chung cua site (endpoint nay khong can dang nhap) ----
export async function getSiteInfo() {
  const d = await wpFetch('/');
  return {
    name: d?.name,
    description: d?.description,
    url: d?.url || d?.home,
    gmtOffset: d?.gmt_offset,
    timezoneString: d?.timezone_string,
    namespaces: d?.namespaces || [],
    hasApplicationPasswords: !!d?.authentication?.['application-passwords'],
  };
}

// ---- Tai khoan dang dung ----
export async function getAccount() {
  const u = await wpFetch('/wp/v2/users/me', { query: { context: 'edit' } });
  return {
    id: u.id,
    username: u.username || u.slug,
    name: u.name,
    firstName: u.first_name,
    lastName: u.last_name,
    nickname: u.nickname,
    email: u.email,
    url: u.url,
    description: u.description,
    locale: u.locale,
    roles: u.roles || [],
    avatar: u.avatar_urls?.['96'] || null,
    link: u.link,
    registeredDate: u.registered_date,
    // capabilities dai dong - chi tra ve vai quyen quan trong
    canManageOptions: !!u.capabilities?.manage_options,
    canEditPosts: !!u.capabilities?.edit_posts,
    canEditUsers: !!u.capabilities?.edit_users,
  };
}

export async function updateAccount(fields) {
  const body = pick(fields || {}, ACCOUNT_FIELDS);
  if (!Object.keys(body).length) {
    throw new WpError(`Khong co truong nao de sua. Cac truong cho phep: ${ACCOUNT_FIELDS.join(', ')}`, 400, 'wp_no_fields');
  }
  await wpFetch('/wp/v2/users/me', { method: 'POST', body });
  return getAccount();
}

// Doi mat khau dang nhap WordPress (KHONG phai mat khau ung dung)
export async function changePassword(newPassword) {
  const p = String(newPassword || '');
  if (p.length < 8) throw new WpError('Mat khau moi phai tu 8 ky tu tro len.', 400, 'wp_weak_password');
  await wpFetch('/wp/v2/users/me', { method: 'POST', body: { password: p } });
  return { ok: true };
}

// ---- Cau hinh site (can quyen Administrator) ----
export async function getSettings() {
  return wpFetch('/wp/v2/settings');
}

export async function updateSettings(fields) {
  const body = pick(fields || {}, SETTINGS_FIELDS);
  if (!Object.keys(body).length) {
    throw new WpError(`Khong co muc nao de sua. Cac muc cho phep: ${SETTINGS_FIELDS.join(', ')}`, 400, 'wp_no_fields');
  }
  return wpFetch('/wp/v2/settings', { method: 'POST', body });
}

// ---- Danh sach mat khau ung dung dang hoat dong ----
export async function listAppPasswords() {
  const rows = await wpFetch('/wp/v2/users/me/application-passwords');
  return (rows || []).map(r => ({
    uuid: r.uuid,
    name: r.name,
    created: r.created,
    lastUsed: r.last_used,
    lastIp: r.last_ip,
  }));
}

// Thu hoi 1 mat khau ung dung (dung khi lo mat khau ra ngoai)
export async function revokeAppPassword(uuid) {
  if (!/^[0-9a-f-]{36}$/i.test(String(uuid || ''))) throw new WpError('Ma mat khau ung dung khong hop le.', 400, 'wp_bad_uuid');
  return wpFetch(`/wp/v2/users/me/application-passwords/${uuid}`, { method: 'DELETE' });
}

// ---- Danh sach nguoi dung cua site (can quyen edit_users) ----
export async function listUsers(perPage = 50) {
  const rows = await wpFetch('/wp/v2/users', {
    query: { context: 'edit', per_page: Math.min(Math.max(parseInt(perPage, 10) || 50, 1), 100), orderby: 'registered_date', order: 'desc' },
  });
  return (rows || []).map(u => ({
    id: u.id,
    username: u.username || u.slug,
    name: u.name,
    email: u.email,
    roles: u.roles || [],
    registeredDate: u.registered_date,
  }));
}

// ---- Kiem tra ket noi tong the ----
// Tra ve tung buoc mot de biet hong o dau, khong nem loi ra ngoai.
export async function testConnection() {
  const steps = [];
  const status = wpStatus();
  if (!status.configured) {
    return { ok: false, status, steps, error: `Chua cau hinh (thieu: ${status.missing.join(', ')})` };
  }

  let site = null, account = null, settings = null;
  try {
    site = await getSiteInfo();
    steps.push({ step: 'REST API', ok: true, detail: `Tim thay site "${site.name || '(khong ten)'}"` });
  } catch (err) {
    steps.push({ step: 'REST API', ok: false, detail: err.message });
    return { ok: false, status, steps, error: err.message };
  }

  try {
    account = await getAccount();
    steps.push({ step: 'Dang nhap', ok: true, detail: `Dang nhap voi "${account.username}" (${(account.roles || []).join(', ') || 'khong ro vai tro'})` });
  } catch (err) {
    steps.push({ step: 'Dang nhap', ok: false, detail: err.message });
    return { ok: false, status, steps, site, error: err.message };
  }

  try {
    settings = await getSettings();
    steps.push({ step: 'Quyen cau hinh', ok: true, detail: 'Doc/sua duoc cau hinh site' });
  } catch (err) {
    // van coi la ket noi thanh cong - chi la thieu quyen quan tri
    steps.push({ step: 'Quyen cau hinh', ok: false, detail: err.message });
  }

  return { ok: true, status, steps, site, account, settings };
}

export const wpFields = { account: ACCOUNT_FIELDS, settings: SETTINGS_FIELDS };
