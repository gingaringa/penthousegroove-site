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

/* ===== Updates section (fetch updates.json, show latest N=all) ===== */
(function(){
  function ymdToISO(s){
    s = String(s||'');
    if (!/^\d{8}$/.test(s)) return '';
    var y = s.slice(0,4), m = s.slice(4,6), d = s.slice(6,8);
    return y + '-' + m + '-' + d;
  }
  function ymdToDisplay(s){
    var iso = ymdToISO(s);
    if (!iso) return '';
    var y = iso.slice(0,4), m = iso.slice(5,7), d = iso.slice(8,10);
    return y + '/' + m + '/' + d;
  }
  function esc(t){ return String(t||'').replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]); }); }
  function badgeOf(key){
    switch(key){
      case 'recommend': return 'Recommend';
      case 'event': return 'Event';
      case 'eventArchive': return 'EventArchive';
      case 'youtube': return 'YouTube';
      case 'goods': return 'Goods';
      case 'break': return 'TakeABreak';
      default: return 'Update';
    }
  }
  function guessUrl(key, rec){
    try{
      if (key === 'eventArchive') return rec.url || 'event-archive.html';
      if (key === 'youtube') return rec.url || '#youtube-section';
      if (key === 'event') return '#event';
      if (key === 'goods') return '#shop';
      if (key === 'break') return 'takeabreak.html';
      if (key === 'recommend'){
        // Always jump to Today's Recommend section on the current page
        return '#recommend';
      }
      return '#';
    }catch(_){ return '#'; }
  }
  // --- helpers for short, seasonal labels ---
  function ymdToMD(s){
    var iso = ymdToISO(s);
    if (!iso) return '';
    var m = parseInt(iso.slice(5,7),10);
    var d = parseInt(iso.slice(8,10),10);
    return m + '/' + d;
  }
  function seasonFromYmd(s){
    var iso = ymdToISO(s);
    if (!iso) return '';
    var month = parseInt(iso.slice(5,7),10);
    if (month === 12 || month === 1 || month === 2) return '冬';
    if (month >= 3 && month <= 5) return '春';
    if (month >= 6 && month <= 8) return '夏';
    if (month >= 9 && month <= 11) return '秋';
    return '';
  }
  function parseVol(text){
    try{
      var m = String(text||'').match(/vol\.?\s*(\d+)/i);
      return m ? ('vol.' + m[1]) : '';
    }catch(_){ return ''; }
  }
  // ----- text formatter (short & device-friendly) -----
  function formatUpdateText(key, rec){
    var md = ymdToMD(rec.lastUpdate);

    if (key === 'recommend'){
      // e.g., "8/22のレコメンド曲を更新"
      return esc((md ? md + 'の' : '') + 'レコメンド曲を更新');
    }

    if (key === 'youtube'){
      // kind: short | live | video
      var kind = String(rec.kind||'').toLowerCase();
      var map = { short: 'ショート動画を更新', live: 'ライブ配信を更新', video: '動画を更新' };
      return esc(map[kind] || 'YouTubeを更新');
    }

    if (key === 'eventArchive' || key === 'break'){
      // Prefer explicit rec.vol, else parse from message/title
      var vol = rec.vol || parseVol(rec.message) || parseVol(rec.title);
      // Remove "を" for shorter copy
      return esc(vol ? (vol + '更新') : 'アーカイブ更新');
    }

    if (key === 'event'){
      // e.g., "夏のイベント情報解禁!"
      var ssn = seasonFromYmd(rec.lastUpdate) || '';
      return esc((ssn ? (ssn + 'の') : '') + 'イベント情報解禁!');
    }

    if (key === 'goods'){
      // e.g., "夏の新作グッズを更新"
      var ssn2 = seasonFromYmd(rec.lastUpdate) || '';
      return esc((ssn2 ? (ssn2 + 'の') : '') + '新作グッズを更新');
    }

    // Fallback: 1行目だけを短く
    var firstLine = String(rec.message||'').split('\n').find(function(t){ return t.trim(); }) || '';
    return esc(firstLine || '更新しました');
  }

  async function run(){
    var list = document.getElementById('updates-list');
    if (!list) return;
    try{
      var u = new URL('/updates.json', location.origin);
      u.searchParams.set('t', Date.now());
      var res = await fetch(u.toString(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP '+res.status);
      var data = await res.json();
      var items = Object.keys(data).map(function(k){
        var rec = data[k] || {};
        return { key:k, lastUpdate: String(rec.lastUpdate||''), message: rec.message || '', title: rec.title || '', url: rec.url || '' };
      }).filter(function(it){ return /^\d{8}$/.test(it.lastUpdate); });
      // 最新順で全件表示（sliceを廃止）
      items.sort(function(a,b){ return b.lastUpdate.localeCompare(a.lastUpdate); });

      if (items.length === 0){
        list.innerHTML = '<li class="update-item">更新情報はまだありません / <span lang="en">No updates yet</span></li>';
        return;
      }
      list.innerHTML = items.map(function(it){
        var href = guessUrl(it.key, it);
        var iso = ymdToISO(it.lastUpdate);
        var disp = ymdToDisplay(it.lastUpdate);
        var badge = esc(badgeOf(it.key));
        var displayText = formatUpdateText(it.key, it);
        return '<li class="update-item">'
             +   '<a href="' + href + '">'
             +     '<span class="update-badge">' + badge + '</span>'
             +     '<span class="update-text">' + displayText + '</span>'
             +     (disp ? ('<time class="update-date" datetime="' + iso + '">' + disp + '</time>') : '')
             +   '</a>'
             + '</li>';
      }).join('');
    }catch(e){
      console.warn('[PHG] updates load failed:', e);
      list.innerHTML = '<li class="update-item">更新を読み込めませんでした / <span lang="en">Failed to load updates</span></li>';
    }
  }
  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', run, { once:true }); } else { run(); }
})();