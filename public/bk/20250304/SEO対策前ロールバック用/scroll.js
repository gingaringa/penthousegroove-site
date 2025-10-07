document.addEventListener("DOMContentLoaded", () => {
    const track = document.querySelector(".carousel-track");
    let speed = 1; // スクロール速度 (ピクセル単位)
    let scrollAmount = 0; // 現在のスクロール量
    let duplicateWidth = track.scrollWidth / 2; // 画像が2セットあるので半分の幅を計算
  
    function scrollLoop() {
      scrollAmount += speed;
      if (scrollAmount >= duplicateWidth) {
        scrollAmount = 0; // 半分スクロールしたら一瞬で最初に戻す
      }
      track.style.transform = `translateX(-${scrollAmount}px)`;
      requestAnimationFrame(scrollLoop);
    }
  
    scrollLoop();
  });