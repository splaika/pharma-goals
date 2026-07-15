// ============================================================================
// サーバー正本ロジックの自動テスト
// ハンドオフ第5節：採番2類型・区分推奨・外字・職務分離・提出ゲート・XML生成は必須。
// ============================================================================
import { describe, it, expect } from "vitest";
import { MockCtnRepository } from "./data/mockRepository";
import {
  is30DayReview,
  computeDeadline,
  recommendKubun,
  nextStudyDrugSerial,
  nextInvestigatorSerial,
  validateCompoundCode,
  detectGaiji,
  normalizeGaiji,
  checkByteLimit,
  BYTE_RULES,
  canApprove,
  canSubmit,
  diffRoster,
} from "./logic";
import { generateCtnXml, validateAgainstSubset, type XmlContext } from "./xml";
import { deriveAlerts, hasSubInvestigatorMovement } from "./derive";
import { KUBUN, DRUG_ROLE, DOCTOR_ROLE, CHANGE_TYPE } from "./refData";
import { makeSeedDb } from "./data/seed";
import type { Notification } from "./types";

const db = makeSeedDb();
const byId = (id: string) => db.notifications.find((n) => n.id === id)!;

describe("30日調査対象の判定 (S1)", () => {
  it("計画届∧届出回数1 → 真", () => {
    expect(is30DayReview({ notifType: "plan", filingCount: 1 })).toBe(true);
  });
  it("計画届∧届出回数2 → 偽", () => {
    expect(is30DayReview({ notifType: "plan", filingCount: 2 })).toBe(false);
  });
  it("変更届∧区分1 → 真 / 区分3 → 偽", () => {
    expect(is30DayReview({ notifType: "change", filingCount: 2, kubun: KUBUN.k1 })).toBe(true);
    expect(is30DayReview({ notifType: "change", filingCount: 2, kubun: KUBUN.k3 })).toBe(false);
  });
  it("中止・終了・開発中止 → 偽", () => {
    expect(is30DayReview({ notifType: "termination", filingCount: 3 })).toBe(false);
    expect(is30DayReview({ notifType: "completion", filingCount: 3 })).toBe(false);
  });
});

describe("提出期限の算定 (S2)", () => {
  it("初回計画届（30日調査対象）は開始予定日 −30日", () => {
    expect(computeDeadline({ notifType: "plan", filingCount: 1, changeLocations: [], plannedStartDate: "2026-05-01" })).toBe("2026-04-01");
  });
  it("N回届（新規プロトコール）は開始予定日 −14日", () => {
    expect(computeDeadline({ notifType: "plan", filingCount: 2, changeLocations: [], plannedStartDate: "2026-05-01" })).toBe("2026-04-17");
  });
  it("変更届：目的の変更＝『変更前』→ 変更（予定）日まで", () => {
    expect(computeDeadline({ notifType: "change", filingCount: 1, changeLocations: [100000800], plannedStartDate: "2026-05-01" })).toBe("2026-05-01");
  });
  it("変更届：CROの変更＝『変更後6ヶ月以内』", () => {
    expect(computeDeadline({ notifType: "change", filingCount: 1, changeLocations: [100000805], plannedStartDate: "2026-05-01" })).toBe("2026-10-30");
  });
  it("変更届：分担医師のみ＝『変更後1年以内』", () => {
    expect(computeDeadline({ notifType: "change", filingCount: 1, changeLocations: [100000804], plannedStartDate: "2026-05-01" })).toBe("2027-05-01");
  });
  it("中止/終了/開発中止は対象外", () => {
    expect(computeDeadline({ notifType: "termination", filingCount: 1, changeLocations: [], plannedStartDate: "2026-05-01" })).toBeUndefined();
  });
});

describe("届出区分の推奨 (S3)", () => {
  it("初回計画届 → 区分1（30日調査対象）", () => {
    expect(recommendKubun({ notifType: "plan", filingCount: 1, changeLocations: [] }).value).toBe(KUBUN.k1);
  });
  it("変更届：最も重い区分を採用（被験薬の追加=1 が分担医師=3 に優先）", () => {
    const s = recommendKubun({ notifType: "change", filingCount: 2, changeLocations: [100000804, 100000802] });
    expect(s.value).toBe(KUBUN.k1);
  });
  it("変更届：分担医師の追加・削除のみ → 区分3", () => {
    expect(recommendKubun({ notifType: "change", filingCount: 2, changeLocations: [100000804] }).value).toBe(KUBUN.k3);
  });
});

describe("順序番号採番 — 突合キー型 (S4)", () => {
  it("最大値+1、欠番でも再利用しない", () => {
    expect(nextStudyDrugSerial([])).toBe(1);
    expect(nextStudyDrugSerial([1, 2])).toBe(3);
    expect(nextStudyDrugSerial([1, 3])).toBe(4); // #2欠番でも4（再付番禁止）
  });
  it("計画届と終了届で主たる被験薬の順序番号が一致（不変性）", () => {
    const plan = byId("nt-abc-1").studyDrugs.find((d) => d.drugRole === DRUG_ROLE.main)!;
    const comp = byId("nt-abc-3").studyDrugs.find((d) => d.drugRole === DRUG_ROLE.main)!;
    expect(plan.serialNo).toBe(comp.serialNo);
    expect(plan.serialNo).toBe(1);
  });
});

