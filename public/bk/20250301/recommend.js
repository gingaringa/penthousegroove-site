document.addEventListener("DOMContentLoaded", function () {
    fetch("recommend.json")
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) return;
            
            // 最新のレコメンドを取得
            let latest = data[data.length - 1];

            // index.html のレコメンド欄を更新
            if (document.getElementById("recommend-title")) {
                document.getElementById("recommend-title").textContent = latest.title;
                document.getElementById("recommend-comment").innerHTML = latest.comment;
                document.getElementById("recommend-embed").src = latest.apple_music_embed;
                
                let amazonBtn = document.getElementById("amazon-btn");
                amazonBtn.onclick = function () {
                    window.open(latest.amazon_url, '_blank');
                };
            }

            // recommend.html のアーカイブ表示
            if (document.getElementById("recommend-list")) {
                let list = document.getElementById("recommend-list");
                data.reverse().forEach(item => {
                    let listItem = document.createElement("li");
                    listItem.innerHTML = `
                        <h3>${item.title}</h3>
                        <p>${item.comment}</p>
                        <div class="apple-music-playlist">
                            <iframe height="150" width="100%" src="${item.apple_music_embed}" allow="autoplay *; encrypted-media *;" style="border: 0px; border-radius: 12px;"></iframe>
                        </div>
                        <button class="buy-button" onclick="window.open('${item.amazon_url}', '_blank')">
                            💿 Get it on Amazon
                        </button>
                        <hr>`;
                    list.appendChild(listItem);
                });
            }
        })
        .catch(error => console.error("Error loading recommendation:", error));
});
