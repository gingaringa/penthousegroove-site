// intro.js

function hideIntro() {
    const intro = document.getElementById('intro-video');
    if (intro) {
        intro.style.display = 'none';
    }
    // イントロを一度見たことを記録する
    sessionStorage.setItem('introPlayed', 'true');
}

window.addEventListener('DOMContentLoaded', function() {
    if (document.body.classList.contains('recommend-page')) {
        return;
    }

    const introPlayed = sessionStorage.getItem('introPlayed');

    // すでにイントロを見たならintro-videoを即座に非表示
    if (introPlayed === 'true') {
        hideIntro();
        return;
    }

    const videoSource = document.getElementById('intro-video-source');
    const videoElement = document.getElementById('intro-video-element');

    if (!videoSource || !videoElement) {
        console.warn('Intro video elements not found.');
        return;
    }

    const screenWidth = window.innerWidth;

    if (screenWidth <= 768) {
        videoSource.src = 'intro-mobile.mp4';
    } else {
        videoSource.src = 'intro-pc.mp4';
    }

    videoElement.load();

    videoElement.addEventListener('ended', hideIntro);

    // 動画がエラーになってもイントロを非表示
    videoElement.addEventListener('error', hideIntro);
});