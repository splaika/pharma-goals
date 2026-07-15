// ============================================================================
// 参照データ・定数・小ヘルパ
// ============================================================================
import { choiceSet, choiceLabel } from "./schema";
import type { Lang, NotifTypeKey, StatusKey } from "./types";
export { NOTIF_TYPE_ORDER } from "./types";

// デモの基準日（本番相当。実クロックに依存せず再現可能にする）
export const TODAY = "2026-07-14";

// ---- 選択肢セット名（schema の setName と一致させる） ----
export const SET = {
  notifType: "届出種別",
  targetCategory: "対象区分",
  kubun: "届出区分",
  status: "ステータス",
  drugRole: "主従区分",
  doctorRole: "医師区分",
  phase: "開発の相",
  trialType: "試験の種類",
  changeLocations: "変更箇所（複数選択）",
  devStatus: "開発状態",
  changeType: "異動区分",
  combCategory: "薬剤区別",
  docType: "資料種別",
  attachStatus: "添付ステータス",
  irbType: "IRB区分",
  gaijiType: "外字判定区分",
} as const;

export const label = (setName: string, value: number | undefined) =>
  choiceLabel(setName, value);
export const options = (setName: string) => choiceSet(setName);

// ---- 届出種別 <-> choice値 / キー ----
export const NOTIF_TYPE_VALUE: Record<NotifTypeKey, number> = {
  plan: 100000000,
  change: 100000001,
  termination: 100000002,
  completion: 100000003,
  devDiscontinuation: 100000004,
};
export const NOTIF_TYPE_LABEL: Record<NotifTypeKey, [string, string]> = {
  plan: ["Clinical Trial Plan", "治験計画届"],
  change: ["Plan Change", "治験計画変更届"],
  termination: ["Discontinuation", "治験中止届"],
  completion: ["Completion", "治験終了届"],
  devDiscontinuation: ["Dev. Discontinuation", "開発中止届"],
};
export const NOTIF_TYPE_SHORT: Record<NotifTypeKey, string> = {
  plan: "計画",
  change: "変更",
  termination: "中止",
  completion: "終了",
  devDiscontinuation: "開発中止",
};
export const notifTypeName = (k: NotifTypeKey, lang: Lang) =>
  lang === "ja" ? NOTIF_TYPE_LABEL[k][1] : NOTIF_TYPE_LABEL[k][0];

// ---- ステータス <-> choice値 / 表示 ----
export const STATUS_VALUE: Record<StatusKey, number> = {
  draft: 100000300,
  review: 100000301,
  approved: 100000302,
  submitted: 100000303,
};
export const STATUS_ORDER: StatusKey[] = ["draft", "review", "approved", "submitted"];
export const STATUS_LABEL: Record<StatusKey, [string, string]> = {
  draft: ["Draft", "作成中"],
  review: ["In Review", "レビュー中"],
  approved: ["Approved", "承認済み"],
  submitted: ["Submitted", "提出済み"],
};
// UIステータス色クラス（index.css の g/a/r と別に専用）
export const STATUS_CLASS: Record<StatusKey, string> = {
  draft: "st-draft",
  review: "st-review",
  approved: "st-approved",
  submitted: "st-submitted",
};
export const statusName = (k: StatusKey, lang: Lang) =>
  lang === "ja" ? STATUS_LABEL[k][1] : STATUS_LABEL[k][0];

// ---- 固定 choice値（分岐で使うもの） ----
export const DRUG_ROLE = { main: 100000400, other: 100000401 } as const;
export const DOCTOR_ROLE = { responsible: 100000500, sub: 100000501 } as const;
export const CHANGE_TYPE = {
  register: 100001000, // 登録（初回）
  add: 100001001, // 追加
  remove: 100001002, // 削除
  change: 100001003, // 変更
} as const;
export const IRB_TYPE = { internal: 100001400, external: 100001401 } as const;
export const DEV_STATUS = { active: 100000900, discontinued: 100000901 } as const;
export const KUBUN = { k1: 100000200, k2: 100000201, k3: 100000202 } as const;
export const TARGET_CATEGORY = { drug: 100000100, device: 100000101, regen: 100000102 } as const;
export const GAIJI_TYPE = {
  outOfJis: 100001500,
  platformDependent: 100001501,
  ivs: 100001502,
  pua: 100001503,
} as const;
export const ATTACH_STATUS = { attached: 100001300, checking: 100001301, optional: 100001302 } as const;
// 薬剤区別（被験薬/対照薬/併用薬/レスキュー薬/その他）
export const COMB = { subject: 100001100, control: 100001101, concomitant: 100001102, rescue: 100001103, other: 100001104 } as const;
export const COMB_PLACEHOLDER = COMB.control; // プラセボ＝対照薬

