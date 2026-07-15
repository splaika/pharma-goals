// ============================================================================
// シードデータ — 5施設・12名の医師（責任/分担）・6名のCRC等・3シリーズ
// シナリオ：新規届 / 変更届 / N回作成 / 終了届 / 開発中止届 / マスタCRUD / 下書き継続
// ============================================================================
import {
  ATTACH_STATUS,
  CHANGE_TYPE,
  COMB_PLACEHOLDER,
  DEV_STATUS,
  DOCTOR_ROLE,
  DRUG_ROLE,
  IRB_TYPE,
  KUBUN,
  TARGET_CATEGORY,
} from "../refData";
import type {
  Compound,
  Doctor,
  Institution,
  Investigator,
  Irb,
  Notification,
  SiteDrugQty,
  SiteStaff,
  Sponsor,
  StudyDrug,
} from "../types";
import type { CtnDb } from "./repository";

// ---------------------------------------------------------------------------
// マスタ
// ---------------------------------------------------------------------------
export const SPONSORS: Sponsor[] = [
  {
    id: "sp-1",
    sponsorType: "製造販売業者",
    name: "サンライズ製薬株式会社",
    repName: "大河内 誠",
    address1: "東京都中央区日本橋2-1-1",
    address2: "サンライズ日本橋ビル12F",
    manufacturerCode: "130001",
    contactName: "青木 亮介",
    contactTitle: "臨床開発部 開発推進課",
    telNo: "03-5200-1234",
    faxOrMail: "ctn-office@sunrise-pharma.co.jp",
    active: true,
  },
];

export const INSTITUTIONS: Institution[] = [
  { id: "inst-1", code: "H001", name: "北央大学医学部附属病院", address1: "北海道札幌市北区北15条西7丁目", address2: "", telNo: "011-706-5000", active: true },
  { id: "inst-2", code: "H002", name: "東京メディカルセンター", address1: "東京都目黒区東が丘2-5-1", address2: "", telNo: "03-3411-0111", active: true },
  { id: "inst-3", code: "H003", name: "浪速総合医療センター", address1: "大阪府大阪市住吉区東粉浜4-1-8", address2: "", telNo: "06-6672-1221", active: true },
  { id: "inst-4", code: "H004", name: "名古屋臨床研究病院", address1: "愛知県名古屋市昭和区妙見町2-9", address2: "", telNo: "052-832-1181", active: true },
  { id: "inst-5", code: "H005", name: "九州先端医療病院", address1: "福岡県福岡市南区大楠3-1-1", address2: "", telNo: "092-541-4936", active: true },
];

export const IRBS: Irb[] = [
  { id: "irb-1", irbType: IRB_TYPE.internal, ownerName: "北央大学医学部附属病院 治験審査委員会", address1: "北海道札幌市北区北15条西7丁目", address2: "", active: true },
  { id: "irb-2", irbType: IRB_TYPE.internal, ownerName: "東京メディカルセンター治験審査委員会", address1: "東京都目黒区東が丘2-5-1", address2: "", active: true },
  { id: "irb-3", irbType: IRB_TYPE.external, ownerName: "中央治験審査委員会（NPO臨床研究支援機構）", address1: "東京都千代田区神田駿河台1-8-11", address2: "", active: true },
  { id: "irb-4", irbType: IRB_TYPE.internal, ownerName: "名古屋臨床研究病院 治験審査委員会", address1: "愛知県名古屋市昭和区妙見町2-9", address2: "", active: true },
];

