// ============================================================================
// メモリ内リポジトリ（シード）。リロードで初期状態に戻る＝デモに最適。
// サーバー正本ロジック（採番確定・職務分離・提出ゲート・開発状態更新・監査）を
// この層で強制する（ハンドオフ第2節：確定はサーバー側）。
// ============================================================================
import { normalizeGaiji } from "../logic";
import {
  DEV_STATUS,
  NOTIF_TYPE_SHORT,
  TODAY,
  userById,
} from "../refData";
import {
  canApprove,
  canSubmit,
  nextInvestigatorSerial,
  nextStudyDrugSerial,
  seriesStudyDrugSerials,
} from "../logic";
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
import type { CreateNotificationInput, CtnDb, CtnRepository } from "./repository";
import { makeSeedDb } from "./seed";

const clone = <T,>(v: T): T => structuredClone(v);

export class MockCtnRepository implements CtnRepository {
  private db: CtnDb = makeSeedDb();
  private seq = 1000;
  private nid() {
    return `x${++this.seq}`;
  }
  private nowIso() {
    return `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;
  }
  private actorName(actorId: string): string {
    return userById(actorId)?.name ?? actorId;
  }

  async getState(): Promise<CtnDb> {
    return clone(this.db);
  }

  private pushAudit(a: Omit<AuditEntry, "id" | "at">) {
    this.db.audit.unshift({ ...a, id: this.nid(), at: this.nowIso() });
  }
  async addAudit(entry: Omit<AuditEntry, "id" | "at">, _actor: string): Promise<void> {
    void _actor;
    this.pushAudit(entry);
  }

  // ---- 汎用マスタCRUD ヘルパ ----
  private createIn<T extends { id: string }>(list: T[], rec: Omit<T, "id">, prefix: string): T {
    const created = { ...(rec as object), id: `${prefix}-${this.nid()}` } as T;
    list.push(created);
    return clone(created);
  }
  private updateIn<T extends { id: string }>(list: T[], rec: T): T {
    const i = list.findIndex((x) => x.id === rec.id);
    if (i === -1) throw new Error(`Not found: ${rec.id}`);
    list[i] = { ...rec };
    return clone(list[i]);
  }
  private setActiveIn<T extends { id: string; active?: boolean }>(list: T[], id: string, active: boolean) {
    const r = list.find((x) => x.id === id);
    if (!r) throw new Error(`Not found: ${id}`);
    (r as { active: boolean }).active = active;
  }

  // ---- 医療機関マスタ ----
  async createInstitution(rec: Omit<Institution, "id">, actor: string) {
    const r = this.createIn(this.db.institutions, rec, "inst");
    this.pushAudit({ who: this.actorName(actor), action: "create", entity: "医療機関マスタ", entityRef: r.name, summary: `機関「${r.name}」を登録` });
    return r;
  }
  async updateInstitution(rec: Institution, actor: string) {
    const r = this.updateIn(this.db.institutions, rec);
    this.pushAudit({ who: this.actorName(actor), action: "update", entity: "医療機関マスタ", entityRef: r.name, summary: `機関「${r.name}」を更新` });
    return r;
  }
  async setInstitutionActive(id: string, active: boolean, actor: string) {
    this.setActiveIn(this.db.institutions, id, active);
    const r = this.db.institutions.find((x) => x.id === id)!;
    this.pushAudit({ who: this.actorName(actor), action: active ? "restore" : "delete", entity: "医療機関マスタ", entityRef: r.name, summary: `機関「${r.name}」を${active ? "有効化" : "論理削除（無効化）"}` });
  }

  // ---- 医師マスタ ----
  async createDoctor(rec: Omit<Doctor, "id">, actor: string) {
    // 届出用表記が空なら外字正規化で補完
    const filled = { ...rec, nameFiling: rec.nameFiling || normalizeGaiji(rec.nameOriginal) };
    const r = this.createIn(this.db.doctors, filled, "doc");
    this.pushAudit({ who: this.actorName(actor), action: "create", entity: "医師マスタ", entityRef: r.nameFiling, summary: `医師「${r.nameOriginal}」を登録${r.hasGaiji ? "（外字あり）" : ""}` });
    return r;
  }
  async updateDoctor(rec: Doctor, actor: string) {
    const r = this.updateIn(this.db.doctors, rec);
    this.pushAudit({ who: this.actorName(actor), action: "update", entity: "医師マスタ", entityRef: r.nameFiling, summary: `医師「${r.nameOriginal}」を更新（改名は同一行更新）` });
    return r;
  }
  async setDoctorActive(id: string, active: boolean, actor: string) {
    this.setActiveIn(this.db.doctors, id, active);
    const r = this.db.doctors.find((x) => x.id === id)!;
    this.pushAudit({ who: this.actorName(actor), action: active ? "restore" : "delete", entity: "医師マスタ", entityRef: r.nameFiling, summary: `医師「${r.nameFiling}」を${active ? "有効化" : "論理削除"}` });
  }

  // ---- IRBマスタ ----
  async createIrb(rec: Omit<Irb, "id">, actor: string) {
    const r = this.createIn(this.db.irbs, rec, "irb");
    this.pushAudit({ who: this.actorName(actor), action: "create", entity: "IRBマスタ", entityRef: r.ownerName, summary: `IRB「${r.ownerName}」を登録` });
    return r;
  }
  async updateIrb(rec: Irb, actor: string) {
    const r = this.updateIn(this.db.irbs, rec);
    this.pushAudit({ who: this.actorName(actor), action: "update", entity: "IRBマスタ", entityRef: r.ownerName, summary: `IRB「${r.ownerName}」を更新` });
    return r;
  }
  async setIrbActive(id: string, active: boolean, actor: string) {
    this.setActiveIn(this.db.irbs, id, active);
    const r = this.db.irbs.find((x) => x.id === id)!;
    this.pushAudit({ who: this.actorName(actor), action: active ? "restore" : "delete", entity: "IRBマスタ", entityRef: r.ownerName, summary: `IRB「${r.ownerName}」を${active ? "有効化" : "論理削除"}` });
  }

  // ---- 治験届出者マスタ ----
  async createSponsor(rec: Omit<Sponsor, "id">, actor: string) {
    const r = this.createIn(this.db.sponsors, rec, "sp");
    this.pushAudit({ who: this.actorName(actor), action: "create", entity: "治験届出者", entityRef: r.name, summary: `届出者「${r.name}」を登録` });
    return r;
  }
  async updateSponsor(rec: Sponsor, actor: string) {
    const r = this.updateIn(this.db.sponsors, rec);
    this.pushAudit({ who: this.actorName(actor), action: "update", entity: "治験届出者", entityRef: r.name, summary: `届出者「${r.name}」を更新` });
    return r;
  }
  async setSponsorActive(id: string, active: boolean, actor: string) {
    this.setActiveIn(this.db.sponsors, id, active);
    const r = this.db.sponsors.find((x) => x.id === id)!;
    this.pushAudit({ who: this.actorName(actor), action: active ? "restore" : "delete", entity: "治験届出者", entityRef: r.name, summary: `届出者「${r.name}」を${active ? "有効化" : "論理削除"}` });
  }

  // ---- 現場担当（CRC等） ----
  async createSiteStaff(rec: Omit<SiteStaff, "id">, actor: string) {
    const r = this.createIn(this.db.siteStaff, rec, "crc");
    this.pushAudit({ who: this.actorName(actor), action: "create", entity: "現場担当", entityRef: r.name, summary: `${r.role}「${r.name}」を登録` });
    return r;
  }
  async updateSiteStaff(rec: SiteStaff, actor: string) {
    const r = this.updateIn(this.db.siteStaff, rec);
    this.pushAudit({ who: this.actorName(actor), action: "update", entity: "現場担当", entityRef: r.name, summary: `${r.role}「${r.name}」を更新` });
    return r;
  }
  async setSiteStaffActive(id: string, active: boolean, actor: string) {
    this.setActiveIn(this.db.siteStaff, id, active);
    const r = this.db.siteStaff.find((x) => x.id === id)!;
    this.pushAudit({ who: this.actorName(actor), action: active ? "restore" : "delete", entity: "現場担当", entityRef: r.name, summary: `${r.role}「${r.name}」を${active ? "有効化" : "論理削除"}` });
  }

  // ---- シリーズ（治験成分） ----
  async createCompound(rec: Omit<Compound, "id" | "createdAt">, actor: string) {
    const created: Compound = { ...rec, id: `cmp-${this.nid()}`, createdAt: TODAY };
    this.db.compounds.push(created);
    this.pushAudit({ who: this.actorName(actor), action: "create", entity: "治験成分", entityRef: created.compoundCode, summary: `シリーズ「${created.compoundCode}」を作成` });
    return clone(created);
  }

  // ---- 治験届 ----
  private seriesNotifs(compoundId: string): Notification[] {
    return this.db.notifications.filter((n) => n.compoundId === compoundId);
  }

  /** 未採番（serialNo<=0）の順序番号を確定する（サーバー正本） */
  private finalizeSerials(n: Notification) {
    // 実施医療機関の順序番号（SERIALNO1・届内）をサーバーで確定（クライアント採番を信頼しない）
    let maxSite = Math.max(0, ...n.sites.map((s) => (s.serialNo > 0 ? s.serialNo : 0)));
    for (const s of n.sites) if (s.serialNo <= 0) s.serialNo = ++maxSite;

    const series = this.seriesNotifs(n.compoundId).filter((x) => x.id !== n.id);
    const known = new Set(seriesStudyDrugSerials(series));
    for (const d of n.studyDrugs) known.add(d.serialNo > 0 ? d.serialNo : -1);
    for (const d of n.studyDrugs) {
      if (d.serialNo <= 0) {
        const next = nextStudyDrugSerial([...known].filter((s) => s > 0));
        d.serialNo = next;
        known.add(next);
      }
    }
    // 施設別数量は治験使用薬の順序番号を継承
    for (const s of n.sites)
      for (const q of s.quantities) {
        const drug = n.studyDrugs.find((d) => d.id === q.studyDrugId);
        if (drug) q.serialNo = drug.serialNo;
      }
    // 医師イベント行：届内で採番
    for (const s of n.sites)
      for (const inv of s.investigators)
        if (inv.serialNo <= 0) inv.serialNo = nextInvestigatorSerial(n);
  }

  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const series = this.seriesNotifs(input.compoundId);
    const compound = this.db.compounds.find((c) => c.id === input.compoundId)!;
    const filingCount = series.length ? Math.max(...series.map((n) => n.filingCount)) + 1 : 1;
    const changeCount =
      input.notifType === "change"
        ? Math.max(0, ...series.filter((n) => n.notifType === "change").map((n) => n.changeCount ?? 0)) + 1
        : undefined;

    const base: Notification = {
      id: `nt-${this.nid()}`,
      compoundId: input.compoundId,
      notifType: input.notifType,
      filingCount,
      changeCount,
      status: "draft",
      changeLocations: [],
      protocolNo: "",
      objectives: "",
      targetDisease: "",
      isGlobal: false,
      sponsorId: compound.sponsorId,
      studyDrugs: [],
      sites: [],
      attachments: [],
      references: [],
      inquiries: [],
      createdBy: input.createdBy,
      createdAt: TODAY,
    };

    // 直近の届からの継承（転記の排除）
    const from = input.inheritFromNotificationId
      ? this.db.notifications.find((n) => n.id === input.inheritFromNotificationId)
      : [...series].sort((a, b) => b.filingCount - a.filingCount)[0];
    if (from) {
      base.studyDrugs = clone(from.studyDrugs); // 順序番号（突合キー）ごと引き継ぐ
      base.protocolNo = from.protocolNo;
      base.phase = from.phase;
      base.trialType = from.trialType;
      base.objectives = from.objectives;
      base.targetDisease = from.targetDisease;
      base.plannedSubjDrug = from.plannedSubjDrug;
      base.plannedSubjTotal = from.plannedSubjTotal;
      base.periodStart = from.periodStart;
      base.periodEnd = from.periodEnd;
      base.plannedStartDate = from.plannedStartDate;
      // 施設・医師ロスターを継続として引き継ぐ（イベント行は新規届で編集）
      base.sites = from.sites.map((s) => ({
        ...clone(s),
        id: `site-${this.nid()}`,
        enrolledSubjects: undefined,
        investigators: s.investigators
          .filter((iv) => iv.changeType !== 100001002) // 前届で削除済みは持ち越さない
          // イベント行型：新しい届では順序番号を採番し直す（serialNo=0 → finalizeSerials で確定）
          .map((iv) => ({ ...clone(iv), id: `inv-${this.nid()}`, serialNo: 0, changeType: 100001003, changeDate: undefined, changeReason: undefined })),
        quantities: s.quantities.map((q) => ({ ...clone(q), qtySupplied: undefined, qtyUsed: undefined, qtyWithdrawn: undefined, qtyAbrogated: undefined })),
      }));
    }

    this.db.notifications.push(base);
    this.pushAudit({ who: this.actorName(input.createdBy), action: "create", entity: "治験届", entityRef: `${compound.compoundCode} ${NOTIF_TYPE_SHORT[input.notifType]}届 #${filingCount}`, summary: `${NOTIF_TYPE_SHORT[input.notifType]}届を起票（届出回数 ${filingCount}${changeCount ? `・変更回数 ${changeCount}` : ""}）` });
    return clone(base);
  }

