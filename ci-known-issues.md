# CI Known Issues (quick reference)

## 1) zsh: parse error near ')'
- 原因: 長いワンライナーを zsh に貼ると `$(...)`/正規表現/全角文字混在で構文崩れ
- 対応: `bash --noprofile --norc` で実行、または1行ずつに分ける

## 2) scripts/ingest-today.mjs: TypeError: arr.some is not a function
- 原因: recommend.json が {items:[...]} 形のときに配列前提で .some を呼ぶ
- 対応: 
  const d = JSON.parse(fs.readFileSync(p,'utf8'));
  const arr = Array.isArray(d) ? d : (d.items || []);

## 3) public/generate-recommend-pages.js: TypeError: data is not iterable
- 原因: recommend.json が {items:[...]} 形のとき data を配列にしていない
- 対応:
  const _raw = JSON.parse(...);
  const data = Array.isArray(_raw) ? _raw : (_raw.items || []);

## Bash history expansion and one-liners
- 現象: perl/sed ワンライナー内の ! で event not found
- 対応: bash --noprofile --norc で入り、set +H を実行

