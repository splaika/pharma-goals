// ===== Domain model (UI-side, Dataverse-agnostic) =====
// The Dataverse repository maps rows to/from these shapes so components
// never need to know about Dataverse column logical names.

export type Level = "company" | "dept" | "team" | "individual";
export type Status = "g" | "a" | "r"; // green / amber(at risk) / red(off track)
export type ChangeKind = "created" | "updated";

export interface MonthlyEntry {
  month: string; // "YYYY-MM"
  pct: number; // 0-100
  commentEn: string;
  commentJa: string;
}

export interface ChangeEntry {
  at: string; // display timestamp, e.g. "Jun 5, 09:12"
  who: string; // initials
  kind: ChangeKind;
  note: string;
}

export interface Goal {
  id: string;
  parent: string | null; // null => top-level (no parent) — allowed at any level
  level: Level;
  dept: string; // Dept id
  titleEn: string;
  titleJa: string;
  owner: string; // person name (individual) or team/dept label
  av: string; // avatar initials
  status: Status;
  monthly: MonthlyEntry[];
  log: ChangeEntry[];
}

export interface Dept {
  id: string;
  en: string;
  ja: string;
}

export type Lang = "en" | "ja";
