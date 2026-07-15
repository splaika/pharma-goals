import { useState } from "react";
import { useLang } from "../../i18n";
import { detectGaiji } from "../logic";
import { label, SET, options, IRB_TYPE, userById } from "../refData";
import { Modal, Btn, Field, Icon, Empty } from "./common";
import { GaijiDialog, type GaijiConfirmation } from "./GaijiDialog";
import type { CtnRepository, CtnDb } from "../data/repository";
import type { Doctor, Institution, Irb, SiteStaff, Sponsor, GaijiRecord } from "../types";

type Tab = "institution" | "doctor" | "irb" | "sponsor" | "staff";

export function MasterView({ db, repo, actorId, reload, flash }: { db: CtnDb; repo: CtnRepository; actorId: string; reload: () => Promise<void>; flash: (m: string) => void }) {
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("institution");
  const [editing, setEditing] = useState<{ kind: Tab; rec: unknown } | null>(null);
  const [gaiji, setGaiji] = useState<{ base: Omit<Doctor, "id">; hits: ReturnType<typeof detectGaiji> } | null>(null);

  const tabs: [Tab, string, string, number][] = [
    ["institution", "Institutions", "医療機関", db.institutions.length],
    ["doctor", "Doctors", "医師", db.doctors.length],
    ["staff", "CRC", "CRC", db.siteStaff.length],
    ["irb", "IRB", "IRB", db.irbs.length],
    ["sponsor", "Sponsors", "治験届出者", db.sponsors.length],
  ];

  const toggleActive = async (kind: Tab, id: string, active: boolean) => {
    const map: Record<Tab, (id: string, a: boolean, actor: string) => Promise<void>> = {
      institution: repo.setInstitutionActive.bind(repo),
      doctor: repo.setDoctorActive.bind(repo),
      irb: repo.setIrbActive.bind(repo),
      sponsor: repo.setSponsorActive.bind(repo),
      staff: repo.setSiteStaffActive.bind(repo),
    };
    await map[kind](id, active, actorId);
    await reload();
    flash(active ? t("Restored", "有効化しました") : t("Logically deleted", "論理削除しました"));
  };

  // ---- 医師：保存（外字検出フック） ----
  const saveDoctor = async (rec: Doctor | Omit<Doctor, "id">, isNew: boolean) => {
    const hits = detectGaiji(rec.nameOriginal);
    const already = db.gaiji.some((g) => "id" in rec && g.doctorId === (rec as Doctor).id);
    if (hits.length > 0 && (isNew || !already)) {
      // 外字ダイアログを開く（確認後に保存）
      setGaiji({ base: { ...rec, hasGaiji: true } as Omit<Doctor, "id">, hits });
      setEditing(null);
      return;
    }
    if (isNew) await repo.createDoctor(rec as Omit<Doctor, "id">, actorId);
    else await repo.updateDoctor(rec as Doctor, actorId);
    await reload();
    setEditing(null);
    flash(t("Saved", "保存しました"));
  };

  const confirmGaiji = async (confs: GaijiConfirmation[], filingName: string) => {
    if (!gaiji) return;
    const created = await repo.createDoctor({ ...gaiji.base, nameFiling: filingName, hasGaiji: true }, actorId);
    const confirmedOn = `${new Date().toISOString().slice(0, 10)}T${new Date().toTimeString().slice(0, 8)}`;
    const confirmedBy = userById(actorId)?.name ?? actorId;
    for (const c of confs) {
      const rec: Omit<GaijiRecord, "id"> = { doctorId: created.id, targetColumn: "cr_doctor.cr_nameoriginal", originalChar: c.originalChar, codePoint: c.codePoint, replacementChar: c.replacementChar, gaijiType: c.gaijiType, confirmedBy, confirmedOn };
      await repo.addGaijiRecord(rec);
    }
    await reload();
    setGaiji(null);
    flash(t("Gaiji confirmed & doctor registered", "外字を確認し医師を登録しました"));
  };

  return (
    <>
      <div className="mtabs">
        {tabs.map(([k, en, ja, n]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{t(en, ja)} <span className="mtab-n">{n}</span></button>
        ))}
      </div>

      <div className="card">
        <div className="card-h">
          <h3>{t(tabs.find((x) => x[0] === tab)![1], tabs.find((x) => x[0] === tab)![2])}</h3>
          <Btn kind="p" small onClick={() => setEditing({ kind: tab, rec: null })}>{Icon.plus} {t("Register", "新規登録")}</Btn>
        </div>

        {tab === "institution" && <InstTable db={db} onEdit={(r) => setEditing({ kind: "institution", rec: r })} onToggle={(id, a) => toggleActive("institution", id, a)} />}
        {tab === "doctor" && <DocTable db={db} onEdit={(r) => setEditing({ kind: "doctor", rec: r })} onToggle={(id, a) => toggleActive("doctor", id, a)} />}
        {tab === "irb" && <IrbTable db={db} onEdit={(r) => setEditing({ kind: "irb", rec: r })} onToggle={(id, a) => toggleActive("irb", id, a)} />}
        {tab === "sponsor" && <SponsorTable db={db} onEdit={(r) => setEditing({ kind: "sponsor", rec: r })} onToggle={(id, a) => toggleActive("sponsor", id, a)} />}
        {tab === "staff" && <StaffTable db={db} onEdit={(r) => setEditing({ kind: "staff", rec: r })} onToggle={(id, a) => toggleActive("staff", id, a)} />}
      </div>

      {/* ===== 編集モーダル ===== */}
      {editing?.kind === "institution" && (
        <InstForm rec={editing.rec as Institution | null} onClose={() => setEditing(null)} onSave={async (rec, isNew) => { if (isNew) await repo.createInstitution(rec as Omit<Institution, "id">, actorId); else await repo.updateInstitution(rec as Institution, actorId); await reload(); setEditing(null); flash(t("Saved", "保存しました")); }} />
      )}
      {editing?.kind === "doctor" && (
        <DocForm db={db} rec={editing.rec as Doctor | null} onClose={() => setEditing(null)} onSave={saveDoctor} />
      )}
      {editing?.kind === "irb" && (
        <IrbForm rec={editing.rec as Irb | null} onClose={() => setEditing(null)} onSave={async (rec, isNew) => { if (isNew) await repo.createIrb(rec as Omit<Irb, "id">, actorId); else await repo.updateIrb(rec as Irb, actorId); await reload(); setEditing(null); flash(t("Saved", "保存しました")); }} />
      )}
      {editing?.kind === "sponsor" && (
        <SponsorForm rec={editing.rec as Sponsor | null} onClose={() => setEditing(null)} onSave={async (rec, isNew) => { if (isNew) await repo.createSponsor(rec as Omit<Sponsor, "id">, actorId); else await repo.updateSponsor(rec as Sponsor, actorId); await reload(); setEditing(null); flash(t("Saved", "保存しました")); }} />
      )}
      {editing?.kind === "staff" && (
        <StaffForm db={db} rec={editing.rec as SiteStaff | null} onClose={() => setEditing(null)} onSave={async (rec, isNew) => { if (isNew) await repo.createSiteStaff(rec as Omit<SiteStaff, "id">, actorId); else await repo.updateSiteStaff(rec as SiteStaff, actorId); await reload(); setEditing(null); flash(t("Saved", "保存しました")); }} />
      )}

      {gaiji && <GaijiDialog originalName={gaiji.base.nameOriginal} hits={gaiji.hits} onCancel={() => setGaiji(null)} onConfirm={confirmGaiji} />}
    </>
  );
}

