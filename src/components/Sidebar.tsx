import { useLang } from "../i18n";

export type ViewKey = "overview" | "goals" | "report";

const ICONS: Record<ViewKey, JSX.Element> = {
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" />
    </svg>
  ),
  goals: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" />
    </svg>
  ),
  report: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6" />
    </svg>
  ),
};

export function Sidebar({
  view,
  onNavigate,
}: {
  view: ViewKey;
  onNavigate: (v: ViewKey) => void;
}) {
  const { t } = useLang();
  const items: [ViewKey, string, string][] = [
    ["overview", "Overview", "サマリー"],
    ["goals", "Goals", "目標"],
    ["report", "Report", "レポート"],
  ];
  return (
    <aside className="side">
      <div className="brand">
        <div className="m">
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#fff" strokeWidth={2.4}>
            <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="#fff" />
          </svg>
        </div>
        <b>Pharma Goals</b>
      </div>
      <nav className="nav">
        {items.map(([key, en, ja]) => (
          <a
            key={key}
            className={view === key ? "on" : ""}
            onClick={() => onNavigate(key)}
          >
            {ICONS[key]}
            <span>{t(en, ja)}</span>
          </a>
        ))}
      </nav>
      <div className="sfoot">
        <div className="a">KT</div>
        <div>
          <div className="n">Kenji Takahashi</div>
          <div className="r">{t("Data Science", "データサイエンス部")}</div>
        </div>
      </div>
    </aside>
  );
}
