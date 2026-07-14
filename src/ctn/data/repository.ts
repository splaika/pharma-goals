// ============================================================================
// データアクセス契約（mock <-> Dataverse 差し替え可能）
// ----------------------------------------------------------------------------
// コンポーネントはこのインターフェースのみに依存する。VITE_USE_DATAVERSE で実装切替。
// 書き込みは監査ログを自動付随させる（本番のプラットフォーム監査に相当）。
// ============================================================================
import type {
  AuditEntry,
  Compound,
  Doctor,
  GaijiRecord,
  Institution,
  Irb,
  Notification,
  SiteStaff,
  Sponsor,
} from "../types";

/** アプリが保持する全データのスナップショット */
export interface CtnDb {
  compounds: Compound[];
  notifications: Notification[];
  institutions: Institution[];
  doctors: Doctor[];
  siteStaff: SiteStaff[];
  irbs: Irb[];
  sponsors: Sponsor[];
  gaiji: GaijiRecord[];
  audit: AuditEntry[];
}

export interface CreateNotificationInput {
  compoundId: string;
  notifType: Notification["notifType"];
  createdBy: string;
  /** 変更/終了/中止/開発中止で、直近の届からの継承元 */
  inheritFromNotificationId?: string;
}

export interface CtnRepository {
  getState(): Promise<CtnDb>;

  // ---- マスタ（登録・追加・変更・論理削除／復活） ----
  createInstitution(rec: Omit<Institution, "id">, actor: string): Promise<Institution>;
  updateInstitution(rec: Institution, actor: string): Promise<Institution>;
  setInstitutionActive(id: string, active: boolean, actor: string): Promise<void>;

  createDoctor(rec: Omit<Doctor, "id">, actor: string): Promise<Doctor>;
  updateDoctor(rec: Doctor, actor: string): Promise<Doctor>;
  setDoctorActive(id: string, active: boolean, actor: string): Promise<void>;

  createIrb(rec: Omit<Irb, "id">, actor: string): Promise<Irb>;
  updateIrb(rec: Irb, actor: string): Promise<Irb>;
  setIrbActive(id: string, active: boolean, actor: string): Promise<void>;

  createSponsor(rec: Omit<Sponsor, "id">, actor: string): Promise<Sponsor>;
  updateSponsor(rec: Sponsor, actor: string): Promise<Sponsor>;
  setSponsorActive(id: string, active: boolean, actor: string): Promise<void>;

  createSiteStaff(rec: Omit<SiteStaff, "id">, actor: string): Promise<SiteStaff>;
  updateSiteStaff(rec: SiteStaff, actor: string): Promise<SiteStaff>;
  setSiteStaffActive(id: string, active: boolean, actor: string): Promise<void>;

  // ---- シリーズ（治験成分） ----
  createCompound(rec: Omit<Compound, "id" | "createdAt">, actor: string): Promise<Compound>;

  // ---- 治験届 ----
  createNotification(input: CreateNotificationInput): Promise<Notification>;
  updateNotification(n: Notification, actor: string): Promise<Notification>;
  deleteNotification(id: string, actor: string): Promise<void>;
  /** 社内レビューへ */
  sendForReview(id: string, actor: string): Promise<void>;
  /** 承認（起票者≠承認者を強制） */
  approveNotification(id: string, approverUserId: string): Promise<void>;
  /** 提出（承認済ゲート）。順序番号確定・開発状態更新・保留クリアを伴う */
  submitNotification(id: string, actor: string): Promise<void>;
  /** XML生成（生成日時記録） */
  markXmlGenerated(id: string, actor: string): Promise<void>;

  // ---- 外字確認履歴 ----
  addGaijiRecord(rec: Omit<GaijiRecord, "id">): Promise<void>;

  // ---- 監査（読み取り用に addState と共に返す） ----
  addAudit(entry: Omit<AuditEntry, "id" | "at">, actor: string): Promise<void>;
}

let _repo: CtnRepository | null = null;

// mockRepository.ts は repository.ts から「型のみ」を import するため実行時の循環は無い。
// eslint-disable-next-line import/first
import { MockCtnRepository } from "./mockRepository";
import { DataverseCtnRepository } from "./dataverseRepository";

/** VITE_USE_DATAVERSE=true で Dataverse 実装へ。既定はメモリ内 mock。 */
export function getRepository(): CtnRepository {
  if (_repo) return _repo;
  const useDataverse = import.meta.env.VITE_USE_DATAVERSE === "true";
  _repo = useDataverse ? new DataverseCtnRepository() : new MockCtnRepository();
  return _repo;
}
