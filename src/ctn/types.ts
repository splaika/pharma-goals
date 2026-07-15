// ============================================================================
// CTN Suite — UI-side domain model (Dataverse-agnostic)
// ----------------------------------------------------------------------------
// これらの型は ctn-schema.json（14テーブル・154列）の中核列を写したもの。
// リポジトリ実装（mock / Dataverse）が行 <-> これらの形の相互変換を担うので、
// コンポーネントは Dataverse の論理名を知らなくてよい。
// 選択肢（choices）は「整数値もこのまま使用」（ハンドオフ第3節）ため number で保持し、
// ラベルは refData.ts の choiceLabel() で引く。
// ============================================================================

export type Lang = "ja" | "en";

// --- 届出種別（cr_notiftype）: 計/変/中/終/開 の順で requiredByType を解釈 ---
export type NotifTypeKey =
  | "plan" // 治験計画届
  | "change" // 治験計画変更届
  | "termination" // 治験中止届
  | "completion" // 治験終了届
  | "devDiscontinuation"; // 開発中止届

// requiredByType / requiredMatrix の列順（計/変/中/終/開）
export const NOTIF_TYPE_ORDER: NotifTypeKey[] = [
  "plan",
  "change",
  "termination",
  "completion",
  "devDiscontinuation",
];

// --- ステータス（cr_status）: BPFステージと連動・手動変更不可 ---
export type StatusKey = "draft" | "review" | "approved" | "submitted";

// ============================================================================
// マスタ
// ============================================================================

/** アプリ利用者（Entra ID の代替。ユーザー切替ドロップダウンで模擬） */
export interface User {
  id: string;
  name: string;
  initials: string;
  role: "drafter" | "reviewer" | "approver" | "regulatory";
  dept: string;
}

/** 治験届出者（cr_sponsor） */
export interface Sponsor {
  id: string;
  sponsorType: string; // 届出者の種別
  name: string; // 届出者の名称
  repName: string; // 代表者の氏名
  address1: string;
  address2: string;
  manufacturerCode: string; // 業者コード
  contactName: string; // 届出担当者の氏名
  contactTitle: string; // 届出担当者の所属
  telNo: string;
  faxOrMail: string;
  overseasInfo?: string; // 海外依頼者・外国製造業者情報（邦文4項目＋外国文4項目・該当時のみ）
  active: boolean;
}

/** 医療機関マスタ（cr_institution）— 論理削除で履歴保持 */
export interface Institution {
  id: string;
  code: string; // 表示用の機関コード
  name: string; // 機関名称
  address1: string;
  address2: string;
  telNo: string; // 代表電話番号
  active: boolean; // statecode（無効化＝論理削除）
}

/** 医師マスタ（cr_doctor）— 不変ID・原表記/届出用の二段構え */
export interface Doctor {
  id: string; // 不変の同一性キー（改名しても不変）
  doctorNo: string; // 医師表示ID（自動採番）
  nameOriginal: string; // 氏名（原表記）
  nameFiling: string; // 氏名（届出用表記＝外字正規化済み）
  pronounce: string; // よみかな
  medSchoolNo: string; // 大学番号（責任医師想定）
  graduationYear: string; // 卒業年
  hasGaiji: boolean; // 外字有無（検出結果）
  institutionId?: string; // 主たる所属医療機関（運用・表示用）
  active: boolean;
}

/** 治験実施の現場担当（CRC・SMO事務局）。XML対象外だが本番運用で必須の連絡先。 */
export interface SiteStaff {
  id: string;
  name: string;
  kana: string;
  role: "CRC" | "事務局" | "薬剤部"; // 治験コーディネーター等
  institutionId: string;
  telNo: string;
  mail: string;
  active: boolean;
}

/** IRBマスタ（cr_irb） */
export interface Irb {
  id: string;
  irbType: number; // 院内/外部（choice）
  ownerName: string; // 設置者の名称
  address1: string;
  address2: string;
  active: boolean;
}

// ============================================================================
// トランザクション（親）: 治験成分＝シリーズ
// ============================================================================

/** 治験成分（cr_compound）— 届出をまたぐ共通事項を保持するシリーズ親 */
export interface Compound {
  id: string;
  compoundCode: string; // 治験成分記号（半角英数字20桁以内・「&」不可）
  targetCategory: number; // 対象区分（医薬品/医療機器/再生医療等製品）
  trialKind: string; // 治験の種類
  initReceptNo: string; // 初回届出受付番号
  initNoteDate: string; // 初回届出年月日（YYYY-MM-DD）
  devStatus: number; // 開発状態（開発中/開発中止）
  sponsorId: string; // 主たる届出者
  drugName: string; // 代表的な被験薬名称（表示用）
  createdAt: string;
}

