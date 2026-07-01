// ⚠️ PLACEHOLDER — replaced by `pac code add-data-source` for the Goals table.
import type { Goals } from "../models/GoalsModel";
import {
  IGetAllOptions,
  IServiceResult,
  IServiceListResult,
  NOT_GENERATED,
} from "./_types";

export const GoalsService = {
  async getAll(_options?: IGetAllOptions): Promise<IServiceListResult<Goals>> {
    throw new Error(NOT_GENERATED);
  },
  async get(_id: string): Promise<IServiceResult<Goals>> {
    throw new Error(NOT_GENERATED);
  },
  async create(_record: Omit<Goals, "sto_goalid">): Promise<IServiceResult<Goals>> {
    throw new Error(NOT_GENERATED);
  },
  async update(_id: string, _changes: Partial<Goals>): Promise<IServiceResult<Goals>> {
    throw new Error(NOT_GENERATED);
  },
  async delete(_id: string): Promise<void> {
    throw new Error(NOT_GENERATED);
  },
};
