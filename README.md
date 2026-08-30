# ニトロール服用記録

ニトログリセリンスプレーの服用状況(時刻・場所・していたこと・痛みの強さ・その他メモ)を記録し、通院日の記録と合わせてCSV/TXTで書き出せるアプリです。ブラウザにインストールして、ホーム画面から普通のアプリのように開けます(PWA)。

データはすべて**この端末のブラウザ内(localStorage)にのみ**保存されます。サーバーには送信されません。

---

## 1. 動作確認(このままでOKか試す)

```bash
npm install
npm run dev
```

表示されたURL(例: `http://localhost:5173`)をブラウザで開いて確認できます。

---

## 2. GitHubに登録する

まだこのプロジェクト用のリポジトリを作っていない場合は、GitHub上で新しいリポジトリを作成してください(例: `nitorol-log`、Public/Privateどちらでも可)。

作成したら、このフォルダで以下を実行します(`<あなたのユーザー名>` と `<リポジトリ名>` は実際の値に置き換えてください)。

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
git push -u origin main
```

> 認証を求められたら、パスワードの代わりに GitHub の Personal Access Token を使うか、GitHub CLI (`gh auth login`) でログイン済みの状態にしておくとスムーズです。

---

## 3. Netlifyで公開する

このアプリは **Netlify** で公開する構成になっています(`netlify.toml` 同梱)。GitHub Pagesは使いません。

> 補足: 同じ `<ユーザー名>.github.io` ドメインの下に複数のPWAを置くと、Android側が2つ目以降を「ホーム画面へのショートカット」としてしか扱えず、独立アプリとしてインストールできないことがあります。Netlifyはプロジェクトごとに専用ドメイン(例: `nitorol-log.netlify.app`)が自動発行されるため、他のPWA(例: 別途作成したMLBアプリ)と衝突せず、単独アプリとしてインストールできます。

1. [Netlify](https://www.netlify.com/) にアクセスし、GitHubアカウントでサインアップ/ログインする
2. ダッシュボードで **Add new site → Import an existing project** を選択
3. **GitHub** を選び、このリポジトリを選択する
4. ビルド設定は `netlify.toml` から自動で読み込まれます(Build command: `npm run build` / Publish directory: `dist`)。そのまま **Deploy** をクリック
5. 数分後、`https://<自動生成された名前>.netlify.app` でアクセスできるようになります
6. 好みのURLにしたい場合は、**Site settings → Change site name** から変更できます(例: `nitorol-log.netlify.app`)
7. 以降は `main` ブランチにpushするたびに自動で再デプロイされます

---

## 4. Android端末にインストールする(ホーム画面に追加)

1. Nothing Phone (3) の **Chrome** で、Netlifyで公開されたURL(`https://xxxx.netlify.app`)を開く
2. 数秒待つと、画面下に「ホーム画面に追加」または「アプリをインストール」というバナーが出ます
   - 出ない場合は、右上の「⋮」メニュー → **「アプリをインストール」** または **「ホーム画面に追加」**
3. インストールすると、他のアプリと同じようにホーム画面にアイコンが追加され、単独のウィンドウ(アドレスバーなし)で起動します
4. 以前 GitHub Pages 版を「ホーム画面に追加」していた場合は、そのショートカットは削除しておいてください(古いURLを指したままになります)

---

## データについて

- 記録は**この端末・このブラウザにのみ**保存されます(サーバーには送信されません)
- ブラウザのデータ消去やアプリの再インストールで記録が消える可能性があるため、通院前にはカレンダー画面からCSV/TXTで定期的に書き出しておくことをおすすめします
- 別の端末やブラウザで開いても、記録は共有されません
