import { createContext, useContext } from "react";
import type { Lang } from "./ctn/types";

export interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** pick language-appropriate string */
  t: (en: string, ja: string) => string;
}

export const LangContext = createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  t: (en) => en,
});

export const useLang = (): LangCtx => useContext(LangContext);

export const makeT =
  (lang: Lang) =>
  (en: string, ja: string): string =>
    lang === "ja" ? ja : en;