describe("順序番号採番 — イベント行型 (S5)", () => {
  it("届内・イベント単位で採番（突合キー型と分離）", () => {
    const n = byId("nt-abc-1");
    expect(nextInvestigatorSerial(n)).toBe(6); // seed は #1..#5
  });
  it("同一人物でも追加/削除で別番号を許容", () => {
    const change = byId("nt-abc-2");
    const serials = change.sites.flatMap((s) => s.investigators.map((i) => i.serialNo));
    expect(new Set(serials).size).toBe(serials.length); // 届内で一意
  });
});

describe("治験成分記号の検証 (S6)", () => {
  it("正常：ABC-123", () => expect(validateCompoundCode("ABC-123").ok).toBe(true));
  it("「&」禁則", () => expect(validateCompoundCode("ABC&123").ok).toBe(false));
  it("20桁超", () => expect(validateCompoundCode("A".repeat(21)).ok).toBe(false));
  it("全角混じり", () => expect(validateCompoundCode("ＡＢＣ123").ok).toBe(false));
  it("スペースは警告（別記号判定）", () => expect(validateCompoundCode("ABC 123").warnings.length).toBeGreaterThan(0));
});

describe("外字検出・正規化 (S7)", () => {
  it("髙・﨑 を検出し代替字を提案", () => {
    const hits = detectGaiji("髙島 山﨑");
    expect(hits.map((h) => h.char)).toEqual(["髙", "﨑"]);
    expect(hits[0].replacement).toBe("高");
    expect(hits[1].replacement).toBe("崎");
  });
  it("正規化で届出用表記へ置換", () => {
    expect(normalizeGaiji("髙島 幸雄")).toBe("高島 幸雄");
    expect(normalizeGaiji("德永 明")).toBe("徳永 明");
  });
  it("外字なしは空", () => expect(detectGaiji("佐藤 誠一")).toEqual([]));
});

describe("バイト数検証 (S8)", () => {
  it("よみかな 100バイト上限", () => {
    expect(checkByteLimit("あ".repeat(50), BYTE_RULES.pronounce).ok).toBe(true); // 100
    expect(checkByteLimit("あ".repeat(51), BYTE_RULES.pronounce).ok).toBe(false); // 102
  });
});

describe("職務分離 (S10) / 提出ゲート (S11)", () => {
  it("起票者は自分の届を承認できない", () => {
    expect(canApprove({ createdBy: "u-a" }, "u-a").ok).toBe(false);
    expect(canApprove({ createdBy: "u-a" }, "u-c").ok).toBe(true);
  });
  it("承認済でなければ提出不可", () => {
    expect(canSubmit({ status: "review" }).ok).toBe(false);
    expect(canSubmit({ status: "approved" }).ok).toBe(true);
  });
});

describe("医師ロスター差分 → イベント行", () => {
  it("追加・削除・役割変更を検出", () => {
    const prev = [{ doctorId: "d1", doctorRole: DOCTOR_ROLE.responsible }, { doctorId: "d2", doctorRole: DOCTOR_ROLE.sub }];
    const next = [{ doctorId: "d1", doctorRole: DOCTOR_ROLE.responsible }, { doctorId: "d3", doctorRole: DOCTOR_ROLE.sub }];
    const diff = diffRoster(prev, next);
    expect(diff.additions.map((m) => m.doctorId)).toEqual(["d3"]);
    expect(diff.removals.map((m) => m.doctorId)).toEqual(["d2"]);
  });
});

