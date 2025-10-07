// Multi-carousel auto-scroll (per-carousel RAF loop)
// Assumes each .carousel-track contains a duplicated sequence (A + A) for seamless looping.
document.addEventListener('DOMContentLoaded', () => {
  const carousels = document.querySelectorAll('.carousel');
  carousels.forEach(initCarousel);
});

function initCarousel(root) {
  const track = root.querySelector('.carousel-track');
  if (!track) return;

  const speed = Number(root.dataset.speed || 1); // px per frame (roughly)
  let scrollAmount = 0;
  let duplicateWidth = 0;
  let rafId = null;

  function measure() {
    // Half of the full track width because content is duplicated (A + A)
    duplicateWidth = Math.floor(track.scrollWidth / 2);
    if (!duplicateWidth) {
      // Fallback: try again soon in case images haven't laid out yet
      setTimeout(measure, 100);
    }
  }

  function step() {
    scrollAmount += speed;
    if (duplicateWidth <= 0) measure();
    if (scrollAmount >= duplicateWidth) {
      scrollAmount = 0; // Snap back to the start after half-width
    }
    track.style.transform = `translateX(-${scrollAmount}px)`;
    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (rafId == null) {
      rafId = requestAnimationFrame(step);
    }
  }

  function stop() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Wait until images/videos inside the track have layout-ready metadata
  const media = Array.from(track.querySelectorAll('img, video'));
  // Start immediately; re-measure as each media becomes ready (handles lazy-loading)
  measure();
  start();
  media.forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === 'img') {
      if (el.complete && el.naturalWidth > 0) {
        measure();
      } else {
        el.addEventListener('load', measure, { once: true });
        el.addEventListener('error', measure, { once: true });
      }
    } else if (tag === 'video') {
      if (el.readyState >= 1) {
        measure();
      } else {
        el.addEventListener('loadedmetadata', measure, { once: true });
        el.addEventListener('error', measure, { once: true });
      }
    }
  });

  // Respect pause toggling via class (e.g., root.classList.add('is-paused'))
  const mo = new MutationObserver(() => {
    if (root.classList.contains('is-paused')) {
      stop();
    } else {
      start();
    }
  });
  mo.observe(root, { attributes: true, attributeFilter: ['class'] });

  // Page visibility: pause when hidden to save battery/CPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else if (!root.classList.contains('is-paused')) {
      start();
    }
  });

  // Expose optional controls (for future hooks)
  root._pgCarousel = { start, stop, measure };
}