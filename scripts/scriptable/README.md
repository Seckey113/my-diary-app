# My Diary Scriptable Widget

iPhoneのScriptableアプリで使う「今日の目的」表示用ウィジェットです。

## 使い方

1. `my-diary-widget.js` の内容をコピーし、iPhoneのScriptableアプリの新規スクリプトに貼り付ける。
2. コード内の `BASE_URL` を自分のVercelのURLに変更する。
   （例：`const BASE_URL = "https://my-diary-app.vercel.app".replace(/\/+$/, "");`）
3. iPhoneのホーム画面にScriptableウィジェット（中サイズ）を追加する。
4. ウィジェットを長押しして「ウィジェットを編集」を開き、`Script` に作成したスクリプトを指定する。
5. 同画面の `Parameter` 欄に、Vercelの環境変数 `WIDGET_SECRET_TOKEN` の値（パスワードの文字列のみ）を入力する。

## 注意事項

- セキュリティ保護のため、`WIDGET_SECRET_TOKEN` の値はこのリポジトリ内のコードやREADMEには**絶対に書き込まない**こと。
- `Parameter` 欄にはURL全体ではなく、トークン文字列だけを入力すること（コード内で自動結合されます）。