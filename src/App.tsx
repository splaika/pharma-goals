import { useEffect, useMemo, useState } from "react";
import type { Goal, Lang } from "./types";
import { LangContext, makeT } from "./i18n";
import { getRepository } from "./data/repository";
import { Sidebar, type ViewKey } from "./components/Sidebar";
import { Overview } from "./components/Overview";
import { GoalsView } from "./components/GoalsView";
import { ReportView } from "./components/ReportView";
import { GoalDrawer, type DrawerResult } from "./components/GoalDrawer";
import type { FilterState } from "./components/Filters";

const NEW_GOAL = (dept: string): Goal => ({
  id: "__new__",
  parent: null,
  level: "individual",
  dept,
  titleEn: "",
  titleJa: "",
  owner: "Kenji Takahashi",
  av: "KT",
  status: "g",
  monthly: [],
  log: [],
});

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [view, setView] = useState<ViewKey>("overview");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>({ dept: "all", level: "all", view: "cascade" });
  const [editing, setEditing] = useState<{ goal: Goal; isNew: boolean } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const t = useMemo(() => makeT(lang), [lang]);
  const repo = getRepository();

  useEffect(() => {
    document.body.classList.toggle("ja", lang === "ja");
  }, [lang]);

  const reload = async () => setGoals(await repo.listGoals());

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2300);
  };

  const openNew = () => setEditing({ goal: NEW_GOAL(filter.dept !== "all" ? filter.dept : "ds"), isNew: true });
  const openGoal = (id: string) => {
    const g = goals.find((x) => x.id === id);
    if (g) setEditing({ goal: g, isNew: false });
  };

  const handleSave = async (r: DrawerResult) => {
    if (r.isNew) {
      const { id: _drop, ...base } = r.goal;
      void _drop;
      await repo.createGoal({ ...base, monthly: [r.monthEntry], log: [r.change] });
    } else {
      await repo.updateGoal(r.goal);
      await repo.upsertMonthly(r.goal.id, r.monthEntry);
      await repo.addChange(r.goal.id, r.change);
    }
    await reload();
    setEditing(null);
    flash(r.isNew ? t("Goal added", "目標を追加しました") : t("Saved", "保存しました"));
  };

  const handleDelete = async (id: string) => {
    await repo.deleteGoal(id);
    await reload();
    setEditing(null);
    flash(t("Goal deleted", "目標を削除しました"));
  };

  const TITLES: Record<ViewKey, [string, string]> = {
    overview: ["Overview", "サマリー"],
    goals: ["Goals", "目標"],
    report: ["Report", "レポート"],
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <div className={`app${lang === "ja" ? " ja" : ""}`}>
        <Sidebar view={view} onNavigate={setView} />
        <div className="main">
          <header className="top">
            <h1>{t(...TITLES[view])}</h1>
            <div className="sp" />
            <div className="lang">
              <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
                EN
              </button>
              <button className={lang === "ja" ? "on" : ""} onClick={() => setLang("ja")}>
                JA
              </button>
            </div>
            <button className="btn btn-p" onClick={openNew}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14" />
              </svg>
              {t("Add goal", "目標を追加")}
            </button>
          </header>

          <div className="scroll">
            {loading ? (
              <div className="empty">{t("Loading…", "読み込み中…")}</div>
            ) : view === "overview" ? (
              <Overview goals={goals} />
            ) : view === "goals" ? (
              <GoalsView goals={goals} filter={filter} onFilterChange={setFilter} onOpenGoal={openGoal} />
            ) : (
              <ReportView goals={goals} filter={filter} onFilterChange={setFilter} />
            )}
          </div>
        </div>
      </div>

      {editing && (
        <GoalDrawer
          goal={editing.goal}
          isNew={editing.isNew}
          goals={goals}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      <div className={`toast${toast ? " on" : ""}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <span>{toast}</span>
      </div>
    </LangContext.Provider>
  );
}
