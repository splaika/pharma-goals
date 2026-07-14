import { useMemo, useState } from "react";
import { useLang } from "../../i18n";
import { validateCompoundCode } from "../logic";
import { NOTIF_TYPE_ORDER, notifTypeName, NOTIF_TYPE_SHORT, options, SET, TARGET_CATEGORY, DEV_STATUS } from "../refData";
import { Modal, Btn, Field } from "./common";
import type { CtnDb } from "../data/repository";
import type { Compound, NotifTypeKey } from "../types";

export interface CreatePayload {
  compoundId?: string;
  newCompound?: Omit<Compound, "id" | "createdAt">;
  notifType: NotifTypeKey;
}

export function CreateWizard({ db, onClose, onSubmit }: { db: CtnDb; onClose: () => void; onSubmit: (p: CreatePayload) => void }) {
  const { t, lang } = useLang();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [compoundId, setCompoundId] = useState(db.compounds[0]?.id ?? "");
  const [notifType, setNotifType] = useState<NotifTypeKey>("plan");

  // 新規シリーズ用
  const [code, setCode] = useState("");
  const [targetCategory, setTargetCategory] = useState<number>(TARGET_CATEGORY.drug);
  const [drugName, setDrugName] = useState("");
  const [sponsorId, setSponsorId] = useState(db.sponsors[0]?.id ?? "");

  const codeCheck = useMemo(() => validateCompoundCode(code), [code]);
  const dup = mode === "new" && db.compounds.some((c) => c.compoundCode.toLowerCase() === code.trim().toLowerCase());

  const isNewSeries = mode === "new";
  // 新規シリーズは計画届（初回）で確定
  const effectiveType: NotifTypeKey = isNewSeries ? "plan" : notifType;

  const canProceedStep1 = isNewSeries ? codeCheck.ok && !dup && !!drugName.trim() && !!sponsorId : !!compoundId;

  const finish = () => {
    if (isNewSeries) {
      onSubmit({ notifType: "plan", newCompound: { compoundCode: code.trim(), targetCategory, trialKind: "医薬品", initReceptNo: "", initNoteDate: "", devStatus: DEV_STATUS.active, sponsorId, drugName } });
    } else {
      onSubmit({ compoundId, notifType });
    }
  };

  const footer = (
    <>
      {step > 1 && <Btn onClick={() => setStep(step - 1)}>{t("Back", "戻る")}</Btn>}
      <div style={{ flex: 1 }} />
      <Btn onClick={onClose}>{t("Cancel", "キャンセル")}</Btn>
      {step === 1 && isNewSeries ? (
        // 新規シリーズは計画届で確定 → 種別選択ステップは不要、直接作成
        <Btn kind="p" disabled={!canProceedStep1} onClick={finish}>{t("Create filing", "届を作成")}</Btn>
      ) : step === 1 ? (
        <Btn kind="p" disabled={!canProceedStep1} onClick={() => setStep(2)}>{t("Next", "次へ")} →</Btn>
      ) : (
        <Btn kind="p" onClick={finish}>{t("Create filing", "届を作成")}</Btn>
      )}
    </>
  );

  return (
    <Modal title={t("New CTN filing", "新規届作成")} sub={t("Wizard: choose a series and the notification type.", "ウィザード：シリーズと届出種別を選択します。")} onClose={onClose} footer={footer} size="lg">
      {/* ステップ表示（新規シリーズは計画届固定のため種別ステップなし） */}
      <div className="wiz-steps">
        <span className={step === 1 ? "on" : "done"}>1. {t("Series", "シリーズ")}</span>
        {!isNewSeries && <span className={step === 2 ? "on" : ""}>2. {t("Notification type", "届出種別")}</span>}
      </div>

      {step === 1 && (
        <div>
          <div className="seg-2">
            <button className={mode === "existing" ? "on" : ""} onClick={() => setMode("existing")}>{t("Use existing series", "既存シリーズから")}</button>
            <button className={mode === "new" ? "on" : ""} onClick={() => setMode("new")}>{t("Create new series", "新規シリーズを作成")}</button>
          </div>

          {mode === "existing" ? (
            <div className="wiz-list">
              {db.compounds.map((c) => {
                const notifs = db.notifications.filter((n) => n.compoundId === c.id);
                return (
                  <label key={c.id} className={`wiz-series${compoundId === c.id ? " on" : ""}`}>
                    <input type="radio" name="series" checked={compoundId === c.id} onChange={() => setCompoundId(c.id)} />
                    <div>
                      <b>{c.compoundCode}</b> <span className="muted">{c.drugName}</span>
                      <div className="muted small">{notifs.length} {t("filings", "件の届出")} ・ {c.devStatus === DEV_STATUS.discontinued ? t("Discontinued", "開発中止") : t("Active", "開発中")}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="form-grid" style={{ marginTop: 14 }}>
              <Field label={t("Compound code", "治験成分記号")} mark="always" hint={t("Half-width alphanumerics/hyphen, ≤20 chars, no '&'.", "半角英数字・ハイフン、20桁以内、「&」不可。")} wide>
                <input className={`tin${code && !codeCheck.ok ? " err" : ""}`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="例：ABC-123" />
                {code && (
                  <div className="validate">
                    {codeCheck.errors.map((er, i) => <div key={i} className="v-err">✕ {er}</div>)}
                    {dup && <div className="v-err">✕ {t("This code already exists.", "この成分記号は既に存在します。")}</div>}
                    {codeCheck.warnings.map((w, i) => <div key={i} className="v-warn">⚠ {w}</div>)}
                    {codeCheck.ok && !dup && <div className="v-ok">✓ {t("Valid", "OK（サーバー検証相当）")}</div>}
                  </div>
                )}
              </Field>
              <Field label={t("Target category", "対象区分")} mark="always"><select className="sel" value={targetCategory} onChange={(e) => setTargetCategory(Number(e.target.value))}>{options(SET.targetCategory).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
              <Field label={t("Sponsor", "治験届出者")} mark="always"><select className="sel" value={sponsorId} onChange={(e) => setSponsorId(e.target.value)}>{db.sponsors.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
              <Field label={t("Representative drug name", "代表的な被験薬名称")} mark="always" wide><input className="tin" value={drugName} onChange={(e) => setDrugName(e.target.value)} placeholder="例：ABC-123（開発コード）" /></Field>
              <div className="wiz-note wide">{t("A new series starts with the first Clinical Trial Plan (filing #1, 30-day review).", "新規シリーズは初回の治験計画届（届出回数#1・30日調査対象）から開始します。")}</div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div>
          {isNewSeries ? (
            <div className="wiz-fixed">
              <div className="wiz-fixed-badge">{NOTIF_TYPE_SHORT.plan}届</div>
              <div>
                <b>{notifTypeName("plan", lang)}</b>
                <div className="muted small">{t("New series → first plan filing is fixed.", "新規シリーズのため、初回は治験計画届で固定です。")}</div>
              </div>
            </div>
          ) : (
            <div className="type-grid">
              {NOTIF_TYPE_ORDER.map((k) => {
                const notifs = db.notifications.filter((n) => n.compoundId === compoundId);
                const hasPlan = notifs.some((n) => n.notifType === "plan");
                const disabled = k === "plan" && hasPlan; // 計画届は初回のみ
                return (
                  <button key={k} className={`type-card${effectiveType === k ? " on" : ""}${disabled ? " disabled" : ""}`} disabled={disabled} onClick={() => setNotifType(k)}>
                    <div className={`type-ico ty-${k}`}>{NOTIF_TYPE_SHORT[k]}</div>
                    <b>{notifTypeName(k, lang)}</b>
                    <span className="muted small">
                      {k === "plan" && t("First filing of a series", "シリーズの初回届")}
                      {k === "change" && t("Amend an existing plan", "計画の変更")}
                      {k === "termination" && t("Discontinue mid-trial", "治験の中止")}
                      {k === "completion" && t("Complete the trial", "治験の終了")}
                      {k === "devDiscontinuation" && t("Stop development", "開発の中止")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {!isNewSeries && effectiveType !== "plan" && (
            <div className="wiz-note" style={{ marginTop: 12 }}>
              {t("Study drugs, sites and roster are inherited from the latest filing (transcription-free). Edit only the differences.", "治験使用薬・施設・医師ロスターは最新届から継承されます（転記排除）。差分だけを編集してください。")}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