// 4名は外字を含む（原表記→届出用表記）
export const DOCTORS: Doctor[] = [
  { id: "doc-1", doctorNo: "D0001", nameOriginal: "佐藤 誠一", nameFiling: "佐藤 誠一", pronounce: "さとう せいいち", medSchoolNo: "12345", graduationYear: "2001", hasGaiji: false, institutionId: "inst-1", active: true },
  { id: "doc-2", doctorNo: "D0002", nameOriginal: "髙島 幸雄", nameFiling: "高島 幸雄", pronounce: "たかしま ゆきお", medSchoolNo: "23456", graduationYear: "1998", hasGaiji: true, institutionId: "inst-1", active: true },
  { id: "doc-3", doctorNo: "D0003", nameOriginal: "鈴木 一郎", nameFiling: "鈴木 一郎", pronounce: "すずき いちろう", medSchoolNo: "34567", graduationYear: "2005", hasGaiji: false, institutionId: "inst-1", active: true },
  { id: "doc-4", doctorNo: "D0004", nameOriginal: "山﨑 玲奈", nameFiling: "山崎 玲奈", pronounce: "やまざき れな", medSchoolNo: "45678", graduationYear: "2008", hasGaiji: true, institutionId: "inst-3", active: true },
  { id: "doc-5", doctorNo: "D0005", nameOriginal: "田中 浩二", nameFiling: "田中 浩二", pronounce: "たなか こうじ", medSchoolNo: "56789", graduationYear: "2000", hasGaiji: false, institutionId: "inst-2", active: true },
  { id: "doc-6", doctorNo: "D0006", nameOriginal: "伊藤 さゆり", nameFiling: "伊藤 さゆり", pronounce: "いとう さゆり", medSchoolNo: "67890", graduationYear: "2010", hasGaiji: false, institutionId: "inst-2", active: true },
  { id: "doc-7", doctorNo: "D0007", nameOriginal: "渡辺 隆", nameFiling: "渡辺 隆", pronounce: "わたなべ たかし", medSchoolNo: "78901", graduationYear: "2003", hasGaiji: false, institutionId: "inst-1", active: true },
  { id: "doc-8", doctorNo: "D0008", nameOriginal: "中村 由美", nameFiling: "中村 由美", pronounce: "なかむら ゆみ", medSchoolNo: "89012", graduationYear: "2012", hasGaiji: false, institutionId: "inst-4", active: true },
  { id: "doc-9", doctorNo: "D0009", nameOriginal: "小林 大輔", nameFiling: "小林 大輔", pronounce: "こばやし だいすけ", medSchoolNo: "90123", graduationYear: "2004", hasGaiji: false, institutionId: "inst-3", active: true },
  { id: "doc-10", doctorNo: "D0010", nameOriginal: "德永 明", nameFiling: "徳永 明", pronounce: "とくなが あきら", medSchoolNo: "11234", graduationYear: "1999", hasGaiji: true, institutionId: "inst-4", active: true },
  { id: "doc-11", doctorNo: "D0011", nameOriginal: "加藤 めぐみ", nameFiling: "加藤 めぐみ", pronounce: "かとう めぐみ", medSchoolNo: "22345", graduationYear: "2011", hasGaiji: false, institutionId: "inst-3", active: true },
  { id: "doc-12", doctorNo: "D0012", nameOriginal: "濵田 亮", nameFiling: "浜田 亮", pronounce: "はまだ りょう", medSchoolNo: "33456", graduationYear: "2007", hasGaiji: true, institutionId: "inst-5", active: true },
];

export const SITE_STAFF: SiteStaff[] = [
  { id: "crc-1", name: "星野 恵", kana: "ほしの めぐみ", role: "CRC", institutionId: "inst-1", telNo: "011-706-5011", mail: "hoshino@hokuo-u.example.jp", active: true },
  { id: "crc-2", name: "森田 拓也", kana: "もりた たくや", role: "CRC", institutionId: "inst-2", telNo: "03-3411-0122", mail: "morita@tmc.example.jp", active: true },
  { id: "crc-3", name: "岡本 千夏", kana: "おかもと ちなつ", role: "CRC", institutionId: "inst-3", telNo: "06-6672-1233", mail: "okamoto@naniwa.example.jp", active: true },
  { id: "crc-4", name: "藤井 健", kana: "ふじい けん", role: "CRC", institutionId: "inst-4", telNo: "052-832-1194", mail: "fujii@nagoya-cr.example.jp", active: true },
  { id: "crc-5", name: "松本 あおい", kana: "まつもと あおい", role: "CRC", institutionId: "inst-5", telNo: "092-541-4945", mail: "matsumoto@kyushu-am.example.jp", active: true },
  { id: "crc-6", name: "西村 大和", kana: "にしむら やまと", role: "事務局", institutionId: "inst-1", telNo: "011-706-5099", mail: "chiken-office@hokuo-u.example.jp", active: true },
];

