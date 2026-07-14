import { useState } from "react";
import { useLang } from "../../i18n";
import { DEFAULT_RULES, type RuleSettings } from "../rules";
import { Section, Field, Btn } from "./common";

export function SettingsView({ rules, onSave }: { rules: RuleSettings; onSave: (r: RuleSettings) => void }) {
  const { t } = useLang();
  const [v, setV] = useState<RuleSettings>({ ...rules });
  const [dirty, setDirty] = useState(false);
  const num = (k: keyof RuleSettings) => (e: React.ChangeEvent<HTMLInputElement>) => { setV((s) => ({ ...s, [k]: Number(e.target.value) })); setDirty(true); };
  const bool = (k: keyof RuleSettings) => (e: React.ChangeEvent<HTMLInputElement>) => { setV((s) => ({ ...s, [k]: e.target.checked })); setDirty(true); };

  return (
    <>
      <div className="vh">
        <div className="t">{t("Logical-check rule settings", "ロジカルチェック設定")}</div>
        <div className="s">{t("Configure deadline calculation and the alert / reminder rules.", "提出期限の算定と、アラート・リマインダのロジカルチェック項目を設定します。")}</div>
      </div>

      <div style={{ maxWidth: 760 }}>
        <Section title={t("Submission deadline", "提出期限の算定")} sub={t("Offset from planned start date (business-day handling is out of scope for this demo).", "治験開始予定日からのオフセット日数（営業日補正はデモ対象外）。")}>
          <div className="form-grid">
            <Field label={t("30-day review offset (days)", "30日調査対象のオフセット（日）")} mark="always"><input type="number" className="tin" value={v.offset30} onChange={num("offset30")} /></Field>
            <Field label={t("Standard offset (days)", "通常のオフセット（日）")} mark="always"><input type="number" className="tin" value={v.offset14} onChange={num("offset14")} /></Field>
          </div>
        </Section>

        <Section title={t("Alert thresholds", "アラート閾値")} sub={t("Deadline-related alerts on the dashboard.", "ダッシュボードの提出期限アラート。")}>
          <div className="form-grid">
            <Field label={t("Warn when days-left ≤", "接近（黄）：残日数 ≤")} mark="always"><input type="number" className="tin" value={v.warnDays} onChange={num("warnDays")} /></Field>
            <Field label={t("High when days-left ≤", "高（赤）：残日数 ≤")} mark="always"><input type="number" className="tin" value={v.hotDays} onChange={num("hotDays")} /></Field>
            <Field label={t("PMDA inquiry reminder within (days)", "PMDA照会リマインダ：残日数 ≤")} mark="always"><input type="number" className="tin" value={v.inquiryDays} onChange={num("inquiryDays")} /></Field>
            <Field label={t("Periodic report batch (months)", "定期報告バッチ（か月）")} mark="always"><input type="number" className="tin" value={v.batchMonths} onChange={num("batchMonths")} /></Field>
          </div>
        </Section>

        <Section title={t("Enable / disable checks", "チェックの有効化")}>
          <div className="rule-toggles">
            <label className="rule-toggle"><input type="checkbox" checked={v.overdue} onChange={bool("overdue")} /><div><b>{t("Overdue deadline alert", "提出期限超過アラート")}</b><span>{t("Alert when a filing passes its submission deadline.", "提出期限を過ぎた届を警告。")}</span></div></label>
            <label className="rule-toggle"><input type="checkbox" checked={v.submitReminder} onChange={bool("submitReminder")} /><div><b>{t("Awaiting-submission reminder", "提出待ちリマインダ")}</b><span>{t("Remind when approved filings are not yet submitted.", "承認済で未提出の届をリマインド。")}</span></div></label>
            <label className="rule-toggle"><input type="checkbox" checked={v.inquiryReminder} onChange={bool("inquiryReminder")} /><div><b>{t("PMDA inquiry reminder", "PMDA照会リマインダ")}</b><span>{t("Remind about unanswered PMDA inquiries nearing their deadline.", "回答期限が近いPMDA照会をリマインド。")}</span></div></label>
            <label className="rule-toggle"><input type="checkbox" checked={v.batchReminder} onChange={bool("batchReminder")} /><div><b>{t("Periodic-report batch reminder", "定期報告 保留リマインダ")}</b><span>{t("Remind about change filings with sub-investigator movement pending the batch.", "分担医師異動を含む変更届のバッチ保留をリマインド。")}</span></div></label>
          </div>
        </Section>

        <div className="settings-actions">
          <Btn onClick={() => { setV({ ...DEFAULT_RULES }); setDirty(true); }}>{t("Reset to defaults", "既定に戻す")}</Btn>
          <div style={{ flex: 1 }} />
          <Btn kind="p" disabled={!dirty} onClick={() => { onSave(v); setDirty(false); }}>{t("Apply", "設定を反映")}</Btn>
        </div>
      </div>
    </>
  );
}
