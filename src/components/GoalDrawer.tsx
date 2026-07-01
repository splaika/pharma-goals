import { useEffect, useState } from "react";
import type { ChangeEntry, Goal, Level, MonthlyEntry, Status } from "../types";
import { CUR, DEPTS, MONTHS, lvlInfo, moLabel, monthEntry, progressOf, stInfo } from "../refData";
import { useLang } from "../i18n";

export interface DrawerResult {
  goal: Goal;
  monthEntry: MonthlyEntry;
  change: ChangeEntry;
  isNew: boolean;
}

export function GoalDrawer({
  goal,
  isNew,
  goals,
  onClose,
  onSave,
  onDelete,
}: {
  goal: Goal;
  isNew: boolean;
  goals: Goal[];
  onClose: () => void;
  onSave: (r: DrawerResult) => void;
  onDelete: (id: string) => void;
}) {
  const { lang, t } = useLang();
  const [draft, setDraft] = useState<Goal>(goal);
  const [pct, setPct] = useState(0);
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");

  // Re-seed local state when a different goal is opened.
  useEffect(() => {
    setDraft(goal);
    setNote("");
    const cur = monthEntry(goal, CUR);
    setPct(cur ? cur.pct : progressOf(goal));
    setComment(cur ? (lang === "ja" ? cur.commentJa : cur.commentEn) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal]);

  const title = lang === "ja" ? draft.titleJa : draft.titleEn;
  const setTitle = (v: string) =>
    setDraft((d) => (lang === "ja" ? { ...d, titleJa: v } : { ...d, titleEn: v }));

  const hist = MONTHS.map((m) => monthEntry(draft, m))
    .filter((e): e is MonthlyEntry => !!e)
    .reverse();

  const hasChildren = goals.some((g) => g.parent === draft.id);

  const handleSave = () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    const g: Goal = { ...draft };
    if (lang === "ja") {
      g.titleJa = cleanTitle;
      if (!g.titleEn) g.titleEn = cleanTitle;
    } else {
      g.titleEn = cleanTitle;
      if (!g.titleJa) g.titleJa = cleanTitle;
    }

    const existing = monthEntry(draft, CUR);
    const me: MonthlyEntry = {
      month: CUR,
      pct,
      commentEn: lang === "ja" ? existing?.commentEn ?? "" : comment,
      commentJa: lang === "ja" ? comment : existing?.commentJa ?? "",
    };

    const now = new Date();
    const locale = lang === "ja" ? "ja-JP" : "en-US";
    const stamp =
      now.toLocaleDateString(locale, { month: "short", day: "numeric" }) +
      ", " +
      now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    const change: ChangeEntry = {
      at: stamp,
      who: "KT",
      kind: isNew ? "created" : "updated",
      note: note.trim(),
    };

    onSave({ goal: g, monthEntry: me, change, isNew });
  };

  const [levelBadge, levelCls] = lvlInfo[draft.level];

  return (
    <>
      <div className="scrim on" onClick={onClose} />
      <aside className="drawer on">
        <div className="dh">
          <div className="dh-t">
            <input
              className="title"
              placeholder={t("Goal name", "目標名")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <span className={`lvl ${levelCls}`} style={{ marginTop: 8, display: "inline-block" }}>
              {levelBadge}
            </span>
          </div>
          <button className="x" onClick={onClose}>
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="db">
          {/* status */}
          <div className="fld">
            <label>{t("Status", "状態")}</label>
            <div className="stseg">
              {(["g", "a", "r"] as Status[]).map((s) => (
                <button
                  key={s}
                  className={`s${s} ${draft.status === s ? "on" : ""}`}
                  onClick={() => setDraft((d) => ({ ...d, status: s }))}
                >
                  {t(stInfo[s][0], stInfo[s][1])}
                </button>
              ))}
            </div>
          </div>

          {/* level & department */}
          <div className="fld">
            <label>{t("Level & department", "レベル・部門")}</label>
            <div className="row2">
              <select
                className="sel"
                value={draft.level}
                onChange={(e) => setDraft((d) => ({ ...d, level: e.target.value as Level }))}
              >
                {(Object.keys(lvlInfo) as Level[]).map((k) => (
                  <option key={k} value={k}>
                    {t(lvlInfo[k][2], lvlInfo[k][3])}
                  </option>
                ))}
              </select>
              <select
                className="sel"
                value={draft.dept}
                onChange={(e) => setDraft((d) => ({ ...d, dept: e.target.value }))}
              >
                {DEPTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {t(d.en, d.ja)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* parent */}
          <div className="fld">
            <label>{t("Rolls up to", "上位の目標")}</label>
            <select
              className="sel"
              value={draft.parent ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, parent: e.target.value || null }))}
            >
              <option value="">{t("— None (top-level) —", "— なし（最上位）—")}</option>
              {goals
                .filter((g) => g.id !== draft.id)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {lvlInfo[g.level][0]} · {t(g.titleEn, g.titleJa)}
                  </option>
                ))}
            </select>
            <div style={{ fontSize: "11.5px", color: "var(--ink-3)", marginTop: 7 }}>
              {t(
                "Leave as “None” for a goal that does not ladder up to a higher one.",
                "上位に紐づかない目標は「なし」のままにします。"
              )}
            </div>
          </div>

          {/* current month update */}
          <div className="fld">
            <label>{t(`Update — ${moLabel(CUR, "en")}`, `${moLabel(CUR, "ja")}の進捗を更新`)}</label>
            <div className="addmo">
              <div className="rr">
                <label>{t("Progress", "進捗率")}</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pct}
                  onChange={(e) => setPct(Number(e.target.value))}
                />
                <b>{pct}%</b>
              </div>
              <textarea
                placeholder={t("One line on this month…", "今月の状況を一言…")}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>
          </div>

          {/* monthly history */}
          <div className="fld">
            <label>{t("Monthly progress", "各月の進捗")}</label>
            {hist.length ? (
              hist.map((e) => {
                const c = lang === "ja" ? e.commentJa : e.commentEn;
                return (
                  <div className="mo" key={e.month}>
                    <div className="mk">{moLabel(e.month, lang)}</div>
                    <div className="mb">
                      <div className="mr">
                        <div className={`bar ${draft.status}`}>
                          <i style={{ width: `${e.pct}%` }} />
                        </div>
                        <b>{e.pct}%</b>
                      </div>
                      <div className={`mc ${c.trim() ? "" : "none"}`}>
                        {c.trim() ? c : t("No comment", "コメントなし")}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="mc none" style={{ padding: "6px 0" }}>
                {t("No monthly progress yet.", "月次進捗はまだありません。")}
              </div>
            )}
          </div>

          {/* change note */}
          <div className="fld">
            <label>{t("Change note (optional)", "変更メモ（任意）")}</label>
            <textarea
              className="tin"
              style={{ minHeight: 48, resize: "vertical" }}
              placeholder={t("What changed? e.g. updated status, added KR…", "何を変えた？ 例：状態を更新、KRを追加…")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div style={{ fontSize: "11.5px", color: "var(--ink-3)", marginTop: 7 }}>
              {t("Kept in this goal’s history when you save.", "保存すると、この目標の履歴に残ります。")}
            </div>
          </div>

          {/* history */}
          <div className="fld">
            <label>{t("History", "変更履歴")}</label>
            {draft.log.length ? (
              draft.log.map((e, i) => (
                <div className="logl" key={i}>
                  <div className="a">{e.who}</div>
                  <div>
                    <div className="lt">
                      <span className="kind">
                        {e.kind === "created" ? t("Created", "作成") : t("Updated", "更新")}
                      </span>
                      {e.note && <span className="note"> {e.note}</span>}
                    </div>
                    <div className="lm">
                      {e.who} · {e.at}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="mc none" style={{ padding: "6px 0" }}>
                {t("No changes recorded yet.", "変更の記録はまだありません。")}
              </div>
            )}
          </div>
        </div>

        <div className="df">
          {!isNew && (
            <button
              className="del"
              onClick={() => (hasChildren ? undefined : onDelete(draft.id))}
              title={hasChildren ? t("Remove sub-goals first", "先に下位の目標を削除してください") : ""}
            >
              {t("Delete", "削除")}
            </button>
          )}
          <div className="sp" />
          <button className="btn btn-g" onClick={onClose}>
            {t("Cancel", "キャンセル")}
          </button>
          <button className="btn btn-p" onClick={handleSave}>
            {t("Save", "保存")}
          </button>
        </div>
      </aside>
    </>
  );
}
