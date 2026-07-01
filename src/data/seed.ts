import type { Goal } from "../types";

const mo = (
  month: string,
  pct: number,
  en: string,
  ja: string
): Goal["monthly"][number] => ({ month, pct, commentEn: en, commentJa: ja });

// Ported from the v3 mockup. Used by MockGoalsRepository and as illustrative
// content. In production this data lives in Dataverse (see README schema).
export const SEED_GOALS: Goal[] = [
  // ===== Company =====
  {
    id: "c1", parent: null, level: "company", dept: "co_co",
    titleEn: "Launch MGT-006 in Japan", titleJa: "MGT-006 日本上市",
    owner: "Board", av: "BD", status: "a",
    monthly: [
      mo("2026-03", 30, "Program kickoff complete.", "プログラム始動完了。"),
      mo("2026-04", 38, "Filing plan locked.", "申請計画を確定。"),
      mo("2026-05", 46, "Site readiness on track.", "施設準備は順調。"),
      mo("2026-06", 52, "CTD assembly underway.", "CTD編集が進行中。"),
    ],
    log: [],
  },
  {
    id: "c2", parent: null, level: "company", dept: "co_co",
    titleEn: "Strengthen data & safety capability", titleJa: "データ・安全性能力の強化",
    owner: "Board", av: "BD", status: "g",
    monthly: [
      mo("2026-04", 40, "Investment approved.", "投資承認。"),
      mo("2026-05", 58, "Hiring ahead of plan.", "採用が計画前倒し。"),
      mo("2026-06", 66, "Platform pilot live.", "基盤パイロット稼働。"),
    ],
    log: [],
  },

  // ===== Data Science dept — a ROOT with no company link (allowed) =====
  {
    id: "ds1", parent: null, level: "dept", dept: "ds",
    titleEn: "Build clinical data platform", titleJa: "臨床データ基盤の構築",
    owner: "Data Science", av: "DS", status: "g",
    monthly: [
      mo("2026-02", 20, "Architecture agreed.", "アーキテクチャ合意。"),
      mo("2026-03", 34, "Dataverse model built.", "Dataverseモデル構築。"),
      mo("2026-04", 50, "First pipelines live.", "初期パイプライン稼働。"),
      mo("2026-05", 62, "2 trials onboarded.", "2試験を取込み。"),
      mo("2026-06", 71, "Self-service dashboards out.", "セルフサービスDB提供開始。"),
    ],
    log: [],
  },
  {
    id: "ds2", parent: "c2", level: "dept", dept: "ds",
    titleEn: "Embed analytics in trial ops", titleJa: "治験オペへの分析組込み",
    owner: "Data Science", av: "DS", status: "a",
    monthly: [
      mo("2026-04", 28, "Use cases scoped.", "ユースケース整理。"),
      mo("2026-05", 40, "Pilot with 1 study.", "1試験で試行。"),
      mo("2026-06", 47, "Adoption slower than planned.", "定着が想定より遅い。"),
    ],
    log: [],
  },
  // DS teams
  {
    id: "ds_t1", parent: "ds1", level: "team", dept: "ds",
    titleEn: "Data engineering team", titleJa: "データエンジニアリングチーム",
    owner: "Eng team", av: "DE", status: "g",
    monthly: [
      mo("2026-03", 30, "Ingestion framework done.", "取込基盤完成。"),
      mo("2026-04", 52, "EDC connector built.", "EDCコネクタ構築。"),
      mo("2026-05", 64, "Latency targets met.", "遅延目標を達成。"),
      mo("2026-06", 76, "8 sources integrated.", "8ソース連携。"),
    ],
    log: [],
  },
  {
    id: "ds_t2", parent: "ds1", level: "team", dept: "ds",
    titleEn: "Visualization team", titleJa: "可視化チーム",
    owner: "Viz team", av: "VZ", status: "g",
    monthly: [
      mo("2026-04", 35, "Design system set.", "デザイン基盤確立。"),
      mo("2026-05", 55, "5 dashboards shipped.", "5DB提供。"),
      mo("2026-06", 68, "User training started.", "利用者研修開始。"),
    ],
    log: [],
  },
  // DS individuals
  {
    id: "ds_i1", parent: "ds_t1", level: "individual", dept: "ds",
    titleEn: "Integrate signal data sources", titleJa: "シグナルデータ連携",
    owner: "Kenji Takahashi", av: "KT", status: "a",
    monthly: [
      mo("2026-04", 25, "2 of 8 sources connected.", "8中2ソース接続。"),
      mo("2026-05", 38, "Access approvals delayed.", "アクセス承認が遅延。"),
      mo("2026-06", 50, "5 of 8 connected.", "8中5ソース接続。"),
    ],
    log: [
      { at: "Jun 5, 09:12", who: "KT", kind: "updated", note: "Access approvals granted for 3 more sources." },
      { at: "May 2, 16:40", who: "KT", kind: "created", note: "" },
    ],
  },
  {
    id: "ds_i2", parent: "ds_t1", level: "individual", dept: "ds",
    titleEn: "Automate KR data refresh", titleJa: "KRデータ自動更新",
    owner: "Lin Chen", av: "LC", status: "g",
    monthly: [
      mo("2026-05", 48, "Refresh job built.", "更新ジョブ構築。"),
      mo("2026-06", 72, "Auto-update for 12 KRs.", "12KRを自動更新化。"),
    ],
    log: [],
  },
  {
    id: "ds_i3", parent: "ds_t2", level: "individual", dept: "ds",
    titleEn: "Ship enrollment dashboard", titleJa: "登録進捗ダッシュボード",
    owner: "Kenji Takahashi", av: "KT", status: "g",
    monthly: [
      mo("2026-04", 40, "Mockups approved.", "モック承認。"),
      mo("2026-05", 60, "v1 released.", "v1リリース。"),
      mo("2026-06", 82, "Adopted by 3 studies.", "3試験で利用。"),
    ],
    log: [{ at: "Jun 1, 11:05", who: "KT", kind: "updated", note: "Rolled out to the third study team." }],
  },
  {
    id: "ds_i4", parent: "ds_t2", level: "individual", dept: "ds",
    titleEn: "Standardize KPI definitions", titleJa: "KPI定義の標準化",
    owner: "Sara Okada", av: "SO", status: "g",
    monthly: [
      mo("2026-05", 50, "Draft glossary done.", "用語集ドラフト完成。"),
      mo("2026-06", 70, "Reviewed by 4 depts.", "4部門でレビュー。"),
    ],
    log: [],
  },

  // ===== Clinical Ops =====
  {
    id: "co1", parent: "c1", level: "dept", dept: "co",
    titleEn: "Complete Phase III enrollment", titleJa: "第III相 組入完了",
    owner: "Clinical Ops", av: "CO", status: "a",
    monthly: [
      mo("2026-03", 45, "180 of 240 enrolled.", "240中180登録。"),
      mo("2026-04", 55, "200 enrolled.", "200登録。"),
      mo("2026-05", 62, "Pace below target.", "ペースが目標未達。"),
      mo("2026-06", 70, "215 enrolled.", "215登録。"),
    ],
    log: [],
  },
  {
    id: "co_t1", parent: "co1", level: "team", dept: "co",
    titleEn: "Site activation team", titleJa: "施設立上げチーム",
    owner: "Site team", av: "SI", status: "g",
    monthly: [
      mo("2026-04", 60, "22 of 25 sites live.", "25中22施設稼働。"),
      mo("2026-05", 80, "24 sites live.", "24施設稼働。"),
      mo("2026-06", 96, "All 25 sites live.", "全25施設稼働。"),
    ],
    log: [],
  },
  {
    id: "co_i1", parent: "co_t1", level: "individual", dept: "co",
    titleEn: "Reduce screen-fail rate", titleJa: "スクリーニング失敗率の低減",
    owner: "Aoi Mori", av: "AM", status: "a",
    monthly: [
      mo("2026-04", 30, "Failures at 18%.", "失敗率18%。"),
      mo("2026-05", 45, "Down to 15%.", "15%へ低減。"),
      mo("2026-06", 55, "At 14%, target 12%.", "14%、目標12%。"),
    ],
    log: [],
  },

  // ===== Regulatory Affairs =====
  {
    id: "ra1", parent: "c1", level: "dept", dept: "ra",
    titleEn: "Secure MGT-006 approval", titleJa: "MGT-006 承認取得",
    owner: "Reg Affairs", av: "RA", status: "a",
    monthly: [
      mo("2026-03", 25, "Pre-submission meeting held.", "事前面談を実施。"),
      mo("2026-04", 35, "Module 2 drafting.", "モジュール2起草中。"),
      mo("2026-05", 44, "9 of 12 sections drafted.", "12中9セクション起草。"),
      mo("2026-06", 52, "QC reviews ongoing.", "QCレビュー進行中。"),
    ],
    log: [],
  },
  {
    id: "ra_i1", parent: "ra1", level: "individual", dept: "ra",
    titleEn: "Respond to PMDA queries", titleJa: "PMDA照会対応",
    owner: "Aoi Mori", av: "AM", status: "g",
    monthly: [
      mo("2026-05", 70, "10 of 15 answered.", "15中10回答。"),
      mo("2026-06", 92, "14 of 15 answered.", "15中14回答。"),
    ],
    log: [],
  },

  // ===== Pharmacovigilance — dept ROOT, no company link =====
  {
    id: "pv1", parent: null, level: "dept", dept: "pv",
    titleEn: "Modernize pharmacovigilance", titleJa: "PV体制の刷新",
    owner: "PV", av: "PV", status: "r",
    monthly: [
      mo("2026-04", 18, "SOP review started.", "SOP見直し開始。"),
      mo("2026-05", 24, "Vendor selection slipped.", "ベンダー選定が遅延。"),
      mo("2026-06", 30, "1 of 6 SOPs updated.", "6中1SOP改訂。"),
    ],
    log: [],
  },
  {
    id: "pv_i1", parent: "pv1", level: "individual", dept: "pv",
    titleEn: "Clear case backlog", titleJa: "症例バックログ解消",
    owner: "Sara Okada", av: "SO", status: "g",
    monthly: [
      mo("2026-04", 50, "420 cases pending.", "420症例滞留。"),
      mo("2026-05", 72, "120 pending.", "120滞留。"),
      mo("2026-06", 90, "20 pending.", "20滞留。"),
    ],
    log: [],
  },
];
