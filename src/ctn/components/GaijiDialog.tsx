import { useState } from "react";
import { useLang } from "../../i18n";
import { label, SET } from "../refData";
import type { GaijiHit } from "../logic";
import { Modal, Btn } from "./common";

export interface GaijiConfirmation {
  originalChar: string;
  codePoint: string;
  replacementChar: string;
  gaijiType: number;
}

/**
 * 外字確認ダイアログ。JIS第1・2水準外を検出したときに提示し、
 * 元字・コードポイント・代替字・確認者・日時を GaijiMap へ記録する材料を返す。
 */
export function GaijiDialog({ originalName, hits, onCancel, onConfirm }: { originalName: string; hits: GaijiHit[]; onCancel: () => void; onConfirm: (confs: GaijiConfirmation[], filingName: string) => void }) {
  const { t } = useLang();
  const [repls, setRepls] = useState<string[]>(hits.map((h) => h.replacement));

  const filingName = (() => {
    let out = originalName;
    hits.forEach((h, i) => {
      out = out.split(h.char).join(repls[i] || h.char);
    });
    return out;
  })();

  return (
    <Modal
      title={t("Gaiji confirmation", "外字の確認")}
      sub={t("Out-of-JIS / platform-dependent characters were detected. Confirm the filing-form substitution.", "JIS水準外・機種依存文字を検出しました。届出用表記への置換を確認してください。")}
      onClose={onCancel}
      size="md"
      footer={<><div style={{ flex: 1 }} /><Btn onClick={onCancel}>{t("Cancel", "キャンセル")}</Btn><Btn kind="p" onClick={() => onConfirm(hits.map((h, i) => ({ originalChar: h.char, codePoint: h.codePoint, replacementChar: repls[i] || h.char, gaijiType: h.gaijiType })), filingName)}>{t("Confirm & record", "確認して記録")}</Btn></>}
    >
      <div className="gaiji-orig">{t("Original", "原表記")}: <b>{originalName}</b> → {t("Filing", "届出用")}: <b className="hl">{filingName}</b></div>
      <table className="gaiji-tbl">
        <thead><tr><th>{t("Char", "元字")}</th><th>{t("Code point", "コードポイント")}</th><th>{t("Type", "判定区分")}</th><th>{t("Replacement", "代替字")}</th></tr></thead>
        <tbody>
          {hits.map((h, i) => (
            <tr key={i}>
              <td className="gc">{h.char}</td>
              <td className="muted">{h.codePoint}</td>
              <td><span className={`gtype g-${h.gaijiType}`}>{label(SET.gaijiType, h.gaijiType)}</span></td>
              <td><input className="tin tin-xs gc-in" value={repls[i]} onChange={(e) => setRepls((r) => r.map((x, j) => (j === i ? e.target.value : x)))} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="gaiji-note">{t("Once confirmed for a doctor, this dialog will not reappear for the same characters.", "医師単位で確認済みになると、同じ文字では再度ダイアログは表示されません。")}</div>
    </Modal>
  );
}
