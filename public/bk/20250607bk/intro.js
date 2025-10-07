function hideIntro() {
    const intro = document.getElementById('intro-video');
    if (intro) {
        intro.style.display = 'none'; // 完全に非表示
    }
    document.body.style.opacity = '1'; // サイト本体を表示
    sessionStorage.setItem('introPlayed', 'true');
}

window.onload = function() {
    if (document.body.classList.contains('recommend-page')) {
        return;
    }

    const introPlayed = sessionStorage.getItem('introPlayed');
    const introVideoDiv = document.getElementById('intro-video');
    const videoElement = document.getElementById('intro-video-element');

    if (!introVideoDiv || !videoElement) {
        document.body.style.opacity = '1';
        return;
    }

    /*
    if (!introPlayed) {
        introVideoDiv.style.display = 'flex';

        const screenWidth = window.innerWidth;
        if (screenWidth <= 768) {
            videoElement.src = 'intro-mobile.mp4';
        } else {
            videoElement.src = 'intro-pc.mp4';
        }

        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.load();
        videoElement.play().catch(error => {
            console.warn('Autoplay failed:', error);
            hideIntro();
        });

        videoElement.addEventListener('ended', hideIntro);
        videoElement.addEventListener('error', hideIntro);
    } else {
        hideIntro();
    }
    */

    introVideoDiv.style.display = 'flex';

    const screenWidth = window.innerWidth;
    videoElement.src = (screenWidth <= 768) ? 'intro-mobile.mp4' : 'intro-pc.mp4';

    videoElement.muted = true;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.load();
    videoElement.play().catch(error => {
        console.warn('Autoplay failed:', error);
        hideIntro();
    });

    videoElement.addEventListener('ended', hideIntro);
    videoElement.addEventListener('error', hideIntro);
};