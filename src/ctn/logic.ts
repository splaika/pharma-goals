// ============================================================================
// サーバーロジック（ホスト非依存の純粋関数）
// ----------------------------------------------------------------------------
// 本番では Dataverse プラグイン／数式列に載せ替える中核ロジック。
// ハンドオフ第4節「特に間違えやすい4つのロジック」をここに集約する。
// UI（PCF/ビジネスルール相当）は提案・即時表示のみ、確定はこの層＝サーバー正本。
// ============================================================================
import {
  addDays,
  CHANGE_TYPE,
  DEV_STATUS,
  KUBUN,
  byteLen,
  gaijiFor,
  GAIJI_MAP,
} from "./refData";
import type { Investigator, Notification, StudyDrug } from "./types";

// ---------------------------------------------------------------------------
// (S1) 30日調査対象の判定（数式列相当）
//   計画届∧届出回数=1 → 真 ／ 変更届∧届出区分=1 → 真 ／ 中止・終了・開発中止 → 偽
// ---------------------------------------------------------------------------
export function is30DayReview(n: Pick<Notification, "notifType" | "filingCount" | "kubun">): boolean {
  if (n.notifType === "plan") return n.filingCount === 1;
  if (n.notifType === "change") return n.kubun === KUBUN.k1;
  return false;
}

// ---------------------------------------------------------------------------
// (S2) 提出期限の算定（数式列相当）
//   DateAdd(治験開始予定日, 30日調査対象なら -30 それ以外 -14, Days)
//   中止/終了/開発中止は対象外
// ---------------------------------------------------------------------------
export function computeDeadline(
  n: Pick<Notification, "notifType" | "filingCount" | "kubun" | "plannedStartDate">
): string | undefined {
  if (n.notifType !== "plan" && n.notifType !== "change") return undefined;
  if (!n.plannedStartDate) return undefined;
  return addDays(n.plannedStartDate, is30DayReview(n) ? -30 : -14);
}

// ---------------------------------------------------------------------------
// (S3) 届出区分の推奨（同期プラグイン相当・PCFは表示のみ）
//   変更箇所のうち最も重い区分（1＞2＞3）を推奨。保存時にサーバーで再計算し確定。
// ---------------------------------------------------------------------------
// 変更箇所 choice値 → 推奨区分 の重み表
const CHANGE_LOC_KUBUN: Record<number, number> = {
  100000800: KUBUN.k1, // 目的の変更
  100000801: KUBUN.k1, // 対象疾患の追加
  100000802: KUBUN.k1, // 被験薬の追加
  100000803: KUBUN.k2, // 治験使用薬の追加
  100000804: KUBUN.k3, // 治験分担医師の追加・削除
  100000805: KUBUN.k3, // CROの追加・変更
  100000806: KUBUN.k3, // 届出担当者の変更
  100000807: KUBUN.k3, // 備考欄の追加
};

export interface KubunSuggestion {
  value: number; // KUBUN.k1|k2|k3
  reasonJa: string;
  reasonEn: string;
}

export function recommendKubun(
  n: Pick<Notification, "notifType" | "filingCount" | "changeLocations">
): KubunSuggestion {
  if (n.notifType === "plan") {
    const first = n.filingCount === 1;
    return first
      ? { value: KUBUN.k1, reasonJa: "初回計画届（届出回数1）のため30日調査対象＝区分1", reasonEn: "First plan filing (count 1) → 30-day review → kubun 1" }
      : { value: KUBUN.k3, reasonJa: "計画届（再提出）のため区分3（その他）", reasonEn: "Re-filed plan → kubun 3 (other)" };
  }
  if (n.notifType === "change") {
    const locs = n.changeLocations ?? [];
    if (locs.length === 0)
      return { value: KUBUN.k3, reasonJa: "変更箇所が未選択のため暫定で区分3", reasonEn: "No change locations selected → provisional kubun 3" };
    // 最も重い＝最小の区分番号
    const heaviest = Math.min(...locs.map((l) => CHANGE_LOC_KUBUN[l] ?? KUBUN.k3));
    const drivers = locs.filter((l) => (CHANGE_LOC_KUBUN[l] ?? KUBUN.k3) === heaviest);
    return {
      value: heaviest,
      reasonJa: `変更箇所のうち最も重い区分（${drivers.length}件が該当）から算出`,
      reasonEn: `Derived from the heaviest change location (${drivers.length} match)`,
    };
  }
  return { value: KUBUN.k3, reasonJa: "中止・終了・開発中止のため区分3", reasonEn: "Termination/completion/dev-discontinuation → kubun 3" };
}

