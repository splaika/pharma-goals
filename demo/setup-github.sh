#!/usr/bin/env bash
# ------------------------------------------------------------
# GitHub Pages 一発セットアップ
#   リポジトリ作成 → push → Pages 有効化 → 公開URL表示 まで自動化。
#
# 前提: GitHub CLI (gh) がインストール済みで、`gh auth login` 認証済みであること。
#   インストール: https://cli.github.com/
#
# 使い方:
#   ./setup-github.sh <リポジトリ名> [public|private]
#
#   例) 公開（github.io リンクが誰でも見られる。無料プランでPagesが使える）:
#       ./setup-github.sh pharma-goals-demo public
#
#   例) 非公開（社外に出さない。Pages公開URLは GitHub Team/Enterprise が必要）:
#       ./setup-github.sh pharma-goals-demo private
# ------------------------------------------------------------
set -euo pipefail

REPO="${1:-pharma-goals-demo}"
VIS="${2:-public}"   # public | private

if ! command -v gh >/dev/null 2>&1; then
  echo "❌ GitHub CLI (gh) が見つかりません。https://cli.github.com/ からインストールしてください。"
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "❌ gh が未認証です。まず 'gh auth login' を実行してください。"
  exit 1
fi

if [ "$VIS" = "public" ]; then
  echo "⚠️  公開(public)リポジトリとして作成します。github.io のURLはURLを知る誰でも閲覧できます。"
  VISFLAG="--public"
else
  echo "🔒 非公開(private)リポジトリとして作成します。"
  echo "   ※ 非公開リポジトリで Pages 公開URLを使うには GitHub Team / Enterprise が必要です。"
  VISFLAG="--private"
fi

OWNER="$(gh api user --jq .login)"

# 1) git 初期化 & コミット
git init -q
git add .
git commit -q -m "Add pharma goals MVP demo" || echo "（コミット済みの変更なし）"
git branch -M main

# 2) リポジトリ作成 & push
echo "▶ リポジトリ $OWNER/$REPO を作成して push します…"
gh repo create "$REPO" $VISFLAG --source=. --remote=origin --push

# 3) GitHub Pages を有効化（main / ルート）
echo "▶ GitHub Pages を有効化します…"
gh api -X POST "repos/$OWNER/$REPO/pages" \
  -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1 \
  || echo "（Pagesは既に有効か、権限/プランの制約で自動有効化できませんでした。Settings→Pagesで手動設定してください）"

URL="https://$OWNER.github.io/$REPO/"
echo ""
echo "✅ 完了しました。"
echo "   リポジトリ : https://github.com/$OWNER/$REPO"
echo "   公開デモURL: $URL"
echo "   （Pagesの反映に最大1〜2分かかることがあります）"
