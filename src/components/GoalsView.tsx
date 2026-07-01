import { useState } from "react";
import type { Goal } from "../types";
import { byId, deptName, kids, lvlInfo, progressOf, stInfo } from "../refData";
import { useLang } from "../i18n";
import type { FilterState } from "./Filters";
import { Filters } from "./Filters";

const DEFAULT_OPEN = ["c1", "c2", "ds1", "ds2", "co1", "ra1", "pv1", "ds_t1", "ds_t2", "co_t1"];

export function GoalsView({
  goals,
  filter,
  onFilterChange,
  onOpenGoal,
}: {
  goals: Goal[];
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
  onOpenGoal: (id: string) => void;
}) {
  const { lang, t } = useLang();
  const [open, setOpen] = useState<Set<string>>(new Set(DEFAULT_OPEN));

  const inTree = filter.view === "cascade" && filter.level === "all" && filter.dept === "all";
  const filtered = goals.filter(
    (g) => (filter.dept === "all" || g.dept === filter.dept) && (filter.level === "all" || g.level === filter.level)
  );
  const roots = goals.filter((g) => g.parent == null);

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const Row = ({ g, depth }: { g: Goal; depth: number }): JSX.Element => {
    const [badge, cls] = lvlInfo[g.level];
    const p = progressOf(g);
    const ch = kids(goals, g.id);
    const isOpen = open.has(g.id);
    const hasParent = g.parent != null;
    const parentGoal = byId(goals, g.parent);
    const note =
      g.level !== "individual"
        ? hasParent
          ? `${t("rolls up to", "上位")}: ${parentGoal ? t(parentGoal.titleEn, parentGoal.titleJa) : ""}`
          : t("top-level (no parent)", "最上位（上位なし）")
        : g.owner;
    const noteCls = !hasParent && g.level !== "individual" ? "nolink" : "";

    return (
      <div className={`node ${isOpen ? "open" : ""}`}>
        <div className="grow" onClick={() => onOpenGoal(g.id)}>
          <div className="gname" style={{ paddingLeft: inTree ? depth * 22 : 0 }}>
            {inTree && (
              <button
                className={`tog ${ch.length ? "" : "leaf"} ${isOpen ? "open" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(g.id);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            )}
            <span className={`lvl ${cls}`}>{badge}</span>
            <div className="gtx">
              <b>{t(g.titleEn, g.titleJa)}</b>
              <small className={noteCls}>{note}</small>
            </div>
          </div>
          <div className="own">
            <span className="a">{g.av}</span>
            <span>{g.level === "individual" ? g.owner : deptName(g.dept, lang)}</span>
          </div>
          <div className="gp">
            <div className={`bar ${g.status}`}>
              <i style={{ width: `${p}%` }} />
            </div>
            <b>{p}%</b>
          </div>
          <div>
            <span className={`pill ${g.status}`}>{t(stInfo[g.status][0], stInfo[g.status][1])}</span>
          </div>
        </div>
        {inTree && ch.length > 0 && (
          <div className="children">
            {ch.map((c) => (
              <Row key={c.id} g={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="vh">
        <div className="t">{t("Goals", "目標")}</div>
        <div className="s">
          {t(
            "Filter by department and level, then open a goal to log monthly progress.",
            "部門・粒度で絞り込み、目標を開いて月次進捗を記録します。"
          )}
        </div>
      </div>

      <Filters filter={filter} count={filtered.length} withView onChange={onFilterChange} />

      <div className="glist">
        <div className="gh">
          <span>{t("Goal", "目標")}</span>
          <span>{t("Owner", "担当")}</span>
          <span>{t("Progress", "進捗")}</span>
          <span>{t("Status", "状態")}</span>
        </div>
        {inTree ? (
          roots.map((r) => <Row key={r.id} g={r} depth={0} />)
        ) : filtered.length ? (
          filtered.map((g) => <Row key={g.id} g={g} depth={0} />)
        ) : (
          <div className="empty">
            {t("No goals match this filter.", "この絞り込みに該当する目標はありません。")}
          </div>
        )}
      </div>
    </>
  );
}
