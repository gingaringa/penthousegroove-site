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

// ---- robust init (runs even if DOMContentLoaded already fired) ----
async function initRecommend() {
  // 絶対URL（ページを開いたドメイン配下に固定：www/無しの揺れを解消）
  const ORIGIN = window.location.origin || (window.location.protocol + "//" + window.location.host);
  const JSON_URL = new URL("/recommend.json", ORIGIN).toString();
  if (window.__pglog) window.__pglog("[json] " + JSON_URL);
  console.log("[recommend] JSON_URL:", JSON_URL);

  const data = await fetchJsonWithBust(JSON_URL);
  if (window.__pglog) window.__pglog(data ? "[fetch] ok (" + (Array.isArray(data) ? data.length : "n/a") + " items)" : "[fetch] failed");
  if (!Array.isArray(data) || data.length === 0) {
    console.warn("[recommend] empty or invalid JSON");
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
  }

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
}

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
