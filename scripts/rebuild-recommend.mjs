import fs from 'fs';
const p = 'public/recommend.json';
if (!fs.existsSync('public')) fs.mkdirSync('public', {recursive:true});
if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({items:[]}, null, 2));
console.log('rebuild: ensured', p);
