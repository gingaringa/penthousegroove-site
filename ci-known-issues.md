## ingest-today.mjs: TypeError: arr.some is not a function
- 現象: GitHub Actions の `Ingest (no commit)` で TypeError、Job が失敗。
- 原因: `public/recommend.json` が配列ではなく `{items:[...]}` 形式のときに `arr` が配列になっていない。
- 対応: `arr = Array.isArray(d)? d : (Array.isArray(d.items)? d.items : [])` に修正。`.some()` 呼び出しは配列ガード。
- 再発抑止: Workflow 側で `continue-on-error: true` を設定。

## Workflow YAML: Unrecognized named-value: 'secrets' in if:
- 現象: GUI に "Invalid workflow file ... Unrecognized named-value: 'secrets'"。
- 原因: `if: ${{ secrets.FOO != '' }}` を置く位置や書式のミスで式が解釈されない。
- 対応: `if:` を使わず、シェル内 `if [ -n "$ENV" ]; then ... fi` へ変更し、ENV は `env:` で注入。
