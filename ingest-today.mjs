// node scripts/ingest-today.mjs
import fs from 'fs';

const TZ = 'Asia/Tokyo';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date()); // YYYY-MM-DD

const dailyPath = `content/daily/${today}.json`;
const recommendPath = `public/recommend.json`;

if (!fs.existsSync(dailyPath)) {
  console.log(`[ingest] ${today}: daily file missing -> SKIP (no error)`);
  process.exit(0);
}

// recommend.json は最初に無ければ空配列で作成
if (!fs.existsSync(recommendPath)) {
  fs.writeFileSync(recommendPath, '[]\n', 'utf8');
}

const daily = JSON.parse(fs.readFileSync(dailyPath, 'utf8'));
const arr   = JSON.parse(fs.readFileSync(recommendPath, 'utf8'));

// 同日重複を防ぐ（idempotent）
if (arr.some(x => x.date === today)) {
  console.log(`[ingest] ${today}: already appended -> NOOP`);
  process.exit(0);
}

// 必須フィールドだけ最低限チェック
if (!daily.title || !daily.date) {
  console.log(`[ingest] invalid daily json (need date/title) -> SKIP`);
  process.exit(0);
}

arr.push(daily);
fs.writeFileSync(recommendPath, JSON.stringify(arr, null, 4) + '\n', 'utf8');
console.log(`[ingest] appended ${today} to recommend.json`);