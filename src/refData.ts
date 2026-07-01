import type { Dept, Goal, Lang, Level, MonthlyEntry, Status } from "./types";

export const MONTHS = [
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
];
export const CUR = "2026-06";

export const DEPTS: Dept[] = [
  { id: "ds", en: "Data Science", ja: "データサイエンス部" },
  { id: "co", en: "Clinical Operations", ja: "臨床開発部" },
  { id: "ra", en: "Regulatory Affairs", ja: "薬事部" },
  { id: "pv", en: "Pharmacovigilance", ja: "安全性部" },
  { id: "co_co", en: "Company-wide", ja: "全社" },
];

// [badge, className, en, ja]
export const lvlInfo: Record<Level, [string, string, string, string]> = {
  company: ["CO", "lc", "Company", "全社"],
  dept: ["DEPT", "ld", "Department", "部門"],
  team: ["TEAM", "lt", "Team", "チーム"],
  individual: ["IND", "li", "Individual", "個人"],
};

// [en, ja]
export const stInfo: Record<Status, [string, string]> = {
  g: ["On track", "順調"],
  a: ["At risk", "注意"],
  r: ["Off track", "遅延"],
};

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const moLabel = (m: string, lang: Lang): string => {
  const n = Number(m.split("-")[1]);
  return lang === "ja" ? `${n}月` : MONTH_ABBR[n - 1];
};

// ===== pure helpers over a goal list =====
export const byId = (goals: Goal[], id: string | null): Goal | undefined =>
  id == null ? undefined : goals.find((g) => g.id === id);

export const kids = (goals: Goal[], id: string): Goal[] =>
  goals.filter((g) => g.parent === id);

export const monthEntry = (g: Goal, m: string): MonthlyEntry | undefined =>
  g.monthly.find((x) => x.month === m);

export const latest = (g: Goal): MonthlyEntry | undefined => {
  for (let i = MONTHS.length - 1; i >= 0; i--) {
    const e = monthEntry(g, MONTHS[i]);
    if (e) return e;
  }
  return undefined;
};

export const progressOf = (g: Goal): number => latest(g)?.pct ?? 0;

export const deptName = (id: string, lang: Lang): string => {
  const d = DEPTS.find((x) => x.id === id);
  return d ? (lang === "ja" ? d.ja : d.en) : id;
};
