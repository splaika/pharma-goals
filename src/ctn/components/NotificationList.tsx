import { useEffect, useMemo, useState, type ReactNode } from "react";
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

// ---- 列定義（ユーザーが並び替え可能。既定は指定の並び） ----
type ColKey = "compound" | "protocol" | "type" | "count" | "kubun" | "status" | "deadline" | "sites";
const DEFAULT_ORDER: ColKey[] = ["compound", "protocol", "type", "count", "kubun", "status", "deadline", "sites"];
const STORAGE_KEY = "ctn.notif.colorder";

interface ColDef {
  label: [string, string];
  cls?: string;
  render: (n: Notification, db: CtnDb) => ReactNode;
}
const COLS: Record<ColKey, ColDef> = {
  compound: { label: ["Compound", "治験成分記号"], cls: "nm", render: (n, db) => db.compounds.find((c) => c.id === n.compoundId)?.compoundCode ?? "—" },
  protocol: { label: ["Protocol No.", "治験計画書番号"], cls: "muted small", render: (n) => n.protocolNo || "—" },
  type: { label: ["Type", "届出種別"], render: (n) => <TypeBadge type={n.notifType} full /> },
  count: { label: ["Count", "回数"], cls: "tnum", render: (n) => n.notifType === "devDiscontinuation" ? <span className="muted" title="開発中止届は届出回数不要（00）">00</span> : <>#{n.filingCount}{n.changeCount != null && <small className="muted"> 変{n.changeCount}</small>}</> },
  kubun: { label: ["Kubun", "届出区分"], render: (n) => (n.kubun ? <span className="kubun-chip">{label(SET.kubun, n.kubun)}</span> : <span className="muted">—</span>) },
  status: { label: ["Status", "ステータス"], render: (n) => <StatusPill status={n.status} /> },
  deadline: { label: ["Deadline", "提出期限"], render: (n) => <DeadlineCell n={n} /> },
  sites: { label: ["Sites", "医療機関数"], cls: "tnum", render: (n) => n.sites.length },
};

function loadOrder(): ColKey[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (Array.isArray(saved) && saved.length === DEFAULT_ORDER.length && saved.every((k) => k in COLS)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_ORDER;
}

export function NotificationTable({ db, notifications, onOpen }: { db: CtnDb; notifications: Notification[]; onOpen: (id: string) => void }) {
  const { t, lang } = useLang();
  const [order, setOrder] = useState<ColKey[]>(() => loadOrder());
  const [drag, setDrag] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      /* ignore */
    }
  }, [order]);

  const move = (from: number, to: number) => {
    if (from === to) return;
    setOrder((o) => {
      const next = [...o];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  };

  if (notifications.length === 0) return <Empty>{lang === "ja" ? "該当する治験届はありません。" : "No notifications."}</Empty>;
  return (
    <div className="ntbl-wrap">
      <div className="ntbl-hint">{t("Drag column headers to reorder.", "列見出しをドラッグして並び替えできます。")} {order.join(",") !== DEFAULT_ORDER.join(",") && <button className="linkbtn" onClick={() => setOrder(DEFAULT_ORDER)}>{t("Reset", "既定に戻す")}</button>}</div>
      <table className="ntbl">
        <thead>
          <tr>
            {order.map((k, i) => (
              <th
                key={k}
                draggable
                className={`col-drag${COLS[k].cls?.includes("tnum") ? " tnum" : ""}`}
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (drag != null) move(drag, i); setDrag(null); }}
                onDragEnd={() => setDrag(null)}
              >
                <span className="col-grip">⋮⋮</span>{lang === "ja" ? COLS[k].label[1] : COLS[k].label[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {notifications.map((n) => (
            <tr key={n.id} onClick={() => onOpen(n.id)}>
              {order.map((k) => (
                <td key={k} className={COLS[k].cls}>{COLS[k].render(n, db)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NotificationsView({ db, onOpen }: { db: CtnDb; onOpen: (id: string) => void }) {
  const { t, lang } = useLang();
  const [fType, setFType] = useState<"all" | NotifTypeKey>("all");
  const [fStatus, setFStatus] = useState<"all" | StatusKey>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const codeOf = (id: string) => db.compounds.find((c) => c.id === id)?.compoundCode ?? "";
    return db.notifications
      .filter((n) => fType === "all" || n.notifType === fType)
      .filter((n) => fStatus === "all" || n.status === fStatus)
      .filter((n) => !q || codeOf(n.compoundId).toLowerCase().includes(q.toLowerCase()) || n.protocolNo.toLowerCase().includes(q.toLowerCase()) || notifTypeName(n.notifType, lang).includes(q))
      .sort((a, b) => a.compoundId.localeCompare(b.compoundId) || a.filingCount - b.filingCount);
  }, [db, fType, fStatus, q, lang]);

  return (
    <>
      <div className="filters">
        <div className="fg">
          <label>{t("Type", "届出種別")}</label>
          <select className="sel" value={fType} onChange={(e) => setFType(e.target.value as typeof fType)}>
            <option value="all">{t("All", "すべて")}</option>
            {NOTIF_TYPE_ORDER.map((k) => <option key={k} value={k}>{notifTypeName(k, lang)}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>{t("Status", "ステータス")}</label>
          <select className="sel" value={fStatus} onChange={(e) => setFStatus(e.target.value as typeof fStatus)}>
            <option value="all">{t("All", "すべて")}</option>
            <option value="draft">{t("Draft", "作成中")}</option>
            <option value="review">{t("In Review", "レビュー中")}</option>
            <option value="approved">{t("Approved", "承認済み")}</option>
            <option value="submitted">{t("Submitted", "提出済み")}</option>
          </select>
        </div>
        <input className="search" placeholder={t("Search…", "検索…")} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="fsp" />
        <span className="fcount">{filtered.length} {t("items", "件")}</span>
      </div>

      <div className="card">
        <NotificationTable db={db} notifications={filtered} onOpen={onOpen} />
      </div>
    </>
  );
}
