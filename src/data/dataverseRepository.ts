import type { ChangeEntry, Goal, Level, MonthlyEntry, Status } from "../types";
import type { GoalsRepository } from "./repository";

import { GoalsService } from "../generated/services/GoalsService";
import { GoalUpdatesService } from "../generated/services/GoalUpdatesService";
import { GoalChangesService } from "../generated/services/GoalChangesService";
import type { Goals } from "../generated/models/GoalsModel";
import type { GoalUpdates } from "../generated/models/GoalUpdatesModel";
import type { GoalChanges } from "../generated/models/GoalChangesModel";

// Bind syntax for setting a lookup on create/update (single-valued nav property).
// The navigation property is the SCHEMA name of the lookup column (PascalCase).
const parentBind = (parentId: string | null) =>
  parentId ? { "sto_Parent@odata.bind": `/sto_goals(${parentId})` } : {};
const goalBind = (goalId: string) => ({
  "sto_Goal@odata.bind": `/sto_goals(${goalId})`,
});

// ===== row <-> domain mappers =====
function rowToGoal(
  g: Goals,
  updates: GoalUpdates[],
  changes: GoalChanges[]
): Goal {
  return {
    id: g.sto_goalid,
    parent: g._sto_parent_value ?? null,
    level: (g.sto_level as Level) ?? "individual",
    dept: g.sto_department ?? "",
    titleEn: g.sto_name ?? "",
    titleJa: g.sto_titleja ?? "",
    owner: g.sto_owner ?? "",
    av: g.sto_avatar ?? "",
    status: (g.sto_status as Status) ?? "g",
    monthly: updates
      .filter((u) => u._sto_goal_value === g.sto_goalid)
      .map<MonthlyEntry>((u) => ({
        month: u.sto_month,
        pct: u.sto_percent,
        commentEn: u.sto_commenten ?? "",
        commentJa: u.sto_commentja ?? "",
      }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    log: changes
      .filter((c) => c._sto_goal_value === g.sto_goalid)
      .map<ChangeEntry>((c) => ({
        at: c.sto_changedat ?? "",
        who: c.sto_who ?? "",
        kind: c.sto_kind === "created" ? "created" : "updated",
        note: c.sto_note ?? "",
      })),
  };
}

/**
 * Dataverse-backed repository. Reads/writes across three tables:
 * Goals (sto_goal), GoalUpdates (sto_goalupdate), GoalChanges (sto_goalchange).
 *
 * Requires the generated services (run `pac code add-data-source` — see README).
 * The Power Apps SDK must be initialized first (handled by PowerProvider).
 */
export class DataverseGoalsRepository implements GoalsRepository {
  async listGoals(): Promise<Goal[]> {
    const [goalsRes, updatesRes, changesRes] = await Promise.all([
      GoalsService.getAll({
        select: [
          "sto_goalid",
          "sto_name",
          "sto_titleja",
          "sto_level",
          "sto_department",
          "sto_owner",
          "sto_avatar",
          "sto_status",
          "_sto_parent_value",
        ],
        top: 5000,
      }),
      GoalUpdatesService.getAll({
        select: [
          "sto_goalupdateid",
          "_sto_goal_value",
          "sto_month",
          "sto_percent",
          "sto_commenten",
          "sto_commentja",
        ],
        top: 5000,
      }),
      GoalChangesService.getAll({
        select: [
          "sto_goalchangeid",
          "_sto_goal_value",
          "sto_changedat",
          "sto_who",
          "sto_kind",
          "sto_note",
        ],
        top: 5000,
      }),
    ]);

    const updates = updatesRes.data ?? [];
    const changes = changesRes.data ?? [];
    return (goalsRes.data ?? []).map((g) => rowToGoal(g, updates, changes));
  }

  async createGoal(goal: Omit<Goal, "id">): Promise<Goal> {
    const record = {
      sto_name: goal.titleEn,
      sto_titleja: goal.titleJa,
      sto_level: goal.level,
      sto_department: goal.dept,
      sto_owner: goal.owner,
      sto_avatar: goal.av,
      sto_status: goal.status,
      ...parentBind(goal.parent),
    };
    // Casts: @odata.bind keys are not part of the strongly-typed model.
    const res = await GoalsService.create(record as unknown as Omit<Goals, "sto_goalid">);
    const newId = res.data?.sto_goalid;
    if (!newId) throw new Error("Goal create returned no id.");

    // Persist child rows.
    await Promise.all([
      ...goal.monthly.map((m) => this.upsertMonthly(newId, m)),
      ...goal.log.map((c) => this.addChange(newId, c)),
    ]);

    return { ...goal, id: newId };
  }

  async updateGoal(goal: Goal): Promise<Goal> {
    const changes = {
      sto_name: goal.titleEn,
      sto_titleja: goal.titleJa,
      sto_level: goal.level,
      sto_department: goal.dept,
      sto_owner: goal.owner,
      sto_avatar: goal.av,
      sto_status: goal.status,
      ...parentBind(goal.parent),
    };
    await GoalsService.update(goal.id, changes as unknown as Partial<Goals>);
    return goal;
  }

  async upsertMonthly(goalId: string, entry: MonthlyEntry): Promise<void> {
    // Find an existing update row for this goal + month.
    const existing = await GoalUpdatesService.getAll({
      select: ["sto_goalupdateid"],
      filter: `_sto_goal_value eq ${goalId} and sto_month eq '${entry.month}'`,
      top: 1,
    });
    const row = existing.data?.[0];
    const fields = {
      sto_month: entry.month,
      sto_percent: entry.pct,
      sto_commenten: entry.commentEn,
      sto_commentja: entry.commentJa,
    };
    if (row) {
      await GoalUpdatesService.update(row.sto_goalupdateid, fields as Partial<GoalUpdates>);
    } else {
      await GoalUpdatesService.create({
        sto_name: `${goalId} ${entry.month}`,
        ...fields,
        ...goalBind(goalId),
      } as unknown as Omit<GoalUpdates, "sto_goalupdateid">);
    }
  }

  async addChange(goalId: string, change: ChangeEntry): Promise<void> {
    await GoalChangesService.create({
      sto_name: `${change.kind} ${change.at}`,
      sto_changedat: change.at,
      sto_who: change.who,
      sto_kind: change.kind,
      sto_note: change.note,
      ...goalBind(goalId),
    } as unknown as Omit<GoalChanges, "sto_goalchangeid">);
  }

  async deleteGoal(id: string): Promise<void> {
    await GoalsService.delete(id);
  }
}
