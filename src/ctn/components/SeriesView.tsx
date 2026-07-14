import { useLang } from "../../i18n";
import { seriesSummaries } from "../derive";
import { DEV_STATUS, fmtDate, label, SET } from "../refData";
import { StatusPill, TypeBadge } from "./common";
import type { CtnDb } from "../data/repository";

export function SeriesView({ db, onOpen, onCreate }: { db: CtnDb; onOpen: (id: string) => void; onCreate: () => void }) {
  const { t } = useLang();
  const series = seriesSummaries(db);
  return (
    <>
      <div className="vh">
        <div className="t">{t("Series (compounds)", "シリーズ（治験成分）")}</div>
        <div className="s">{t("Each series carries items common across filings. Study-drug serial numbers stay constant within a series.", "シリーズは届出をまたぐ共通事項を保持。治験使用薬の順序番号はシリーズ内で不変です。")}</div>
      </div>

      <div className="series-grid">
        {series.map((s) => (
          <div key={s.compound.id} className="series-card">
            <div className="series-head">
              <div>
                <div className="series-code">{s.compound.compoundCode}</div>
                <div className="muted small">{s.compound.drugName}</div>
              </div>
              <span className={`dev-chip ${s.compound.devStatus === DEV_STATUS.discontinued ? "disc" : "active"}`}>{label(SET.devStatus, s.compound.devStatus)}</span>
            </div>
            <div className="series-meta">
              <span>{t("Target", "対象区分")}: {label(SET.targetCategory, s.compound.targetCategory)}</span>
              <span>{t("Initial receipt", "初回受付")}: {s.compound.initReceptNo || "—"}</span>
              <span>{t("Drug serials", "薬の順序番号")}: {s.drugSerials.map((n) => `#${n}`).join(" ") || "—"}</span>
            </div>
            <div className="series-timeline">
              {s.notifications.map((n) => (
                <button key={n.id} className="tl-item" onClick={() => onOpen(n.id)}>
                  <span className="tl-count">#{n.filingCount}</span>
                  <TypeBadge type={n.notifType} />
                  <StatusPill status={n.status} />
                  <span className="muted small">{fmtDate(n.submittedAt ?? n.noteDate ?? n.createdAt)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18 }}>
        <button className="btn btn-p" onClick={onCreate}>＋ {t("New filing", "新規届作成")}</button>
      </div>
    </>
  );
}