// ============================================================================
// トランザクション（中核）: 治験届と明細
// ============================================================================

/** 治験使用薬（cr_studydrug）— 順序番号＝突合キー型 */
export interface StudyDrug {
  id: string;
  drugRole: number; // 主従区分（主たる被験薬/その他治験使用薬）
  serialNo: number; // 順序番号（突合キー型・シリーズ内不変）
  drugName: string;
  idType?: string; // 記号・名称等の種類（その他のみ）
  combCategory?: number; // 区別（被験薬/対照薬…）その他のみ
  applicationStatus?: string; // 国内における承認状況
  adrReport?: string; // 副作用報告の有無
  plantName: string; // 製造所名称
  plantAddress1: string;
  plantAddress2: string;
  plantCode: string; // 製造所業者コード
  ingredients: string; // 成分及び分量
  manufactMethod?: string; // 製造方法
  intendEffects: string; // 予定される効能効果
  efficacyClassCode: string; // 薬効分類番号
  intendDosage: string; // 予定される用法用量
  dosageAdmin?: string; // 用法及び用量
  dosageFormCode?: string; // 剤形コード
  adminRouteCode?: string; // 投与経路コード
}

/** 治験責任医師・分担医師（cr_investigator）— イベント行型 */
export interface Investigator {
  id: string;
  doctorId: string; // 医師マスタ（不変ID）
  doctorRole: number; // 医師区分（責任/分担）
  serialNo: number; // 順序番号（届内・イベント単位で採番）
  changeType: number; // 異動区分（登録/追加/削除/変更）
  changeDate?: string; // 異動日付（変更届のみ）
  changeReason?: string; // 異動理由
  // 医師マスタから自動転記（スナップショット）
  nameOriginal: string;
  nameFiling: string;
  pronounce: string;
  medSchoolNo: string;
  graduationYear: string;
}

/** 施設別治験薬数量（cr_sitedrugqty）— 施設×薬の交差 */
export interface SiteDrugQty {
  studyDrugId: string;
  serialNo: number; // 治験使用薬の順序番号を継承
  qtyPlanned: number; // 予定交付数量（計画届〜）
  qtyNotation?: string; // 数量（届出用表記）
  qtySupplied?: number; // 交付数量（終了/中止のみ）
  qtyUsed?: number; // 使用数量
  qtyWithdrawn?: number; // 回収数量
  qtyAbrogated?: number; // 廃棄数量
}

/** 実施医療機関（cr_site）— 届出ごとの実施機関。医師ロスターと数量を内包 */
export interface Site {
  id: string;
  institutionId: string;
  serialNo: number; // 順序番号（SERIALNO1）
  department: string; // 実施診療科
  plannedSubjects: number; // 予定被験者数
  enrolledSubjects?: number; // 実施医療機関被験者数（終了/中止で必須）
  irbId: string;
  smoName?: string;
  smoAddress1?: string;
  smoAddress2?: string;
  smoService?: string;
  others?: string; // その他（要確認）
  crcStaffId?: string; // 現場担当CRC（運用情報・XML対象外）
  investigators: Investigator[]; // 医師イベント行
  quantities: SiteDrugQty[]; // 施設×薬の数量
}

/** 添付資料（cr_attachment） */
export interface Attachment {
  id: string;
  docType: number; // 資料種別
  docName: string;
  spReference: string; // SharePoint参照（デモは擬似パス）
  hasBookmarks: boolean;
  hasText: boolean;
  attachStatus: number; // 添付ステータス
}

/** 参照治験届出（cr_reference） */
export interface ReferenceNote {
  id: string;
  serialNo: number;
  refCategory: string; // 医薬品等の別
  refCode: string; // 治験成分記号又は識別記号
  refCount: string; // 届出回数
  refType: string; // 参照の区分
  refContents: string; // 参照の詳細
}

/** PMDA照会対応（cr_inquiry）— 提出後管理 */
export interface Inquiry {
  id: string;
  inquiryDate: string;
  inquiryContent: string;
  responseDeadline: string;
  responseDate?: string;
  responseContent?: string;
  hasReplacement: boolean;
}

