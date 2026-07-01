import type { Goal } from "../types";
import { CUR, DEPTS, monthEntry, progressOf } from "../refData";
import { useLang } from "../i18n";

function Kpi({ label, value, meta, hl }: { label: string; value: React.ReactNode; meta: string; hl?: boolean }) {
  return (
    <div className={`kpi ${hl ? "hl" : ""}`}>
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      <div className="m">{meta}</div>
    </div>
  );
}

export function Overview({ goals }: { goals: Goal[] }) {
  const { t } = useLang();
  const onTrack = goals.filter((g) => g.status === "g").length;
  const atRisk = goals.filter((g) => g.status !== "g").length;
  const avg = goals.length
    ? Math.round(goals.reduce((s, g) => s + progressOf(g), 0) / goals.length)
    : 0;

  return (
    <>
      <div className="vh">
        <div className="t">{t("Overview", "サマリー")}</div>
        <div className="s">
          {t("Company-wide goal health at a glance.", "全社の目標状況をひと目で。")}
        </div>
      </div>

      <div className="kpis">
        <Kpi hl label={t("Total goals", "目標数")} value={goals.length} meta={t("4 levels, 4 departments", "4階層・4部門")} />
        <Kpi label={t("Avg progress", "平均進捗")} value={<>{avg}<small>%</small></>} meta={t("latest month", "当月時点")} />
        <Kpi label={t("On track", "順調")} value={onTrack} meta={t("green status", "緑ステータス")} />
        <Kpi label={t("Needs attention", "要対応")} value={atRisk} meta={t("at risk / off track", "注意・遅延")} />
      </div>

      <div className="card">
        <div className="card-h">
          <h3>{t("By department", "部門別")}</h3>
          <span className="tag">{t("health & freshness", "状態と更新状況")}</span>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th><span>{t("Department", "部門")}</span></th>
              <th><span>{t("Goals", "目標数")}</span></th>
              <th><span>{t("Status", "状態")}</span></th>
              <th><span>{t("Updated this mo.", "今月更新")}</span></th>
            </tr>
          </thead>
          <tbody>
            {DEPTS.map((d) => {
              const gs = goals.filter((g) => g.dept === d.id);
              if (!gs.length) return null;
              const total = gs.length;
              const g_ = gs.filter((x) => x.status === "g").length;
              const a_ = gs.filter((x) => x.status === "a").length;
              const r_ = gs.filter((x) => x.status === "r").length;
              const updated = gs.filter((x) => monthEntry(x, CUR)).length;
              const pc = (n: number) => (n / total) * 100;
              return (
                <tr key={d.id}>
                  <td className="nm">{t(d.en, d.ja)}</td>
                  <td>{total}</td>
                  <td>
                    <div className="stcell">
                      <div className="sbar">
                        {g_ > 0 && <i className="g" style={{ width: `${pc(g_)}%` }} />}
                        {a_ > 0 && <i className="a" style={{ width: `${pc(a_)}%` }} />}
                        {r_ > 0 && <i className="r" style={{ width: `${pc(r_)}%` }} />}
                      </div>
                      <span className="stnum">
                        {g_ > 0 && <b className="cg">{g_}</b>}
                        {a_ > 0 && <b className="ca">{a_}</b>}
                        {r_ > 0 && <b className="cr">{r_}</b>}
                      </span>
                    </div>
                  </td>
                  <td>
                    <b style={{ fontSize: "13.5px" }}>{updated}</b>
                    <span style={{ color: "var(--ink-3)" }}> / {total}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
