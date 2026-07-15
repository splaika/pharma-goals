import { useRef, useState } from "react";
import { useLang } from "../../i18n";
import { NOTIF_TYPE_VALUE, notifTypeName } from "../refData";
import { Section, Btn, Icon } from "./common";
import type { NotifTypeKey } from "../types";

export interface ParsedImport {
  compoundCode: string;
  notifType: NotifTypeKey;
  filingCount?: number;
  protocolNo?: string;
  objectives?: string;
  targetDisease?: string;
  remarks?: string;
  siteCount: number;
  drugCount: number;
}

interface ImportedFile {
  id: string;
  name: string;
  size: number;
  kind: "xml" | "pdf" | "other";
  status: "parsed" | "attachment" | "error";
  message: string;
  parsed?: ParsedImport;
}

const notifKeyFromValue = (v: number): NotifTypeKey =>
  (Object.entries(NOTIF_TYPE_VALUE).find(([, val]) => val === v)?.[0] as NotifTypeKey) ?? "plan";

function parseCtnXml(text: string): ParsedImport | null {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) return null;
  const root = doc.querySelector("CLINICALTRIALNOTIFICATION");
  if (!root) return null;
  const txt = (tag: string) => root.querySelector(tag)?.textContent?.trim() ?? "";
  const notifVal = Number(root.getAttribute("NOTIFTYPE") ?? "100000000");
  return {
    compoundCode: txt("COMPOUNDCODE") || "(不明)",
    notifType: notifKeyFromValue(notifVal),
    filingCount: Number(txt("FILINGCOUNT")) || undefined,
    protocolNo: txt("PROTOCOLNO") || undefined,
    objectives: txt("OBJECTIVES") || undefined,
    targetDisease: txt("TARGETDISEASE") || undefined,
    remarks: txt("REMARKS") || undefined,
    siteCount: root.querySelectorAll("INFOEACHMEDICALINSTITUT").length,
    drugCount: root.querySelectorAll("MAININVESTPRODUCT, INFOCOMBINATION").length,
  };
}

