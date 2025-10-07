"use strict";

// global error logger (what/where is failing)
window.addEventListener("error", (e) => {
  console.error("[recommend] global error:", e.message, e.error || "");
});

// ---- helper: build absolute URL for recommend.json with cache-buster ----
async function fetchJsonWithBust(pathOrUrl) {
  try {
    const base = pathOrUrl.startsWith("http")
      ? pathOrUrl
      : new URL(pathOrUrl, window.location.origin).toString();
    const url = new URL(base);
    // cache-buster：LINEアプリ内ブラウザでも必ず最新を取る
    url.searchParams.set("t", Date.now().toString());
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } catch (e) {
    console.error("[recommend] fetchJsonWithBust error:", e);
    return null;
  }
}

// ---- helper: robust date parser (YYYY-MM-DD) ----
function parseYMD(s) {
  if (typeof s === "string" && /\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

// ---- helper: YouTube ID extraction ----
function extractYouTubeId(url) {
  try {
    const m = url.match(/(?:youtube\.com\/(?:.*v=|v\/|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m && m[1]) return m[1];
    const u = new URL(url);
    return u.searchParams.get("v") || "";
  } catch (_) {
    return "";
  }
}

// ---- share menu bootstrap (works even without JSON) ----
function setupShareMenu(archiveUrl, shareText){
  try{
    if (window.__shareInitDone) return; // 重複初期化防止
    window.__shareInitDone = true;

    var url  = archiveUrl && String(archiveUrl).length > 0 ? archiveUrl : (window.location.href || '');
    var text = shareText && String(shareText).length > 0 ? shareText : '今日のおすすめ';

    // Xリンク
    var xLink = document.getElementById('share-menu-x');
    if (xLink && url) {
      xLink.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
    }

    // Copy link
    var copyBtn = document.getElementById('share-copy');
    if (copyBtn && url) {
      copyBtn.dataset.url = url;
      copyBtn.addEventListener('click', async function(){
        try {
          await navigator.clipboard.writeText(this.dataset.url || url);
          alert('リンクをコピーしました。Instagramに貼り付けてシェアしてください。');
        } catch(_){
          prompt('以下のURLをコピーしてください：', this.dataset.url || url);
        }
      });
    }

    // Shareボタン（Web Share API優先→メニュー表示）
    var openBtn = document.getElementById('share-open');
    var menu = document.getElementById('share-menu');
    if (openBtn) {
      openBtn.addEventListener('click', function(e){
        e.preventDefault();
        var u = url || window.location.href;
        var title = document.title;
        if (navigator.share) {
          navigator.share({ title: title, text: text, url: u }).catch(function(){});
          return;
        }
        if (menu) menu.classList.toggle('open');
      });
    }

    // 外側クリックでメニューを閉じる
    if (menu) {
      document.addEventListener('click', function(ev){
        var t = ev.target;
        if (!menu.classList.contains('open')) return;
        if (t.closest && (t.closest('#share-menu') || t.closest('#share-open'))) return;
        menu.classList.remove('open');
      });
    }
  } catch(e){ console.warn('[recommend] setupShareMenu failed:', e); }
}

// ---- robust init (runs even if DOMContentLoaded already fired) ----
async function initRecommend() {
  // 絶対URL（ページを開いたドメイン配下に固定：www/無しの揺れを解消）
  const ORIGIN = window.location.origin || (window.location.protocol + "//" + window.location.host);
  const JSON_URL = new URL("/recommend.json", ORIGIN).toString();
  if (window.__pglog) window.__pglog("[json] " + JSON_URL);
  console.log("[recommend] JSON_URL:", JSON_URL);

  // 先に deeplink を試す（JSON取得に失敗してもスクロールは効かせたい）
  try { await handleDeepLinkScroll(); } catch (_) {}

  const data = await fetchJsonWithBust(JSON_URL);
  if (window.__pglog) window.__pglog(data ? "[fetch] ok (" + (Array.isArray(data) ? data.length : "n/a") + " items)" : "[fetch] failed");
  if (!Array.isArray(data) || data.length === 0) {
    console.warn("[recommend] empty or invalid JSON");
    setupShareMenu('', '今日のおすすめ'); // JSONが取れなくてもShareは動く
    return;
  }

  // ✅ 最新曲は「配列末尾」前提をやめ、date最大の要素で判定
  const latest = data.reduce((a, b) => (parseYMD(a.date) > parseYMD(b.date) ? a : b));
  if (window.__pglog) window.__pglog("[latest] " + (latest && latest.title ? latest.title : "(no title)"));

  // ====== main index: wait for elements (LINE WebView で遅延出現する対策) ======
  const targets = await waitForMainElements(4000); // 最大4秒待つ
  if (targets) {
    applyLatestToMain(latest, targets);
  } else {
    console.warn("[recommend] main elements not found; skip main section update");
    if (window.__pglog) window.__pglog("[main] elements not found");
    var archiveUrl = latest && latest.date ? new URL('/recommend_pages/recommend-' + latest.date + '.html', window.location.origin).toString() : '';
    setupShareMenu(archiveUrl, '今日のおすすめ ' + (latest && latest.title ? latest.title : ''));
  }

  // コンテンツ差し込み後にもう一度スクロール（位置ズレ対策）
  try { await handleDeepLinkScroll(); } catch (_) {}

  // ====== recommend.html のアーカイブ表示 ======
  const listEl = document.getElementById("recommend-list");
  if (listEl) {
    const sorted = [...data].sort((a, b) => parseYMD(b.date) - parseYMD(a.date));
    sorted.forEach((item) => {
      const li = document.createElement("li");

      const h3 = document.createElement("h3");
      h3.textContent = item.title || "";
      li.appendChild(h3);

      const p = document.createElement("p");
      p.innerHTML = item.comment || "";
      li.appendChild(p);

      // 埋め込み（Apple優先 → YouTube）
      if (item.apple_music_embed && item.apple_music_embed !== "") {
        const wrap = document.createElement("div");
        wrap.classList.add("apple-music-playlist");
        wrap.innerHTML = `<iframe height="150" width="100%" src="${item.apple_music_embed}" allow="autoplay *; encrypted-media *;" style="border:0; border-radius:12px;"></iframe>`;
        li.appendChild(wrap);
      } else if (item.youtube_url) {
        const vid = extractYouTubeId(item.youtube_url);
        if (vid) {
          const wrap = document.createElement("div");
          wrap.classList.add("youtube-embed");
          wrap.innerHTML = `<iframe height="200" width="100%" src="https://www.youtube.com/embed/${vid}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="border:0; border-radius:12px;"></iframe>`;
          li.appendChild(wrap);
        }
      }

      // ボタン群
      const btnBox = document.createElement("div");
      btnBox.classList.add("recommend-button-container");
      if (item.amazon_url) {
        const b = document.createElement("button");
        b.textContent = "🛒 Get it on Amazon";
        b.classList.add("recommend-amazon-button");
        b.onclick = () => window.open(item.amazon_url, "_blank");
        btnBox.appendChild(b);
      }
      if (item.youtube_url) {
        const b = document.createElement("button");
        b.textContent = "▶ Listen To MyTube";
        b.classList.add("recommend-youtube-button");
        b.onclick = () => window.open(item.youtube_url, "_blank");
        btnBox.appendChild(b);
      }
      li.appendChild(btnBox);

      li.appendChild(document.createElement("hr"));
      listEl.appendChild(li);
    });
  }

  // ========== JSON-LD（検索向け構造化データ） ==========
  generateJSONLD(data);
}

function applyLatestToMain(latest, t) {
  if (t.titleEl)   t.titleEl.textContent = latest.title || "";
  if (t.commentEl) t.commentEl.innerHTML = latest.comment || "";

  if (t.iframeEl) {
    if (latest.apple_music_embed && latest.apple_music_embed !== "") {
      t.iframeEl.src = latest.apple_music_embed;            // Apple優先
    } else if (latest.youtube_url) {
      const vid = extractYouTubeId(latest.youtube_url);
      if (vid) t.iframeEl.src = `https://www.youtube.com/embed/${vid}`;
    } else {
      t.iframeEl.removeAttribute("src");                    // 何も無ければ空
    }
  }

  if (t.buttonsWrap) {
    t.buttonsWrap.innerHTML = "";                           // 既存ボタンをクリア
    const btnBox = document.createElement("div");
    btnBox.classList.add("recommend-button-container");

    if (latest.amazon_url) {
      const amazonBtn = document.createElement("button");
      amazonBtn.textContent = "🛒 Get it on Amazon";
      amazonBtn.classList.add("recommend-amazon-button");
      amazonBtn.onclick = () => window.open(latest.amazon_url, "_blank");
      btnBox.appendChild(amazonBtn);
    }
    if (latest.youtube_url) {
      const ytBtn = document.createElement("button");
      ytBtn.textContent = "▶ Listen To MyTube";
      ytBtn.classList.add("recommend-youtube-button");
      ytBtn.onclick = () => window.open(latest.youtube_url, "_blank");
      btnBox.appendChild(ytBtn);
    }
    t.buttonsWrap.appendChild(btnBox);
  }

  // --- Share menu setup (works even if JSON fetch fails later) ---
  var archiveUrl = (latest && latest.date)
    ? new URL('/recommend_pages/recommend-' + latest.date + '.html', window.location.origin).toString()
    : '';
  var shareText = '今日のおすすめ ' + (latest && latest.title ? latest.title : '');
  setupShareMenu(archiveUrl, shareText);
} // end of applyLatestToMain

function waitForMainElements(timeoutMs) {
  const deadline = Date.now() + (timeoutMs || 0);
  const SELECTORS = {
    titleEl:   '#recommend-title, [data-recommend-title], .recommend-title',
    commentEl: '#recommend-comment, [data-recommend-comment], .recommend-comment',
    iframeEl:  '#recommend-embed, [data-recommend-embed], .recommend-embed',
    buttonsWrap:'#recommend-buttons, [data-recommend-buttons], .recommend-buttons',
  };

  function grab() {
    const got = {
      titleEl:   document.querySelector(SELECTORS.titleEl),
      commentEl: document.querySelector(SELECTORS.commentEl),
      iframeEl:  document.querySelector(SELECTORS.iframeEl),
      buttonsWrap: document.querySelector(SELECTORS.buttonsWrap),
    };
    const ok = !!(got.titleEl && got.commentEl);
    return { ok, got };
  }

  const first = grab();
  if (first.ok) {
    if (window.__pglog) window.__pglog("[main] elements found (immediate)");
    return Promise.resolve(first.got);
  }

  return new Promise((resolve) => {
    if (window.__pglog) window.__pglog("[main] wait elements...");
    const mo = new MutationObserver(() => {
      const r = grab();
      if (r.ok) {
        mo.disconnect();
        if (window.__pglog) window.__pglog("[main] elements found (observer)");
        resolve(r.got);
      } else if (Date.now() > deadline) {
        mo.disconnect();
        resolve(null);
      }
    });
    mo.observe(document.documentElement || document.body, { childList: true, subtree: true });

    // タイムアウトも設定
    setTimeout(() => {
      mo.disconnect();
      resolve(null);
    }, Math.max(0, deadline - Date.now()));
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRecommend, { once: true });
} else {
  initRecommend();
}

// JSON-LD を動的に追加（元関数を堅牢化）
function generateJSONLD(data) {
  try {
    const jsonLD = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "PENTHOUSE GROOVE おすすめレコード",
      "itemListElement": data.map((item, index) => ({
        "@type": "Review",
        "position": index + 1,
        "itemReviewed": {
          "@type": "Product",
          "name": item.title,
          "image": "",
          "brand": "PENTHOUSE GROOVE"
        },
        "author": { "@type": "Person", "name": "PENTHOUSE GROOVE" },
        "reviewBody": (item.comment || "").replace(/<\/?p>/gi, ""),
        "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" }
      }))
    };

    const scriptTag = document.createElement("script");
    scriptTag.type = "application/ld+json";
    scriptTag.textContent = JSON.stringify(jsonLD, null, 2);
    document.head.appendChild(scriptTag);
  } catch (e) {
    console.error("[recommend] JSON-LD error:", e);
  }
}

// ---- deep-link helpers ----

// Wait until a selector appears in the DOM (with timeout)
async function waitForSelector(selector, timeoutMs) {
  try {
    if (!selector) return null;
    const foundNow = document.querySelector(selector);
    if (foundNow) return foundNow;

    const end = Date.now() + (timeoutMs || 0);
    return new Promise((resolve) => {
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        } else if (Date.now() > end) {
          obs.disconnect();
          resolve(null);
        }
      });
      obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
      // 最終タイムアウト
      setTimeout(() => {
        obs.disconnect();
        resolve(document.querySelector(selector) || null);
      }, Math.max(0, end - Date.now()));
    });
  } catch (e) {
    console.error("[recommend] waitForSelector error:", e);
    return null;
  }
}
function getToParam() {
  try {
    // support both hash (#to=...) and query (?to=...)
    const hash = (window.location.hash || "").replace(/^#/, "");
    const hqs = new URLSearchParams(hash.includes("=") ? hash : "");
    const qqs = new URLSearchParams(window.location.search || "");
    return hqs.get("to") || qqs.get("to") || null;
  } catch (_) {
    return null;
  }
}

// 固定ヘッダー/LINE上部バーを考慮した推定オフセット
function getHeaderOffset() {
  // 明示的な固定ヘッダー候補（存在すればその高さを優先）
  const cand = document.querySelector("header.sticky, header.fixed, .site-header, #global-header");
  const h = cand && cand.offsetHeight ? cand.offsetHeight : 0;
  const extra = 12;  // LINE内ブラウザのUIぶんの余白
  const min = 64;    // サイト全体の最低オフセット（環境に合わせて 60-96px 程度で調整可）
  return Math.max(min, h + extra);
}

function selectorFor(to) {
  const map = {
    recommend:    "#recommend, #recommend-section, #recommend-title, [data-recommend-title], .recommend-title",
    youtube:      "#youtube-section, #youtube, [data-section='youtube'], .youtube-section, a[href*='youtube.com']",
    goods:        "#shop, #goods, #goods-section, [data-section='goods'], .goods-section",
    break:        "#break, #break-section, [data-section='break'], .break-section",
    event:        "#event, #event-section, [data-section='event'], .event-section",
    eventArchive: "#event-archive-button, a[href*='event-archive.html']"
  };
  return map[to] || "";
}

async function handleDeepLinkScroll() {
  const to = getToParam();
  if (!to) return;
  if (window.__pglog) window.__pglog("[deeplink] to=" + to);

  const sel = selectorFor(to);
  if (!sel) return;

  const target = await waitForSelector(sel, 4000);
  if (!target) {
    if (to === "eventArchive") location.href = "/event-archive.html";
    return;
  }

  // セクション要素に寄せる（見出しに直接合わせると margin/padding でズレやすい）
  const anchor = target.closest("section") || target;

  const baseScroll = () => {
    const offset = getHeaderOffset();
    const rect = anchor.getBoundingClientRect();
    const y = window.pageYOffset + rect.top - offset;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  // 初回スクロール + レイアウトシフト対策で数回追いスクロール
  baseScroll();
  [150, 600, 1200].forEach((ms) => setTimeout(baseScroll, ms));
}

// Run deeplink scroll on first load and on hash changes, too
(function bootstrapDeeplink(){
  function kick(){ try { handleDeepLinkScroll(); } catch(_) {} }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", kick, { once: true });
  } else {
    kick();
  }
  window.addEventListener("hashchange", kick);
})();
