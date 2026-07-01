// ⚠️ PLACEHOLDER — replaced by `pac code add-data-source -a dataverse -t sto_goalupdate`.

export interface GoalUpdates {
  sto_goalupdateid: string;
  sto_name: string;
  /** Lookup: owning Goal. Read as `_sto_goal_value`. */
  _sto_goal_value?: string | null;
  sto_month: string; // "YYYY-MM"
  sto_percent: number;
  sto_commenten: string;
  sto_commentja: string;
}
