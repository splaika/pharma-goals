#!/usr/bin/env python3
"""Convert MedDRA/J PT file (pt_j.asc, $-delimited, CP932) to CSV or Markdown.

Usage:
    python convert.py pt_j.asc pt_j.csv        # CSV (default)
    python convert.py pt_j.asc pt_j.md         # Markdown table

The source pt_j.asc is licensed MedDRA/J data and is NOT included in this
repository. Supply your own subscriber copy to regenerate the output.
"""
import csv
import sys
import unicodedata


def full_kana(s: str) -> str:
    """Half-width katakana -> full-width (composes dakuten/handakuten)."""
    return unicodedata.normalize("NFKC", s) if s else s


def read_rows(src: str):
    rows = []
    with open(src, encoding="cp932", errors="replace") as f:
        for raw in f:
            line = raw.rstrip("\r\n")
            if not line:
                continue
            p = line.split("$")  # code $ term $ kana $ alt-kana $ (trailing)
            code = p[0].strip() if len(p) > 0 else ""
            if not code:
                continue
            term = p[1].strip() if len(p) > 1 else ""
            kana = full_kana(p[2].strip()) if len(p) > 2 else ""
            alt = full_kana(p[3].strip()) if len(p) > 3 else ""
            rows.append((code, term, kana, alt))
    return rows


def write_csv(rows, out: str):
    with open(out, "w", encoding="utf-8-sig", newline="") as o:
        w = csv.writer(o)
        w.writerow(["pt_code", "term_ja", "reading_kana", "reading_alt"])
        w.writerows(rows)


def write_markdown(rows, out: str):
    def esc(s: str) -> str:
        return s.replace("|", "\\|")

    with open(out, "w", encoding="utf-8") as o:
        o.write("# MedDRA/J PT（基本語）用語集\n\n")
        o.write(f"- 総項目数: {len(rows):,}\n")
        o.write("- 出典: MedDRA/J `pt_j.asc`（`$` 区切り, CP932）\n")
        o.write("- カナ列は半角→全角カナに正規化（NFKC）\n\n")
        o.write("| PTコード | 用語（日本語） | 読み（カナ） | 別読み |\n")
        o.write("| --- | --- | --- | --- |\n")
        for code, term, kana, alt in rows:
            o.write(f"| {esc(code)} | {esc(term)} | {esc(kana)} | {esc(alt)} |\n")


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else "pt_j.asc"
    out = sys.argv[2] if len(sys.argv) > 2 else "pt_j.csv"
    rows = read_rows(src)
    if out.lower().endswith(".md"):
        write_markdown(rows, out)
    else:
        write_csv(rows, out)
    print(f"{len(rows)} rows -> {out}")


if __name__ == "__main__":
    main()
