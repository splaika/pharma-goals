import { useLang } from "../../i18n";
import { roleLabel, type DemoUser } from "../refData";

export type ViewKey = "dashboard" | "notifications" | "series" | "masters" | "audit";

const ICONS: Record<ViewKey, JSX.Element> = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" /></svg>
  ),
  series: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M2 12h4l3 8 4-16 3 8h6" /></svg>
  ),
  masters: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0" /></svg>
  ),
  audit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 8v4l3 2" /><circle cx="12" cy="12" r="9" /></svg>
  ),
};

export function Sidebar({ view, onNavigate, user, badges }: { view: ViewKey; onNavigate: (v: ViewKey) => void; user: DemoUser; badges?: Partial<Record<ViewKey, number>> }) {
  const { t } = useLang();
  const items: [ViewKey, string, string][] = [
    ["dashboard", "Dashboard", "ダッシュボード"],
    ["notifications", "Notifications", "治験届一覧"],
    ["series", "Series", "シリーズ（成分）"],
    ["masters", "Masters", "マスタ管理"],
    ["audit", "Audit log", "監査ログ"],
  ];
  return (
    <aside className="side">
      <div className="brand">
        <div className="m">
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth={2.2}><path d="M9 12l2 2 4-4" /><path d="M21 12c0 5-3.5 7.5-8.2 8.9a1 1 0 0 1-.6 0C7.5 19.5 4 17 4 12V6a1 1 0 0 1 .7-1l7-2.3a1 1 0 0 1 .6 0L19.3 5A1 1 0 0 1 20 6Z" /></svg>
        </div>
        <div>
          <b>CTN Suite</b>
          <span>治験届管理システム</span>
        </div>
      </div>
      <nav className="nav">
        {items.map(([key, en, ja]) => (
          <a key={key} className={view === key ? "on" : ""} onClick={() => onNavigate(key)}>
            {ICONS[key]}
            <span>{t(en, ja)}</span>
            {badges?.[key] ? <span className="nav-badge">{badges[key]}</span> : null}
          </a>
        ))}
      </nav>
      <div className="sfoot">
        <div className="a">{user.initials}</div>
        <div>
          <div className="n">{user.name}</div>
          <div className="r">{t(roleLabel[user.role][0], roleLabel[user.role][1])}・{user.dept}</div>
        </div>
      </div>
    </aside>
  );
}
