const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync('recommend.json', 'utf8'));

// recommend_pagesディレクトリがなければ作成
if (!fs.existsSync('recommend_pages')) {
  fs.mkdirSync('recommend_pages');
}

// 日付新しい順
const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));

// 1. recommend.html（アーカイブ目次）生成
let archiveHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>PENTHOUSE GROOVEのおすすめレコードアーカイブ | jazz/soul/latin/world/electronica/etc...</title>
  <meta property="og:title" content="PENTHOUSE GROOVE - おすすめレコード">
  <meta property="og:description" content="PENTHOUSE GROOVEがおすすめするエレクトロニカ・ジャズ・ソウルのレコード一覧！">
  <meta name="description" content="PENTHOUSE GROOVEが厳選したおすすめレコードのアーカイブ！エレクトロニカ、ジャズ、ソウルの過去のおすすめ作品一覧。">
  <link rel="stylesheet" href="style.css">
</head>
<body class="recommend-page">
  <div class="fixed-bg"></div>
  <header>
    <h1>Archive for today's recommended records</h1>
    <h2 class="dj-subtitle">- SELECTED BY PENTHOUSE GROOVE -</h2>
    <a href="index.html">HOME</a>
  </header>
  <section id="archive" class="content-box">
    <h2 class="section-title">Past Recommendation List</h2>
    <ul id="recommend-archive-list">
      ${sorted.map(item => 
        `<li>
          <a href="recommend_pages/recommend-${item.date}.html">${item.date} ${item.title}</a>
        </li>`).join('\n')}
    </ul>
  </section>
  <footer>
    <p>&copy; 2025 PENTHOUSE GROOVE</p>
    <a href="index.html">What's PENTHOUSE GROOVE?</a>
  </footer>
</body>
</html>
`;

fs.writeFileSync('recommend.html', archiveHtml);

// 2. 個別ページ群（recommend-YYYY-MM-DD.html）生成
for (let i = 0; i < sorted.length; i++) {
  const item = sorted[i];
  const prev = sorted[i - 1];
  const next = sorted[i + 1];

  let html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>${item.date}のおすすめ｜PENTHOUSE GROOVE</title>
  <meta name="description" content="${item.title}のおすすめ。${item.comment.replace(/<[^>]*>/g,'')}">
  <link rel="stylesheet" href="../style.css">
</head>
<body class="recommend-page">
  <div class="fixed-bg"></div>
  <header>
    <h1>${item.date} のおすすめレコード</h1>
    <h2 class="dj-subtitle">- SELECTED BY PENTHOUSE GROOVE -</h2>
    <a href="../index.html">HOME</a> | <a href="../recommend.html">アーカイブ一覧</a>
  </header>
  <main class="content-box">
    <h2>${item.title}</h2>
    <div>${item.comment}</div>
    <div class="apple-music-playlist" style="margin:16px 0;">
      ${
        item.apple_music_embed
          ? `<iframe height="150" width="100%" src="${item.apple_music_embed}" allow="autoplay *; encrypted-media *;" style="border: 0px; border-radius: 12px;"></iframe>`
          : (item.youtube_url
              ? `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${(function(url){
                  // extract YouTube video ID robustly
                  try {
                    var m = url.match(/(?:youtube\.com\/(?:.*v=|v\/|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
                    if (m && m[1]) return m[1];
                    // fallback: try to get v param
                    var u = new URL(url);
                    return u.searchParams.get("v") || "";
                  } catch(e) { return ""; }
                })(item.youtube_url)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border:0px; border-radius:12px;"></iframe>`
              : "")
      }
    </div>
    <div class="recommend-button-container">
      ${item.amazon_url ? `<a href="${item.amazon_url}" class="recommend-amazon-button" target="_blank" rel="noopener">🛒 Amazonで探す</a>` : ''}
      ${
        // Only show YouTube button if Apple Music embed is present and youtube_url is present
        item.apple_music_embed && item.youtube_url
          ? `<a href="${item.youtube_url}" class="recommend-youtube-button" target="_blank" rel="noopener">🎧 YouTubeで聴く</a>`
          : ''
      }
    </div>
    <div class="recommend-nav">
      ${next ? `<a href="recommend-${next.date}.html">← 前日</a>` : ''}
      <a href="../recommend.html">アーカイブ一覧</a>
      ${prev ? `<a href="recommend-${prev.date}.html">翌日 →</a>` : ''}
    </div>
  </main>
  <footer>
    <p>&copy; 2025 PENTHOUSE GROOVE</p>
    <a href="../index.html">What's PENTHOUSE GROOVE?</a>
  </footer>
</body>
</html>
  `;

  fs.writeFileSync(path.join('recommend_pages', `recommend-${item.date}.html`), html);
}

console.log("recommendアーカイブ＆個別ページを生成しました。");