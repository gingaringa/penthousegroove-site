document.addEventListener("DOMContentLoaded", function () {
    function updateCountdown() {
        const eventDate = new Date("2025-05-05T15:00:00+09:00").getTime();
        const now = new Date().getTime();
        const timeRemaining = eventDate - now;

        if (timeRemaining > 0) {
            const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

            // 2桁のゼロ埋め（padStart を使用）
            const formattedTime = 
                String(hours).padStart(2, '0') + ":" + 
                String(minutes).padStart(2, '0') + ":" + 
                String(seconds).padStart(2, '0');

            document.getElementById("countdown").textContent = `${days}days & ${formattedTime}`;
        } else {
            document.getElementById("countdown").textContent = "00days & 00:00:00";
        }
    }

    // 初回実行
    updateCountdown();
    
    // 1秒ごとにカウントダウンを更新
    setInterval(updateCountdown, 1000);
});