// ===========================================================================
// テーブル
// ===========================================================================
function ActiveCell({ active, onToggle }: { active: boolean; onToggle: (a: boolean) => void }) {
  const { t } = useLang();
  return active ? (
    <button className="icon-btn danger" title={t("Logical delete", "論理削除")} onClick={() => onToggle(false)}>{Icon.trash}</button>
  ) : (
    <button className="icon-btn" title={t("Restore", "復活")} onClick={() => onToggle(true)}>{Icon.restore}</button>
  );
}

function InstTable({ db, onEdit, onToggle }: { db: CtnDb; onEdit: (r: Institution) => void; onToggle: (id: string, a: boolean) => void }) {
  const { t } = useLang();
  if (!db.institutions.length) return <Empty>{t("None", "なし")}</Empty>;
  return (
    <table className="mtbl">
      <thead><tr><th>{t("Code", "コード")}</th><th>{t("Name", "機関名称")}</th><th>{t("Address", "所在地")}</th><th>{t("Tel", "電話")}</th><th></th></tr></thead>
      <tbody>
        {db.institutions.map((r) => (
          <tr key={r.id} className={r.active ? "" : "inactive"}>
            <td className="muted">{r.code}</td>
            <td className="nm">{r.name}{!r.active && <span className="del-badge">論理削除</span>}</td>
            <td className="muted small">{r.address1}{r.address2}</td>
            <td className="muted small">{r.telNo}</td>
            <td className="acts"><button className="icon-btn" onClick={() => onEdit(r)}>{Icon.edit}</button><ActiveCell active={r.active} onToggle={(a) => onToggle(r.id, a)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DocTable({ db, onEdit, onToggle }: { db: CtnDb; onEdit: (r: Doctor) => void; onToggle: (id: string, a: boolean) => void }) {
  const { t } = useLang();
  const instName = (id?: string) => (id ? db.institutions.find((i) => i.id === id)?.name ?? "—" : "—");
  return (
    <table className="mtbl">
      <thead><tr><th>ID</th><th>{t("Filing name", "届出用表記")}</th><th>{t("Original", "原表記")}</th><th>{t("Institution", "所属医療機関")}</th><th>{t("Kana", "よみかな")}</th><th>{t("Gaiji", "外字")}</th><th></th></tr></thead>
      <tbody>
        {db.doctors.map((r) => (
          <tr key={r.id} className={r.active ? "" : "inactive"}>
            <td className="muted">{r.doctorNo}</td>
            <td className="nm">{r.nameFiling}{!r.active && <span className="del-badge">論理削除</span>}</td>
            <td className={r.nameOriginal !== r.nameFiling ? "gaiji-orig-cell" : "muted"}>{r.nameOriginal}</td>
            <td className="small">{instName(r.institutionId)}</td>
            <td className="muted small">{r.pronounce}</td>
            <td>{r.hasGaiji ? <span className="gaiji-flag">⚠ 外字</span> : <span className="muted">—</span>}</td>
            <td className="acts"><button className="icon-btn" onClick={() => onEdit(r)}>{Icon.edit}</button><ActiveCell active={r.active} onToggle={(a) => onToggle(r.id, a)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IrbTable({ db, onEdit, onToggle }: { db: CtnDb; onEdit: (r: Irb) => void; onToggle: (id: string, a: boolean) => void }) {
  const { t } = useLang();
  return (
    <table className="mtbl">
      <thead><tr><th>{t("Type", "区分")}</th><th>{t("Owner name", "設置者の名称")}</th><th>{t("Address", "所在地")}</th><th></th></tr></thead>
      <tbody>
        {db.irbs.map((r) => (
          <tr key={r.id} className={r.active ? "" : "inactive"}>
            <td><span className={`irb-chip ${r.irbType === IRB_TYPE.internal ? "in" : "ex"}`}>{label(SET.irbType, r.irbType)}</span></td>
            <td className="nm">{r.ownerName}{!r.active && <span className="del-badge">論理削除</span>}</td>
            <td className="muted small">{r.address1}{r.address2}</td>
            <td className="acts"><button className="icon-btn" onClick={() => onEdit(r)}>{Icon.edit}</button><ActiveCell active={r.active} onToggle={(a) => onToggle(r.id, a)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SponsorTable({ db, onEdit, onToggle }: { db: CtnDb; onEdit: (r: Sponsor) => void; onToggle: (id: string, a: boolean) => void }) {
  const { t } = useLang();
  return (
    <table className="mtbl">
      <thead><tr><th>{t("Name", "届出者の名称")}</th><th>{t("Code", "業者コード")}</th><th>{t("Contact", "届出担当者")}</th><th>{t("Tel", "電話")}</th><th></th></tr></thead>
      <tbody>
        {db.sponsors.map((r) => (
          <tr key={r.id} className={r.active ? "" : "inactive"}>
            <td className="nm">{r.name}{!r.active && <span className="del-badge">論理削除</span>}</td>
            <td className="muted">{r.manufacturerCode}</td>
            <td className="muted small">{r.contactName}（{r.contactTitle}）</td>
            <td className="muted small">{r.telNo}</td>
            <td className="acts"><button className="icon-btn" onClick={() => onEdit(r)}>{Icon.edit}</button><ActiveCell active={r.active} onToggle={(a) => onToggle(r.id, a)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StaffTable({ db, onEdit, onToggle }: { db: CtnDb; onEdit: (r: SiteStaff) => void; onToggle: (id: string, a: boolean) => void }) {
  const { t } = useLang();
  const instName = (id: string) => db.institutions.find((i) => i.id === id)?.name ?? "—";
  return (
    <table className="mtbl">
      <thead><tr><th>{t("Name", "氏名")}</th><th>{t("Role", "役割")}</th><th>{t("Institution", "所属機関")}</th><th>{t("Contact", "連絡先")}</th><th></th></tr></thead>
      <tbody>
        {db.siteStaff.map((r) => (
          <tr key={r.id} className={r.active ? "" : "inactive"}>
            <td className="nm">{r.name}<small className="muted"> {r.kana}</small>{!r.active && <span className="del-badge">論理削除</span>}</td>
            <td><span className="staff-role">{r.role}</span></td>
            <td className="muted small">{instName(r.institutionId)}</td>
            <td className="muted small">{r.telNo} / {r.mail}</td>
            <td className="acts"><button className="icon-btn" onClick={() => onEdit(r)}>{Icon.edit}</button><ActiveCell active={r.active} onToggle={(a) => onToggle(r.id, a)} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ===========================================================================
// フォーム
// ===========================================================================
function useForm<T>(init: T) {
  const [v, setV] = useState<T>(init);
  const on = <K extends keyof T>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [k]: e.target.value }));
  return { v, setV, on };
}

function FormFooter({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { t } = useLang();
  return <><div style={{ flex: 1 }} /><Btn onClick={onClose}>{t("Cancel", "キャンセル")}</Btn><Btn kind="p" onClick={onSave}>{t("Save", "保存")}</Btn></>;
}

function InstForm({ rec, onClose, onSave }: { rec: Institution | null; onClose: () => void; onSave: (r: Institution | Omit<Institution, "id">, isNew: boolean) => void }) {
  const { t } = useLang();
  const { v, on } = useForm<Omit<Institution, "id">>(rec ?? { code: "", name: "", address1: "", address2: "", telNo: "", active: true });
  return (
    <Modal title={rec ? t("Edit institution", "医療機関を編集") : t("Register institution", "医療機関を登録")} onClose={onClose} footer={<FormFooter onClose={onClose} onSave={() => onSave(rec ? { ...v, id: rec.id } : v, !rec)} />}>
      <div className="form-grid">
        <Field label={t("Code", "コード")} mark="optional"><input className="tin" value={v.code} onChange={on("code")} /></Field>
        <Field label={t("Name", "機関名称")} mark="always"><input className="tin" value={v.name} onChange={on("name")} /></Field>
        <Field label={t("Tel", "代表電話番号")} mark="always"><input className="tin" value={v.telNo} onChange={on("telNo")} /></Field>
        <Field label={t("Address 1", "所在地1")} mark="always" wide><input className="tin" value={v.address1} onChange={on("address1")} /></Field>
        <Field label={t("Address 2", "所在地2")} mark="always" wide><input className="tin" value={v.address2} onChange={on("address2")} /></Field>
      </div>
    </Modal>
  );
}

function DocForm({ db, rec, onClose, onSave }: { db: CtnDb; rec: Doctor | null; onClose: () => void; onSave: (r: Doctor | Omit<Doctor, "id">, isNew: boolean) => void }) {
  const { t } = useLang();
  const { v, on, setV } = useForm<Omit<Doctor, "id">>(rec ?? { doctorNo: "", nameOriginal: "", nameFiling: "", pronounce: "", medSchoolNo: "", graduationYear: "", hasGaiji: false, institutionId: db.institutions[0]?.id ?? "", active: true });
  const hits = detectGaiji(v.nameOriginal);
  return (
    <Modal title={rec ? t("Edit doctor", "医師を編集") : t("Register doctor", "医師を登録")} sub={t("Original / filing-form name (two-tier). Gaiji is detected on save.", "原表記／届出用表記の二段構え。保存時に外字を検出します。")} onClose={onClose} footer={<FormFooter onClose={onClose} onSave={() => onSave(rec ? { ...v, id: rec.id } : v, !rec)} />}>
      <div className="form-grid">
        <Field label={t("Display ID", "医師表示ID")} mark="auto"><input className="tin" value={v.doctorNo} onChange={on("doctorNo")} placeholder="自動採番（未入力可）" /></Field>
        <Field label={t("Institution", "所属医療機関")} mark="optional"><select className="sel" value={v.institutionId ?? ""} onChange={(e) => setV((s) => ({ ...s, institutionId: e.target.value || undefined }))}><option value="">—</option>{db.institutions.filter((i) => i.active).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
        <Field label={t("Name (original)", "氏名（原表記）")} mark="always" hint={hits.length ? `⚠ 外字検出: ${hits.map((h) => h.char).join(" ")}` : "Unicode・サロゲートペア可"}><input className="tin" value={v.nameOriginal} onChange={(e) => { on("nameOriginal")(e); }} placeholder="例：髙島 幸雄" /></Field>
        <Field label={t("Name (filing)", "氏名（届出用表記）")} mark="always" hint={t("JIS L1/L2 only — blank → auto-normalized on save", "JIS第1・第2水準のみ。空欄なら保存時に自動正規化")}><input className="tin" value={v.nameFiling} onChange={on("nameFiling")} placeholder="例：高島 幸雄" /></Field>
        <Field label={t("Kana", "よみかな")} mark="always" hint="全角50/半角100バイト"><input className="tin" value={v.pronounce} onChange={on("pronounce")} /></Field>
        <Field label={t("Medical school no.", "大学番号")} mark="optional"><input className="tin" value={v.medSchoolNo} onChange={on("medSchoolNo")} placeholder="コード表（責任医師想定）" /></Field>
        <Field label={t("Graduation year", "卒業年")} mark="optional"><input className="tin" value={v.graduationYear} onChange={on("graduationYear")} /></Field>
      </div>
      <label className="chk"><input type="checkbox" checked={v.hasGaiji} onChange={(e) => setV((s) => ({ ...s, hasGaiji: e.target.checked }))} /> {t("Contains gaiji (auto-detected)", "外字を含む（自動検出）")}</label>
    </Modal>
  );
}

function IrbForm({ rec, onClose, onSave }: { rec: Irb | null; onClose: () => void; onSave: (r: Irb | Omit<Irb, "id">, isNew: boolean) => void }) {
  const { t } = useLang();
  const { v, on, setV } = useForm<Omit<Irb, "id">>(rec ?? { irbType: IRB_TYPE.internal, ownerName: "", address1: "", address2: "", active: true });
  return (
    <Modal title={rec ? t("Edit IRB", "IRBを編集") : t("Register IRB", "IRBを登録")} onClose={onClose} footer={<FormFooter onClose={onClose} onSave={() => onSave(rec ? { ...v, id: rec.id } : v, !rec)} />}>
      <div className="form-grid">
        <Field label={t("Type", "院内・外部の区分")} mark="always"><select className="sel" value={v.irbType} onChange={(e) => setV((s) => ({ ...s, irbType: Number(e.target.value) }))}>{options(SET.irbType).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
        <Field label={t("Owner name", "設置者の名称")} mark="always" wide><input className="tin" value={v.ownerName} onChange={on("ownerName")} /></Field>
        <Field label={t("Address 1", "所在地1")} mark="always" wide><input className="tin" value={v.address1} onChange={on("address1")} /></Field>
        <Field label={t("Address 2", "所在地2")} mark="always" wide><input className="tin" value={v.address2} onChange={on("address2")} /></Field>
      </div>
    </Modal>
  );
}

function SponsorForm({ rec, onClose, onSave }: { rec: Sponsor | null; onClose: () => void; onSave: (r: Sponsor | Omit<Sponsor, "id">, isNew: boolean) => void }) {
  const { t } = useLang();
  const { v, on } = useForm<Omit<Sponsor, "id">>(rec ?? { sponsorType: "製造販売業者", name: "", repName: "", address1: "", address2: "", manufacturerCode: "", contactName: "", contactTitle: "", telNo: "", faxOrMail: "", active: true });
  return (
    <Modal title={rec ? t("Edit sponsor", "届出者を編集") : t("Register sponsor", "届出者を登録")} onClose={onClose} size="lg" footer={<FormFooter onClose={onClose} onSave={() => onSave(rec ? { ...v, id: rec.id } : v, !rec)} />}>
      <div className="form-grid">
        <Field label={t("Sponsor type", "届出者の種別")} mark="always"><input className="tin" value={v.sponsorType} onChange={on("sponsorType")} /></Field>
        <Field label={t("Name", "届出者の名称")} mark="always"><input className="tin" value={v.name} onChange={on("name")} /></Field>
        <Field label={t("Representative", "代表者の氏名")} mark="always"><input className="tin" value={v.repName} onChange={on("repName")} /></Field>
        <Field label={t("Manufacturer code", "業者コード")} mark="always"><input className="tin" value={v.manufacturerCode} onChange={on("manufacturerCode")} /></Field>
        <Field label={t("Address 1", "所在地1")} mark="always" wide><input className="tin" value={v.address1} onChange={on("address1")} /></Field>
        <Field label={t("Address 2", "所在地2")} mark="always" wide><input className="tin" value={v.address2} onChange={on("address2")} /></Field>
        <Field label={t("Contact name", "届出担当者の氏名")} mark="always"><input className="tin" value={v.contactName} onChange={on("contactName")} /></Field>
        <Field label={t("Contact title", "届出担当者の所属")} mark="always"><input className="tin" value={v.contactTitle} onChange={on("contactTitle")} /></Field>
        <Field label={t("Tel", "電話番号")} mark="always"><input className="tin" value={v.telNo} onChange={on("telNo")} /></Field>
        <Field label={t("Fax / mail", "FAX番号又はメールアドレス")} mark="always"><input className="tin" value={v.faxOrMail} onChange={on("faxOrMail")} /></Field>
        <Field label={t("Overseas sponsor / foreign manufacturer", "海外依頼者・外国製造業者情報")} mark="conditional" unconfirmed wide hint={t("Japanese 4 items + foreign 4 items — only when applicable", "邦文4項目＋外国文4項目・該当時のみ")}><textarea className="ta" value={v.overseasInfo ?? ""} onChange={on("overseasInfo")} /></Field>
      </div>
    </Modal>
  );
}

function StaffForm({ db, rec, onClose, onSave }: { db: CtnDb; rec: SiteStaff | null; onClose: () => void; onSave: (r: SiteStaff | Omit<SiteStaff, "id">, isNew: boolean) => void }) {
  const { t } = useLang();
  const { v, on, setV } = useForm<Omit<SiteStaff, "id">>(rec ?? { name: "", kana: "", role: "CRC", institutionId: db.institutions[0]?.id ?? "", telNo: "", mail: "", active: true });
  return (
    <Modal title={rec ? t("Edit CRC", "CRCを編集") : t("Register CRC", "CRCを登録")} onClose={onClose} footer={<FormFooter onClose={onClose} onSave={() => onSave(rec ? { ...v, id: rec.id } : v, !rec)} />}>
      <div className="form-grid">
        <Field label={t("Name", "氏名")} mark="always"><input className="tin" value={v.name} onChange={on("name")} /></Field>
        <Field label={t("Kana", "よみかな")} mark="optional"><input className="tin" value={v.kana} onChange={on("kana")} /></Field>
        <Field label={t("Role", "役割")} mark="always"><select className="sel" value={v.role} onChange={(e) => setV((s) => ({ ...s, role: e.target.value as SiteStaff["role"] }))}><option value="CRC">CRC</option><option value="事務局">事務局</option><option value="薬剤部">薬剤部</option></select></Field>
        <Field label={t("Institution", "所属機関")} mark="always"><select className="sel" value={v.institutionId} onChange={(e) => setV((s) => ({ ...s, institutionId: e.target.value }))}>{db.institutions.filter((i) => i.active).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></Field>
        <Field label={t("Tel", "電話")} mark="optional"><input className="tin" value={v.telNo} onChange={on("telNo")} /></Field>
        <Field label={t("Mail", "メール")} mark="optional"><input className="tin" value={v.mail} onChange={on("mail")} /></Field>
      </div>
    </Modal>
  );
}
