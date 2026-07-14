import { useMemo } from "react";
import { useLang } from "../../i18n";
import { generateCtnXml, validateAgainstSubset, type XmlContext } from "../xml";
import { DOCTOR_ROLE, DRUG_ROLE, label, SET } from "../refData";
import { Modal, Btn } from "./common";
import type { CtnDb } from "../data/repository";
import type { Notification } from "../types";

export function XmlPreview({ notification, db, onClose, onGenerated }: { notification: Notification; db: CtnDb; onClose: () => void; onGenerated: (n: Notification) => void }) {
  const { t } = useLang();

  const { xml, check, ctx } = useMemo(() => {
    const compound = db.compounds.find((c) => c.id === notification.compoundId)!;
    const sponsor = db.sponsors.find((s) => s.id === notification.sponsorId)!;
    const ctx: XmlContext = {
      compound,
      sponsor,
      institutions: new Map(db.institutions.map((i) => [i.id, i])),
      irbs: new Map(db.irbs.map((i) => [i.id, i])),
    };
    const xml = generateCtnXml(notification, ctx);
    const check = validateAgainstSubset(notification, xml);
    return { xml, check, ctx };
  }, [notification, db]);
  void ctx;

  const download = () => {
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CTN_${db.compounds.find((c) => c.id === notification.compoundId)?.compoundCode}_${notification.notifType}_${notification.filingCount}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      title={t("XML generation & validation (confirm step)", "XML生成・XSD検証（確認ステップ）")}
      sub={t("Demo subset XSD — not the official iykckn_all_v3_0_0.xsd. Serial numbers are revealed here.", "デモ用サブセットXSD（公式 iykckn_all_v3_0_0.xsd ではありません）。順序番号はこの確認ステップで提示されます。")}
      onClose={onClose}
      size="xl"
      footer={<><div className={`xsd-verdict ${check.ok ? "ok" : "err"}`}>{check.ok ? `✓ ${t("Valid", "検証OK")}` : `✕ ${t("Invalid", "検証NG")}`} ・ {check.elementCount} {t("elements", "要素")}</div><div style={{ flex: 1 }} /><Btn onClick={download}>{t("Download .xml", "XMLをダウンロード")}</Btn><Btn kind="p" disabled={!check.ok} onClick={() => onGenerated(notification)}>{t("Record generation", "生成を記録")}</Btn></>}
    >
      {/* 順序番号サマリ */}
      <div className="serial-summary">
        <div className="ss-block">
          <div className="ss-h">{t("Study drugs (matching-key serial)", "治験使用薬（突合キー型 順序番号）")}</div>
          {notification.studyDrugs.length === 0 ? <div className="muted small">—</div> : notification.studyDrugs.map((d) => (
            <div key={d.id} className="ss-row"><span className="ss-serial">#{d.serialNo}</span> {d.drugName} <span className={`mini-badge ${d.drugRole === DRUG_ROLE.main ? "main" : "other"}`}>{label(SET.drugRole, d.drugRole)}</span></div>
          ))}
        </div>
        <div className="ss-block">
          <div className="ss-h">{t("Investigators (event-row serial)", "医師（イベント行型 順序番号）")}</div>
          {notification.sites.flatMap((s) => s.investigators).length === 0 ? <div className="muted small">—</div> : notification.sites.flatMap((s) => s.investigators.map((iv) => (
            <div key={iv.id} className="ss-row"><span className="ss-serial">#{iv.serialNo}</span> {iv.nameFiling} <span className={`mini-badge ${iv.doctorRole === DOCTOR_ROLE.responsible ? "resp" : "sub"}`}>{iv.doctorRole === DOCTOR_ROLE.responsible ? "INFOINVESTIGATOR" : "INFOSUBINVESTIGATOR"}</span> <span className={`mv mv-${iv.changeType === 100001001 ? "add" : iv.changeType === 100001002 ? "remove" : "cont"}`}>STATUS={iv.changeType === 100001001 ? "APPEND" : iv.changeType === 100001002 ? "DELETE" : "NONE"}</span></div>
          )))}
        </div>
      </div>

      {(check.errors.length > 0 || check.warnings.length > 0) && (
        <div className="xsd-msgs">
          {check.errors.map((e, i) => <div key={i} className="v-err">✕ {e}</div>)}
          {check.warnings.map((w, i) => <div key={i} className="v-warn">⚠ {w}</div>)}
        </div>
      )}

      <pre className="xml-pre">{xml}</pre>
    </Modal>
  );
}
