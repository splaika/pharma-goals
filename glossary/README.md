# 用語集（MedDRA/J PT）

MedDRA/J の PT（基本語, Preferred Term）日本語ファイル `pt_j.asc` を、扱いやすい
CSV に変換したものです。

## ファイル

| ファイル | 内容 |
| --- | --- |
| `pt_j.csv` | PT 用語集（27,361 件, UTF-8 BOM 付き） |
| `convert.py` | 元ファイル `pt_j.asc` から CSV/Markdown を再生成するスクリプト |

### CSV の列

| 列 | 説明 |
| --- | --- |
| `pt_code` | PT コード（8 桁） |
| `term_ja` | 用語（日本語・漢字表記） |
| `reading_kana` | 読み（カナ, 半角→全角に正規化） |
| `reading_alt` | 別読み（存在する場合のみ, 943 件） |

## 再生成

元の `pt_j.asc`（`$` 区切り, CP932）は**ライセンスデータのためリポジトリには含めていません**。
購読者が保有する原本を用意して実行します。

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
