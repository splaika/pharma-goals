// ⚠️ PLACEHOLDER — replaced by `pac code add-data-source` for the GoalChanges table.
import type { GoalChanges } from "../models/GoalChangesModel";
import {
  IGetAllOptions,
  IServiceResult,
  IServiceListResult,
  NOT_GENERATED,
} from "./_types";

export const GoalChangesService = {
  async getAll(_options?: IGetAllOptions): Promise<IServiceListResult<GoalChanges>> {
    throw new Error(NOT_GENERATED);
  },
  async get(_id: string): Promise<IServiceResult<GoalChanges>> {
    throw new Error(NOT_GENERATED);
  },
  async create(_record: Omit<GoalChanges, "sto_goalchangeid">): Promise<IServiceResult<GoalChanges>> {
    throw new Error(NOT_GENERATED);
  },
  async update(_id: string, _changes: Partial<GoalChanges>): Promise<IServiceResult<GoalChanges>> {
    throw new Error(NOT_GENERATED);
  },
  async delete(_id: string): Promise<void> {
    throw new Error(NOT_GENERATED);
  },
};
