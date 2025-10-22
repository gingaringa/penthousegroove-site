// scripts/update-youtube-from-daily.mjs
// 毎日(JST)チェックし、当日の content/daily_youtube/youtube-YYYY-MM-DD.json があれば
// public/updates.json の youtube セクションを置換する。
// 未来日ブロック：ファイル名は当日の日付のみ参照（payload.lastUpdateは無視）。
// 差分がなければNOOP。
// テスト用に FORCE_DATE=YYYY-MM-DD を受け付けます。

import fs from 'fs';
import path from 'path';

function todayJST() {
  if (process.env.FORCE_DATE) {
    const d = new Date(process.env.FORCE_DATE);
    if (Number.isNaN(d.getTime())) throw new Error('invalid FORCE_DATE');
    return d;
  }
  // 現地時間をJSTにしてから Date を生成
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
}
function fmtYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
function fmtYMD8(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const da = String(d.getDate()).padStart(2,'0');
  return `${y}${m}${da}`;
}

const now  = todayJST();
const ymd  = fmtYMD(now);
const ymd8 = fmtYMD8(now);

const dailyPath = path.join('content','daily_youtube',`youtube-${ymd}.json`);
if (!fs.existsSync(dailyPath)) {
  console.log('[youtube] skip: daily file not found:', dailyPath);
  process.exit(0);
}

// dailyファイルを読み込み
let payload = {};
try {
  payload = JSON.parse(fs.readFileSync(dailyPath,'utf8'));
} catch (e) {
  console.log('[youtube] skip: invalid JSON:', dailyPath, e.message);
  process.exit(0);
}

const title = String(payload.title || '').trim();
const url   = String(payload.url   || '').trim();
const kind  = String(payload.kind  || 'video').trim();
if (!title || !url) {
  console.log('[youtube] skip: missing title/url in', dailyPath);
  process.exit(0);
}

// updates.json を読み込み（なければ空から開始）
const updatesPath = path.join('public','updates.json');
let updates = {};
if (fs.existsSync(updatesPath)) {
  try { updates = JSON.parse(fs.readFileSync(updatesPath,'utf8')); } catch {}
}
updates.youtube ||= {};
const before = updates.youtube;

// 置換内容（lastUpdate は当日固定）
const next = { lastUpdate: ymd8, kind, title, url };

// 差分が無ければNOOP
const same =
  String(before?.lastUpdate||'') === next.lastUpdate &&
  String(before?.title||'')      === next.title &&
  String(before?.url||'')        === next.url &&
  String(before?.kind||'video')  === next.kind;

if (same) {
  console.log('[youtube] no change:', next.lastUpdate);
  process.exit(0);
}

// 置換して保存
updates.youtube = next;
fs.writeFileSync(updatesPath, JSON.stringify(updates, null, 2));
console.log('[youtube] updated youtube section:', next.lastUpdate);
