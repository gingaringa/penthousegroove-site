document.addEventListener("DOMContentLoaded", function () {
    fetch("https://penthousegroove.com/recommend.json") //Cloudfront確認用
    // fetch("recommend.json") //ローカル確認用
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
                
                let buttonContainer = document.createElement("div");
                buttonContainer.classList.add("recommend-button-container");

                let amazonBtn = document.createElement("button");
                amazonBtn.textContent = "🛒 Get it on Amazon";
                amazonBtn.classList.add("recommend-amazon-button");
                amazonBtn.onclick = function () {
                    window.open(latest.amazon_url, '_blank');
                };
                buttonContainer.appendChild(amazonBtn);
               
                // YouTubeリンクがある場合のみボタンを追加
                if (latest.youtube_url) {
                    let youtubeBtn = document.createElement("button");
                    youtubeBtn.textContent = "▶ Listen To MyTube";
                    youtubeBtn.classList.add("recommend-youtube-button");
                    youtubeBtn.onclick = function () {
                        window.open(latest.youtube_url, '_blank');
                    };
                    buttonContainer.appendChild(youtubeBtn);
                }

                let recommendSection = document.getElementById("recommend-buttons");
                if (recommendSection) {
                    recommendSection.innerHTML = "";  // 既存のボタンをクリア
                    recommendSection.appendChild(buttonContainer);
                }


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
                        
                        `;

                        let buttonContainer = document.createElement("div");
                    buttonContainer.classList.add("recommend-button-container");

                    // AmazonのURLが存在する場合のみボタンを追加
                    if (item.amazon_url) {
                        let amazonBtn = document.createElement("button");
                        amazonBtn.textContent = "🛒 Get it on Amazon";
                        amazonBtn.classList.add("recommend-amazon-button");
                        amazonBtn.onclick = function () {
                            window.open(item.amazon_url, '_blank');
                        };
                        buttonContainer.appendChild(amazonBtn);
                    }

                    // YouTubeリンクがある場合のみボタンを追加
                    if (item.youtube_url) {
                        let youtubeBtn = document.createElement("button");
                        youtubeBtn.textContent = "▶ Listen To MyTube";
                        youtubeBtn.classList.add("recommend-youtube-button");
                        youtubeBtn.onclick = function () {
                            window.open(item.youtube_url, '_blank');
                        };
                        buttonContainer.appendChild(youtubeBtn);
                    }

                    listItem.appendChild(buttonContainer);
                    listItem.appendChild(document.createElement("hr"));
                    list.appendChild(listItem);
                });
            }
            // JSON-LD を動的に生成
            generateJSONLD(data);
        })
        .catch(error => console.error("Error loading recommendation:", error));
});

// JSON-LD を動的に追加する関数
function generateJSONLD(data) {
    let jsonLD = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "PENTHOUSE GROOVE おすすめレコード",
        "itemListElement": data.map((item, index) => ({
            "@type": "Review",
            "position": index + 1,
            "itemReviewed": {
                "@type": "Product",
                "name": item.title,
                "image": "",  // 必要なら画像 URL を追加
                "brand": "PENTHOUSE GROOVE"
            },
            "author": {
                "@type": "Person",
                "name": "PENTHOUSE GROOVE"
            },
            "reviewBody": item.comment.replace(/<\/?p>/g, ""), // HTMLタグを除去
            "reviewRating": {
                "@type": "Rating",
                "ratingValue": "5",
                "bestRating": "5"
            }
        }))
    };

    let scriptTag = document.createElement("script");
    scriptTag.type = "application/ld+json";
    scriptTag.textContent = JSON.stringify(jsonLD, null, 2);
    document.head.appendChild(scriptTag);
}
