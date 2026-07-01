// ⚠️ PLACEHOLDER — replaced by `pac code add-data-source -a dataverse -t sto_goal`.
// Field logical names below must match the columns you create in Dataverse
// (see README → "Dataverse schema"). Adjust names here only if yours differ.

export interface Goals {
  sto_goalid: string;
  sto_name: string; // primary column → titleEn
  sto_titleja: string;
  sto_level: string; // "company" | "dept" | "team" | "individual"
  sto_department: string; // dept id
  sto_owner: string;
  sto_avatar: string;
  sto_status: string; // "g" | "a" | "r"
  /** Lookup: parent Goal. Read as `_sto_parent_value` (GUID or null). */
  _sto_parent_value?: string | null;
}