export const COMPOUNDS: Compound[] = [
  { id: "cmp-abc", compoundCode: "ABC-123", targetCategory: TARGET_CATEGORY.drug, trialKind: "医薬品", initReceptNo: "R6薬第1234号", initNoteDate: "2026-03-25", devStatus: DEV_STATUS.active, sponsorId: "sp-1", drugName: "ABC-123（開発コード：リロマブ）", createdAt: "2026-03-20" },
  { id: "cmp-srp", compoundCode: "SRP-204", targetCategory: TARGET_CATEGORY.drug, trialKind: "医薬品", initReceptNo: "R6薬第2210号", initNoteDate: "2026-01-15", devStatus: DEV_STATUS.active, sponsorId: "sp-1", drugName: "SRP-204（開発コード：ソラペジブ）", createdAt: "2026-01-10" },
  { id: "cmp-klm", compoundCode: "KLM-330", targetCategory: TARGET_CATEGORY.drug, trialKind: "医薬品", initReceptNo: "R5薬第9987号", initNoteDate: "2025-11-10", devStatus: DEV_STATUS.discontinued, sponsorId: "sp-1", drugName: "KLM-330（開発コード：カルメチニブ）", createdAt: "2025-11-05" },
];

// ---------------------------------------------------------------------------
// ビルダー：医師イベント行（医師マスタからスナップショット）
// ---------------------------------------------------------------------------
let invSeq = 0;
function inv(
  doctorId: string,
  role: number,
  serialNo: number,
  changeType: number,
  extra: Partial<Investigator> = {}
): Investigator {
  const d = DOCTORS.find((x) => x.id === doctorId)!;
  return {
    id: `inv-${++invSeq}`,
    doctorId,
    doctorRole: role,
    serialNo,
    changeType,
    nameOriginal: d.nameOriginal,
    nameFiling: d.nameFiling,
    pronounce: d.pronounce,
    medSchoolNo: d.medSchoolNo,
    graduationYear: d.graduationYear,
    ...extra,
  };
}
function qty(studyDrugId: string, serialNo: number, planned: number, terminal?: Partial<SiteDrugQty>): SiteDrugQty {
  return { studyDrugId, serialNo, qtyPlanned: planned, ...terminal };
}

// ---------------------------------------------------------------------------
// 治験使用薬テンプレート（順序番号＝突合キー型：シリーズ内で不変）
// ---------------------------------------------------------------------------
const abcMain = (): StudyDrug => ({
  id: "sd-abc-main", drugRole: DRUG_ROLE.main, serialNo: 1, drugName: "ABC-123錠 25mg",
  plantName: "サンライズ製薬株式会社 湘南工場", plantAddress1: "神奈川県藤沢市城南4-2-1", plantAddress2: "", plantCode: "6A1234",
  ingredients: "1錠中 ABC-123 25mg", intendEffects: "関節リウマチ", efficacyClassCode: "3999", intendDosage: "1日1回1錠を経口投与",
});
const abcPlacebo = (): StudyDrug => ({
  id: "sd-abc-plc", drugRole: DRUG_ROLE.other, serialNo: 2, drugName: "ABC-123 プラセボ錠", combCategory: COMB_PLACEHOLDER,
  idType: "識別記号", applicationStatus: "国内未承認", adrReport: "無",
  plantName: "サンライズ製薬株式会社 湘南工場", plantAddress1: "神奈川県藤沢市城南4-2-1", plantAddress2: "", plantCode: "6A1234",
  ingredients: "有効成分を含まない", intendEffects: "（対照薬）", efficacyClassCode: "3999", intendDosage: "1日1回1錠を経口投与",
});
const srpMain = (): StudyDrug => ({
  id: "sd-srp-main", drugRole: DRUG_ROLE.main, serialNo: 1, drugName: "SRP-204注 50mg",
  plantName: "サンライズ製薬株式会社 富士工場", plantAddress1: "静岡県富士市大渕2-7", plantAddress2: "", plantCode: "6A5678",
  ingredients: "1バイアル中 SRP-204 50mg", intendEffects: "潰瘍性大腸炎", efficacyClassCode: "2399", intendDosage: "2週間ごとに点滴静注",
});
const srpAdjunct = (): StudyDrug => ({
  id: "sd-srp-adj", drugRole: DRUG_ROLE.other, serialNo: 2, drugName: "タクロリムスカプセル（併用薬）", combCategory: 100001102,
  idType: "一般的名称", applicationStatus: "国内承認済", adrReport: "有",
  plantName: "アステラ製薬株式会社 高岡工場", plantAddress1: "富山県高岡市長慶寺700", plantAddress2: "", plantCode: "3B0011",
  ingredients: "1カプセル中 タクロリムス 0.5mg", intendEffects: "（併用薬）", efficacyClassCode: "3999", intendDosage: "1日2回経口投与",
});
const klmMain = (): StudyDrug => ({
  id: "sd-klm-main", drugRole: DRUG_ROLE.main, serialNo: 1, drugName: "KLM-330カプセル 100mg",
  plantName: "サンライズ製薬株式会社 湘南工場", plantAddress1: "神奈川県藤沢市城南4-2-1", plantAddress2: "", plantCode: "6A1234",
  ingredients: "1カプセル中 KLM-330 100mg", intendEffects: "非小細胞肺癌", efficacyClassCode: "4291", intendDosage: "1日2回 食後経口投与",
});

