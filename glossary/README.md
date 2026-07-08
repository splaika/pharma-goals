# 用語集（MedDRA/J PT）

MedDRA/J の PT（基本語, Preferred Term）日本語ファイル `pt_j.asc` を、扱いやすい
CSV / Markdown に変換するためのツール一式です。

> **データ本体（`pt_j.csv` / `pt_j.md`）と原本 `pt_j.asc` はリポジトリに含めません。**
> MedDRA/J はサブスクリプション・ライセンスのデータで、公開リポジトリでの配布は
> 許可されていないためです（末尾「ライセンス」参照）。購読者が保有する原本から
> `convert.py` でローカル生成してください。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `convert.py` | 原本 `pt_j.asc` から CSV/Markdown を生成するスクリプト |

### 生成される CSV の列

| 列 | 説明 |
| --- | --- |
| `pt_code` | PT コード（8 桁） |
| `term_ja` | 用語（日本語・漢字表記） |
| `reading_kana` | 読み（カナ, 半角→全角に正規化） |
| `reading_alt` | 別読み（存在する場合のみ, 943 件） |

## 生成

原本 `pt_j.asc`（`$` 区切り, CP932）を用意して実行します。生成物は公開リポジトリに
コミットしないでください（`.gitignore` 済み）。

```bash
python glossary/convert.py pt_j.asc glossary/pt_j.csv   # CSV
python glossary/convert.py pt_j.asc pt_j.md             # Markdown テーブル
```

## ⚠️ ライセンス

このデータは **MedDRA/J**（ICH／MSSO・JMO が管理するサブスクリプション・ライセンス）に
由来します。利用は購読契約の範囲に限られ、**非購読者への再配布や一般公開は許可されていません**。

- 公開リポジトリ・GitHub Pages 等での**公開に含めない**でください。
- 外部クラウド／AI サービス（Foundry の用語集・ナレッジ等）へ取り込む際は、
  MedDRA の利用条件を事前に確認してください。
