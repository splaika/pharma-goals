import { useEffect, useMemo, useState } from "react";
import { LangContext, makeT } from "./i18n";
import type { Lang } from "./ctn/types";
import { getRepository } from "./ctn/data/repository";
import type { CtnDb } from "./ctn/data/repository";
import { deriveAlerts } from "./ctn/derive";
import { USERS, userById, roleLabel, TARGET_CATEGORY, DEV_STATUS } from "./ctn/refData";
import { Sidebar, type ViewKey } from "./ctn/components/Sidebar";
import { Dashboard } from "./ctn/components/Dashboard";
import { NotificationsView } from "./ctn/components/NotificationList";
import { NotificationDetail } from "./ctn/components/NotificationDetail";
import { CreateWizard, type CreatePayload } from "./ctn/components/CreateWizard";
import { MasterView } from "./ctn/components/MasterView";
import { ImportView, type ParsedImport } from "./ctn/components/ImportView";
import { SettingsView } from "./ctn/components/SettingsView";
import { AuditView } from "./ctn/components/AuditView";
import { XmlPreview } from "./ctn/components/XmlPreview";
import { DEFAULT_RULES, setRules, type RuleSettings } from "./ctn/rules";
import type { Notification } from "./ctn/types";

const TITLES: Record<ViewKey, [string, string]> = {
  dashboard: ["Dashboard", "ダッシュボード"],
  notifications: ["Notifications", "治験届一覧"],
  import: ["Import", "データ取り込み"],
  masters: ["Masters", "マスタ管理"],
  settings: ["Rule settings", "ロジカルチェック設定"],
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
  const [rules, setRulesState] = useState<RuleSettings>(() => ({ ...DEFAULT_RULES }));
  // デザインテーマはモダンに統一（標準/モダン切替は撤去）
  const [mode, setMode] = useState<"light" | "dark">(() => {
    try {
      return localStorage.getItem("ctn.mode") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("ctn.sidebar") === "collapsed";
    } catch {
      return false;
    }
  });

  const t = useMemo(() => makeT(lang), [lang]);
  const repo = getRepository();
  const user = userById(userId)!;

  useEffect(() => {
    document.body.classList.toggle("ja", lang === "ja");
  }, [lang]);
  useEffect(() => {
    try {
      localStorage.setItem("ctn.mode", mode);
    } catch {
      /* ignore */
    }
  }, [mode]);
  useEffect(() => {
    try {
      localStorage.setItem("ctn.sidebar", collapsed ? "collapsed" : "expanded");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

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

  const applyRules = (r: RuleSettings) => {
    setRules(r); // モジュールのシングルトンへ反映（computeDeadline / deriveAlerts が参照）
    setRulesState(r); // 再描画してアラート等を再計算
    flash(t("Rule settings applied", "設定を反映しました"));
  };

  // 既存ファイル（XML）→ ドラフトとして取り込む
  const handleImport = async (p: ParsedImport) => {
    let compoundId = db?.compounds.find((c) => c.compoundCode === p.compoundCode)?.id;
    if (!compoundId) {
      const c = await repo.createCompound({ compoundCode: p.compoundCode, targetCategory: TARGET_CATEGORY.drug, trialKind: "医薬品", initReceptNo: "", initNoteDate: "", devStatus: DEV_STATUS.active, sponsorId: db?.sponsors[0]?.id ?? "", drugName: p.compoundCode }, userId);
      compoundId = c.id;
    }
    const n = await repo.createNotification({ compoundId, notifType: p.notifType, createdBy: userId });
    await repo.updateNotification({ ...n, protocolNo: p.protocolNo ?? n.protocolNo, objectives: p.objectives ?? n.objectives, targetDisease: p.targetDisease ?? n.targetDisease, remarks: p.remarks ?? n.remarks }, userId);
    await reload();
    setSelectedId(n.id);
    setView("notifications");
    flash(t("Imported as a draft — complete the details.", "ドラフトとして取り込みました。詳細を補完してください。"));
  };

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

  if (!db)
    return (
      <div className="boot">
        <div className="boot-card">
          <div className="sk-note">{t("Loading…", "読み込み中…")}</div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div className="sk-row" key={i}>
              <span className="sk" /><span className="sk" /><span className="sk" /><span className="sk" /><span className="sk" />
            </div>
          ))}
        </div>
      </div>
    );

  const alerts = deriveAlerts(db);
  const selected = selectedId ? db.notifications.find((n) => n.id === selectedId) ?? null : null;

  return (
    <LangContext.Provider value={{ lang, setLang: (l) => setLang(l as Lang), t }}>
      <div className={`app${lang === "ja" ? " ja" : ""} theme-modern mode-${mode}${collapsed ? " collapsed" : ""}`}>
        <Sidebar view={selected ? "notifications" : view} onNavigate={(v) => { setSelectedId(null); setView(v); }} user={user} badges={{ dashboard: alerts.length }} collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
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
            <button
              className="icon-btn mode-toggle"
              onClick={() => setMode((m) => (m === "dark" ? "light" : "dark"))}
              title={mode === "dark" ? t("Switch to light mode", "ライトモードに切替") : t("Switch to dark mode", "ダークモードに切替")}
              aria-label={mode === "dark" ? t("Switch to light mode", "ライトモードに切替") : t("Switch to dark mode", "ダークモードに切替")}
            >
              {mode === "dark" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.2M12 19.8V22M2 12h2.2M19.8 12H22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M19.1 4.9l-1.6 1.6M6.5 17.5l-1.6 1.6" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
              )}
            </button>
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
              <NotificationsView db={db} onOpen={openNotif} />
            ) : view === "import" ? (
              <ImportView onImport={handleImport} />
            ) : view === "masters" ? (
              <MasterView db={db} repo={repo} actorId={userId} reload={reload} flash={flash} />
            ) : view === "settings" ? (
              <SettingsView rules={rules} onSave={applyRules} user={user} />
            ) : (
              <AuditView db={db} />
            )}
          </div>
        </div>

        {/* オーバーレイは .app の内側に置く（theme-modern の変数を継承させるため） */}
        {wizard && <CreateWizard db={db} onClose={() => setWizard(false)} onSubmit={handleCreate} />}
        {xmlFor && <XmlPreview notification={xmlFor} db={db} onClose={() => setXmlFor(null)} onGenerated={handleXmlGenerated} />}

        <div className={`toast${toast ? " on" : ""}${toast?.err ? " toast-err" : ""}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            {toast?.err ? <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /> : <path d="M20 6 9 17l-5-5" />}
          </svg>
          <span>{toast?.msg}</span>
        </div>
      </div>
    </LangContext.Provider>
  );
}
