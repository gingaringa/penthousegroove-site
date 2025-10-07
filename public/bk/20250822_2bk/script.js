// Guarded attach: only bind when #songForm exists (avoid breaking other pages)
(function(){
  var form = document.getElementById('songForm');
  if (!form) return; // no form on this page

  form.addEventListener('submit', async function(e){
    e.preventDefault();

    var inputEl = document.getElementById('songInput');
    var songInput = inputEl ? (inputEl.value || '').trim() : '';
    if (!songInput) {
      alert('曲名を入力してください。');
      return;
    }

    // 入力値をエスケープしてXSS防止
    var safeInput = songInput.replace(/[&<>"']/g, function(char){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[char]);
    });

    var recommendationsDiv = document.getElementById('recommendations');
    if (recommendationsDiv) {
      recommendationsDiv.textContent = '「' + safeInput + '」に基づくレコメンド曲を取得中...';
    }

    try {
      var response = await fetch('/api/recommend?song=' + encodeURIComponent(safeInput));
      var data = await response.json();
      if (recommendationsDiv) {
        recommendationsDiv.textContent = Array.isArray(data.recommendations) ? data.recommendations.join(', ') : 'レコメンドを取得できませんでした。';
      }
    } catch (error) {
      if (recommendationsDiv) {
        recommendationsDiv.textContent = 'レコメンドを取得できませんでした。';
      }
    }
  });
})();

/* ===== PENTHOUSE GROOVE: mini-card utilities (Event / Take a Break) ===== */
(function(){
    window.PHG = window.PHG || {};
  
    function extractYouTubeId(url){
      try{
        if (!url) return "";
        var m = String(url).match(/(?:youtube\.com\/(?:.*[?&]v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        if (m && m[1]) return m[1];
        var u = new URL(url, location.href);
        return u.searchParams.get("v") || "";
      }catch(_){ return ""; }
    }
  
    // Event Archive へのリンクに UTM を付与
    PHG.addUtmToEventArchiveLinks = function(){
      try{
        var UTM = "utm_source=phg_site&utm_medium=event_section&utm_campaign=archive_cta";
        document.querySelectorAll('a[href*="event-archive.html"]').forEach(function(a){
          try{
            var href = a.getAttribute("href") || "event-archive.html";
            var u = new URL(href, location.href);
            if (!u.searchParams.has("utm_source")){
              if (u.search && u.search.length > 1){ u.search += "&" + UTM; }
              else { u.search = "?" + UTM; }
            }
            a.setAttribute("href", u.toString());
          }catch(_){}
        });
      }catch(e){ console.warn("[PHG] addUtmToEventArchiveLinks skipped:", e); }
    };
  
    // ミニカードにサムネを貼る（画像 or YouTube から自動抽出）
    // opts: { pageUrl: string, cardsQuery: string, anchorAttr?: string }
    PHG.attachMiniCardThumbs = function(opts){
      try{
        var pageUrl   = opts && opts.pageUrl   ? opts.pageUrl   : "";
        var cardsSel  = opts && opts.cardsQuery ? opts.cardsQuery : "";
        var anchorAtt = (opts && opts.anchorAttr) || "data-anchor";
        if (!pageUrl || !cardsSel) return;
  
        var cards = document.querySelectorAll(cardsSel);
        if (!cards.length) return;
  
        // file:// では他HTMLの取得不可 → テキストのみ表示
        if (location.protocol === "file:"){
          console.warn("[PHG] file:// detected — skip remote fetch & use no-thumb fallback");
          cards.forEach(function(card){ card.classList.add("no-thumb"); });
          return;
        }
  
        function setNoThumb(card){ card.classList.add("no-thumb"); }
        function setThumb(card, srcAbs){
          var t = card.querySelector(".thumb");
          if (!t || !srcAbs){ setNoThumb(card); return; }
          t.style.backgroundImage = 'url("' + srcAbs + '")';
        }
        function preload(srcAbs, ok, ng){
          try{
            var im = new Image();
            im.onload = function(){ ok && ok(); };
            im.onerror = function(){ ng && ng(); };
            try { im.referrerPolicy = "no-referrer"; } catch(_){}
            im.src = srcAbs;
          }catch(_){ ng && ng(); }
        }
  
        var PAGE_ABS = new URL(pageUrl, location.href).toString();
        fetch(PAGE_ABS, { cache: "no-store", credentials: "same-origin" })
          .then(function(r){ return r.ok ? r.text() : Promise.reject(new Error("HTTP "+r.status)); })
          .then(function(html){
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, "text/html");
  
            cards.forEach(function(card){
              var anchor = card.getAttribute(anchorAtt);
              if (!anchor){ setNoThumb(card); return; }
  
              var section = doc.getElementById(anchor);
              if (!section){ setNoThumb(card); return; }

              // --- NEW: pull section title (e.g., h2.section-title in takeabreak.html) and set into card .title ---
              try {
                var tEl = section.querySelector('.section-title, h2, h3');
                var tText = tEl ? (tEl.textContent || '').trim().replace(/\s+/g,' ') : '';
                if (tText) {
                  var cardTitle = card.querySelector('.title');
                  if (cardTitle) { cardTitle.textContent = tText; }
                }
              } catch(_){/* no-op */}

              var candidates = [];
  
              // 1) 画像 <img src>
              Array.prototype.forEach.call(section.querySelectorAll("img[src]"), function(img){
                var raw = (img.getAttribute("src") || "").trim();
                if (!raw) return;
                try { candidates.push(new URL(raw, PAGE_ABS).toString()); } catch(_){}
              });
  
              // 2) YouTube 埋め込み/リンク → サムネ生成
              Array.prototype.forEach.call(section.querySelectorAll('iframe[src], a[href]'), function(el){
                var src = el.tagName === "IFRAME" ? el.getAttribute("src") : el.getAttribute("href");
                if (!src) return;
                if (!/youtu\.?be|youtube\-nocookie/.test(src)) return;
                var vid = extractYouTubeId(src);
                if (vid){
                  candidates.push("https://i.ytimg.com/vi/" + vid + "/mqdefault.jpg");
                }
              });
  
              if (!candidates.length){ setNoThumb(card); return; }
  
              var pick = candidates[Math.floor(Math.random() * candidates.length)];
              preload(pick, function(){ setThumb(card, pick); }, function(){ setNoThumb(card); });
            });
          })
          .catch(function(err){
            console.warn("[PHG] mini-card thumbs fallback:", err && err.message ? err.message : err);
            cards.forEach(setNoThumb);
          });
      }catch(e){
        console.warn("[PHG] attachMiniCardThumbs failed:", e);
      }
    };
  
    // index.html の Event セクション初期化
    PHG.eventMiniInit = function(){
      PHG.addUtmToEventArchiveLinks();
      PHG.attachMiniCardThumbs({
        pageUrl: "event-archive.html",
        cardsQuery: "#event-mini-grid .event-mini-card",
        anchorAttr: "data-anchor"
      });
    };
  })();