export function ImportView({ onImport }: { onImport: (p: ParsedImport) => void }) {
  const { t, lang } = useLang();
  const [files, setFiles] = useState<ImportedFile[]>([]);
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  let seq = 0;

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    Array.from(list).forEach((file) => {
      const kind: ImportedFile["kind"] = file.name.toLowerCase().endsWith(".xml") ? "xml" : file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "other";
      const id = `f-${Date.now()}-${seq++}`;
      if (kind === "xml") {
        const reader = new FileReader();
        reader.onload = () => {
          const parsed = parseCtnXml(String(reader.result));
          setFiles((f) => [
            {
              id, name: file.name, size: file.size, kind, status: parsed ? "parsed" : "error",
              message: parsed ? t("CTN XML parsed — ready to import as a draft.", "CTN XMLを解析しました。ドラフトとして取り込めます。") : t("Not a recognizable CTN XML.", "CTN XMLとして解析できませんでした。"),
              parsed: parsed ?? undefined,
            },
            ...f,
          ]);
        };
        reader.readAsText(file);
      } else {
        setFiles((f) => [
          { id, name: file.name, size: file.size, kind, status: kind === "pdf" ? "attachment" : "error", message: kind === "pdf" ? t("PDF registered as an attachment candidate (content not parsed in demo).", "添付資料の候補として登録（デモでは内容解析なし）。") : t("Unsupported file type.", "未対応のファイル形式です。") },
          ...f,
        ]);
      }
    });
  };

  const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`);

  // デモ用ダミーデータ（実ファイル不要で取り込み結果一覧を確認できる）
  const loadSamples = () => {
    let s = 0;
    const now = `s-${files.length}`;
    const samples: ImportedFile[] = [
      { id: `${now}-${s++}`, name: "CTN_ABC-123_change_2.xml", size: 12480, kind: "xml", status: "parsed", message: t("CTN XML parsed — ready to import as a draft.", "CTN XMLを解析しました。ドラフトとして取り込めます。"), parsed: { compoundCode: "ABC-123", notifType: "change", filingCount: 2, protocolNo: "ABC-123-001", objectives: "分担医師の追加・削除", targetDisease: "関節リウマチ", remarks: "分担医師1名追加・1名削除", siteCount: 2, drugCount: 2 } },
      { id: `${now}-${s++}`, name: "CTN_SRP-204_plan_1.xml", size: 9760, kind: "xml", status: "parsed", message: t("CTN XML parsed — ready to import as a draft.", "CTN XMLを解析しました。ドラフトとして取り込めます。"), parsed: { compoundCode: "SRP-204", notifType: "plan", filingCount: 1, protocolNo: "SRP-204-01", objectives: "健康成人におけるSRP-204の薬物動態及び安全性", targetDisease: "潰瘍性大腸炎", siteCount: 1, drugCount: 1 } },
      { id: `${now}-${s++}`, name: "CTN_XYZ-500_plan_1.xml", size: 8190, kind: "xml", status: "parsed", message: t("CTN XML parsed — ready to import as a draft.", "CTN XMLを解析しました。ドラフトとして取り込めます。"), parsed: { compoundCode: "XYZ-500", notifType: "plan", filingCount: 1, protocolNo: "XYZ-500-101", objectives: "固形がんを対象とした第I相試験", targetDisease: "固形がん", siteCount: 3, drugCount: 1 } },
      { id: `${now}-${s++}`, name: "ABC-123-001_実施計画書_v2.pdf", size: 2411520, kind: "pdf", status: "attachment", message: t("PDF registered as an attachment candidate (content not parsed in demo).", "添付資料の候補として登録（デモでは内容解析なし）。") },
      { id: `${now}-${s++}`, name: "broken_export.xml", size: 640, kind: "xml", status: "error", message: t("Not a recognizable CTN XML.", "CTN XMLとして解析できませんでした。") },
    ];
    setFiles((f) => [...samples, ...f]);
  };

  return (
    <>
      <div
        className={`dropzone${over ? " over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
      >
        <div className="dz-ico">{Icon.doc}</div>
        <div className="dz-t">{t("Drag & drop files here, or click to choose", "ここにファイルをドラッグ＆ドロップ、またはクリックして選択")}</div>
        <div className="dz-s">{t("Accepted: .xml (CTN notification), .pdf (protocol / IB / ICF …)", "対応形式：.xml（治験届）、.pdf（実施計画書・IB・ICF 等）")}</div>
        <input ref={inputRef} type="file" accept=".xml,.pdf" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      </div>

      <div className="import-toolbar">
        <span className="muted small">{t("Want to see it in action? Load demo data.", "動きを確認したい場合はデモデータを読み込めます。")}</span>
        <div style={{ flex: 1 }} />
        <Btn kind="p" small onClick={loadSamples}>{Icon.plus} {t("Load sample data", "サンプルデータを取り込む")}</Btn>
        {files.length > 0 && <Btn small onClick={() => setFiles([])}>{t("Clear", "クリア")}</Btn>}
      </div>

      <Section title={t("Imported files", "取り込んだファイル")} sub={t("XML files parsed as CTN notifications can be turned into a draft.", "CTN届として解析できたXMLはドラフト作成できます。")}>
        {files.length === 0 ? (
          <div className="rt-empty">{t("No files imported yet.", "まだファイルはありません。")}</div>
        ) : (
          <div className="imp-list">
            {files.map((f) => (
              <div key={f.id} className={`imp-row st-${f.status}`}>
                <span className={`imp-kind k-${f.kind}`}>{f.kind.toUpperCase()}</span>
                <div className="imp-body">
                  <div className="imp-name">{f.name} <span className="muted small">{fmtSize(f.size)}</span></div>
                  <div className="imp-msg">{f.message}</div>
                  {f.parsed && (
                    <div className="imp-parsed">
                      <span><b>{f.parsed.compoundCode}</b></span>
                      <span className="imp-chip">{notifTypeName(f.parsed.notifType, lang)}</span>
                      {f.parsed.filingCount != null && <span>#{f.parsed.filingCount}</span>}
                      <span>{t("Sites", "施設")}: {f.parsed.siteCount}</span>
                      <span>{t("Drugs", "薬")}: {f.parsed.drugCount}</span>
                      {f.parsed.protocolNo && <span className="muted">{f.parsed.protocolNo}</span>}
                    </div>
                  )}
                </div>
                {f.parsed && <Btn kind="p" small onClick={() => onImport(f.parsed!)}>{Icon.arrow} {t("Import as draft", "ドラフトとして取り込む")}</Btn>}
                <button className="icon-btn danger" onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))}>{Icon.x}</button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="dash-note">
        {t(
          "Tip: export any filing's XML from the detail screen (XML preview → download), then import it here to see the round-trip.",
          "ヒント：詳細画面のXMLプレビューからダウンロードしたXMLをここで取り込むと、ラウンドトリップを確認できます。"
        )}
      </div>
    </>
  );
}