/** 治験届（cr_notification）— 1件の届出（計画/変更/中止/終了/開発中止） */
export interface Notification {
  id: string;
  compoundId: string;
  notifType: NotifTypeKey;
  filingCount: number; // 届出回数（通算・自動採番）
  changeCount?: number; // 変更回数（変更届のみ・自動採番）
  receptNo?: string; // 当該届出受付番号
  receptDate?: string; // 当該届出年月日
  noteDate?: string; // 届出年月日（提出日・自動）
  kubun?: number; // 届出区分（1/2/3・推奨→確定）
  subj30dayReview?: number; // 30日調査対応被験薬区分
  plannedStartDate?: string; // 治験開始予定日
  status: StatusKey;
  changeLocations: number[]; // 変更箇所（複数選択・変更届）
  changeDate?: string; // 変更年月日（変更届・提出時期の起点＝変更予定日）
  changeReason?: string; // 変更理由（変更届）
  terminationDate?: string; // 中止年月日
  terminationReason?: string;
  postTermination?: string; // その後の対応状況（中止届）
  protocolNo: string; // 実施計画書識別記号
  phase?: number; // 開発の相
  trialType?: number; // 試験の種類
  objectives: string; // 目的
  plannedSubjDrug?: number; // 予定被験者数（被験薬）
  plannedSubjTotal?: number; // 予定被験者数（合計）
  targetDisease: string; // 主たる被験薬の対象疾患
  periodStart?: string; // 実施期間（開始）
  periodEnd?: string; // 実施期間（終了）
  isGlobal: boolean; // 国際共同治験
  reasonOnerous?: string; // 有償の理由等
  // ---- 治験計画概要：手引き第4版 4.3 の条件付き項目（該当時のみ・計画で記入/変更等で継承） ----
  chargeOutPersonName?: string; // 費用負担者氏名（CHARGEOUTPERSONNAME）
  validityReasons?: string; // 費用負担の妥当性の理由（VALIDITYREASONS）
  applicBiological?: number; // 生物由来製品 該当有無（TYPEBIOLOGICALPROD/APPLICABLEORNOT）
  applicBiologicalDetail?: string; // 生物由来製品 詳細（DETAIL）
  applicCartagena?: number; // カルタヘナ法 該当有無（TYPECLINTRIALWITHDRUGCARTAGENA）
  applicCartagenaDetail?: string;
  applicExpandedAccess?: number; // 拡大治験 該当有無（TYPEEXPANDEDACCESSPROG）
  applicExpandedAccessDetail?: string;
  otherCommentsPrimary?: string; // その他コメント・主たる被験薬（OTHERCOMMENTS_PRIMARY）
  otherCommentsProtocol?: string; // その他コメント・治験計画書（OTHERCOMMENTS_PROTOCOL）
  croName?: string; // CRO 名称（CRO_NAME・繰り返し可＝要確認）
  croAddress1?: string; // CRO 所在地1（CRO_ADDRESS1）
  croAddress2?: string; // CRO 所在地2（CRO_ADDRESS2）
  croService?: string; // CRO 受託業務の範囲（CRO_SERVICE）
  coordName?: string; // 治験調整医師 氏名（KEYINVEST_NAME・繰り返し可＝要確認）
  coordAffiliation?: string; // 治験調整医師 所属（KEYINVEST_AFFILIATION）
  coordInstitution?: string; // 治験調整医師 医療機関名（NAMEMEDICALINSTITUT）
  remarks?: string; // 備考（通信欄）
  footnote?: string; // 脚注
  gwReceptNo?: string; // GW受付番号
  sponsorId: string;
  // ---- 明細 ----
  studyDrugs: StudyDrug[];
  sites: Site[];
  attachments: Attachment[];
  references: ReferenceNote[];
  inquiries: Inquiry[];
  // ---- 運用メタ ----
  createdBy: string; // 起票者（職務分離の判定に使用）
  createdAt: string;
  reviewedBy?: string;
  approvedBy?: string; // 承認者（起票者と異なることを強制）
  approvedAt?: string;
  submittedAt?: string;
  xmlGeneratedAt?: string;
}

// ============================================================================
// 履歴・派生
// ============================================================================

/** 外字置換マッピング（cr_gaijimap）— 医師単位の確認履歴 */
export interface GaijiRecord {
  id: string;
  doctorId: string;
  notificationId?: string;
  targetColumn: string;
  originalChar: string;
  codePoint: string;
  replacementChar: string;
  gaijiType: number; // 外字判定区分
  confirmedBy: string;
  confirmedOn: string;
}

/** 監査ログ（横断・全操作の記録） */
export interface AuditEntry {
  id: string;
  at: string; // ISO
  who: string; // ユーザー名
  action: "create" | "update" | "delete" | "restore" | "submit" | "approve" | "generate-xml";
  entity: string; // テーブル表示名
  entityRef: string; // 対象の識別子
  summary: string; // 何を・どう変えたか
}

/** ダッシュボードのアラート／リマインダ（派生・非永続） */
export interface AlertItem {
  id: string;
  kind: "alert" | "reminder";
  severity: "high" | "med" | "low";
  notificationId?: string;
  titleJa: string;
  titleEn: string;
  detailJa: string;
  detailEn: string;
  dueDate?: string; // 期限日
}
