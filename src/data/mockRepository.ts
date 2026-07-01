import type { ChangeEntry, Goal, MonthlyEntry } from "../types";
import type { GoalsRepository } from "./repository";
import { SEED_GOALS } from "./seed";

// In-memory repository seeded with the v3 mockup data.
// Data resets on reload — perfect for demos and local UI work.
export class MockGoalsRepository implements GoalsRepository {
  private goals: Goal[] = structuredClone(SEED_GOALS);
  private seq = 200;

  async listGoals(): Promise<Goal[]> {
    return structuredClone(this.goals);
  }

  async createGoal(goal: Omit<Goal, "id">): Promise<Goal> {
    const created: Goal = { ...structuredClone(goal), id: `g${++this.seq}` };
    this.goals.push(created);
    return structuredClone(created);
  }

  // Scalar fields only; monthly + log are preserved.
  async updateGoal(goal: Goal): Promise<Goal> {
    const g = this.goals.find((x) => x.id === goal.id);
    if (!g) throw new Error(`Goal not found: ${goal.id}`);
    g.parent = goal.parent;
    g.level = goal.level;
    g.dept = goal.dept;
    g.titleEn = goal.titleEn;
    g.titleJa = goal.titleJa;
    g.owner = goal.owner;
    g.av = goal.av;
    g.status = goal.status;
    return structuredClone(g);
  }

  async upsertMonthly(goalId: string, entry: MonthlyEntry): Promise<void> {
    const g = this.goals.find((x) => x.id === goalId);
    if (!g) throw new Error(`Goal not found: ${goalId}`);
    const i = g.monthly.findIndex((m) => m.month === entry.month);
    if (i === -1) g.monthly.push({ ...entry });
    else g.monthly[i] = { ...entry };
  }

  async addChange(goalId: string, change: ChangeEntry): Promise<void> {
    const g = this.goals.find((x) => x.id === goalId);
    if (!g) throw new Error(`Goal not found: ${goalId}`);
    g.log.unshift({ ...change });
  }

  async deleteGoal(id: string): Promise<void> {
    this.goals = this.goals.filter((g) => g.id !== id);
  }
}