  async updateNotification(n: Notification, actor: string): Promise<Notification> {
    const i = this.db.notifications.findIndex((x) => x.id === n.id);
    if (i === -1) throw new Error(`Not found: ${n.id}`);
    const saved = clone(n);
    this.finalizeSerials(saved);
    this.db.notifications[i] = saved;
    const compound = this.db.compounds.find((c) => c.id === saved.compoundId)!;
    this.pushAudit({ who: this.actorName(actor), action: "update", entity: "治験届", entityRef: `${compound.compoundCode} ${NOTIF_TYPE_SHORT[saved.notifType]}届 #${saved.filingCount}`, summary: "内容を保存" });
    return clone(saved);
  }

  async deleteNotification(id: string, actor: string): Promise<void> {
    const n = this.db.notifications.find((x) => x.id === id);
    if (!n) throw new Error(`Not found: ${id}`);
    if (n.status !== "draft") throw new Error("提出済・承認済の届は削除できません（起票中のみ削除可）。");
    this.db.notifications = this.db.notifications.filter((x) => x.id !== id);
    const compound = this.db.compounds.find((c) => c.id === n.compoundId);
    this.pushAudit({ who: this.actorName(actor), action: "delete", entity: "治験届", entityRef: `${compound?.compoundCode ?? ""} ${NOTIF_TYPE_SHORT[n.notifType]}届`, summary: "起票中の届を削除" });
  }

