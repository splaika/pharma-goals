import { useMemo, useState } from "react";
import { useLang } from "../../i18n";
import { Empty } from "./common";
import type { CtnDb } from "../data/repository";
import type { AuditEntry } from "../types";

const ACTION_LABEL: Record<AuditEntry["action"], [string, string, string]> = {
  create: ["Create", "作成", "a-create"],
  update: ["Update", "更新", "a-update"],
  delete: ["Delete", "削除", "a-delete"],
  restore: ["Restore", "復活", "a-restore"],
  submit: ["Submit", "提出", "a-submit"],
  approve: ["Approve", "承認", "a-approve"],
  "generate-xml": ["XML", "XML生成", "a-xml"],
};

export function AuditView({ db }: { db: CtnDb }) {
  const { t, lang } = useLang();
  const [q, setQ] = useState("");
  const [action, setAction] = useState<"all" | AuditEntry["action"]>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(
    () =>
      db.audit
        .filter((a) => action === "all" || a.action === action)
        .filter((a) => !from || a.at.slice(0, 10) >= from)
        .filter((a) => !to || a.at.slice(0, 10) <= to)
        .filter((a) => !q || a.who.includes(q) || a.entity.includes(q) || a.entityRef.toLowerCase().includes(q.toLowerCase()) || a.summary.includes(q)),
    [db.audit, q, action, from, to]
  );
  const anyFilter = action !== "all" || from || to || q;

  return (
    <>
      <div className="vh">
        <div className="t">{t("Audit log", "監査ログ")}</div>
        <div className="s">{t("Who did what, when, to which record — every operation is recorded.", "誰が・いつ・どのレコードの・何を・どう変えたか。全操作を記録します。")}</div>
      </div>

      <div className="filters">
        <div className="fg">
          <label>{t("Filter", "フィルタ")}</label>
          <select className="sel" value={action} onChange={(e) => setAction(e.target.value as typeof action)}>
            <option value="all">{t("All actions", "すべての操作")}</option>
            {Object.entries(ACTION_LABEL).map(([k, v]) => <option key={k} value={k}>{lang === "ja" ? v[1] : v[0]}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>{t("From", "期間 From")}</label>
          <input type="date" className="tin" style={{ width: 150 }} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="fg">
          <label>{t("To", "To")}</label>
          <input type="date" className="tin" style={{ width: 150 }} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <input className="search" placeholder={t("Search…", "検索…")} value={q} onChange={(e) => setQ(e.target.value)} />
        {anyFilter && <button className="linkbtn" onClick={() => { setAction("all"); setFrom(""); setTo(""); setQ(""); }}>{t("Clear", "クリア")}</button>}
        <div className="fsp" />
        <span className="fcount">{rows.length} {t("entries", "件")}</span>
      </div>

      <div className="card">
        {rows.length === 0 ? <Empty>{t("No entries.", "該当なし")}</Empty> : (
          <table className="audit-tbl">
            <thead><tr><th>{t("When", "日時")}</th><th>{t("Who", "実行者")}</th><th>{t("Action", "操作")}</th><th>{t("Entity", "対象")}</th><th>{t("Detail", "内容")}</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="muted small nowrap">{a.at.replace("T", " ")}</td>
                  <td className="nm">{a.who}</td>
                  <td><span className={`act-chip ${ACTION_LABEL[a.action][2]}`}>{lang === "ja" ? ACTION_LABEL[a.action][1] : ACTION_LABEL[a.action][0]}</span></td>
                  <td className="small">{a.entity}<div className="muted small">{a.entityRef}</div></td>
                  <td className="small">{a.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
