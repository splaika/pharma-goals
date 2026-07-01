// ⚠️ PLACEHOLDER — replaced by `pac code add-data-source -a dataverse -t sto_goalchange`.

export interface GoalChanges {
  sto_goalchangeid: string;
  sto_name: string;
  /** Lookup: owning Goal. Read as `_sto_goal_value`. */
  _sto_goal_value?: string | null;
  sto_changedat: string; // display stamp
  sto_who: string;
  sto_kind: string; // "created" | "updated"
  sto_note: string;
}
