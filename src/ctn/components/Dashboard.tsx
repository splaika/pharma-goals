import { useLang } from "../../i18n";
import { dashboardStats, deriveAlerts } from "../derive";
import { fmtDate } from "../refData";
import { Kpi } from "./common";
import { NotificationTable } from "./NotificationList";
import type { CtnDb } from "../data/repository";
import type { AlertItem } from "../types";
import type { ViewKey } from "./Sidebar";

function AlertRow({ a, onOpen }: { a: AlertItem; onOpen: (id: string) => void }) {
  const { lang } = useLang();
  return (
    <div className={`alert-row sev-${a.severity}${a.notificationId ? " clickable" : ""}`} onClick={() => a.notificationId && onOpen(a.notificationId)}>
      <span className={`alert-dot ${a.kind}`} />
      <div className="alert-txt">
        <div className="alert-t">{lang === "ja" ? a.titleJa : a.titleEn}</div>
        <div className="alert-d">{lang === "ja" ? a.detailJa : a.detailEn}</div>
      </div>
      {a.dueDate && <div className="alert-due">{fmtDate(a.dueDate)}</div>}
    </div>
  );
}

export function Dashboard({ db, onOpen, onNavigate }: { db: CtnDb; onOpen: (id: string) => void; onNavigate: (v: ViewKey) => void }) {
  const { t, lang } = useLang();
  const alerts = deriveAlerts(db);
  const stats = dashboardStats(db, alerts);
  const alertItems = alerts.filter((a) => a.kind === "alert");
  const reminderItems = alerts.filter((a) => a.kind === "reminder");

  return (
    <>
      <div className="vh">
        <div className="t">{t("Dashboard", "ダッシュボード")}</div>
        <div className="s">{t("CTN filings, alerts and reminders at a glance.", "既存の治験届・アラート・リマインダをひと目で。")}</div>
      </div>

      <div className="kpis kpis-5">
        <Kpi label={t("Total filings", "届出総数")} value={stats.total} onClick={() => onNavigate("notifications")} />
        <Kpi label={t("Submitted", "提出済み")} value={stats.submitted} />
        <Kpi label={t("In progress", "進行中")} value={stats.inProgress} />
        <Kpi label={t("Alerts", "アラート")} value={stats.alerts} />
        <Kpi label={t("Reminders", "リマインダ")} value={stats.reminders} />
      </div>

      <div className="dash-grid">
        <div className="sect">
          <div className="sect-h">
            <div><h3>⚠ {t("Alerts", "アラート")}</h3><div className="sect-sub">{t("Submission deadlines", "提出期限に関する警告")}</div></div>
            <span className="count-chip red">{alertItems.length}</span>
          </div>
          <div className="sect-b nopad">
            {alertItems.length === 0 ? <div className="empty small">{t("No alerts.", "アラートはありません。")}</div> : alertItems.map((a) => <AlertRow key={a.id} a={a} onOpen={onOpen} />)}
          </div>
        </div>
        <div className="sect">
          <div className="sect-h">
            <div><h3>🔔 {t("Reminders", "リマインダ")}</h3><div className="sect-sub">{t("Pending actions", "対応待ちのタスク")}</div></div>
            <span className="count-chip amber">{reminderItems.length}</span>
          </div>
          <div className="sect-b nopad">
            {reminderItems.length === 0 ? <div className="empty small">{t("No reminders.", "リマインダはありません。")}</div> : reminderItems.map((a) => <AlertRow key={a.id} a={a} onOpen={onOpen} />)}
          </div>
        </div>
      </div>

      <div className="sect">
        <div className="sect-h">
          <div><h3>{t("All notifications", "すべての治験届")}</h3><div className="sect-sub">{t("Every CTN filing in the system", "システム内の全治験届")}</div></div>
          <button className="btn btn-g btn-sm" onClick={() => onNavigate("notifications")}>{t("Open list", "一覧を開く")} →</button>
        </div>
        <div className="sect-b nopad">
          <NotificationTable db={db} notifications={[...db.notifications].sort((a, b) => (a.compoundId + a.filingCount).localeCompare(b.compoundId + b.filingCount))} onOpen={onOpen} />
        </div>
      </div>

      <div className="dash-note">
        {lang === "ja"
          ? "※ 本デモは Power Platform 本番（Dataverse＋モデル駆動アプリ＋プラグイン）の模擬です。採番・区分・職務分離・提出ゲート・外字・XML生成はサーバー正本ロジックとして実装しています。"
          : "This demo mirrors the Power Platform production system. Numbering, kubun, job-separation, submission gate, gaiji and XML generation are implemented as server-authoritative logic."}
      </div>
    </>
  );
}
