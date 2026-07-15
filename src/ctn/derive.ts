// ============================================================================
// 派生データ（ダッシュボードのアラート・リマインダ・集計）
// これらは永続化しない。届出データから都度算出する。
// ============================================================================
import { computeDeadline } from "./logic";
import { CHANGE_TYPE, DOCTOR_ROLE, daysUntil, TODAY } from "./refData";
import { getRules } from "./rules";
import type { AlertItem, Compound, Notification, StatusKey } from "./types";
import type { CtnDb } from "./data/repository";

export const notifDeadline = (n: Notification): string | undefined => computeDeadline(n);

/** 分担医師の異動（追加・削除）を含むか。12か月バッチは分担医師の異動のみが対象。 */
export const hasSubInvestigatorMovement = (n: Notification): boolean =>
  n.sites.some((s) =>
    s.investigators.some(
      (iv) => iv.doctorRole === DOCTOR_ROLE.sub && (iv.changeType === CHANGE_TYPE.add || iv.changeType === CHANGE_TYPE.remove)
    )
  );

/** シリーズに、この届より後に提出された終了/中止届があるか（保留クリア判定） */
function seriesClosedAfter(db: CtnDb, n: Notification): boolean {
  return db.notifications.some(
    (x) =>
      x.compoundId === n.compoundId &&
      x.status === "submitted" &&
      (x.notifType === "termination" || x.notifType === "completion" || x.notifType === "devDiscontinuation") &&
      x.filingCount > n.filingCount
  );
}

export function deriveAlerts(db: CtnDb, today = TODAY): AlertItem[] {
  const r = getRules(); // 「ロジカルチェック設定」で編集される閾値・有効/無効
  const items: AlertItem[] = [];
  for (const n of db.notifications) {
    const compound = db.compounds.find((c) => c.id === n.compoundId);
    const tag = `${compound?.compoundCode ?? ""}`;
    const dl = notifDeadline(n);
    const du = daysUntil(dl, today);

    // 提出期限（起票・レビュー・承認済で未提出）
    if (dl && n.status !== "submitted" && du != null) {
      if (du < 0) {
        if (r.overdue)
          items.push({ id: `al-ovd-${n.id}`, kind: "alert", severity: "high", notificationId: n.id, dueDate: dl, titleJa: `提出期限超過：${tag}`, titleEn: `Deadline passed: ${tag}`, detailJa: `提出期限を ${-du} 日超過しています（${dl}）。`, detailEn: `${-du} days past the submission deadline (${dl}).` });
      } else if (du <= r.warnDays) {
        items.push({ id: `al-due-${n.id}`, kind: "alert", severity: du <= r.hotDays ? "high" : "med", notificationId: n.id, dueDate: dl, titleJa: `提出期限接近：${tag}`, titleEn: `Deadline soon: ${tag}`, detailJa: `提出期限まで残り ${du} 日（${dl}）。`, detailEn: `${du} days until the submission deadline (${dl}).` });
      }
    }

    // 承認済・提出待ち → リマインダ
    if (r.submitReminder && n.status === "approved") {
      items.push({ id: `rm-sub-${n.id}`, kind: "reminder", severity: "med", notificationId: n.id, titleJa: `提出待ち：${tag}`, titleEn: `Awaiting submission: ${tag}`, detailJa: "承認済です。提出（XML生成・GW送信）を実施してください。", detailEn: "Approved. Generate XML and submit." });
    }

    // PMDA照会 回答期限
    for (const q of n.inquiries) {
      if (!r.inquiryReminder || q.responseDate) continue;
      const qd = daysUntil(q.responseDeadline, today);
      if (qd != null && qd <= r.inquiryDays) {
        const overdue = qd < 0;
        items.push({
          id: `rm-inq-${q.id}`,
          kind: "reminder",
          severity: overdue || qd <= r.hotDays ? "high" : "med",
          notificationId: n.id,
          dueDate: q.responseDeadline,
          titleJa: `PMDA照会 回答期限${overdue ? "超過" : ""}：${tag}`,
          titleEn: `PMDA inquiry ${overdue ? "overdue" : "due"}: ${tag}`,
          detailJa: overdue ? `照会「${q.inquiryContent}」の回答期限を ${-qd} 日超過しています。` : `照会「${q.inquiryContent}」の回答期限まで残り ${qd} 日。`,
          detailEn: overdue ? `Inquiry response is ${-qd} days overdue.` : `Response due in ${qd} days.`,
        });
      }
    }

    // 定期報告バッチ（分担医師の異動を含む変更届の保留）
    if (r.batchReminder && n.notifType === "change" && n.status === "submitted" && hasSubInvestigatorMovement(n) && !seriesClosedAfter(db, n)) {
      items.push({ id: `rm-batch-${n.id}`, kind: "reminder", severity: "low", notificationId: n.id, titleJa: `定期報告 保留：${tag}`, titleEn: `Periodic report pending: ${tag}`, detailJa: `分担医師の異動を含む変更届が${r.batchMonths}か月バッチの保留対象です（終了・中止届の提出でクリア）。`, detailEn: `Change filing with investigator movement is pending the ${r.batchMonths}-month batch.` });
    }
  }
  // 重要度順
  const rank = { high: 0, med: 1, low: 2 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

// ---- 集計 ----
export interface DashboardStats {
  total: number;
  byStatus: Record<StatusKey, number>;
  submitted: number;
  inProgress: number; // 起票+レビュー+承認済
  seriesCount: number;
  alerts: number;
  reminders: number;
}

export function dashboardStats(db: CtnDb, alerts: AlertItem[]): DashboardStats {
  const byStatus: Record<StatusKey, number> = { draft: 0, review: 0, approved: 0, submitted: 0 };
  for (const n of db.notifications) byStatus[n.status]++;
  return {
    total: db.notifications.length,
    byStatus,
    submitted: byStatus.submitted,
    inProgress: byStatus.draft + byStatus.review + byStatus.approved,
    seriesCount: db.compounds.length,
    alerts: alerts.filter((a) => a.kind === "alert").length,
    reminders: alerts.filter((a) => a.kind === "reminder").length,
  };
}

// ---- シリーズ単位のまとめ ----
export interface SeriesSummary {
  compound: Compound;
  notifications: Notification[];
  latest?: Notification;
  drugSerials: number[];
  siteCount: number;
}
export function seriesSummaries(db: CtnDb): SeriesSummary[] {
  return db.compounds.map((compound) => {
    const notifications = db.notifications
      .filter((n) => n.compoundId === compound.id)
      .sort((a, b) => a.filingCount - b.filingCount);
    const latest = [...notifications].sort((a, b) => b.filingCount - a.filingCount)[0];
    const serials = new Set<number>();
    for (const n of notifications) for (const d of n.studyDrugs) serials.add(d.serialNo);
    const siteCount = latest?.sites.length ?? 0;
    return { compound, notifications, latest, drugSerials: [...serials].sort((a, b) => a - b), siteCount };
  });
}
