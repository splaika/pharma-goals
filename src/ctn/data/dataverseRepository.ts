// ============================================================================
// Dataverse リポジトリ（プレースホルダ）
// ----------------------------------------------------------------------------
// 本番は Power Platform（Dataverse＋プラグイン）。ここは差し替えポイントの雛形。
// `pac code add-data-source -a dataverse -t cr_notification` 等でテーブルを追加し、
// 生成された型付きサービス経由の読み書きに置き換える。UIコードは変更不要。
// ============================================================================
import type {
  Compound,
  Doctor,
  GaijiRecord,
  Institution,
  Irb,
  Notification,
  SiteStaff,
  Sponsor,
  AuditEntry,
} from "../types";
import type { CreateNotificationInput, CtnDb, CtnRepository } from "./repository";

const NOT_CONFIGURED =
  "Dataverse モード未構成：`pac code add-data-source` でCTNテーブルを追加し、DataverseCtnRepository を実装してください。";

export class DataverseCtnRepository implements CtnRepository {
  private fail(): never {
    throw new Error(NOT_CONFIGURED);
  }
  async getState(): Promise<CtnDb> {
    this.fail();
  }
  async createInstitution(_r: Omit<Institution, "id">, _a: string): Promise<Institution> {
    this.fail();
  }
  async updateInstitution(_r: Institution, _a: string): Promise<Institution> {
    this.fail();
  }
  async setInstitutionActive(): Promise<void> {
    this.fail();
  }
  async createDoctor(_r: Omit<Doctor, "id">, _a: string): Promise<Doctor> {
    this.fail();
  }
  async updateDoctor(_r: Doctor, _a: string): Promise<Doctor> {
    this.fail();
  }
  async setDoctorActive(): Promise<void> {
    this.fail();
  }
  async createIrb(_r: Omit<Irb, "id">, _a: string): Promise<Irb> {
    this.fail();
  }
  async updateIrb(_r: Irb, _a: string): Promise<Irb> {
    this.fail();
  }
  async setIrbActive(): Promise<void> {
    this.fail();
  }
  async createSponsor(_r: Omit<Sponsor, "id">, _a: string): Promise<Sponsor> {
    this.fail();
  }
  async updateSponsor(_r: Sponsor, _a: string): Promise<Sponsor> {
    this.fail();
  }
  async setSponsorActive(): Promise<void> {
    this.fail();
  }
  async createSiteStaff(_r: Omit<SiteStaff, "id">, _a: string): Promise<SiteStaff> {
    this.fail();
  }
  async updateSiteStaff(_r: SiteStaff, _a: string): Promise<SiteStaff> {
    this.fail();
  }
  async setSiteStaffActive(): Promise<void> {
    this.fail();
  }
  async createCompound(_r: Omit<Compound, "id" | "createdAt">, _a: string): Promise<Compound> {
    this.fail();
  }
  async createNotification(_i: CreateNotificationInput): Promise<Notification> {
    this.fail();
  }
  async updateNotification(_n: Notification, _a: string): Promise<Notification> {
    this.fail();
  }
  async deleteNotification(): Promise<void> {
    this.fail();
  }
  async sendForReview(): Promise<void> {
    this.fail();
  }
  async approveNotification(): Promise<void> {
    this.fail();
  }
  async submitNotification(): Promise<void> {
    this.fail();
  }
  async markXmlGenerated(): Promise<void> {
    this.fail();
  }
  async addGaijiRecord(_r: Omit<GaijiRecord, "id">): Promise<void> {
    this.fail();
  }
  async addAudit(_e: Omit<AuditEntry, "id" | "at">, _a: string): Promise<void> {
    this.fail();
  }
}
