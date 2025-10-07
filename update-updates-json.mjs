// node scripts/update-updates-json.mjs
import fs from 'fs';

const TZ = 'Asia/Tokyo';
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date()); // YYYY-MM-DD
const ymdCompact = ymd.replace(/-/g, '');

const dailyPath   = `content/daily/${ymd}.json`;
const updatesPath = `public/updates.json`;

// daily が無ければ静かに終了（仕様：何もしない）
if (!fs.existsSync(dailyPath)) {
  console.log(`[updates] ${ymd}: daily file missing -> SKIP`);
  process.exit(0);
}

const daily   = JSON.parse(fs.readFileSync(dailyPath, 'utf8'));
const updates = fs.existsSync(updatesPath) ? JSON.parse(fs.readFileSync(updatesPath,'utf8')) : {};

function htmlToText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/?p>/gi, '')
    .replace(/<[^>]+>/g, '');
}

updates.recommend = updates.recommend || {};
updates.recommend.lastUpdate = ymdCompact;
updates.recommend.message = `Today's Recommend:\n${daily.title}\n\n${htmlToText(daily.comment)}`.trim();

fs.writeFileSync(updatesPath, JSON.stringify(updates, null, 2) + '\n', 'utf8');
console.log(`[updates] recommend.message updated for ${ymd}`);