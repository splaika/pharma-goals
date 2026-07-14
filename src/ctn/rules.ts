// ============================================================================
// ロジカルチェック設定（期限・アラートのルール）
// ----------------------------------------------------------------------------
// 「ロジカルチェック設定」画面で編集する。提出期限の算定オフセットや、
// アラート/リマインダの閾値・有効/無効を保持する。デモではメモリ内の
// シングルトン（リロードで既定に戻る）。computeDeadline / deriveAlerts が参照する。
// ============================================================================

export interface RuleSettings {
  /** 30日調査対象の提出期限オフセット（開始予定日 − N日） */
  offset30: number;
  /** 通常の提出期限オフセット（開始予定日 − N日） */
  offset14: number;
  /** 提出期限接近アラート（黄）の残日数閾値 */
  warnDays: number;
  /** 提出期限接近アラート（赤・高）の残日数閾値 */
  hotDays: number;
  /** PMDA照会 回答期限リマインダを出す残日数 */
  inquiryDays: number;
  /** 定期報告バッチ（か月） */
  batchMonths: number;
  /** 期限超過アラートを出す */
  overdue: boolean;
  /** 承認済・提出待ちリマインダを出す */
  submitReminder: boolean;
  /** PMDA照会リマインダを出す */
  inquiryReminder: boolean;
  /** 定期報告 保留リマインダを出す */
  batchReminder: boolean;
}

export const DEFAULT_RULES: RuleSettings = {
  offset30: 30,
  offset14: 14,
  warnDays: 14,
  hotDays: 7,
  inquiryDays: 21,
  batchMonths: 12,
  overdue: true,
  submitReminder: true,
  inquiryReminder: true,
  batchReminder: true,
};

let current: RuleSettings = { ...DEFAULT_RULES };
export const getRules = (): RuleSettings => current;
export const setRules = (r: RuleSettings): void => {
  current = { ...r };
};
