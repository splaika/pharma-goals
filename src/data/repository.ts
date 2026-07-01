import type { ChangeEntry, Goal, MonthlyEntry } from "../types";
import { MockGoalsRepository } from "./mockRepository";
import { DataverseGoalsRepository } from "./dataverseRepository";

// ===== Data access contract =====
// Components depend ONLY on this interface. Swap the implementation
// (mock <-> Dataverse) without touching any UI code.
//
// Writes are intentionally granular (updateGoal / upsertMonthly / addChange)
// so the Dataverse implementation can target the right table row precisely,
// instead of diffing whole aggregates.
export interface GoalsRepository {
  listGoals(): Promise<Goal[]>;
  /** Persist a brand new goal together with its monthly entries and log. */
  createGoal(goal: Omit<Goal, "id">): Promise<Goal>;
  /** Update scalar fields only (title / level / dept / owner / status / parent). */
  updateGoal(goal: Goal): Promise<Goal>;
  /** Insert or replace one month's progress for a goal. */
  upsertMonthly(goalId: string, entry: MonthlyEntry): Promise<void>;
  /** Append one change-history entry for a goal. */
  addChange(goalId: string, change: ChangeEntry): Promise<void>;
  deleteGoal(id: string): Promise<void>;
}

let _repo: GoalsRepository | null = null;

// Flip to live Dataverse by setting VITE_USE_DATAVERSE=true in .env.local
// (after running `pac code add-data-source` for the three tables).
export function getRepository(): GoalsRepository {
  if (_repo) return _repo;
  const useDataverse = import.meta.env.VITE_USE_DATAVERSE === "true";
  _repo = useDataverse
    ? new DataverseGoalsRepository()
    : new MockGoalsRepository();
  return _repo;
}
