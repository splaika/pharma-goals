// ⚠️ PLACEHOLDER types mirroring the shapes produced by the Power Apps
// code apps client library. Regenerated files supersede this.

export interface IGetAllOptions {
  maxPageSize?: number;
  select?: string[];
  filter?: string;
  orderBy?: string[];
  top?: number;
  skip?: number;
  skipToken?: string;
}

export interface IServiceResult<T> {
  data?: T;
}

export interface IServiceListResult<T> {
  data?: T[];
}

export const NOT_GENERATED =
  "Dataverse services are not generated yet. Run `pac code add-data-source -a dataverse -t <table>` for each table, then set VITE_USE_DATAVERSE=true.";
