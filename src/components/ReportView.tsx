import type { Goal, Status } from "../types";
import { CUR, DEPTS, MONTHS, deptName, lvlInfo, moLabel, monthEntry, progressOf, stInfo } from "../refData";
import { useLang } from "../i18n";
import type { FilterState } from "./Filters";
import { Filters } from "./Filters";

export function ReportView({
  goals,
  filter,
  onFilterChange,
}: {
  goals: Goal[];
  filter: FilterState;
  onFilterChange: (f: FilterState) => void;
}) {
  const { lang, t } = useLang();
  const list = goals.filter(
    (g) => (filter.dept === "all" || g.dept === filter.dept) && (filter.level === "all" || g.level === filter.level)
  );

  const scope = filter.dept === "all" ? t("All departments", "全部門") : deptName(filter.dept, lang);
  const lvlTxt = filter.level === "all" ? "" : " · " + t(lvlInfo[filter.level][2], lvlInfo[filter.level][3]);
  const g_ = list.filter((x) => x.status === "g").length;
  const a_ = list.filter((x) => x.status === "a").length;
  const r_ = list.filter((x) => x.status === "r").length;
  const avg = list.length ? Math.round(list.reduce((s, x) => s + progressOf(x), 0) / list.length) : 0;
  const overall: Status = !list.length ? "g" : avg >= 65 ? "g" : avg >= 45 ? "a" : "r";
  const date = new Date().toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const downloadCSV = () => {
    const hdr = ["Department", "Level", "Goal", "Owner", "Status", ...MONTHS, "ThisMonthComment"];
    const esc = (s: unknown) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [hdr.map(esc).join(",")];
    list.forEach((g) => {
      const cur = monthEntry(g, CUR);
      const row = [
        deptName(g.dept, lang),
        lvlInfo[g.level][2],
        t(g.titleEn, g.titleJa),
        g.level === "individual" ? g.owner : deptName(g.dept, lang),
        stInfo[g.status][0],
        ...MONTHS.map((m) => monthEntry(g, m)?.pct ?? ""),
        cur ? (lang === "ja" ? cur.commentJa : cur.commentEn) : "",
      ];
      lines.push(row.map(esc).join(","));
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `goal-report-${filter.dept}-${CUR}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div className="rep-top">
        <div style={{ flex: 1 }}>
          <Filters filter={filter} count={list.length} onChange={onFilterChange} />
        </div>
        <button className="btn btn-g" onClick={downloadCSV}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {t("Download CSV", "CSV出力")}
        </button>
        <button className="btn btn-p" onClick={() => window.print()}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
          </svg>
          {t("Print", "印刷")}
        </button>
      </div>

      <div className="rep" id="view-report">
        <div className="rep-hd">
          <div className="ti">
            {scope}
            {lvlTxt} — {t("Goal report", "目標レポート")}
          </div>
          <div className="me">
            {t("Generated", "作成")}: {date} · {t("FY2026", "2026年度")} · {t("current month", "当月")}: {moLabel(CUR, lang)}
          </div>
        </div>

        <div className="rep-stats">
          <div className="st">
            <div className="l">{t("Goals", "目標数")}</div>
            <div className="v">{list.length}</div>
          </div>
          <div className="st">
            <div className="l">{t("Status mix", "状態内訳")}</div>
            <div className="v">
              <span className="seg-mini">
                <span className="pill g">{g_}</span>
                <span className="pill a">{a_}</span>
                <span className="pill r">{r_}</span>
              </span>
            </div>
          </div>
          <div className="st">
            <div className="l">{t("Avg achievement", "平均達成率")}</div>
            <div className="v">{avg}%</div>
          </div>
          <div className="st">
            <div className="l">{t("Overall", "総合")}</div>
            <div className="v">
              <span className={`pill ${overall}`} style={{ fontSize: 14 }}>
                {t(stInfo[overall][0], stInfo[overall][1])}
              </span>
            </div>
          </div>
        </div>

        <div className="rep-scroll">
          <table className="rep-tbl">
            <thead>
              <tr>
                <th>{t("Level", "粒度")}</th>
                <th>{t("Goal", "目標")}</th>
                <th>{t("Owner", "担当")}</th>
                <th>{t("Status", "状態")}</th>
                {MONTHS.map((m) => (
                  <th key={m} className="mcol">
                    {moLabel(m, lang)}
                  </th>
                ))}
                <th>{t("This month", "今月の進捗")}</th>
              </tr>
            </thead>
            <tbody>
              {list.length ? (
                list.map((g) => {
                  const cur = monthEntry(g, CUR);
                  return (
                    <tr key={g.id}>
                      <td>
                        <span className={`lvl ${lvlInfo[g.level][1]}`}>{lvlInfo[g.level][0]}</span>
                      </td>
                      <td className="gn">{t(g.titleEn, g.titleJa)}</td>
                      <td>{g.level === "individual" ? g.owner : deptName(g.dept, lang)}</td>
                      <td>
                        <span className={`pill ${g.status}`}>{t(stInfo[g.status][0], stInfo[g.status][1])}</span>
                      </td>
                      {MONTHS.map((m) => {
                        const e = monthEntry(g, m);
                        return (
                          <td key={m} className={`mcol ${m === CUR ? "cur" : ""}`}>
                            {e ? `${e.pct}%` : "·"}
                          </td>
                        );
                      })}
                      <td className="cm">{cur ? (lang === "ja" ? cur.commentJa : cur.commentEn) || "—" : "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5 + MONTHS.length} className="empty">
                    {t("No goals match this filter.", "該当する目標はありません。")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