// ===========================================================================
// 治験届
// ===========================================================================
export const NOTIFICATIONS: Notification[] = [
  // -------- ABC-123 シリーズ --------
  // (1) 治験計画届（新規・30日調査対象・提出済）
  {
    id: "nt-abc-1", compoundId: "cmp-abc", notifType: "plan", filingCount: 1, kubun: KUBUN.k1,
    subj30dayReview: 1, plannedStartDate: "2026-05-01", noteDate: "2026-03-25", status: "submitted",
    changeLocations: [], protocolNo: "ABC-123-001", phase: 100000602, trialType: 100000701,
    objectives: "関節リウマチ患者を対象としたABC-123の有効性及び安全性の検討（プラセボ対照無作為化二重盲検比較試験）",
    plannedSubjDrug: 120, plannedSubjTotal: 240, targetDisease: "関節リウマチ",
    periodStart: "2026-05", periodEnd: "2028-03", isGlobal: false, sponsorId: "sp-1",
    remarks: "", footnote: "",
    studyDrugs: [abcMain(), abcPlacebo()],
    sites: [
      {
        id: "site-abc1-a", institutionId: "inst-1", serialNo: 1, department: "リウマチ・膠原病内科", plannedSubjects: 12, irbId: "irb-1", crcStaffId: "crc-1",
        investigators: [
          inv("doc-1", DOCTOR_ROLE.responsible, 1, CHANGE_TYPE.register),
          inv("doc-3", DOCTOR_ROLE.sub, 2, CHANGE_TYPE.register),
          inv("doc-2", DOCTOR_ROLE.sub, 3, CHANGE_TYPE.register),
        ],
        quantities: [qty("sd-abc-main", 1, 480), qty("sd-abc-plc", 2, 480)],
      },
      {
        id: "site-abc1-b", institutionId: "inst-2", serialNo: 2, department: "免疫・膠原病内科", plannedSubjects: 10, irbId: "irb-2", crcStaffId: "crc-2",
        investigators: [
          inv("doc-5", DOCTOR_ROLE.responsible, 4, CHANGE_TYPE.register),
          inv("doc-6", DOCTOR_ROLE.sub, 5, CHANGE_TYPE.register),
        ],
        quantities: [qty("sd-abc-main", 1, 400), qty("sd-abc-plc", 2, 400)],
      },
    ],
    attachments: [
      { id: "att-abc1-1", docType: 100001200, docName: "ABC-123-001_実施計画書_v1.0.pdf", spReference: "/CTN/ABC-123/plan/protocol_v1.0.pdf", hasBookmarks: true, hasText: true, attachStatus: ATTACH_STATUS.attached },
      { id: "att-abc1-2", docType: 100001201, docName: "ABC-123_治験薬概要書_v3.pdf", spReference: "/CTN/ABC-123/plan/ib_v3.pdf", hasBookmarks: true, hasText: true, attachStatus: ATTACH_STATUS.attached },
    ],
    references: [],
    inquiries: [
      { id: "inq-abc1-1", inquiryDate: "2026-07-05", inquiryContent: "非臨床安全性試験（反復投与毒性）の追加データ提出について", responseDeadline: "2026-07-20", hasReplacement: false },
    ],
    createdBy: "u-a", createdAt: "2026-03-20", reviewedBy: "u-b", approvedBy: "u-c", approvedAt: "2026-03-24", submittedAt: "2026-03-25", xmlGeneratedAt: "2026-03-25",
  },

  // (2) 治験計画変更届（分担医師の追加・削除 → イベント行自動生成・提出済）
  {
    id: "nt-abc-2", compoundId: "cmp-abc", notifType: "change", filingCount: 2, changeCount: 1, kubun: KUBUN.k3,
    receptNo: "R6薬第1234号", receptDate: "2026-06-12", plannedStartDate: "2026-05-01", noteDate: "2026-06-12", status: "submitted",
    changeLocations: [100000804], protocolNo: "ABC-123-001", phase: 100000602, trialType: 100000701,
    objectives: "関節リウマチ患者を対象としたABC-123の有効性及び安全性の検討", plannedSubjDrug: 120, plannedSubjTotal: 240, targetDisease: "関節リウマチ",
    periodStart: "2026-05", periodEnd: "2028-03", isGlobal: false, sponsorId: "sp-1",
    remarks: "分担医師1名を追加、1名を削除（異動による）。", footnote: "",
    studyDrugs: [abcMain(), abcPlacebo()], // 突合キー型：順序番号 #1/#2 を計画届から引き継ぎ
    sites: [
      {
        id: "site-abc2-a", institutionId: "inst-1", serialNo: 1, department: "リウマチ・膠原病内科", plannedSubjects: 12, irbId: "irb-1", crcStaffId: "crc-1",
        investigators: [
          inv("doc-1", DOCTOR_ROLE.responsible, 1, CHANGE_TYPE.change), // 継続（責任医師）
          inv("doc-2", DOCTOR_ROLE.sub, 2, CHANGE_TYPE.change), // 継続
          inv("doc-7", DOCTOR_ROLE.sub, 3, CHANGE_TYPE.add, { changeDate: "2026-06-10", changeReason: "分担医師の追加（新規参加）" }),
          inv("doc-3", DOCTOR_ROLE.sub, 4, CHANGE_TYPE.remove, { changeDate: "2026-06-10", changeReason: "分担医師の異動（他施設へ転出）" }),
        ],
        quantities: [qty("sd-abc-main", 1, 480), qty("sd-abc-plc", 2, 480)],
      },
    ],
    attachments: [],
    references: [],
    inquiries: [],
    createdBy: "u-b", createdAt: "2026-06-08", reviewedBy: "u-a", approvedBy: "u-c", approvedAt: "2026-06-11", submittedAt: "2026-06-12", xmlGeneratedAt: "2026-06-12",
  },

  // (3) 治験終了届（数量列必須・承認済で提出待ち＝リマインダ）
  {
    id: "nt-abc-3", compoundId: "cmp-abc", notifType: "completion", filingCount: 3, kubun: KUBUN.k3,
    receptNo: "R6薬第1234号", receptDate: "2028-04-05", noteDate: "2028-04-05", status: "approved",
    changeLocations: [], protocolNo: "ABC-123-001", objectives: "治験終了報告", plannedSubjDrug: 120, plannedSubjTotal: 240, targetDisease: "関節リウマチ",
    periodStart: "2026-05", periodEnd: "2028-03", isGlobal: false, sponsorId: "sp-1",
    remarks: "全施設で予定症例登録を完了し、治験を終了した。", footnote: "",
    studyDrugs: [abcMain(), abcPlacebo()], // #1/#2 は計画届と一致（突合キー不変）
    sites: [
      {
        id: "site-abc3-a", institutionId: "inst-1", serialNo: 1, department: "リウマチ・膠原病内科", plannedSubjects: 12, enrolledSubjects: 11, irbId: "irb-1", crcStaffId: "crc-1",
        investigators: [
          inv("doc-1", DOCTOR_ROLE.responsible, 1, CHANGE_TYPE.change),
          inv("doc-2", DOCTOR_ROLE.sub, 2, CHANGE_TYPE.change),
          inv("doc-7", DOCTOR_ROLE.sub, 3, CHANGE_TYPE.change),
        ],
        quantities: [
          qty("sd-abc-main", 1, 480, { qtySupplied: 460, qtyUsed: 300, qtyWithdrawn: 120, qtyAbrogated: 40 }),
          qty("sd-abc-plc", 2, 480, { qtySupplied: 460, qtyUsed: 300, qtyWithdrawn: 120, qtyAbrogated: 40 }),
        ],
      },
      {
        id: "site-abc3-b", institutionId: "inst-2", serialNo: 2, department: "免疫・膠原病内科", plannedSubjects: 10, enrolledSubjects: 9, irbId: "irb-2", crcStaffId: "crc-2",
        investigators: [inv("doc-5", DOCTOR_ROLE.responsible, 4, CHANGE_TYPE.change), inv("doc-6", DOCTOR_ROLE.sub, 5, CHANGE_TYPE.change)],
        quantities: [
          qty("sd-abc-main", 1, 400, { qtySupplied: 380, qtyUsed: 250, qtyWithdrawn: 100, qtyAbrogated: 30 }),
          qty("sd-abc-plc", 2, 400, { qtySupplied: 380, qtyUsed: 250, qtyWithdrawn: 100, qtyAbrogated: 30 }),
        ],
      },
    ],
    attachments: [],
    references: [],
    inquiries: [],
    createdBy: "u-a", createdAt: "2028-03-28", reviewedBy: "u-b", approvedBy: "u-c", approvedAt: "2028-04-04",
  },

  // -------- SRP-204 シリーズ（N回作成：計画→変更→変更（下書き）） --------
  {
    id: "nt-srp-1", compoundId: "cmp-srp", notifType: "plan", filingCount: 1, kubun: KUBUN.k1,
    subj30dayReview: 1, plannedStartDate: "2026-02-01", noteDate: "2026-01-15", status: "submitted",
    changeLocations: [], protocolNo: "SRP-204-01", phase: 100000600, trialType: 100000700,
    objectives: "健康成人を対象としたSRP-204の薬物動態及び安全性の検討（第I相単回投与）", plannedSubjDrug: 40, plannedSubjTotal: 40, targetDisease: "潰瘍性大腸炎",
    periodStart: "2026-02", periodEnd: "2026-12", isGlobal: false, sponsorId: "sp-1",
    remarks: "", footnote: "",
    studyDrugs: [srpMain()],
    sites: [
      {
        id: "site-srp1-a", institutionId: "inst-3", serialNo: 1, department: "消化器内科", plannedSubjects: 20, irbId: "irb-3", crcStaffId: "crc-3",
        smoName: "臨床開発サポート株式会社", smoAddress1: "大阪府大阪市中央区本町3-4-10", smoService: "モニタリング補助・CRC派遣",
        investigators: [inv("doc-9", DOCTOR_ROLE.responsible, 1, CHANGE_TYPE.register), inv("doc-11", DOCTOR_ROLE.sub, 2, CHANGE_TYPE.register)],
        quantities: [qty("sd-srp-main", 1, 200)],
      },
    ],
    attachments: [{ id: "att-srp1-1", docType: 100001200, docName: "SRP-204-01_実施計画書_v1.0.pdf", spReference: "/CTN/SRP-204/plan/protocol_v1.0.pdf", hasBookmarks: true, hasText: true, attachStatus: ATTACH_STATUS.attached }],
    references: [], inquiries: [],
    createdBy: "u-a", createdAt: "2026-01-10", reviewedBy: "u-b", approvedBy: "u-c", approvedAt: "2026-01-14", submittedAt: "2026-01-15", xmlGeneratedAt: "2026-01-15",
  },
  {
    id: "nt-srp-2", compoundId: "cmp-srp", notifType: "change", filingCount: 2, changeCount: 1, kubun: KUBUN.k1,
    receptNo: "R6薬第2210号", receptDate: "2026-04-10", plannedStartDate: "2026-02-01", noteDate: "2026-04-10", status: "submitted",
    changeLocations: [100000801], protocolNo: "SRP-204-01", phase: 100000600, trialType: 100000700,
    objectives: "対象疾患の追加（潰瘍性大腸炎に加えクローン病を追加）", plannedSubjDrug: 40, plannedSubjTotal: 40, targetDisease: "潰瘍性大腸炎、クローン病",
    periodStart: "2026-02", periodEnd: "2026-12", isGlobal: false, sponsorId: "sp-1",
    remarks: "対象疾患を追加。", footnote: "",
    studyDrugs: [srpMain()],
    sites: [
      {
        id: "site-srp2-a", institutionId: "inst-3", serialNo: 1, department: "消化器内科", plannedSubjects: 20, irbId: "irb-3", crcStaffId: "crc-3",
        investigators: [inv("doc-9", DOCTOR_ROLE.responsible, 1, CHANGE_TYPE.change)],
        quantities: [qty("sd-srp-main", 1, 200)],
      },
    ],
    attachments: [], references: [], inquiries: [],
    createdBy: "u-b", createdAt: "2026-04-05", reviewedBy: "u-a", approvedBy: "u-c", approvedAt: "2026-04-09", submittedAt: "2026-04-10", xmlGeneratedAt: "2026-04-10",
  },
  // 下書き（起票中・提出期限接近＝アラート）。ユーザーが継続入力できる。
  {
    id: "nt-srp-3", compoundId: "cmp-srp", notifType: "change", filingCount: 3, changeCount: 2, kubun: KUBUN.k2,
    receptNo: "R6薬第2210号", receptDate: "", plannedStartDate: "2026-08-01", status: "draft",
    changeLocations: [100000803], protocolNo: "SRP-204-01", phase: 100000600, trialType: 100000700,
    objectives: "治験使用薬（併用薬）の追加", plannedSubjDrug: 40, plannedSubjTotal: 40, targetDisease: "潰瘍性大腸炎、クローン病",
    periodStart: "2026-02", periodEnd: "2026-12", isGlobal: false, sponsorId: "sp-1",
    remarks: "併用薬としてタクロリムスを追加。", footnote: "",
    studyDrugs: [srpMain(), srpAdjunct()], // 新規その他治験使用薬 → 順序番号 #2 を新規採番
    sites: [
      {
        id: "site-srp3-a", institutionId: "inst-3", serialNo: 1, department: "消化器内科", plannedSubjects: 20, irbId: "irb-3", crcStaffId: "crc-3",
        investigators: [inv("doc-9", DOCTOR_ROLE.responsible, 1, CHANGE_TYPE.change)],
        quantities: [qty("sd-srp-main", 1, 200), qty("sd-srp-adj", 2, 100)],
      },
    ],
    attachments: [], references: [], inquiries: [],
    createdBy: "u-a", createdAt: "2026-07-08",
  },

  // -------- KLM-330 シリーズ（開発中止） --------
  {
    id: "nt-klm-1", compoundId: "cmp-klm", notifType: "plan", filingCount: 1, kubun: KUBUN.k1,
    subj30dayReview: 1, plannedStartDate: "2025-12-01", noteDate: "2025-11-10", status: "submitted",
    changeLocations: [], protocolNo: "KLM-330-101", phase: 100000600, trialType: 100000700,
    objectives: "非小細胞肺癌患者を対象としたKLM-330の第I相用量漸増試験", plannedSubjDrug: 30, plannedSubjTotal: 30, targetDisease: "非小細胞肺癌",
    periodStart: "2025-12", periodEnd: "2027-06", isGlobal: false, sponsorId: "sp-1",
    remarks: "", footnote: "",
    studyDrugs: [klmMain()],
    sites: [
      {
        id: "site-klm1-a", institutionId: "inst-4", serialNo: 1, department: "腫瘍内科", plannedSubjects: 15, irbId: "irb-4", crcStaffId: "crc-4",
        investigators: [inv("doc-10", DOCTOR_ROLE.responsible, 1, CHANGE_TYPE.register), inv("doc-8", DOCTOR_ROLE.sub, 2, CHANGE_TYPE.register)],
        quantities: [qty("sd-klm-main", 1, 300)],
      },
    ],
    attachments: [], references: [], inquiries: [],
    createdBy: "u-a", createdAt: "2025-11-05", reviewedBy: "u-b", approvedBy: "u-c", approvedAt: "2025-11-09", submittedAt: "2025-11-10", xmlGeneratedAt: "2025-11-10",
  },
  {
    id: "nt-klm-2", compoundId: "cmp-klm", notifType: "devDiscontinuation", filingCount: 2, kubun: KUBUN.k3,
    noteDate: "2026-06-25", status: "submitted", changeLocations: [], protocolNo: "KLM-330-101",
    terminationDate: "2026-06-20", terminationReason: "開発方針の見直しにより本剤の開発を中止する。", objectives: "開発中止報告",
    targetDisease: "非小細胞肺癌", isGlobal: false, sponsorId: "sp-1",
    remarks: "開発中止のため、以降の治験届出は行わない。安全性情報は継続してフォローする。", footnote: "",
    studyDrugs: [], sites: [], attachments: [], references: [], inquiries: [],
    createdBy: "u-a", createdAt: "2026-06-22", reviewedBy: "u-b", approvedBy: "u-c", approvedAt: "2026-06-24", submittedAt: "2026-06-25", xmlGeneratedAt: "2026-06-25",
  },
];