  async sendForReview(id: string, actor: string): Promise<void> {
    const n = this.db.notifications.find((x) => x.id === id);
    if (!n) throw new Error(`Not found: ${id}`);
    n.status = "review";
    this.pushAudit({ who: this.actorName(actor), action: "update", entity: "治験届", entityRef: this.ref(n), summary: "社内レビューへ送付" });
  }

  async approveNotification(id: string, approverUserId: string): Promise<void> {
    const n = this.db.notifications.find((x) => x.id === id);
    if (!n) throw new Error(`Not found: ${id}`);
    const check = canApprove(n, approverUserId); // 職務分離：起票者≠承認者
    if (!check.ok) throw new Error(check.reason);
    n.status = "approved";
    n.approvedBy = approverUserId;
    n.approvedAt = TODAY;
    this.pushAudit({ who: this.actorName(approverUserId), action: "approve", entity: "治験届", entityRef: this.ref(n), summary: "承認（職務分離チェック通過）" });
  }

  async submitNotification(id: string, actor: string): Promise<void> {
    const n = this.db.notifications.find((x) => x.id === id);
    if (!n) throw new Error(`Not found: ${id}`);
    const gate = canSubmit(n); // 提出ゲート：承認済のみ
    if (!gate.ok) throw new Error(gate.reason);
    this.finalizeSerials(n);
    n.status = "submitted";
    n.submittedAt = TODAY;
    n.noteDate = n.noteDate || TODAY;
    // 開発中止届の提出でシリーズ開発状態を更新
    if (n.notifType === "devDiscontinuation") {
      const c = this.db.compounds.find((x) => x.id === n.compoundId);
      if (c) c.devStatus = DEV_STATUS.discontinued;
    }
    this.pushAudit({ who: this.actorName(actor), action: "submit", entity: "治験届", entityRef: this.ref(n), summary: `提出（順序番号確定${n.notifType === "devDiscontinuation" ? "・開発状態を開発中止へ" : ""}）` });
  }

  async markXmlGenerated(id: string, actor: string): Promise<void> {
    const n = this.db.notifications.find((x) => x.id === id);
    if (!n) throw new Error(`Not found: ${id}`);
    n.xmlGeneratedAt = this.nowIso();
    this.pushAudit({ who: this.actorName(actor), action: "generate-xml", entity: "治験届", entityRef: this.ref(n), summary: "CTN XMLを生成・XSD（デモサブセット）検証" });
  }

  async addGaijiRecord(rec: Omit<GaijiRecord, "id">): Promise<void> {
    this.db.gaiji.unshift({ ...rec, id: this.nid() });
    const d = this.db.doctors.find((x) => x.id === rec.doctorId);
    if (d) d.hasGaiji = true;
  }

  private ref(n: Notification): string {
    const compound = this.db.compounds.find((c) => c.id === n.compoundId);
    return `${compound?.compoundCode ?? ""} ${NOTIF_TYPE_SHORT[n.notifType]}届 #${n.filingCount}`;
  }
}
