import { useEffect, useMemo, useState } from "react";
import { LangContext, makeT } from "./i18n";
import type { Lang } from "./ctn/types";
import { getRepository } from "./ctn/data/repository";
import type { CtnDb } from "./ctn/data/repository";
import { deriveAlerts } from "./ctn/derive";
import { USERS, userById, roleLabel } from "./ctn/refData";
import { Sidebar, type ViewKey } from "./ctn/components/Sidebar";
import { Dashboard } from "./ctn/components/Dashboard";
import { NotificationsView } from "./ctn/components/NotificationList";
import { NotificationDetail } from "./ctn/components/NotificationDetail";
import { CreateWizard, type CreatePayload } from "./ctn/components/CreateWizard";
import { MasterView } from "./ctn/components/MasterView";
import { SeriesView } from "./ctn/components/SeriesView";
import { AuditView } from "./ctn/components/AuditView";
import { XmlPreview } from "./ctn/components/XmlPreview";
import type { Notification } from "./ctn/types";

const TITLES: Record<ViewKey, [string, string]> = {
  dashboard: ["Dashboard", "ダッシュボード"],
  notifications: ["Notifications", "治験届一覧"],
  series: ["Series", "シリーズ（成分）"],
  masters: ["Masters", "マスタ管理"],
  audit: ["Audit log", "監査ログ"],
};

export default function App() {
  const [lang, setLang] = useState<Lang>("ja");
  const [view, setView] = useState<ViewKey>("dashboard");
  const [db, setDb] = useState<CtnDb | null>(null);
  const [userId, setUserId] = useState<string>("u-a");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizard, setWizard] = useState(false);
  const [xmlFor, setXmlFor] = useState<Notification | null>(null);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  const t = useMemo(() => makeT(lang), [lang]);
  const repo = getRepository();
  const user = userById(userId)!;

  useEffect(() => {
    document.body.classList.toggle("ja", lang === "ja");
  }, [lang]);

  const reload = async () => setDb(await repo.getState());
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (msg: string, err = false) => {
    setToast({ msg, err });
    window.setTimeout(() => setToast(null), 3000);
  };

  const openNotif = (id: string) => setSelectedId(id);
  const backToList = () => setSelectedId(null);

  // ---- ワークフローハンドラ ----
  const handleCreate = async (p: CreatePayload) => {
    let compoundId = p.compoundId;
    if (p.newCompound) {
      const c = await repo.createCompound(p.newCompound, userId);
      compoundId = c.id;
    }
    if (!compoundId) return;
    const n = await repo.createNotification({ compoundId, notifType: p.notifType, createdBy: userId });
    await reload();
    setWizard(false);
    setSelectedId(n.id);
    flash(t("Filing created — edit the differences.", "届を作成しました。差分を編集してください。"));
  };

  const handleSave = async (n: Notification): Promise<Notification> => {
    const saved = await repo.updateNotification(n, userId);
    await reload();
    flash(t("Saved", "保存しました"));
    return saved; // サーバー確定後の順序番号を detail の draft へ反映する
  };
  const handleSendReview = async (id: string) => {
    await repo.sendForReview(id, userId);
    await reload();
    flash(t("Sent for review", "社内レビューへ送付しました"));
  };
  const handleApprove = async (id: string) => {
    try {
      await repo.approveNotification(id, userId);
      await reload();
      flash(t("Approved", "承認しました"));
    } catch (e) {
      flash((e as Error).message, true);
    }
  };
  const handleSubmit = async (id: string) => {
    try {
      await repo.submitNotification(id, userId);
      await reload();
      flash(t("Submitted", "提出しました（順序番号を確定）"));
    } catch (e) {
      flash((e as Error).message, true);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      await repo.deleteNotification(id, userId);
      await reload();
      setSelectedId(null);
      flash(t("Deleted", "削除しました"));
    } catch (e) {
      flash((e as Error).message, true);
    }
  };
  const handleXmlGenerated = async (n: Notification) => {
    await repo.markXmlGenerated(n.id, userId);
    await reload();
    setXmlFor(null);
    flash(t("XML generated & validated", "XMLを生成・検証しました"));
  };

  if (!db) return <div className="boot">Loading…</div>;

  const alerts = deriveAlerts(db);
  const selected = selectedId ? db.notifications.find((n) => n.id === selectedId) ?? null : null;

  return (
    <LangContext.Provider value={{ lang, setLang: (l) => setLang(l as Lang), t }}>
      <div className={`app${lang === "ja" ? " ja" : ""}`}>
        <Sidebar view={view} onNavigate={(v) => { setSelectedId(null); setView(v); }} user={user} badges={{ dashboard: alerts.length }} />
        <div className="main">
          <header className="top">
            <h1>{selected ? t("Filing detail", "治験届 詳細") : t(...TITLES[view])}</h1>
            <div className="sp" />
            {/* ユーザー切替（職務分離のデモ） */}
            <div className="user-switch">
              <span className="us-label">{t("Acting as", "操作ユーザー")}</span>
              <select className="sel" value={userId} onChange={(e) => setUserId(e.target.value)}>
                {USERS.map((u) => <option key={u.id} value={u.id}>{u.name}（{t(roleLabel[u.role][0], roleLabel[u.role][1])}）</option>)}
              </select>
            </div>
            <div className="lang">
              <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
              <button className={lang === "ja" ? "on" : ""} onClick={() => setLang("ja")}>JA</button>
            </div>
            <button className="btn btn-p" onClick={() => setWizard(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
              {t("New filing", "新規届作成")}
            </button>
          </header>

          <div className="scroll">
            {selected ? (
              <NotificationDetail
                key={selected.id}
                notification={selected}
                db={db}
                user={user}
                onBack={backToList}
                onSave={handleSave}
                onSendReview={handleSendReview}
                onApprove={handleApprove}
                onSubmit={handleSubmit}
                onDelete={handleDelete}
                onGenerateXml={(n) => setXmlFor(n)}
              />
            ) : view === "dashboard" ? (
              <Dashboard db={db} onOpen={openNotif} onNavigate={(v) => setView(v)} />
            ) : view === "notifications" ? (
              <NotificationsView db={db} onOpen={openNotif} onCreate={() => setWizard(true)} />
            ) : view === "series" ? (
              <SeriesView db={db} onOpen={openNotif} onCreate={() => setWizard(true)} />
            ) : view === "masters" ? (
              <MasterView db={db} repo={repo} actorId={userId} reload={reload} flash={flash} />
            ) : (
              <AuditView db={db} />
            )}
          </div>
        </div>
      </div>

      {wizard && <CreateWizard db={db} onClose={() => setWizard(false)} onSubmit={handleCreate} />}
      {xmlFor && <XmlPreview notification={xmlFor} db={db} onClose={() => setXmlFor(null)} onGenerated={handleXmlGenerated} />}

      <div className={`toast${toast ? " on" : ""}${toast?.err ? " toast-err" : ""}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          {toast?.err ? <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /> : <path d="M20 6 9 17l-5-5" />}
        </svg>
        <span>{toast?.msg}</span>
      </div>
    </LangContext.Provider>
  );
}
