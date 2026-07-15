import { useEffect, useMemo, useState } from "react";
import { useLang } from "../../i18n";
import { columnOf, requiredFor, shouldShow, isRequired } from "../schema";
import {
  is30DayReview,
  computeDeadline,
  changeTiming,
  TIMING_LABEL,
  recommendKubun,
  canApprove,
  canSubmit,
} from "../logic";
import {
  CHANGE_TYPE,
  DOCTOR_ROLE,
  DRUG_ROLE,
  KUBUN,
  SET,
  ATTACH_STATUS,
  COMB,
  SUBJ30_OPTIONS,
  APPLICABILITY_OPTIONS,
  daysUntil,
  fmtDate,
  label,
  options,
  notifTypeName,
  NOTIF_TYPE_SHORT,
  userById,
  type DemoUser,
} from "../refData";
import { Section, Field, StatusPill, TypeBadge, Btn, Icon, UnconfirmedBadge } from "./common";
import type { CtnDb } from "../data/repository";
import type { Investigator, Notification, ReferenceNote, Site, SiteDrugQty, StudyDrug } from "../types";

type Cb = (n: Notification) => Promise<Notification | void> | Notification | void;

export function NotificationDetail({
  notification,
  db,
  user,
  onBack,
  onSave,
  onSendReview,
  onApprove,
  onSubmit,
  onDelete,
  onGenerateXml,
}: {
  notification: Notification;
  db: CtnDb;
  user: DemoUser;
  onBack: () => void;
  onSave: Cb;
  onSendReview: (id: string) => void;
  onApprove: (id: string) => void;
  onSubmit: (id: string) => void;
  onDelete: (id: string) => void;
  onGenerateXml: (n: Notification) => void;
}) {
  const { t, lang } = useLang();
  const [draft, setDraft] = useState<Notification>(() => structuredClone(notification));
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<string>("basic");
  const compound = db.compounds.find((c) => c.id === draft.compoundId)!;
  const editable = draft.status === "draft" || draft.status === "review";

  const upd = (fn: (n: Notification) => void) =>
    setDraft((d) => {
      const c = structuredClone(d);
      fn(c);
      return c;
    });
  const set = (fn: (n: Notification) => void) => {
    upd(fn);
    setDirty(true);
  };

  // schema 駆動の必須・表示
  const mk = (col: string) => requiredFor(columnOf("cr_notification", col), draft.notifType);
  const show = (col: string) => shouldShow(mk(col));
  const req = (col: string) => isRequired(mk(col));

  const is30 = is30DayReview(draft);
  const deadline = computeDeadline(draft);
  const du = daysUntil(deadline);
  const kubunSug = useMemo(() => recommendKubun(draft), [draft]);

  const activeDoctors = db.doctors.filter((d) => d.active);
  const activeInstitutions = db.institutions.filter((i) => i.active);
  const activeIrbs = db.irbs.filter((i) => i.active);
  const activeStaff = db.siteStaff.filter((s) => s.active);

  const jobSepBlocked = draft.createdBy === user.id;

  // サーバーのワークフロー遷移（レビュー送付・承認・提出・XML生成）で親から新しい
  // notification が来たら draft を同期する。未保存編集の黙殺を避けるため、mount key は
  // App 側で id のみに固定し、遷移の検知はここで status / xmlGeneratedAt を見て行う。
  useEffect(() => {
    setDraft(structuredClone(notification));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification.status, notification.xmlGeneratedAt]);

  const save = async () => {
    // 保存後にサーバーが確定した順序番号などを draft へ反映（XMLプレビューの SERIALNO 整合）
    const saved = await onSave(draft);
    if (saved) setDraft(structuredClone(saved));
    setDirty(false);
  };

  // ---------- 治験使用薬 ----------
  const addStudyDrug = () =>
    set((n) => {
      const hasMain = n.studyDrugs.some((d) => d.drugRole === DRUG_ROLE.main);
      const nd: StudyDrug = {
        id: `sd-${Math.random().toString(36).slice(2, 8)}`,
        drugRole: hasMain ? DRUG_ROLE.other : DRUG_ROLE.main,
        serialNo: 0,
        drugName: "",
        plantName: "",
        plantAddress1: "",
        plantAddress2: "",
        plantCode: "",
        ingredients: "",
        intendEffects: "",
        efficacyClassCode: "",
        intendDosage: "",
        combCategory: hasMain ? COMB.control : undefined,
      };
      n.studyDrugs.push(nd);
    });
  const rmStudyDrug = (id: string) =>
    set((n) => {
      const removed = n.studyDrugs.find((d) => d.id === id);
      n.studyDrugs = n.studyDrugs.filter((d) => d.id !== id);
      for (const s of n.sites) s.quantities = s.quantities.filter((q) => q.studyDrugId !== id);
      // 「1届1行の主たる被験薬」を維持：主たる被験薬を削除したら残りの先頭を主へ昇格
      if (removed?.drugRole === DRUG_ROLE.main && n.studyDrugs.length > 0 && !n.studyDrugs.some((d) => d.drugRole === DRUG_ROLE.main)) {
        n.studyDrugs[0].drugRole = DRUG_ROLE.main;
        n.studyDrugs[0].combCategory = undefined;
      }
    });

  // ---------- 実施医療機関 ----------
  const addSite = () =>
    set((n) => {
      const inst = activeInstitutions[0];
      const nsite: Site = {
        id: `site-${Math.random().toString(36).slice(2, 8)}`,
        institutionId: inst?.id ?? "",
        serialNo: 0, // サーバー（finalizeSerials）が SERIALNO1 を確定

        department: "",
        plannedSubjects: 0,
        irbId: activeIrbs[0]?.id ?? "",
        investigators: [],
        quantities: n.studyDrugs.map((d) => ({ studyDrugId: d.id, serialNo: d.serialNo, qtyPlanned: 0 })),
      };
      n.sites.push(nsite);
    });
  const rmSite = (id: string) => set((n) => (n.sites = n.sites.filter((s) => s.id !== id)));

  // ---------- 医師ロスター ----------
  const addInvestigator = (siteId: string, doctorId: string, role: number) =>
    set((n) => {
      const site = n.sites.find((s) => s.id === siteId);
      const doc = db.doctors.find((d) => d.id === doctorId);
      if (!site || !doc) return;
      const changeType = n.notifType === "change" ? CHANGE_TYPE.add : CHANGE_TYPE.register;
      const inv: Investigator = {
        id: `inv-${Math.random().toString(36).slice(2, 8)}`,
        doctorId,
        doctorRole: role,
        serialNo: 0,
        changeType,
        nameOriginal: doc.nameOriginal,
        nameFiling: doc.nameFiling,
        pronounce: doc.pronounce,
        medSchoolNo: doc.medSchoolNo,
        graduationYear: doc.graduationYear,
        ...(n.notifType === "change" ? { changeDate: "", changeReason: "分担医師の追加" } : {}),
      };
      site.investigators.push(inv);
    });
  const removeInvestigator = (siteId: string, invId: string) =>
    set((n) => {
      const site = n.sites.find((s) => s.id === siteId);
      if (!site) return;
      const inv = site.investigators.find((i) => i.id === invId);
      if (!inv) return;
      if (n.notifType === "change" && inv.changeType !== CHANGE_TYPE.add) {
        // 変更届：削除はイベント行（DELETE）として記録（物理削除しない）
        inv.changeType = CHANGE_TYPE.remove;
        inv.changeReason = "分担医師の削除";
      } else {
        // 計画届 or 追加したばかりの行は物理的に取り消し
        site.investigators = site.investigators.filter((i) => i.id !== invId);
      }
    });

  // ---------- 数量 ----------
  const setQty = (siteId: string, studyDrugId: string, field: keyof SiteDrugQty, value: number) =>
    set((n) => {
      const site = n.sites.find((s) => s.id === siteId);
      if (!site) return;
      let q = site.quantities.find((x) => x.studyDrugId === studyDrugId);
      if (!q) {
        q = { studyDrugId, serialNo: 0, qtyPlanned: 0 };
        site.quantities.push(q);
      }
      (q[field] as number) = value;
    });

  // 治験使用薬の任意フィールド更新
  const setDrug = (id: string, fn: (d: StudyDrug) => void) =>
    set((n) => {
      const d = n.studyDrugs.find((x) => x.id === id);
      if (d) fn(d);
    });

  // 参照治験届出
  const addReference = () =>
    set((n) =>
      n.references.push({ id: `ref-${Math.random().toString(36).slice(2, 8)}`, serialNo: n.references.length + 1, refCategory: "医薬品", refCode: "", refCount: "", refType: "", refContents: "" })
    );
  const setRef = (id: string, fn: (r: ReferenceNote) => void) =>
    set((n) => {
      const r = n.references.find((x) => x.id === id);
      if (r) fn(r);
    });
  const rmReference = (id: string) => set((n) => (n.references = n.references.filter((r) => r.id !== id)));

  const terminal = draft.notifType === "termination" || draft.notifType === "completion";
  const activeSponsors = db.sponsors.filter((s) => s.active);
  const sponsor = db.sponsors.find((s) => s.id === draft.sponsorId);

  // 詳細画面のセクションをかたまり（タブ）に分けて横並びのボタンで切替
  const isDevDisc = draft.notifType === "devDiscontinuation";
  const detailTabs: { key: string; label: [string, string]; show: boolean }[] = [
    { key: "basic", label: ["Basics", "基本情報"], show: true },
    { key: "plan", label: ["Plan summary", "治験計画概要"], show: !isDevDisc },
    { key: "drugs", label: ["Study drugs", "治験使用薬"], show: !isDevDisc },
    { key: "sites", label: ["Institutions", "実施医療機関"], show: !isDevDisc },
    { key: "refs", label: ["Refs / attachments", "参照・添付・照会"], show: !isDevDisc || draft.inquiries.length > 0 },
  ];
  const visibleTabs = detailTabs.filter((tb) => tb.show);
  const activeTab = visibleTabs.some((tb) => tb.key === tab) ? tab : visibleTabs[0].key;

  return (
    <div className="detail">
      {/* ===== ヘッダー ===== */}
      <div className="detail-top">
        <button className="back" onClick={onBack}>← {t("Back", "一覧へ")}</button>
        <div className="detail-title">
          <div className="dt-code">{compound.compoundCode}</div>
          <TypeBadge type={draft.notifType} full />
          <span className="dt-count">#{draft.filingCount}{draft.changeCount != null ? ` ・変更${draft.changeCount}` : ""}</span>
          <StatusPill status={draft.status} />
        </div>
        <div className="detail-actions">
          {editable && <Btn kind="p" small onClick={save} disabled={!dirty}>{Icon.check} {t("Save", "保存")}</Btn>}
          {draft.status === "draft" && <Btn small onClick={() => onSendReview(draft.id)} disabled={dirty} title={dirty ? "先に保存してください" : ""}>{t("Send for review", "レビュー送付")}</Btn>}
          {draft.status === "review" && (
            <Btn kind="p" small onClick={() => onApprove(draft.id)} disabled={dirty} title={dirty ? "先に保存してください" : jobSepBlocked ? "職務分離：起票者は承認できません" : ""}>{t("Approve", "承認")}</Btn>
          )}
          {draft.status === "approved" && <Btn kind="p" small onClick={() => onSubmit(draft.id)}>{t("Submit", "提出")}</Btn>}
          <Btn small onClick={() => onGenerateXml(draft)}>{Icon.doc} XML{t(" preview", "プレビュー")}</Btn>
          {draft.status === "draft" && <Btn kind="danger" small onClick={() => onDelete(draft.id)}>{Icon.trash}</Btn>}
        </div>
      </div>

      {/* ===== ワークフロー進捗 ===== */}
      <div className="wf">
        {(["draft", "review", "approved", "submitted"] as const).map((s, i) => {
          const order = ["draft", "review", "approved", "submitted"];
          const cur = order.indexOf(draft.status);
          const state = i < cur ? "done" : i === cur ? "cur" : "todo";
          const names = { draft: ["Draft", "作成中"], review: ["In Review", "レビュー中"], approved: ["Approved", "承認済み"], submitted: ["Submitted", "提出済み"] } as const;
          return (
            <div key={s} className={`wf-step ${state}`}>
              <span className="wf-dot">{i < cur ? "✓" : i + 1}</span>
              <span className="wf-name">{t(names[s][0], names[s][1])}</span>
            </div>
          );
        })}
      </div>

      {jobSepBlocked && draft.status === "review" && (
        <div className="banner banner-amber">⚠ {t("Job separation: you drafted this filing and cannot approve it. Switch to another approver (top-right).", "職務分離：あなたはこの届の起票者のため承認できません。右上でユーザーを承認者に切り替えてください。")}</div>
      )}

      {/* ===== 提出期限バナー ===== */}
      {(draft.notifType === "plan" || draft.notifType === "change") && deadline && (
        <div className={`banner deadline ${du != null && du < 0 ? "banner-red" : du != null && du <= 7 ? "banner-red" : du != null && du <= 14 ? "banner-amber" : "banner-blue"}`}>
          <b>{t("Submission deadline", "提出期限")}: {fmtDate(deadline)}</b>
          <span>{
            draft.notifType === "change"
              ? (() => { const tm = changeTiming(draft.changeLocations); return tm ? t(`Timing: ${TIMING_LABEL[tm][0]}`, `提出時期: ${TIMING_LABEL[tm][1]}（変更予定日基準）`) : t("select change locations", "変更箇所を選択してください"); })()
              : is30 ? t("first plan · 30-day review (start −30d)", "初回計画届・30日調査対象（開始予定日−30日）") : t("N-th plan (start −14d)", "N回届（開始予定日−14日）")
          }</span>
          {du != null && <span className="banner-days">{du < 0 ? t(`${-du}d overdue`, `${-du}日超過`) : t(`${du} days left`, `残り${du}日`)}</span>}
        </div>
      )}

      {/* ===== セクションタブ（横並びショートカット） ===== */}
      <div className="detail-tabs">
        {visibleTabs.map((tb) => (
          <button key={tb.key} type="button" className={`dtab${activeTab === tb.key ? " on" : ""}`} onClick={() => setTab(tb.key)}>
            {t(tb.label[0], tb.label[1])}
          </button>
        ))}
      </div>

      {/* ===== 基本情報タブ（基本情報 + 治験届出者 + 備考） ===== */}
      {activeTab === "basic" && (<>
      <Section title={t("Basic information", "基本情報")} sub={t("Common items — inherited from the series where possible", "共通事項（可能な限りシリーズから継承）")}>
        <div className="form-grid">
          <Field label={t("Notification type", "届出種別")} mark="always"><input className="tin" value={notifTypeName(draft.notifType, lang)} disabled /></Field>
          <Field label={t("Filing count (auto)", "届出回数（自動）")} mark="auto"><input className="tin" value={`#${draft.filingCount}`} disabled /></Field>
          {draft.notifType === "change" && <Field label={t("Change count (auto)", "変更回数（自動）")} mark="auto"><input className="tin" value={`${draft.changeCount ?? "—"}`} disabled /></Field>}
          {show("cr_receptno") && (
            <Field label={t("Receipt no.", "当該届出受付番号")} mark={mk("cr_receptno")}>
              <input className="tin" value={draft.receptNo ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.receptNo = e.target.value))} placeholder={draft.notifType === "plan" ? "（計画届は空欄）" : "例：R6薬第1234号"} />
            </Field>
          )}
          {show("cr_receptdate") && (
            <Field label={t("Receipt date", "当該届出年月日")} mark={mk("cr_receptdate")}>
              <input type="date" className="tin" value={draft.receptDate ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.receptDate = e.target.value))} />
            </Field>
          )}
          {show("cr_plannedstartdate") && (
            <Field label={t("Planned start date", "治験開始予定日")} mark={mk("cr_plannedstartdate")} unconfirmed>
              <input type="date" className="tin" value={draft.plannedStartDate ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.plannedStartDate = e.target.value))} />
            </Field>
          )}
          {show("cr_subj30dayreview") && (
            <Field label={t("30-day review drug category", "30日調査対応被験薬区分")} mark={mk("cr_subj30dayreview")} unconfirmed>
              <select className="sel" value={draft.subj30dayReview ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.subj30dayReview = e.target.value ? Number(e.target.value) : undefined))}>
                <option value="">—</option>
                {SUBJ30_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          )}
          <Field label={t("Kubun (submission category)", "届出区分")} mark="always" hint={kubunSug ? `${t("Recommended", "推奨")}: ${label(SET.kubun, kubunSug.value)} — ${lang === "ja" ? kubunSug.reasonJa : kubunSug.reasonEn}` : ""}>
            <div className="inline">
              <select className="sel" value={draft.kubun ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.kubun = Number(e.target.value)))}>
                <option value="">—</option>
                {options(SET.kubun).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {editable && <Btn small onClick={() => set((n) => (n.kubun = kubunSug.value))}>{t("Apply recommendation", "推奨を適用")}</Btn>}
            </div>
          </Field>
        </div>

        {draft.notifType === "change" && (
          <Field label={t("Change locations (drives kubun & submission timing)", "変更箇所（届出区分・提出時期の判定に使用）")} mark="always" wide>
            <div className="chips">
              {options(SET.changeLocations).map((o) => {
                const on = draft.changeLocations.includes(o.value);
                return (
                  <button key={o.value} type="button" className={`chip${on ? " on" : ""}`} disabled={!editable} onClick={() => set((n) => (n.changeLocations = on ? n.changeLocations.filter((x) => x !== o.value) : [...n.changeLocations, o.value]))}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {(draft.notifType === "termination" || draft.notifType === "devDiscontinuation") && (
          <div className="form-grid">
            <Field label={t("Termination date", "中止年月日")} mark="always"><input type="date" className="tin" value={draft.terminationDate ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.terminationDate = e.target.value))} /></Field>
            <Field label={t("Termination reason", "中止理由")} mark="always" wide><input className="tin" value={draft.terminationReason ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.terminationReason = e.target.value))} /></Field>
            {draft.notifType === "termination" && <Field label={t("Post-termination status", "その後の対応状況")} mark="always" wide><input className="tin" value={draft.postTermination ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.postTermination = e.target.value))} /></Field>}
          </div>
        )}
      </Section>

      {/* ===== 治験届出者 ===== */}
      <Section title={t("Sponsor / notifier", "治験届出者")} sub={t("Selected from the master; contact details shown for reference.", "マスタから選択。連絡先等は参照表示。")}>
        <div className="form-grid">
          <Field label={t("Sponsor", "治験届出者")} mark="always"><select className="sel" value={draft.sponsorId} disabled={!editable} onChange={(e) => set((n) => (n.sponsorId = e.target.value))}>{activeSponsors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          {sponsor && <Field label={t("Contact", "届出担当者")}><input className="tin" value={`${sponsor.contactName}（${sponsor.contactTitle}）`} disabled /></Field>}
          {sponsor && <Field label={t("Manufacturer code", "業者コード")}><input className="tin" value={sponsor.manufacturerCode} disabled /></Field>}
          {sponsor && <Field label={t("Tel / contact", "電話・連絡先")}><input className="tin" value={`${sponsor.telNo} / ${sponsor.faxOrMail}`} disabled /></Field>}
        </div>
      </Section>

      {/* 備考（基本情報タブ内。開発中止届では必須◎） */}
      {show("cr_remarks") && (
        <Section title={t("Remarks", "備考")}>
          <Field label={t("Remarks", "備考（通信欄）")} mark={mk("cr_remarks")} wide><textarea className="ta" value={draft.remarks ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.remarks = e.target.value))} placeholder={draft.notifType === "devDiscontinuation" ? "開発中止届では実質必須（中止の経緯・以降の対応等）" : ""} /></Field>
        </Section>
      )}
      </>)}

      {/* ===== 治験計画概要タブ ===== */}
      {activeTab === "plan" && (
        <Section title={t("Trial plan summary", "治験計画概要")}>
          <div className="form-grid">
            {show("cr_protocolno") && <Field label={t("Protocol ID", "実施計画書識別記号")} mark={mk("cr_protocolno")}><input className="tin" value={draft.protocolNo} disabled={!editable} onChange={(e) => set((n) => (n.protocolNo = e.target.value))} /></Field>}
            {show("cr_phase") && <Field label={t("Phase", "開発の相")} mark={mk("cr_phase")}><select className="sel" value={draft.phase ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.phase = Number(e.target.value)))}><option value="">—</option>{options(SET.phase).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>}
            {show("cr_trialtype") && <Field label={t("Trial type", "試験の種類")} mark={mk("cr_trialtype")}><select className="sel" value={draft.trialType ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.trialType = Number(e.target.value)))}><option value="">—</option>{options(SET.trialType).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>}
            {show("cr_plannedsubjdrug") && <Field label={t("Planned subjects (drug)", "予定被験者数（被験薬）")} mark={mk("cr_plannedsubjdrug")}><input type="number" className="tin" value={draft.plannedSubjDrug ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.plannedSubjDrug = Number(e.target.value)))} /></Field>}
            {show("cr_plannedsubjtotal") && <Field label={t("Planned subjects (total)", "予定被験者数（合計）")} mark={mk("cr_plannedsubjtotal")}><input type="number" className="tin" value={draft.plannedSubjTotal ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.plannedSubjTotal = Number(e.target.value)))} /></Field>}
            {show("cr_periodstart") && <Field label={t("Period (start)", "実施期間（開始）")} mark={mk("cr_periodstart")}><input className="tin" value={draft.periodStart ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.periodStart = e.target.value))} placeholder="YYYY-MM" /></Field>}
            {show("cr_periodend") && <Field label={t("Period (end)", "実施期間（終了）")} mark={mk("cr_periodend")}><input className="tin" value={draft.periodEnd ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.periodEnd = e.target.value))} placeholder="YYYY-MM" /></Field>}
            {show("cr_isglobal") && <Field label={t("Global trial", "国際共同治験")} mark={mk("cr_isglobal")}><select className="sel" value={draft.isGlobal ? "1" : "0"} disabled={!editable} onChange={(e) => set((n) => (n.isGlobal = e.target.value === "1"))}><option value="0">{t("No", "いいえ")}</option><option value="1">{t("Yes", "はい")}</option></select></Field>}
          </div>
          {show("cr_objectives") && <Field label={t("Objectives", "目的")} mark={mk("cr_objectives")} wide><textarea className="ta" value={draft.objectives} disabled={!editable} onChange={(e) => set((n) => (n.objectives = e.target.value))} /></Field>}
          {show("cr_targetdisease") && <Field label={t("Target disease (main drug)", "主たる被験薬の対象疾患")} mark={mk("cr_targetdisease")} wide><input className="tin" value={draft.targetDisease} disabled={!editable} onChange={(e) => set((n) => (n.targetDisease = e.target.value))} /></Field>}
          {show("cr_reasononerous") && <Field label={t("Reason for onerous trial", "有償の理由等")} mark={mk("cr_reasononerous")} unconfirmed wide><textarea className="ta" value={draft.reasonOnerous ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.reasonOnerous = e.target.value))} placeholder={t("Only for onerous (paid) trials", "有償治験の場合のみ")} /></Field>}

          {/* ===== 手引き4.3 条件付き項目（該当時のみ） ===== */}
          <div className="form-sub">{t("Conditional items (Guide §4.3 — only when applicable)", "条件付き項目（手引き4.3・該当時のみ）")}</div>
          <div className="form-grid">
            {show("cr_biological") && <Field label={t("Biological product", "生物由来製品 該当有無")} mark={mk("cr_biological")} unconfirmed><select className="sel" value={draft.applicBiological ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.applicBiological = e.target.value === "" ? undefined : Number(e.target.value)))}><option value="">—</option>{APPLICABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>}
            {show("cr_cartagena") && <Field label={t("Cartagena Act", "カルタヘナ法 該当有無")} mark={mk("cr_cartagena")} unconfirmed><select className="sel" value={draft.applicCartagena ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.applicCartagena = e.target.value === "" ? undefined : Number(e.target.value)))}><option value="">—</option>{APPLICABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>}
            {show("cr_expandedaccess") && <Field label={t("Expanded access", "拡大治験 該当有無")} mark={mk("cr_expandedaccess")} unconfirmed><select className="sel" value={draft.applicExpandedAccess ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.applicExpandedAccess = e.target.value === "" ? undefined : Number(e.target.value)))}><option value="">—</option>{APPLICABILITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>}
          </div>
          {draft.applicBiological === 1 && <Field label={t("Biological — detail", "生物由来製品 詳細")} mark={mk("cr_biologicaldetail")} wide><textarea className="ta" value={draft.applicBiologicalDetail ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.applicBiologicalDetail = e.target.value))} /></Field>}
          {draft.applicCartagena === 1 && <Field label={t("Cartagena — detail", "カルタヘナ法 詳細")} mark={mk("cr_cartagenadetail")} wide><textarea className="ta" value={draft.applicCartagenaDetail ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.applicCartagenaDetail = e.target.value))} /></Field>}
          {draft.applicExpandedAccess === 1 && <Field label={t("Expanded access — detail", "拡大治験 詳細")} mark={mk("cr_expandedaccessdetail")} wide><textarea className="ta" value={draft.applicExpandedAccessDetail ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.applicExpandedAccessDetail = e.target.value))} /></Field>}
          <div className="form-grid">
            {show("cr_chargeoutperson") && <Field label={t("Cost bearer", "費用負担者氏名")} mark={mk("cr_chargeoutperson")}><input className="tin" value={draft.chargeOutPersonName ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.chargeOutPersonName = e.target.value))} placeholder={t("Only when applicable", "該当する場合のみ")} /></Field>}
          </div>
          {show("cr_validityreasons") && <Field label={t("Validity reasons (cost)", "費用負担の妥当性の理由")} mark={mk("cr_validityreasons")} wide><textarea className="ta" value={draft.validityReasons ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.validityReasons = e.target.value))} /></Field>}
          {show("cr_othercommentsprimary") && <Field label={t("Other comments (main drug)", "その他コメント（主たる被験薬）")} mark={mk("cr_othercommentsprimary")} wide><textarea className="ta" value={draft.otherCommentsPrimary ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.otherCommentsPrimary = e.target.value))} /></Field>}
          {show("cr_othercommentsprotocol") && <Field label={t("Other comments (protocol)", "その他コメント（治験計画書）")} mark={mk("cr_othercommentsprotocol")} wide><textarea className="ta" value={draft.otherCommentsProtocol ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.otherCommentsProtocol = e.target.value))} /></Field>}

          {/* ===== CRO（開発業務受託機関）・要確認：繰り返しは単数入力で代表 ===== */}
          <div className="form-sub">{t("CRO (contract research org.) — single entry in this demo", "開発業務受託機関（CRO）・本デモは単数入力")}</div>
          <div className="form-grid">
            {show("cr_croname") && <Field label={t("CRO name", "CRO 名称")} mark={mk("cr_croname")} unconfirmed><input className="tin" value={draft.croName ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.croName = e.target.value))} /></Field>}
            {show("cr_croaddress1") && <Field label={t("CRO address 1", "CRO 所在地1")} mark={mk("cr_croaddress1")} unconfirmed><input className="tin" value={draft.croAddress1 ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.croAddress1 = e.target.value))} /></Field>}
            {show("cr_croaddress2") && <Field label={t("CRO address 2", "CRO 所在地2")} mark={mk("cr_croaddress2")} unconfirmed><input className="tin" value={draft.croAddress2 ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.croAddress2 = e.target.value))} /></Field>}
          </div>
          {show("cr_croservice") && <Field label={t("CRO scope of work", "CRO 受託業務の範囲")} mark={mk("cr_croservice")} unconfirmed wide><textarea className="ta" value={draft.croService ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.croService = e.target.value))} /></Field>}

          {/* ===== 治験調整医師・調整委員会・要確認：繰り返しは単数入力で代表 ===== */}
          <div className="form-sub">{t("Coordinating investigator / committee — single entry in this demo", "治験調整医師・調整委員会・本デモは単数入力")}</div>
          <div className="form-grid">
            {show("cr_coordname") && <Field label={t("Coordinating investigator", "治験調整医師 氏名")} mark={mk("cr_coordname")} unconfirmed><input className="tin" value={draft.coordName ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.coordName = e.target.value))} /></Field>}
            {show("cr_coordaffiliation") && <Field label={t("Affiliation", "所属")} mark={mk("cr_coordaffiliation")} unconfirmed><input className="tin" value={draft.coordAffiliation ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.coordAffiliation = e.target.value))} /></Field>}
            {show("cr_coordinstitution") && <Field label={t("Medical institution", "医療機関名")} mark={mk("cr_coordinstitution")} unconfirmed><input className="tin" value={draft.coordInstitution ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.coordInstitution = e.target.value))} /></Field>}
          </div>

          <div className="form-grid">
            <Field label={t("GW receipt no.", "GW受付番号")} mark={mk("cr_gwreceptno")} hint={t("Entered after PMDA gateway acceptance", "提出後にPMDA受付完了メールから入力")}><input className="tin" value={draft.gwReceptNo ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.gwReceptNo = e.target.value))} /></Field>
          </div>
          {show("cr_footnote") && <Field label={t("Footnote", "脚注")} mark={mk("cr_footnote")} unconfirmed wide><textarea className="ta" value={draft.footnote ?? ""} disabled={!editable} onChange={(e) => set((n) => (n.footnote = e.target.value))} /></Field>}
        </Section>
      )}

      {/* ===== 治験使用薬タブ ===== */}
      {activeTab === "drugs" && (
        <Section title={t("Study drugs", "治験使用薬")} sub={t("Serial no. = matching-key type: constant across the series (plan → completion). Expand a row for all fields.", "順序番号＝突合キー型：シリーズ内で不変。行を展開すると全項目を入力できます。")} right={editable ? <Btn kind="p" small onClick={addStudyDrug}>{Icon.plus} {t("Add drug", "薬を追加")}</Btn> : undefined}>
          {draft.studyDrugs.length === 0 && <div className="rt-empty">{t("No study drugs. Add the main investigational drug first.", "治験使用薬がありません。まず主たる被験薬を追加してください。")}</div>}
          {draft.studyDrugs.map((d) => (
            <StudyDrugCard key={d.id} drug={d} editable={editable} onField={(fn) => setDrug(d.id, fn)} onRemove={() => rmStudyDrug(d.id)} />
          ))}
        </Section>
      )}

      {/* ===== 実施医療機関タブ（医師ロスター・数量） ===== */}
      {activeTab === "sites" && (
        <Section title={t("Medical institutions", "実施医療機関")} sub={t("Doctors are edited as a roster; the server generates event rows with movement type.", "医師はロスター操作で編集。保存時に異動区分つきのイベント行が生成されます。")} right={editable ? <Btn kind="p" small onClick={addSite}>{Icon.plus} {t("Add site", "施設を追加")}</Btn> : undefined}>
          {draft.sites.length === 0 && <div className="rt-empty">{t("No sites yet.", "実施医療機関がありません。")}</div>}
          {draft.sites.map((s) => (
            <SiteCard key={s.id} site={s} draft={draft} db={db} editable={editable} terminal={terminal}
              onField={(fn) => set((n) => { const site = n.sites.find((x) => x.id === s.id)!; fn(site); })}
              onAddInv={(docId, role) => addInvestigator(s.id, docId, role)}
              onRemoveInv={(invId) => removeInvestigator(s.id, invId)}
              onQty={(drugId, field, val) => setQty(s.id, drugId, field, val)}
              onRemoveSite={() => rmSite(s.id)}
              activeDoctors={activeDoctors} activeInstitutions={activeInstitutions} activeIrbs={activeIrbs} activeStaff={activeStaff}
            />
          ))}
        </Section>
      )}

      {/* ===== 参照・添付・照会タブ ===== */}
      {activeTab === "refs" && (<>

      {draft.notifType !== "devDiscontinuation" && (
        <Section title={t("Referenced notifications", "参照治験届出")} sub={t("Other CTN filings referenced by this one.", "この届が参照する治験届出情報。")} right={editable ? <Btn small onClick={addReference}>{Icon.plus} {t("Add", "追加")}</Btn> : undefined}>
          {draft.references.length === 0 ? <div className="rt-empty">{t("No references.", "参照はありません。")}</div> : (
            <div className="row-table">
              <div className="rt-head rt-ref"><span>{t("Category", "医薬品等の別")}</span><span>{t("Code", "成分記号/識別記号")}</span><span>{t("Count", "届出回数")}</span><span>{t("Type", "参照の区分")}</span><span>{t("Detail", "参照の詳細")}</span><span /></div>
              {draft.references.map((r) => (
                <div key={r.id} className="rt-row rt-ref">
                  <span><select className="sel sel-sm" value={r.refCategory} disabled={!editable} onChange={(e) => setRef(r.id, (x) => (x.refCategory = e.target.value))}>{options(SET.targetCategory).map((o) => <option key={o.value} value={o.label}>{o.label}</option>)}</select></span>
                  <span><input className="tin tin-sm" value={r.refCode} disabled={!editable} onChange={(e) => setRef(r.id, (x) => (x.refCode = e.target.value))} /></span>
                  <span><input className="tin tin-sm" value={r.refCount} disabled={!editable} onChange={(e) => setRef(r.id, (x) => (x.refCount = e.target.value))} /></span>
                  <span><input className="tin tin-sm" value={r.refType} disabled={!editable} onChange={(e) => setRef(r.id, (x) => (x.refType = e.target.value))} /></span>
                  <span><input className="tin tin-sm" value={r.refContents} disabled={!editable} onChange={(e) => setRef(r.id, (x) => (x.refContents = e.target.value))} /></span>
                  <span>{editable && <button className="icon-btn danger" onClick={() => rmReference(r.id)}>{Icon.trash}</button>}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ===== 添付資料 ===== */}
      {draft.notifType !== "devDiscontinuation" && (
        <Section title={t("Attachments", "添付資料")} sub={t("Actual files live in SharePoint (demo uses pseudo paths).", "実体はSharePoint（デモは擬似パス）。")}
          right={editable ? <Btn small onClick={() => set((n) => n.attachments.push({ id: `att-${Math.random().toString(36).slice(2, 7)}`, docType: options(SET.docType)[0].value, docName: "", spReference: "", hasBookmarks: false, hasText: false, attachStatus: ATTACH_STATUS.checking }))}>{Icon.plus} {t("Add", "追加")}</Btn> : undefined}>
          {draft.attachments.length === 0 ? <div className="rt-empty">{t("No attachments.", "添付資料はありません。")}</div> : (
            <div className="row-table">
              <div className="rt-head rt-att"><span>{t("Type", "資料種別")}</span><span>{t("Name", "資料名")}</span><span>{t("Status", "状態")}</span><span /></div>
              {draft.attachments.map((a) => (
                <div key={a.id} className="rt-row rt-att">
                  <span><select className="sel sel-sm" value={a.docType} disabled={!editable} onChange={(e) => set((n) => { const x = n.attachments.find((y) => y.id === a.id)!; x.docType = Number(e.target.value); })}>{options(SET.docType).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></span>
                  <span><input className="tin tin-sm" value={a.docName} disabled={!editable} onChange={(e) => set((n) => { const x = n.attachments.find((y) => y.id === a.id)!; x.docName = e.target.value; })} placeholder="ファイル名" /></span>
                  <span><span className={`att-chip att-${a.attachStatus}`}>{label(SET.attachStatus, a.attachStatus)}</span></span>
                  <span>{editable && <button className="icon-btn danger" onClick={() => set((n) => (n.attachments = n.attachments.filter((y) => y.id !== a.id)))}>{Icon.trash}</button>}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* ===== PMDA照会（提出後） ===== */}
      {draft.inquiries.length > 0 && (
        <Section title={t("PMDA inquiries", "PMDA照会対応")} tableSchema="cr_inquiry" colSchema="cr_inquirycontent">
          <div className="row-table">
            {draft.inquiries.map((q) => (
              <div key={q.id} className="inq-row">
                <div className="inq-date">{fmtDate(q.inquiryDate)}</div>
                <div className="inq-body"><b>{q.inquiryContent}</b><div className="muted small">{t("Response due", "回答期限")}: {fmtDate(q.responseDeadline)} {q.responseDate ? `／ ${t("answered", "回答済")} ${fmtDate(q.responseDate)}` : ""}</div></div>
                <div className={`inq-flag ${q.responseDate ? "done" : "open"}`}>{q.responseDate ? t("Answered", "回答済") : t("Open", "未回答")}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
      </>)}

      <div className="detail-foot">
        <span className="muted small">
          {t("Created by", "起票")}: {userById(draft.createdBy)?.name ?? draft.createdBy}（{fmtDate(draft.createdAt)}）
          {draft.approvedBy && ` ／ ${t("approved by", "承認")}: ${userById(draft.approvedBy)?.name}`}
          {draft.submittedAt && ` ／ ${t("submitted", "提出")}: ${fmtDate(draft.submittedAt)}`}
          {draft.xmlGeneratedAt && ` ／ XML: ${draft.xmlGeneratedAt.replace("T", " ")}`}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 治験使用薬カード（展開すると全項目）
// ---------------------------------------------------------------------------
function StudyDrugCard({ drug, editable, onField, onRemove }: { drug: StudyDrug; editable: boolean; onField: (fn: (d: StudyDrug) => void) => void; onRemove: () => void }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const isMain = drug.drugRole === DRUG_ROLE.main;
  return (
    <div className="drugcard">
      <div className="drugcard-h" onClick={() => setOpen((o) => !o)}>
        <button className={`tog2${open ? " open" : ""}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path d="m9 18 6-6-6-6" /></svg></button>
        <span className={`role-chip ${isMain ? "resp" : "sub"}`}>{label(SET.drugRole, drug.drugRole)}</span>
        <span className="drug-serial">{drug.serialNo > 0 ? `#${drug.serialNo}` : <em className="muted">{t("auto", "採番前")}</em>}</span>
        <b className="drug-name">{drug.drugName || <em className="muted">{t("(unnamed drug)", "（未入力）")}</em>}</b>
        <div style={{ flex: 1 }} />
        {editable && <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); onRemove(); }}>{Icon.trash}</button>}
      </div>
      {open && (
        <div className="drugcard-b">
          <div className="form-grid">
            <Field label={t("Role", "主従区分")} mark="always"><select className="sel" value={drug.drugRole} disabled={!editable} onChange={(e) => onField((d) => (d.drugRole = Number(e.target.value)))}>{options(SET.drugRole).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
            <Field label={t("Drug name", "治験薬名称")} mark="always"><input className="tin" value={drug.drugName} disabled={!editable} onChange={(e) => onField((d) => (d.drugName = e.target.value))} /></Field>
            {!isMain && <Field label={t("ID type", "記号・名称等の種類")} mark="conditional" unconfirmed><input className="tin" value={drug.idType ?? ""} disabled={!editable} onChange={(e) => onField((d) => (d.idType = e.target.value))} /></Field>}
            {!isMain && <Field label={t("Category", "区別（被験薬/対照薬等）")} mark="conditional" unconfirmed><select className="sel" value={drug.combCategory ?? ""} disabled={!editable} onChange={(e) => onField((d) => (d.combCategory = e.target.value ? Number(e.target.value) : undefined))}><option value="">—</option>{options(SET.combCategory).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>}
            {!isMain && <Field label={t("Approval status (domestic)", "国内における承認状況")} mark="conditional" unconfirmed><input className="tin" value={drug.applicationStatus ?? ""} disabled={!editable} onChange={(e) => onField((d) => (d.applicationStatus = e.target.value))} /></Field>}
            {!isMain && <Field label={t("ADR report", "副作用報告の有無")} mark="conditional" unconfirmed><select className="sel" value={drug.adrReport ?? ""} disabled={!editable} onChange={(e) => onField((d) => (d.adrReport = e.target.value))}><option value="">—</option><option value="有">{t("Yes", "有")}</option><option value="無">{t("No", "無")}</option></select></Field>}
            <Field label={t("Manufacturer name", "製造所名称")} mark="always" unconfirmed><input className="tin" value={drug.plantName} disabled={!editable} onChange={(e) => onField((d) => (d.plantName = e.target.value))} /></Field>
            <Field label={t("Manufacturer code", "製造所業者コード")} mark="always"><input className="tin" value={drug.plantCode} disabled={!editable} onChange={(e) => onField((d) => (d.plantCode = e.target.value))} /></Field>
            <Field label={t("Manufacturer address 1", "製造所所在地1")} mark="always"><input className="tin" value={drug.plantAddress1} disabled={!editable} onChange={(e) => onField((d) => (d.plantAddress1 = e.target.value))} /></Field>
            <Field label={t("Manufacturer address 2", "製造所所在地2")} mark="always"><input className="tin" value={drug.plantAddress2} disabled={!editable} onChange={(e) => onField((d) => (d.plantAddress2 = e.target.value))} /></Field>
            <Field label={t("Efficacy class code", "薬効分類番号")} mark="always" unconfirmed><input className="tin" value={drug.efficacyClassCode} disabled={!editable} onChange={(e) => onField((d) => (d.efficacyClassCode = e.target.value))} /></Field>
            <Field label={t("Dosage form code", "剤形コード")} unconfirmed><input className="tin" value={drug.dosageFormCode ?? ""} disabled={!editable} onChange={(e) => onField((d) => (d.dosageFormCode = e.target.value))} /></Field>
            <Field label={t("Admin route code", "投与経路コード")}><input className="tin" value={drug.adminRouteCode ?? ""} disabled={!editable} onChange={(e) => onField((d) => (d.adminRouteCode = e.target.value))} /></Field>
          </div>
          <Field label={t("Ingredients & quantity", "成分及び分量")} mark="always" wide><textarea className="ta" value={drug.ingredients} disabled={!editable} onChange={(e) => onField((d) => (d.ingredients = e.target.value))} /></Field>
          <Field label={t("Manufacturing method", "製造方法")} wide><textarea className="ta" value={drug.manufactMethod ?? ""} disabled={!editable} onChange={(e) => onField((d) => (d.manufactMethod = e.target.value))} /></Field>
          <Field label={t("Intended effects", "予定される効能効果")} mark="always" wide><textarea className="ta" value={drug.intendEffects} disabled={!editable} onChange={(e) => onField((d) => (d.intendEffects = e.target.value))} /></Field>
          <Field label={t("Intended dosage", "予定される用法用量")} mark="always" wide><textarea className="ta" value={drug.intendDosage} disabled={!editable} onChange={(e) => onField((d) => (d.intendDosage = e.target.value))} /></Field>
          <Field label={t("Dosage & administration", "用法及び用量")} mark="always" unconfirmed wide><textarea className="ta" value={drug.dosageAdmin ?? ""} disabled={!editable} onChange={(e) => onField((d) => (d.dosageAdmin = e.target.value))} /></Field>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 施設カード（医師ロスター＋数量マトリクス）
// ---------------------------------------------------------------------------
function SiteCard({
  site, draft, db, editable, terminal, onField, onAddInv, onRemoveInv, onQty, onRemoveSite,
  activeDoctors, activeInstitutions, activeIrbs, activeStaff,
}: {
  site: Site; draft: Notification; db: CtnDb; editable: boolean; terminal: boolean;
  onField: (fn: (s: Site) => void) => void;
  onAddInv: (doctorId: string, role: number) => void;
  onRemoveInv: (invId: string) => void;
  onQty: (studyDrugId: string, field: keyof SiteDrugQty, val: number) => void;
  onRemoveSite: () => void;
  activeDoctors: typeof db.doctors; activeInstitutions: typeof db.institutions; activeIrbs: typeof db.irbs; activeStaff: typeof db.siteStaff;
}) {
  const { t } = useLang();
  const [pickDoc, setPickDoc] = useState("");
  const [pickRole, setPickRole] = useState(String(DOCTOR_ROLE.sub));
  const inst = db.institutions.find((i) => i.id === site.institutionId);
  const changeTypeBadge = (ct: number) => {
    const cls = ct === CHANGE_TYPE.add ? "add" : ct === CHANGE_TYPE.remove ? "remove" : ct === CHANGE_TYPE.register ? "register" : "cont";
    return <span className={`mv mv-${cls}`}>{label(SET.changeType, ct)}</span>;
  };
  const rosterDoctorIds = new Set(site.investigators.map((i) => i.doctorId));

  return (
    <div className="sitecard">
      <div className="sitecard-h">
        <div className="site-serial">{t("Site", "施設")} {site.serialNo > 0 ? `#${site.serialNo}` : t("(new)", "（採番前）")}</div>
        <select className="sel sel-sm" value={site.institutionId} disabled={!editable} onChange={(e) => onField((s) => (s.institutionId = e.target.value))}>
          {activeInstitutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        {editable && <button className="icon-btn danger" onClick={onRemoveSite} title="施設を削除">{Icon.trash}</button>}
      </div>
      <div className="site-grid">
        <Field label={t("Department", "実施診療科")} mark="always"><input className="tin tin-sm" value={site.department} disabled={!editable} onChange={(e) => onField((s) => (s.department = e.target.value))} /></Field>
        <Field label={t("Planned subjects", "予定被験者数")} mark="always"><input type="number" className="tin tin-sm" value={site.plannedSubjects} disabled={!editable} onChange={(e) => onField((s) => (s.plannedSubjects = Number(e.target.value)))} /></Field>
        <Field label={t("IRB", "IRB")} mark="always"><select className="sel sel-sm" value={site.irbId} disabled={!editable} onChange={(e) => onField((s) => (s.irbId = e.target.value))}>{activeIrbs.map((i) => <option key={i.id} value={i.id}>{i.ownerName}</option>)}</select></Field>
        <Field label={t("CRC", "CRC")}><select className="sel sel-sm" value={site.crcStaffId ?? ""} disabled={!editable} onChange={(e) => onField((s) => (s.crcStaffId = e.target.value || undefined))}><option value="">—</option>{activeStaff.filter((st) => st.institutionId === site.institutionId).map((st) => <option key={st.id} value={st.id}>{st.name}（{st.role}）</option>)}</select></Field>
        {terminal && <Field label={t("Enrolled subjects", "実施医療機関被験者数")} mark="always"><input type="number" className="tin tin-sm" value={site.enrolledSubjects ?? ""} disabled={!editable} onChange={(e) => onField((s) => (s.enrolledSubjects = Number(e.target.value)))} /></Field>}
        <Field label={t("SMO name", "SMO名称")}><input className="tin tin-sm" value={site.smoName ?? ""} disabled={!editable} onChange={(e) => onField((s) => (s.smoName = e.target.value))} placeholder={t("If SMO is used", "SMOありの場合")} /></Field>
        <Field label={t("SMO address 1", "SMO住所1")}><input className="tin tin-sm" value={site.smoAddress1 ?? ""} disabled={!editable} onChange={(e) => onField((s) => (s.smoAddress1 = e.target.value))} /></Field>
        <Field label={t("SMO address 2", "SMO住所2")}><input className="tin tin-sm" value={site.smoAddress2 ?? ""} disabled={!editable} onChange={(e) => onField((s) => (s.smoAddress2 = e.target.value))} /></Field>
        <Field label={t("SMO service scope", "SMO委託業務範囲")}><input className="tin tin-sm" value={site.smoService ?? ""} disabled={!editable} onChange={(e) => onField((s) => (s.smoService = e.target.value))} /></Field>
        <Field label={t("Others", "その他")} unconfirmed><input className="tin tin-sm" value={site.others ?? ""} disabled={!editable} onChange={(e) => onField((s) => (s.others = e.target.value))} /></Field>
      </div>

      {/* 医師ロスター */}
      <div className="roster">
        <div className="roster-h">{t("Investigator roster", "分担医師ロスター")} <span className="muted small">（{inst?.name}）</span></div>
        {site.investigators.map((inv) => (
          <div key={inv.id} className={`roster-row${inv.changeType === CHANGE_TYPE.remove ? " removed" : ""}`}>
            <span className={`role-chip ${inv.doctorRole === DOCTOR_ROLE.responsible ? "resp" : "sub"}`}>{label(SET.doctorRole, inv.doctorRole)}</span>
            <span className="rname">{inv.nameFiling}<small className="muted"> {inv.pronounce}</small>{inv.nameOriginal !== inv.nameFiling && <small className="gaiji-note"> 原表記:{inv.nameOriginal}</small>}</span>
            <span className="rserial">{inv.serialNo > 0 ? `#${inv.serialNo}` : ""}</span>
            {draft.notifType === "change" && changeTypeBadge(inv.changeType)}
            {editable && inv.changeType !== CHANGE_TYPE.remove && <button className="icon-btn danger sm" onClick={() => onRemoveInv(inv.id)} title="ロスターから抜く">{Icon.x}</button>}
          </div>
        ))}
        {editable && (
          <div className="roster-add">
            <select className="sel sel-sm" value={pickDoc} onChange={(e) => setPickDoc(e.target.value)}>
              <option value="">{t("Select doctor…", "医師を選択…")}</option>
              {activeDoctors.filter((d) => !rosterDoctorIds.has(d.id)).map((d) => <option key={d.id} value={d.id}>{d.nameFiling}（{d.doctorNo}）{d.hasGaiji ? " ⚠外字" : ""}</option>)}
            </select>
            <select className="sel sel-sm" value={pickRole} onChange={(e) => setPickRole(e.target.value)}>
              {options(SET.doctorRole).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Btn small disabled={!pickDoc} onClick={() => { if (pickDoc) { onAddInv(pickDoc, Number(pickRole)); setPickDoc(""); } }}>{Icon.plus} {t("Add to roster", "ロスターに追加")}</Btn>
          </div>
        )}
      </div>

      {/* 数量マトリクス */}
      {draft.studyDrugs.length > 0 && (
        <div className="qty">
          <div className="qty-h">{t("Drug quantities (this site)", "施設別治験薬数量")}{terminal && <UnconfirmedBadge label={t("supply→abrogation required", "交付〜廃棄が必須")} />}</div>
          <table className="qty-tbl">
            <thead><tr><th>{t("Drug", "治験薬")}</th><th>{t("Planned", "予定交付")}</th>{terminal && <><th>{t("Supplied", "交付")}</th><th>{t("Used", "使用")}</th><th>{t("Withdrawn", "回収")}</th><th>{t("Abrogated", "廃棄")}</th></>}</tr></thead>
            <tbody>
              {draft.studyDrugs.map((d) => {
                const q = site.quantities.find((x) => x.studyDrugId === d.id);
                return (
                  <tr key={d.id}>
                    <td>{d.drugName || <em className="muted">（未入力）</em>} {d.serialNo > 0 && <small className="muted">#{d.serialNo}</small>}</td>
                    <td><input type="number" className="tin tin-xs" value={q?.qtyPlanned ?? 0} disabled={!editable} onChange={(e) => onQty(d.id, "qtyPlanned", Number(e.target.value))} /></td>
                    {terminal && <>
                      <td><input type="number" className="tin tin-xs" value={q?.qtySupplied ?? ""} disabled={!editable} onChange={(e) => onQty(d.id, "qtySupplied", Number(e.target.value))} /></td>
                      <td><input type="number" className="tin tin-xs" value={q?.qtyUsed ?? ""} disabled={!editable} onChange={(e) => onQty(d.id, "qtyUsed", Number(e.target.value))} /></td>
                      <td><input type="number" className="tin tin-xs" value={q?.qtyWithdrawn ?? ""} disabled={!editable} onChange={(e) => onQty(d.id, "qtyWithdrawn", Number(e.target.value))} /></td>
                      <td><input type="number" className="tin tin-xs" value={q?.qtyAbrogated ?? ""} disabled={!editable} onChange={(e) => onQty(d.id, "qtyAbrogated", Number(e.target.value))} /></td>
                    </>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
