---
name: publish-demo-pages
description: アップロードされた成果物（自己完結HTMLデモ等）をこのリポジトリにマージし、README にデモページへのリンクを追加し、GitHub Pages で公開するまでの一連の手順。作業ブランチ→PR確認→main マージ→自動公開というブランチ運用も含む。Use when merging an uploaded demo/asset into the repo, adding a demo link to the README, enabling or verifying GitHub Pages publishing, or setting up the branch/PR workflow for splaika/pharma-goals.
---

# publish-demo-pages

アップロードされた成果物（多くは「1枚で完結する HTML デモ」）をリポジトリに取り込み、
README からクリックで開けるようにし、GitHub Pages で公開する。あわせて「作業ブランチ →
PR で確認 → `main` にマージ → 自動公開」というブランチ運用を回す。

## いつ使うか

- ユーザーが zip / HTML などの成果物を「リポジトリにマージして」と言ったとき
- 「デモページのリンクを README にわかるように」入れてほしいと言ったとき
- GitHub Pages を有効化 / 確認したいとき
- 今後の変更を PR で確認してマージする運用を整えたいとき

## 前提・このリポジトリ特有の事情

- リポジトリ: `splaika/pharma-goals`
- ルートの `index.html` は **Vite のエントリ**（`/src/main.tsx` を読む）なので、
  ビルドせずに静的公開しても表示されない。→ **デモは `demo/` サブフォルダに置く**。
- 公開URL: **https://splaika.github.io/pharma-goals/demo/**
- 公開・安定版は **`main`** ブランチ。Pages はここを公開する。**`main` は消さない**。

## 全体フロー

```
1. 成果物を demo/ にマージ（ルートの Vite index.html と競合させない）
2. README 上部に「🔗 デモページ」セクション＋リンクを追加
3. 作業ブランチに commit & push
4. （運用）PR を作成 → ユーザーが差分確認 → main にマージ
5. GitHub Pages が main /(root) を自動ビルド → デモ公開
```

## 手順詳細

### 1. 成果物のマージ

- zip は scratchpad に展開して中身を確認してから取り込む。
- デモ本体（自己完結HTML）＋そのREADME・補助スクリプトは `demo/` に置く。
  例: `demo/index.html`, `demo/README.md`, `demo/setup-github.sh`（実行権限付与）。
- ルートの `index.html`（Vite用）は上書きしない。

### 2. README にデモリンクを追加

ルート `README.md` の上部（イントロ直後）に、以下の要素を含むセクションを入れる:

- **公開デモURL（GitHub Pages）**: https://splaika.github.io/pharma-goals/demo/
- **htmlpreview リンク**（Pages 未設定でも見られる代替。public リポジトリ前提）:
  `https://htmlpreview.github.io/?https://raw.githubusercontent.com/splaika/pharma-goals/main/demo/index.html`
- **ローカルで開く**: `demo/index.html` をダブルクリック
- デモはダミーデータで動きリロードで初期化される旨の注記
- 詳細は `demo/README.md` 参照、のリンク

### 3. commit & push

- 指定の作業ブランチで作業（例 `claude/...`）。
- `git push -u origin <branch>`。ネットワーク失敗時のみ指数バックオフで最大4回リトライ。

### 4. GitHub Pages の有効化（ユーザー操作が必要）

Pages の有効化・可視性変更・公開元ブランチ切替は **MCP ツールに無い**ので、
ユーザーに GitHub 画面で操作してもらう。手順を明確に案内する:

- **private だと無料 Pages 不可** → `Settings → General → Danger Zone → Change visibility → Public`
- `Settings → Pages → Source: Deploy from a branch → Branch: main / Folder: /(root) → Save`
- 反映に 1〜2分

### 5. 公開の確認方法（重要な落とし穴）

- **この実行環境のプロキシは `*.github.io` への外部接続を 403 でブロック**する。
  `curl https://splaika.github.io/...` は `HTTP 000`（CONNECT tunnel failed 403）になるが、
  **これはサイトの不具合ではなく環境制約**。curl 結果だけで「失敗」と判断しない。
- 代わりに **GitHub Actions の "pages build and deployment" ワークフローの結論を確認**する:
  `mcp__github__actions_list`（`method: list_workflow_runs`）で最新 run の
  `conclusion == "success"` を見る。成功なら公開済み。ユーザーのブラウザで開いてもらう。

## ブランチ運用（今後の標準）

- **`main`** = 完成・公開版。常にきれいな状態を保ち、削除しない。Pages はここを公開。
- **作業ブランチ** = タスクごとに新規作成し、変更を push。マージ後は削除可。
- **1タスク＝1ブランチ**。マージ済みブランチは使い回さない（新しい変更は新しいブランチ）。
- 確認・マージは **PR 方式**（ユーザー選好）:
  1. Claude が作業ブランチを push
  2. Claude が PR を作成（「何を・なぜ変えたか」を本文に書く）
  3. ユーザーが差分を確認 → Merge ボタン
  4. `main` に合流 → Pages が自動再ビルドして反映
- PR は **ユーザーが明示的に依頼したときのみ**作成する（このリポジトリでは PR 運用が合意済み）。
- `main` が無い状態なら、公開したい内容のブランチから `main` を作成して公開元にする
  （`mcp__github__create_branch` で `from_branch` 指定）。

## 便利メモ

- GitHub 操作は `gh` CLI 不可。`mcp__github__*` ツールを使う（ToolSearch で読み込む）。
- リポジトリ操作は `splaika/pharma-goals` のみ許可スコープ。
- Pages の公開元を作業ブランチにしていると、そのブランチ削除で 404 になる。安定運用は `main`。

## 変更履歴

- 2026-07-01: 初版作成。今日の会話（`a6857a16-pharmagoalsdemo.zip` の自己完結HTMLデモを
  `demo/` にマージ → README に「🔗 デモページ」セクション追加 → リポジトリ Public 化 →
  GitHub Pages を有効化・公開 → 作業ブランチから `main` を作成して公開元を安定化 →
  今後は PR 方式で確認・マージする方針を合意）を手順として記録。