// 該当有無（APPLICABLEORNOT）— 生物由来製品/カルタヘナ/拡大治験 等の該当区分。
// 手引きのコード値は要確認のため暫定（1=該当 / 0=非該当）。
export const APPLICABILITY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "該当" },
  { value: 0, label: "非該当" },
];

// 30日調査対応被験薬区分（cr_subj30dayreview）— コード表・「要確認」。
// 手引き未確定のため、届出区分（SET.kubun）とは切り離した当項目専用の暫定値を定義する。
export const SUBJ30_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1（30日調査対応被験薬）" },
  { value: 2, label: "2（通知該当被験薬）" },
  { value: 3, label: "3（その他）" },
];

// ============================================================================
// デモ利用者（Entra ID の代替。職務分離＝起票者≠承認者 の検証に使用）
// ============================================================================
export interface DemoUser {
  id: string;
  name: string;
  initials: string;
  role: "drafter" | "reviewer" | "approver" | "regulatory";
  dept: string;
}
export const USERS: DemoUser[] = [
  { id: "u-a", name: "青木 亮介", initials: "AR", role: "drafter", dept: "臨床開発部" },
  { id: "u-b", name: "別府 美咲", initials: "BM", role: "reviewer", dept: "臨床開発部" },
  { id: "u-c", name: "千葉 健一", initials: "CK", role: "approver", dept: "開発本部" },
  { id: "u-d", name: "土井 直樹", initials: "DN", role: "regulatory", dept: "薬事部" },
];
export const userById = (id: string) => USERS.find((u) => u.id === id);
export const roleLabel: Record<DemoUser["role"], [string, string]> = {
  drafter: ["Drafter", "起票担当"],
  reviewer: ["Reviewer", "レビュー担当"],
  approver: ["Approver", "承認者"],
  regulatory: ["Regulatory", "薬事担当"],
};

// ============================================================================
// 外字 縮退マップ（代表例・デモ用）。本番は標準＋社内辞書。
// ============================================================================
export interface GaijiEntry {
  original: string;
  replacement: string;
  codePoint: string;
  gaijiType: number;
}
export const GAIJI_MAP: GaijiEntry[] = [
  { original: "髙", replacement: "高", codePoint: "U+9AD9", gaijiType: GAIJI_TYPE.platformDependent },
  { original: "﨑", replacement: "崎", codePoint: "U+FA11", gaijiType: GAIJI_TYPE.outOfJis },
  { original: "德", replacement: "徳", codePoint: "U+5FB3", gaijiType: GAIJI_TYPE.platformDependent },
  { original: "濵", replacement: "浜", codePoint: "U+6FF5", gaijiType: GAIJI_TYPE.outOfJis },
  { original: "淸", replacement: "清", codePoint: "U+6DF8", gaijiType: GAIJI_TYPE.outOfJis },
  { original: "眞", replacement: "真", codePoint: "U+771E", gaijiType: GAIJI_TYPE.platformDependent },
  { original: "邊", replacement: "辺", codePoint: "U+9089", gaijiType: GAIJI_TYPE.outOfJis },
  { original: "齋", replacement: "斎", codePoint: "U+9F4B", gaijiType: GAIJI_TYPE.outOfJis },
  { original: "曻", replacement: "昇", codePoint: "U+66FB", gaijiType: GAIJI_TYPE.pua },
  { original: "圡", replacement: "土", codePoint: "U+5721", gaijiType: GAIJI_TYPE.platformDependent },
];
export const gaijiFor = (ch: string) => GAIJI_MAP.find((g) => g.original === ch);

// ============================================================================
// 日付ヘルパ
// ============================================================================
export const parseDate = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};
export const fmtDate = (s?: string): string => (s ? s.replace(/-/g, "/") : "—");
export const addDays = (s: string, days: number): string => {
  const dt = parseDate(s);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
/** a - b の日数（a,b は YYYY-MM-DD） */
export const daysBetween = (a: string, b: string): number => {
  const ms = parseDate(a).getTime() - parseDate(b).getTime();
  return Math.round(ms / 86_400_000);
};
/** 期限までの残日数（today基準・正=未来） */
export const daysUntil = (deadline?: string, today = TODAY): number | null =>
  deadline ? daysBetween(deadline, today) : null;

// 和暦っぽい短縮表示（デモ）
export const shortDate = (s?: string, lang: Lang = "ja"): string => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return lang === "ja" ? `${y}/${m}/${d}` : `${m}/${d}/${y}`;
};

// バイト数（Shift-JIS 近似: 全角2/半角1）— バイト数検証の表示に使用
export const byteLen = (s: string): number => {
  let n = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    n += code <= 0x7f || (code >= 0xff61 && code <= 0xff9f) ? 1 : 2;
  }
  return n;
};

export const initialsOf = (name: string): string => {
  const clean = name.replace(/\s/g, "");
  return clean.slice(0, 2);
};
