document.getElementById('songForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const songInput = document.getElementById('songInput').value.trim();
    if (!songInput) {
        alert('曲名を入力してください。');
        return;
    }

    // 入力値をエスケープしてXSS防止
    const safeInput = songInput.replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[char]));

    const recommendationsDiv = document.getElementById('recommendations');
    recommendationsDiv.textContent = `「${safeInput}」に基づくレコメンド曲を取得中...`;

    // APIを呼び出してデータを取得（仮のコード）
    try {
        const response = await fetch('/api/recommend?song=' + encodeURIComponent(safeInput));
        const data = await response.json();
        recommendationsDiv.textContent = data.recommendations.join(', ');
    } catch (error) {
        recommendationsDiv.textContent = 'レコメンドを取得できませんでした。';
    }
});