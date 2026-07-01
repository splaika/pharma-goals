# Pharma Goals — デモ

製薬業界向け 目標管理プラットフォームの MVP デモです。
**1枚の自己完結HTML**（HTML + CSS + JavaScript が一体）で、外部依存はフォントのみ。
`index.html` をブラウザで開くだけで動きます。

## 主な機能

- 会社 → 部門 → チーム → 個人 の目標カスケード（上位に紐づかない目標も許容）
- 部門・粒度での絞り込み、カスケード/リスト表示の切替
- 目標ごとの月次進捗入力（進捗率 + 一言コメント）と変更履歴
- 部門別サマリー（状態の内訳バー・今月更新率）
- レポート出力（CSVダウンロード・印刷対応）
- 日本語 / 英語 UI 切替

> データはブラウザ内のダミーデータで、リロードすると初期状態に戻ります（デモ用）。

---

## メンバーへの共有方法

### 方法A: GitHub Pages で「動くデモ」を公開（おすすめ）

1. このリポジトリを GitHub に push する（下の手順参照）
2. リポジトリの **Settings → Pages** を開く
3. **Source** で `Deploy from a branch` を選び、Branch = `main` / フォルダ = `/ (root)` を指定して Save
4. 数十秒後、`https://<ユーザー名>.github.io/<リポジトリ名>/` でデモが公開されます

このURLをメンバーに共有すれば、ブラウザですぐ触れます。

> ⚠️ **公開範囲に注意**: 無料プランの GitHub Pages は URL を知っていれば誰でも閲覧できます。
> クライアント関連の内容を社外に出したくない場合は、下の「方法B」か、
> GitHub Team / Enterprise の **プライベート Pages** を使ってください。

### 方法B: 非公開のまま共有

- リポジトリを **Private** にしてメンバーを招待 → 各自が clone し、`index.html` を
  ブラウザで開く（サーバー不要）。
- または push した後、`https://htmlpreview.github.io/?https://raw.githubusercontent.com/<ユーザー名>/<リポジトリ名>/main/index.html`
  のような htmlpreview 経由で表示（※このプレビューサービスは外部のため、機密性が重要なら非推奨）。

---

## GitHub への push 手順

### すでにリポジトリを作成済みの場合（コマンド）

```bash
cd pharma-goals-demo
git init
git add .
git commit -m "Add pharma goals MVP demo"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git push -u origin main
```

### GitHub CLI を使う場合

```bash
cd pharma-goals-demo
gh repo create pharma-goals-demo --private --source=. --remote=origin --push
```

### 画面から追加する場合

GitHub でリポジトリを新規作成 → **Add file → Upload files** で `index.html` と
このREADMEをドラッグ＆ドロップ → Commit。

---

## ローカルで確認

`index.html` をダブルクリックしてブラウザで開くだけです（ビルド不要）。

---

## 元になった開発版について

このデモを **React + TypeScript + Power Apps Code App（Dataverseバックエンド）** として
移植した開発版があります。バックエンドを Dataverse に載せて本格運用する場合はそちらを使います。
同じリポジトリで管理したい場合は、開発版一式を `app/` サブフォルダに置き、この `index.html` は
デモ用としてルートに残す構成が扱いやすいです。

---

## ワンコマンドで公開する（`setup-github.sh`）

GitHub CLI（`gh`）が入っていれば、リポジトリ作成〜push〜Pages有効化まで自動化できます。

```bash
# 事前に一度だけ: brew install gh (Mac) など → gh auth login
cd pharma-goals-demo

# 公開（誰でも見られるgithub.ioリンク・無料プランでOK）
./setup-github.sh pharma-goals-demo public

# 非公開（社外に出さない。Pages公開URLはGitHub Team/Enterprise必要）
./setup-github.sh pharma-goals-demo private
```

実行後、`https://<ユーザー名>.github.io/pharma-goals-demo/` が表示されます（反映に1〜2分）。
