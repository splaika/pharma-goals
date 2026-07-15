// ============================================================================
// ctn-schema.json ローダー（単一ソース）
// ----------------------------------------------------------------------------
// テーブル・列・選択肢・必須切替・サーバーロジックを schema から取り込む。
// ハンドオフ第3節「手書きの重複定義を作らない」「自動系の列に入力UIを作らない」
// 「動的必須はrequiredByType/requiredMatrixから駆動（ハードコード禁止）」に対応。
// ============================================================================

import raw from "./ctn-schema.json";
import { NOTIF_TYPE_ORDER, type NotifTypeKey } from "./types";

// ---- JSON の形（必要な部分だけ） ----
export interface SchemaColumn {
  displayName: string;
  schemaName: string;
  type?: string;
  requiredByType?: string; // 例: "◎/◎/◎/◎/○"
  inputUi?: string;
  status?: string; // "設計済" | "要確認"
  note?: string;
}
export interface SchemaTable {
  displayName: string;
  schemaName: string;
  kind?: string;
  role?: string;
  xsdMain?: string;
  columns: SchemaColumn[];
}
export interface ChoiceOption {
  label: string;
  value: number;
}
export interface ChoiceSet {
  setName: string;
  note?: string;
  values: ChoiceOption[];
}
export interface RelationDef {
  parent: string;
  child: string;
  type: string;
  lookupColumn: string;
  cascade: string;
  notes?: string;
}
export interface RequiredMatrixRow {
  itemGroup: string;
  plan: string;
  change: string;
  termination: string;
  completion: string;
  devDiscontinuation: string;
  notes?: string;
}
export interface ServerLogic {
  name: string;
  implementation: string;
  targetTable: string;
  trigger: string;
  summary: string;
  gampCategory: string;
  oqTarget: string;
}
export interface CtnSchema {
  meta: Record<string, unknown>;
  tables: SchemaTable[];
  choices: ChoiceSet[];
  relations: RelationDef[];
  requiredMatrix: RequiredMatrixRow[];
  serverLogic: ServerLogic[];
}

export const schema = raw as unknown as CtnSchema;

// ---- テーブル ----
export const tables = schema.tables;
export const tableBySchema = (schemaName: string): SchemaTable | undefined =>
  schema.tables.find((t) => t.schemaName === schemaName);
export const columnOf = (
  tableSchema: string,
  colSchema: string
): SchemaColumn | undefined =>
  tableBySchema(tableSchema)?.columns.find((c) => c.schemaName === colSchema);

// ---- 選択肢 ----
export const choiceSet = (setName: string): ChoiceOption[] =>
  schema.choices.find((c) => c.setName === setName)?.values ?? [];
export const choiceLabel = (setName: string, value: number | undefined): string => {
  if (value == null) return "";
  return choiceSet(setName).find((o) => o.value === value)?.label ?? String(value);
};
export const choiceNote = (setName: string): string =>
  schema.choices.find((c) => c.setName === setName)?.note ?? "";

// ---- サーバーロジック / リレーション ----
export const serverLogic = schema.serverLogic;
export const relations = schema.relations;
export const requiredMatrix = schema.requiredMatrix;

// ---- 「要確認」列（設計上の未確定箇所）: UIにバッジを出す根拠 ----
export interface UnconfirmedItem {
  table: string;
  column: string;
  note: string;
}
export const unconfirmedColumns: UnconfirmedItem[] = schema.tables.flatMap((t) =>
  t.columns
    .filter((c) => c.status === "要確認")
    .map((c) => ({
      table: t.displayName,
      column: c.displayName,
      note: c.inputUi ?? "",
    }))
);
/** ある表・列が「要確認」か */
export const isUnconfirmed = (tableSchema: string, colSchema: string): boolean =>
  columnOf(tableSchema, colSchema)?.status === "要確認";

// ============================================================================
// 必須マーク解釈（requiredByType）
// ============================================================================
export type RequiredMark =
  | "always" // ◎ 常時必須
  | "conditional" // ○ 届出種別により必須（デモでは表示＋必須扱い）
  | "optional" // △ 任意
  | "na" // ― 非該当（非表示）
  | "auto"; // 計算/自動（入力UIを作らない）

const normalizeMark = (token: string): RequiredMark => {
  const s = token.trim();
  if (s.startsWith("◎")) return "always";
  if (s.startsWith("○")) return "conditional";
  if (s.startsWith("△")) return "optional";
  if (s.startsWith("計算") || s.startsWith("◎(system)")) return "auto";
  // "―", "―(空欄)", "" はいずれも非該当
  return "na";
};

/**
 * 列の requiredByType（"計/変/中/終/開" の5マーク）を届出種別で引く。
 * "/" 区切りが無い（"―" や "計算" 単独）場合は全種別で同一とみなす。
 */
export function requiredFor(
  col: SchemaColumn | undefined,
  notifType: NotifTypeKey
): RequiredMark {
  if (!col || !col.requiredByType) return "na";
  const raw = col.requiredByType.replace(/／/g, "/");
  const parts = raw.split("/");
  const idx = NOTIF_TYPE_ORDER.indexOf(notifType);
  if (parts.length < 5) return normalizeMark(parts[0] ?? "―");
  return normalizeMark(parts[idx] ?? "―");
}

/** 表示すべきか（na 以外は表示。auto は読み取り専用で表示） */
export const shouldShow = (mark: RequiredMark): boolean => mark !== "na";
/** 入力必須か（◎/○ を必須扱い） */
export const isRequired = (mark: RequiredMark): boolean =>
  mark === "always" || mark === "conditional";

// requiredMatrix を届出種別キーで引くためのプロパティ名
export const matrixKey: Record<NotifTypeKey, keyof RequiredMatrixRow> = {
  plan: "plan",
  change: "change",
  termination: "termination",
  completion: "completion",
  devDiscontinuation: "devDiscontinuation",
};

export function matrixMark(itemGroup: string, notifType: NotifTypeKey): RequiredMark {
  const row = requiredMatrix.find((r) => r.itemGroup === itemGroup);
  if (!row) return "na";
  return normalizeMark(String(row[matrixKey[notifType]] ?? "―"));
}