describe("XML生成・XSD検証 (S15) — 分岐ルール", () => {
  const ctx = (): XmlContext => ({
    compound: db.compounds.find((c) => c.id === "cmp-abc")!,
    sponsor: db.sponsors.find((s) => s.id === "sp-1")!,
    institutions: new Map(db.institutions.map((i) => [i.id, i])),
    irbs: new Map(db.irbs.map((i) => [i.id, i])),
  });

  it("主たる被験薬→ルート直下 / その他→INFOCOMBINATION", () => {
    const xml = generateCtnXml(byId("nt-abc-1"), ctx());
    expect(xml).toContain("<MAININVESTPRODUCT");
    expect(xml).toContain("<INFOCOMBINATION");
  });
  it("責任→INFOINVESTIGATOR / 分担→INFOSUBINVESTIGATOR", () => {
    const xml = generateCtnXml(byId("nt-abc-1"), ctx());
    expect(xml).toContain("<INFOINVESTIGATOR");
    expect(xml).toContain("<INFOSUBINVESTIGATOR");
  });
  it("異動区分→STATUS属性（追加=APPEND / 削除=DELETE）", () => {
    const xml = generateCtnXml(byId("nt-abc-2"), ctx());
    expect(xml).toContain('STATUS="APPEND"'); // doc-7 追加
    expect(xml).toContain('STATUS="DELETE"'); // doc-3 削除
  });
  it("デモサブセットXSD検証：計画届は妥当", () => {
    const n = byId("nt-abc-1");
    const check = validateAgainstSubset(n, generateCtnXml(n, ctx()));
    expect(check.ok).toBe(true);
    expect(check.elementCount).toBeGreaterThan(20);
  });
  it("主たる被験薬が無いXMLは不正（計画届）", () => {
    const bad: Notification = { ...byId("nt-abc-1"), studyDrugs: [] };
    const check = validateAgainstSubset(bad, generateCtnXml(bad, ctx()));
    expect(check.ok).toBe(false);
  });
  it("開発中止届は治験使用薬・施設が無くても妥当（対象外）", () => {
    const dev = byId("nt-klm-2"); // studyDrugs=[], sites=[]
    const check = validateAgainstSubset(dev, generateCtnXml(dev, {
      compound: db.compounds.find((c) => c.id === "cmp-klm")!,
      sponsor: db.sponsors.find((s) => s.id === "sp-1")!,
      institutions: new Map(db.institutions.map((i) => [i.id, i])),
      irbs: new Map(db.irbs.map((i) => [i.id, i])),
    }));
    expect(check.ok).toBe(true);
  });
});

describe("ダッシュボード導出", () => {
  it("12か月バッチは分担医師の異動のみを対象（責任医師の異動は対象外）", () => {
    const change: Notification = {
      ...structuredClone(byId("nt-abc-2")),
      sites: [{ ...structuredClone(byId("nt-abc-2").sites[0]), investigators: [
        { ...byId("nt-abc-2").sites[0].investigators[0], doctorRole: DOCTOR_ROLE.responsible, changeType: CHANGE_TYPE.add },
      ] }],
    };
    expect(hasSubInvestigatorMovement(change)).toBe(false);
    change.sites[0].investigators[0].doctorRole = DOCTOR_ROLE.sub;
    expect(hasSubInvestigatorMovement(change)).toBe(true);
  });
  it("PMDA照会の回答期限超過は負の残日数を出さない", () => {
    const withOverdue = structuredClone(byId("nt-abc-1"));
    withOverdue.inquiries = [{ id: "iq", inquiryDate: "2026-06-01", inquiryContent: "照会", responseDeadline: "2026-07-01", hasReplacement: false }];
    const alerts = deriveAlerts({ ...db, notifications: [withOverdue] }, "2026-07-14");
    const inq = alerts.find((a) => a.id === "rm-inq-iq")!;
    expect(inq.detailJa).toContain("超過");
    expect(inq.detailJa).not.toContain("残り -");
  });
});

// ============================================================================
// 【根幹】治験届の番号ルール（手引き 2024年3月版）：届出回数=プロトコール通し番号、
// 変更回数=プロトコール内枝番。変更/終了/中止は届出回数を据え置く。
// ============================================================================
describe("採番モデル：届出回数/変更回数（根幹）", () => {
  it("変更届は届出回数を据え置き、変更回数を採番する", async () => {
    const repo = new MockCtnRepository();
    // ABCシリーズ: 計画届 届1 / 変更届 届1・変1 / 終了届 届1
    const n = await repo.createNotification({ compoundId: "cmp-abc", notifType: "change", createdBy: "u-a" });
    expect(n.filingCount).toBe(1); // 対象プロトコール(届1)を継承（+1しない）
    expect(n.changeCount).toBe(2); // 届1内で既に変1があるので変2
  });

  it("既存成分への計画届（N回届）は届出回数をインクリメント", async () => {
    const repo = new MockCtnRepository();
    const n = await repo.createNotification({ compoundId: "cmp-abc", notifType: "plan", createdBy: "u-a" });
    expect(n.filingCount).toBe(2); // 新規プロトコール → 届2
    expect(n.changeCount).toBeUndefined();
  });

  it("新規プロトコールへの変更は、そのプロトコール内で変更回数を採番", async () => {
    const repo = new MockCtnRepository();
    const p2 = await repo.createNotification({ compoundId: "cmp-abc", notifType: "plan", createdBy: "u-a" });
    const c = await repo.createNotification({ compoundId: "cmp-abc", notifType: "change", targetFilingCount: p2.filingCount, createdBy: "u-a" });
    expect(c.filingCount).toBe(2);
    expect(c.changeCount).toBe(1); // 届2内で最初の変更
  });

  it("開発中止届は届出回数を据え置く（XMLでは00）", async () => {
    const repo = new MockCtnRepository();
    const n = await repo.createNotification({ compoundId: "cmp-abc", notifType: "devDiscontinuation", createdBy: "u-a" });
    expect(n.filingCount).toBe(1);
    expect(n.changeCount).toBeUndefined();
  });
});