// ---------------------------------------------------------------------------
// 監査ログ（初期・代表例）
// ---------------------------------------------------------------------------
const initialAudit: CtnDb["audit"] = [
  { id: "au-1", at: "2026-03-25T09:12:00", who: "千葉 健一", action: "submit", entity: "治験届", entityRef: "ABC-123 計画届 #1", summary: "承認済 → 提出済（GW受付待ち）" },
  { id: "au-2", at: "2026-06-12T14:05:00", who: "千葉 健一", action: "submit", entity: "治験届", entityRef: "ABC-123 変更届 #2", summary: "分担医師 追加1・削除1 を提出" },
  { id: "au-3", at: "2026-06-25T10:30:00", who: "千葉 健一", action: "submit", entity: "治験届", entityRef: "KLM-330 開発中止届", summary: "提出に伴いシリーズ開発状態を『開発中止』へ更新" },
  { id: "au-4", at: "2026-07-08T16:40:00", who: "青木 亮介", action: "create", entity: "治験届", entityRef: "SRP-204 変更届 #3", summary: "治験使用薬の追加（併用薬）を起票" },
];

// ---------------------------------------------------------------------------
// 外字確認履歴（初期）
// ---------------------------------------------------------------------------
const initialGaiji: CtnDb["gaiji"] = [
  { id: "gj-1", doctorId: "doc-2", notificationId: "nt-abc-1", targetColumn: "cr_doctor.cr_nameoriginal", originalChar: "髙", codePoint: "U+9AD9", replacementChar: "高", gaijiType: 100001501, confirmedBy: "青木 亮介", confirmedOn: "2026-03-21T11:20:00" },
  { id: "gj-2", doctorId: "doc-10", notificationId: "nt-klm-1", targetColumn: "cr_doctor.cr_nameoriginal", originalChar: "德", codePoint: "U+5FB3", replacementChar: "徳", gaijiType: 100001501, confirmedBy: "青木 亮介", confirmedOn: "2025-11-06T09:05:00" },
];

export function makeSeedDb(): CtnDb {
  invSeq = 0; // 再生成のたびにイベント行IDを安定させる
  return structuredClone({
    compounds: COMPOUNDS,
    notifications: NOTIFICATIONS,
    institutions: INSTITUTIONS,
    doctors: DOCTORS,
    siteStaff: SITE_STAFF,
    irbs: IRBS,
    sponsors: SPONSORS,
    gaiji: initialGaiji,
    audit: initialAudit,
  });
}
