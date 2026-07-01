# Pharma Goals — Power Apps Code App

目標管理MVP（`pharma_goals_mvp_v3`）を **React + TypeScript + Vite** で移植し、
**Power Apps Code App** として構成したものです。データ層を差し替え可能にしています。

- **モックモード（既定）** — メモリ内のシードデータで動作。Power Platform 不要で、
  VS Code ですぐ起動します。**7/21のデモとUI開発はこれで完結**します。
- **Dataverse モード** — 3つの Dataverse テーブルを、自動生成される型付きサービス経由で
  読み書きします。認証・セキュリティロール・監査はプラットフォーム側が継承します
  （トークン管理もバックエンドも不要）。

切り替えは環境変数 `VITE_USE_DATAVERSE` の1つだけ。モード間で **UIコードの変更は不要**です。

---

## 1. モックデータでローカル起動（最短）

```bash
npm install
npm run dev
```

表示されたローカルURLを開きます。シードデータで一通り動作し、リロードで初期状態に戻ります。

> `npm install` で `@microsoft/power-apps` が入ります。ネイティブ依存のビルドに失敗する
> 環境でも、UI開発は可能です（SDKはDataverseモードでのみ呼ばれます）。

主なスクリプト:

| スクリプト | 用途 |
| --- | --- |
| `npm run dev` | Vite開発サーバー（モックデータ） |
| `npm run build` | `tsc --noEmit && vite build` → `dist/` 出力 |
| `npm run typecheck` | 型チェックのみ |
| `npm run preview` | 本番ビルドのプレビュー |

---

## 2. 本物の Power Apps Code App にする

前提: Node.js（LTS）、Git、**Code Apps が有効な** Power Platform 環境
（無料の Power Apps Developer Plan で十分）。

```bash
# Power Apps クライアントライブラリ + npm CLI をインストール
npm install -g @microsoft/power-apps

# このプロジェクトを環境にCode Appとして登録
power-apps init --display-name "Pharma Goals" --environment-id <あなたの環境ID>

# 実環境に対してローカル実行（ターミナル2つ）:
power-apps run      # ターミナル1 — 認証プロキシ + コネクタ経路
npm run dev         # ターミナル2 — Vite（"Local Play" URLを、テナントと同じブラウザプロファイルで開く）

# 公開
npm run build
power-apps push
```

`power-apps init` は `power.config.json`（アプリのマニフェスト）を生成します。ソース管理に含めてください。

---

## 3. Dataverse に接続する

### 3a. テーブルを作成

make.powerapps.com でソリューションとパブリッシャー（プレフィックス `sto`）を作成し、
テーブルを3つ作ります。level と status はマッピングを簡潔にするため **テキスト列** にしています
（後から選択肢列に昇格可能）。

**テーブル: Goal**（論理名 `sto_goal`）

| 列（論理名） | 型 | 備考 |
| --- | --- | --- |
| `sto_name` | テキスト | 主列 → 英語タイトル |
| `sto_titleja` | テキスト | 日本語タイトル |
| `sto_level` | テキスト | `company` \| `dept` \| `team` \| `individual` |
| `sto_department` | テキスト | 部門ID（`ds`, `co`, `ra`, `pv`, `co_co`） |
| `sto_owner` | テキスト | 担当者名 / チーム名 |
| `sto_avatar` | テキスト | アバターのイニシャル |
| `sto_status` | テキスト | `g` \| `a` \| `r` |
| `sto_parent` | 検索（→ **Goal**） | 自己参照。空=最上位 |

**テーブル: Goal Update**（論理名 `sto_goalupdate`）— 月次進捗

| 列 | 型 | 備考 |
| --- | --- | --- |
| `sto_name` | テキスト | 主列 |
| `sto_goal` | 検索（→ **Goal**） | 対象の目標 |
| `sto_month` | テキスト | `YYYY-MM` |
| `sto_percent` | 整数 | 0–100 |
| `sto_commenten` | テキスト（複数行） | 英語コメント |
| `sto_commentja` | テキスト（複数行） | 日本語コメント |

**テーブル: Goal Change**（論理名 `sto_goalchange`）— 変更履歴

| 列 | 型 | 備考 |
| --- | --- | --- |
| `sto_name` | テキスト | 主列 |
| `sto_goal` | 検索（→ **Goal**） | 対象の目標 |
| `sto_changedat` | テキスト | 表示用タイムスタンプ |
| `sto_who` | テキスト | イニシャル |
| `sto_kind` | テキスト | `created` \| `updated` |
| `sto_note` | テキスト（複数行） | 変更メモ |

> アプリ内の簡易履歴に加えてプラットフォームの監査証跡も残したい場合は、
> Goal テーブルの **監査（Auditing）** を有効にしてください。

### 3b. 型付きサービスを生成

```bash
pac code add-data-source -a dataverse -t sto_goal
pac code add-data-source -a dataverse -t sto_goalupdate
pac code add-data-source -a dataverse -t sto_goalchange
```

これで `src/generated/…` に実ファイルが生成され、同梱の **プレースホルダを置き換え**ます。
生成されたサービス/モデルの識別子（例: `GoalsService` / `Goals`）が
`src/data/dataverseRepository.ts` の import と一致するか確認してください。テーブルの複数形
表示名が異なる場合は import 名を調整します — 修正が必要なのはこの1ファイルだけです。

### 3c. 切り替える

```bash
cp .env.example .env.local   # その後 VITE_USE_DATAVERSE=true に設定
npm run dev
```

---

## 4. プロジェクト構成

```
src/
  main.tsx                 アプリのブートストラップ
  PowerProvider.tsx        Power Apps ホストのコンテキスト待ち（Dataverseモード）
  App.tsx                  状態・画面遷移・言語・保存/削除の統括
  types.ts                 ドメインモデル（Goal / MonthlyEntry / ChangeEntry）
  refData.ts               部門・月・ヘルパ（進捗・絞り込みなど）
  i18n.ts                  EN/JA 言語コンテキスト + t()
  index.css                スタイル（v3モックから移植）
  data/
    repository.ts          GoalsRepository インターフェース + mock/dataverse 切替
    mockRepository.ts       メモリ内実装（シード）
    seed.ts                 デモデータ
    dataverseRepository.ts  Dataverse実装（行 <-> ドメインのマッピング）
  generated/               ⚠️ `pac code add-data-source` 実行までプレースホルダ
  components/
    Sidebar / Filters / Overview / GoalsView / GoalDrawer / ReportView
```

**データの流れ:** コンポーネント → `GoalsRepository` →（Mock | Dataverse）。
書き込みは粒度を分けています（`updateGoal` / `upsertMonthly` / `addChange`）ので、
Dataverse でも対象の行だけを正確に更新します。

---

## 注意・制限事項

- **検索（ルックアップ）列** は `@odata.bind` 構文で設定します（`dataverseRepository.ts` 参照）。
  既存目標の親を「なし」に戻す操作は今後の対応としています（Code Apps はまだ関連解除の
  専用ヘルパを公開していないため）。
- **フォント** は Google Fonts から読み込みます。Power Apps は CSP を強制します（2026年1月以降）。
  環境のCSP設定で `fonts.googleapis.com` / `fonts.gstatic.com` を許可するか、
  `index.css` でシステムフォントに切り替えてください。
- **React 18** — Power Apps SDK は React 18 対象です。19 には上げないでください。
- 権限制御は本MVPの対象外です（全員が全件閲覧）。Dataverseモードでは行の可視性は
  割り当てたセキュリティロールに従います。
