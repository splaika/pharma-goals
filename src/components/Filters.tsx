import type { Level } from "../types";
import { DEPTS } from "../refData";
import { useLang } from "../i18n";

export type ViewMode = "cascade" | "list";
export interface FilterState {
  dept: string; // "all" | dept id
  level: Level | "all";
  view: ViewMode;
}

const LEVELS: [Level | "all", string, string][] = [
  ["all", "All", "すべて"],
  ["company", "Company", "全社"],
  ["dept", "Dept", "部門"],
  ["team", "Team", "チーム"],
  ["individual", "Individual", "個人"],
];

export function Filters({
  filter,
  count,
  withView,
  onChange,
}: {
  filter: FilterState;
  count: number;
  withView?: boolean;
  onChange: (next: FilterState) => void;
}) {
  const { t } = useLang();

  // Applying any dept/level filter forces the flat List view (matches v3).
  const apply = (patch: Partial<FilterState>) => {
    const next = { ...filter, ...patch };
    if (
      (patch.dept !== undefined || patch.level !== undefined) &&
      (next.dept !== "all" || next.level !== "all")
    ) {
      next.view = "list";
    }
    onChange(next);
  };

  return (
    <div className="filters">
      <div className="fg">
        <label>{t("Department", "部門")}</label>
        <select
          className="sel"
          value={filter.dept}
          onChange={(e) => apply({ dept: e.target.value })}
        >
          <option value="all">{t("All departments", "全部門")}</option>
          {DEPTS.map((d) => (
            <option key={d.id} value={d.id}>
              {t(d.en, d.ja)}
            </option>
          ))}
        </select>
      </div>

      <div className="fg">
        <label>{t("Level", "粒度")}</label>
        <div className="seg">
          {LEVELS.map(([v, en, ja]) => (
            <button
              key={v}
              className={filter.level === v ? "on" : ""}
              onClick={() => apply({ level: v })}
            >
              {t(en, ja)}
            </button>
          ))}
        </div>
      </div>

      {withView && (
        <div className="fg">
          <label>{t("View", "表示")}</label>
          <div className="seg">
            <button
              className={filter.view === "cascade" ? "on" : ""}
              onClick={() => apply({ view: "cascade" })}
            >
              {t("Cascade", "カスケード")}
            </button>
            <button
              className={filter.view === "list" ? "on" : ""}
              onClick={() => apply({ view: "list" })}
            >
              {t("List", "リスト")}
            </button>
          </div>
        </div>
      )}

      <div className="fsp" />
      <div className="fcount">
        {count} {t("goals", "件")}
      </div>
    </div>
  );
}