// ---------------------------------------------------------------------------
// (S4) 順序番号採番 — 突合キー型（治験使用薬）
//   同一シリーズ内で採番。計画→終了で不変・欠番可・再付番禁止。
//   siblings = そのシリーズで既に採番済みの全順序番号。
// ---------------------------------------------------------------------------
export function nextStudyDrugSerial(existingSerials: number[]): number {
  return existingSerials.length ? Math.max(...existingSerials) + 1 : 1;
}

/** シリーズ内の届出群から、既発番の順序番号集合を得る */
export function seriesStudyDrugSerials(notifications: Notification[]): number[] {
  const set = new Set<number>();
  for (const n of notifications) for (const d of n.studyDrugs) set.add(d.serialNo);
  return [...set].sort((a, b) => a - b);
}

// ---------------------------------------------------------------------------
// (S5) 順序番号採番 — イベント行型（医師）
//   届内・イベント単位で付番。同一人物の複数行を許容。突合キー型とは完全分離。
// ---------------------------------------------------------------------------
export function nextInvestigatorSerial(notification: Notification): number {
  let max = 0;
  for (const s of notification.sites)
    for (const inv of s.investigators) max = Math.max(max, inv.serialNo);
  return max + 1;
}

// ---------------------------------------------------------------------------
// (S6) 治験成分記号の検証
//   半角英数字（ハイフン可）・20桁以内・禁則文字「&」不可・スペース有無を識別
// ---------------------------------------------------------------------------
export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
export function validateCompoundCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (code.trim().length === 0) errors.push("治験成分記号は必須です。");
  if ([...code].length > 20) errors.push(`20桁以内で入力してください（現在 ${[...code].length} 桁）。`);
  if (code.includes("&")) errors.push("禁則文字「&」は使用できません。");
  if (/[^\x00-\x7F]/.test(code)) errors.push("全角文字が含まれています。半角英数字で入力してください。");
  if (/\s/.test(code)) warnings.push("スペースが含まれています（有無で別記号と判定されます）。");
  const stripped = code.replace(/\s/g, "");
  if (stripped && !/^[A-Za-z0-9-]+$/.test(stripped) && !/[^\x00-\x7F]/.test(stripped) && !stripped.includes("&"))
    errors.push("使用できる文字は半角英数字とハイフンのみです。");
  return { ok: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------
// (S7) 外字検出・正規化・記録
//   JIS第1・2水準外を検出 → 縮退マップから代替字提案 → 人間確認（UI）→ 記録。
//   ここでは検出＋提案までを行う。確認結果の記録は呼び出し側（リポジトリ）。
// ---------------------------------------------------------------------------
export interface GaijiHit {
  char: string;
  index: number;
  codePoint: string;
  replacement: string;
  gaijiType: number;
  known: boolean; // 縮退マップに存在するか
}
export function detectGaiji(text: string): GaijiHit[] {
  const hits: GaijiHit[] = [];
  const chars = [...text];
  chars.forEach((ch, i) => {
    const entry = gaijiFor(ch);
    const cp = ch.codePointAt(0) ?? 0;
    const inPua = cp >= 0xe000 && cp <= 0xf8ff;
    const isSurrogatePlane = cp > 0xffff;
    if (entry) {
      hits.push({ char: ch, index: i, codePoint: entry.codePoint, replacement: entry.replacement, gaijiType: entry.gaijiType, known: true });
    } else if (inPua || isSurrogatePlane) {
      hits.push({ char: ch, index: i, codePoint: `U+${cp.toString(16).toUpperCase()}`, replacement: "?", gaijiType: 100001503, known: false });
    }
  });
  return hits;
}
/** 検出された外字を届出用表記へ置換（確認済み前提） */
export function normalizeGaiji(text: string): string {
  let out = text;
  for (const g of GAIJI_MAP) out = out.split(g.original).join(g.replacement);
  return out;
}

// ---------------------------------------------------------------------------
// (S8) バイト数検証（Shift-JIS 近似: 全角2/半角1）
// ---------------------------------------------------------------------------
export interface ByteRule {
  field: string;
  limitBytes: number;
}
export const BYTE_RULES: Record<string, ByteRule> = {
  pronounce: { field: "よみかな", limitBytes: 100 }, // 全角50字
  footnote: { field: "脚注", limitBytes: 1024 }, // 全角512字
  fileName: { field: "ファイル名", limitBytes: 255 },
  remarks: { field: "備考", limitBytes: 2000 },
};
export function checkByteLimit(value: string, rule: ByteRule): ValidationResult {
  const n = byteLen(value);
  return n > rule.limitBytes
    ? { ok: false, errors: [`${rule.field}が上限 ${rule.limitBytes} バイトを超えています（現在 ${n} バイト）。`], warnings: [] }
    : { ok: true, errors: [], warnings: [] };
}

// ---------------------------------------------------------------------------
// (S10) 職務分離の強制 — 起票者 ≠ 承認者
// ---------------------------------------------------------------------------
export function canApprove(notification: Pick<Notification, "createdBy">, approverUserId: string): { ok: boolean; reason?: string } {
  if (notification.createdBy === approverUserId)
    return { ok: false, reason: "職務分離違反：起票者は自分が起票した届を承認できません。別の承認者で操作してください。" };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// (S11) 提出ゲート — ステータス=承認済 でなければ提出不可
// ---------------------------------------------------------------------------
export function canSubmit(notification: Pick<Notification, "status">): { ok: boolean; reason?: string } {
  if (notification.status !== "approved")
    return { ok: false, reason: "提出ゲート：承認済ステータスでなければ提出できません（人間の最終承認が必要）。" };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// (S12) 開発状態の更新 — 開発中止届の提出でシリーズを「開発中止」へ
// ---------------------------------------------------------------------------
export function devStatusAfterSubmit(notifType: Notification["notifType"]): number | null {
  return notifType === "devDiscontinuation" ? DEV_STATUS.discontinued : null;
}

// ---------------------------------------------------------------------------
// 医師ロスター差分 → イベント行の自動生成
//   利用者UIは「現在の分担医師ロスター」への足す/抜く/直すのみ。
//   保存時にサーバーが異動区分・異動日付・理由つきのイベント行を生成する。
//   「変更」は要確認事項のため、デモでは削除＋追加の2行に展開する。
// ---------------------------------------------------------------------------
export interface RosterMember {
  doctorId: string;
  doctorRole: number;
}
export interface RosterDiff {
  additions: RosterMember[];
  removals: RosterMember[];
  roleChanges: { doctorId: string; from: number; to: number }[];
}
export function diffRoster(previous: RosterMember[], next: RosterMember[]): RosterDiff {
  const prevById = new Map(previous.map((m) => [m.doctorId, m]));
  const nextById = new Map(next.map((m) => [m.doctorId, m]));
  const additions: RosterMember[] = [];
  const removals: RosterMember[] = [];
  const roleChanges: { doctorId: string; from: number; to: number }[] = [];
  for (const m of next) {
    const prev = prevById.get(m.doctorId);
    if (!prev) additions.push(m);
    else if (prev.doctorRole !== m.doctorRole) roleChanges.push({ doctorId: m.doctorId, from: prev.doctorRole, to: m.doctorRole });
  }
  for (const m of previous) if (!nextById.has(m.doctorId)) removals.push(m);
  return { additions, removals, roleChanges };
}

/** 異動区分（changeType）ラベルの逆引き用に定数を再エクスポート */
export { CHANGE_TYPE };
