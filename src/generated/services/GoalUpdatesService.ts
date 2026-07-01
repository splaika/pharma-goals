// ⚠️ PLACEHOLDER — replaced by `pac code add-data-source` for the GoalUpdates table.
import type { GoalUpdates } from "../models/GoalUpdatesModel";
import {
  IGetAllOptions,
  IServiceResult,
  IServiceListResult,
  NOT_GENERATED,
} from "./_types";

export const GoalUpdatesService = {
  async getAll(_options?: IGetAllOptions): Promise<IServiceListResult<GoalUpdates>> {
    throw new Error(NOT_GENERATED);
  },
  async get(_id: string): Promise<IServiceResult<GoalUpdates>> {
    throw new Error(NOT_GENERATED);
  },
  async create(_record: Omit<GoalUpdates, "sto_goalupdateid">): Promise<IServiceResult<GoalUpdates>> {
    throw new Error(NOT_GENERATED);
  },
  async update(_id: string, _changes: Partial<GoalUpdates>): Promise<IServiceResult<GoalUpdates>> {
    throw new Error(NOT_GENERATED);
  },
  async delete(_id: string): Promise<void> {
    throw new Error(NOT_GENERATED);
  },
};
