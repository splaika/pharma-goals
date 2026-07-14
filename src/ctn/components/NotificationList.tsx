import { useMemo, useState } from "react";
import { useLang } from "../../i18n";
import { notifDeadline } from "../derive";
import { daysUntil, fmtDate, label, SET, NOTIF_TYPE_ORDER, notifTypeName } from "../refData";
import { StatusPill, TypeBadge, Empty } from "./common";
import type { CtnDb } from "../data/repository";
import type { Notification, NotifTypeKey, StatusKey } from "../types";

function DeadlineCell({ n }: { n: Notification }) {
  const dl = notifDeadline(n);
  if (!dl) return <span className="muted">—</span>;
  const du = n.status === "submitted" ? null : daysUntil(dl);
  let cls = "dl-ok";
  if (du != null && du < 0) cls = "dl-over";
  else if (du != null && du <= 7) cls = "dl-hot";
  else if (du != null && du <= 14) cls = "dl-warn";
  return (
    <span className={`dlcell ${cls}`}>
      {fmtDate(dl)}
      {du != null && <small>{du < 0 ? `${-du}日超過` : `残${du}日`}</small>}
    </span>
  );
}

export function NotificationTable({ db, notifications, onOpen }: { db: CtnDb; notifications: Notification[]; onOpen: (id: string) => void }) {
  const { lang } = useLang();
  const code = (compoundId: string) => db.compounds.find((c) => c.id === compoundId)?.compoundCode ?? "—";
  if (notifications.length === 0) return <Empty>{lang === "ja" ? "該当する治験届はありません。" : "No notifications."}</Empty>;
  return (
    <div className="ntbl-wrap">
      <table className="ntbl">
        <thead>
          <tr>
            <th>{lang === "ja" ? "治験成分記号" : "Compound"}</th>
            <th>{lang === "ja" ? "届出種別" : "Type"}</th>
            <th>{lang === "ja" ? "回数" : "Count"}</th>
            <th>{lang === "ja" ? "届出区分" : "Kubun"}</th>
            <th>{lang === "ja" ? "ステータス" : "Status"}</th>
            <th>{lang === "ja" ? "提出期限" : "Deadline"}</th>
            <th>{lang === "ja" ? "施設" : "Sites"}</th>
            <th>{lang === "ja" ? "実施計画書" : "Protocol"}</th>
          </tr>
        </thead>
        <tbody>
          {notifications.map((n) => (
            <tr key={n.id} onClick={() => onOpen(n.id)}>
              <td className="nm">{code(n.compoundId)}</td>
              <td><TypeBadge type={n.notifType} full /></td>
              <td className="tnum">
                #{n.filingCount}
                {n.changeCount != null && <small className="muted"> 変{n.changeCount}</small>}
              </td>
              <td>{n.kubun ? <span className="kubun-chip">{label(SET.kubun, n.kubun)}</span> : <span className="muted">—</span>}</td>
              <td><StatusPill status={n.status} /></td>
              <td><DeadlineCell n={n} /></td>
              <td className="tnum">{n.sites.length}</td>
              <td className="muted small">{n.protocolNo || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NotificationsView({ db, onOpen, onCreate }: { db: CtnDb; onOpen: (id: string) => void; onCreate: () => void }) {
  const { t, lang } = useLang();
  const [fType, setFType] = useState<"all" | NotifTypeKey>("all");
  const [fStatus, setFStatus] = useState<"all" | StatusKey>("all");
  const [fSeries, setFSeries] = useState<"all" | string>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const codeOf = (id: string) => db.compounds.find((c) => c.id === id)?.compoundCode ?? "";
    return db.notifications
      .filter((n) => fType === "all" || n.notifType === fType)
      .filter((n) => fStatus === "all" || n.status === fStatus)
      .filter((n) => fSeries === "all" || n.compoundId === fSeries)
      .filter((n) => !q || codeOf(n.compoundId).toLowerCase().includes(q.toLowerCase()) || n.protocolNo.toLowerCase().includes(q.toLowerCase()) || notifTypeName(n.notifType, lang).includes(q))
      .sort((a, b) => (a.compoundId + a.filingCount).localeCompare(b.compoundId + b.filingCount));
  }, [db, fType, fStatus, fSeries, q, lang]);

  return (
    <>
      <div className="vh">
        <div className="t">{t("Clinical Trial Notifications", "治験届一覧")}</div>
        <div className="s">{t("All CTN filings across every series.", "全シリーズの治験届（計画・変更・中止・終了・開発中止）。")}</div>
      </div>

      <div className="filters">
        <div className="fg">
          <label>{t("Type", "種別")}</label>
          <select className="sel" value={fType} onChange={(e) => setFType(e.target.value as typeof fType)}>
            <option value="all">{t("All", "すべて")}</option>
            {NOTIF_TYPE_ORDER.map((k) => <option key={k} value={k}>{notifTypeName(k, lang)}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>{t("Status", "状態")}</label>
          <select className="sel" value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)}>
            <option value="all">{t("All", "すべて")}</option>
            <option value="draft">{t("Draft", "起票")}</option>
            <option value="review">{t("In Review", "社内レビュー")}</option>
            <option value="approved">{t("Approved", "承認済")}</option>
            <option value="submitted">{t("Submitted", "提出済")}</option>
          </select>
        </div>
        <div className="fg">
          <label>{t("Series", "シリーズ")}</label>
          <select className="sel" value={fSeries} onChange={(e) => setFSeries(e.target.value)}>
            <option value="all">{t("All", "すべて")}</option>
            {db.compounds.map((c) => <option key={c.id} value={c.id}>{c.compoundCode}</option>)}
          </select>
        </div>
        <input className="search" placeholder={t("Search…", "検索…")} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="fsp" />
        <span className="fcount">{filtered.length} {t("items", "件")}</span>
        <button className="btn btn-p" onClick={onCreate}>＋ {t("New filing", "新規届作成")}</button>
      </div>

      <div className="card">
        <NotificationTable db={db} notifications={filtered} onOpen={onOpen} />
      </div>
    </>
  );
}
