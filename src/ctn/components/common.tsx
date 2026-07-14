import type { ReactNode } from "react";
import { useLang } from "../../i18n";
import { isUnconfirmed } from "../schema";
import { statusName, STATUS_CLASS, notifTypeName, NOTIF_TYPE_SHORT } from "../refData";
import type { NotifTypeKey, StatusKey } from "../types";

// ---- ステータスピル ----
export function StatusPill({ status }: { status: StatusKey }) {
  const { lang } = useLang();
  return <span className={`stpill ${STATUS_CLASS[status]}`}>{statusName(status, lang)}</span>;
}

// ---- 届出種別バッジ ----
export function TypeBadge({ type, full }: { type: NotifTypeKey; full?: boolean }) {
  const { lang } = useLang();
  return <span className={`tybadge ty-${type}`}>{full ? notifTypeName(type, lang) : NOTIF_TYPE_SHORT[type]}</span>;
}

// ---- KPIタイル ----
export function Kpi({ label, value, meta, tone, onClick }: { label: string; value: ReactNode; meta?: string; tone?: "blue" | "amber" | "red" | "green"; onClick?: () => void }) {
  return (
    <div className={`kpi${tone ? ` kpi-${tone}` : ""}${onClick ? " kpi-click" : ""}`} onClick={onClick}>
      <div className="l">{label}</div>
      <div className="v">{value}</div>
      {meta && <div className="m">{meta}</div>}
    </div>
  );
}

// ---- 「要確認」バッジ（設計上の未確定箇所） ----
export function UnconfirmedBadge({ label }: { label?: string }) {
  return (
    <span className="unconf" title="設計上の未確定箇所（本番仕様は手引きと突合が必要）">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
      {label ?? "要確認"}
    </span>
  );
}

// ---- 必須マーク（◎/○/△） ----
export function ReqMark({ mark }: { mark: "always" | "conditional" | "optional" | "na" | "auto" }) {
  if (mark === "na") return null;
  const map: Record<string, [string, string]> = {
    always: ["req-a", "◎"],
    conditional: ["req-c", "○"],
    optional: ["req-o", "△"],
    auto: ["req-auto", "自動"],
  };
  const [cls, sym] = map[mark];
  return <span className={`reqmark ${cls}`}>{sym}</span>;
}

// ---- セクションカード ----
export function Section({ title, sub, right, children, tableSchema, colSchema }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; tableSchema?: string; colSchema?: string }) {
  const unconf = tableSchema && colSchema && isUnconfirmed(tableSchema, colSchema);
  return (
    <div className="sect">
      <div className="sect-h">
        <div>
          <h3>{title}{unconf && <> <UnconfirmedBadge /></>}</h3>
          {sub && <div className="sect-sub">{sub}</div>}
        </div>
        {right}
      </div>
      <div className="sect-b">{children}</div>
    </div>
  );
}

// ---- フォーム項目 ----
export function Field({ label, required, mark, unconfirmed, hint, children, wide }: { label: string; required?: boolean; mark?: "always" | "conditional" | "optional" | "na" | "auto"; unconfirmed?: boolean; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={`field${wide ? " field-wide" : ""}`}>
      <label>
        {mark && <ReqMark mark={mark} />}
        {label}
        {required && <span className="req-star">*</span>}
        {unconfirmed && <> <UnconfirmedBadge /></>}
      </label>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

// ---- モーダル ----
export function Modal({ title, sub, onClose, children, footer, size = "md" }: { title: string; sub?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  return (
    <div className="modal-scrim on" onClick={onClose}>
      <div className={`modal modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <div>
            <h3>{title}</h3>
            {sub && <div className="modal-sub">{sub}</div>}
          </div>
          <button className="modal-x" onClick={onClose} aria-label="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Btn({ kind = "g", onClick, children, disabled, small, title, type }: { kind?: "p" | "g" | "danger" | "ghost"; onClick?: () => void; children: ReactNode; disabled?: boolean; small?: boolean; title?: string; type?: "button" | "submit" }) {
  return (
    <button type={type ?? "button"} className={`btn btn-${kind}${small ? " btn-sm" : ""}`} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

// ---- アイコン（共通） ----
export const Icon = {
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M12 5v14M5 12h14" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M20 6 9 17l-5-5" /></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M18 6 6 18M6 6l12 12" /></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>,
  restore: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" /></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>,
  arrow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
};
