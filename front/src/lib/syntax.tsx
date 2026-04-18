import { Fragment, type ReactNode } from "react";

const KEYWORDS = new Set([
  "public","private","protected","class","interface","extends","implements",
  "static","final","void","return","new","if","else","for","while","do","switch",
  "case","break","continue","try","catch","finally","throw","throws","import",
  "package","this","super","null","true","false","abstract","enum","instanceof",
]);

const TYPES = new Set([
  "String","Long","Integer","int","long","boolean","double","float","char","byte",
  "Optional","List","Map","Set","Student","Course","StudentRepository",
  "RuntimeException","Exception",
]);

type Token = { type: string; value: string };

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];

    // Line comment
    if (ch === "/" && line[i + 1] === "/") {
      tokens.push({ type: "comment", value: line.slice(i) });
      break;
    }
    // String
    if (ch === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"') {
        if (line[j] === "\\") j++;
        j++;
      }
      tokens.push({ type: "string", value: line.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // Annotation
    if (ch === "@") {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      tokens.push({ type: "annotation", value: line.slice(i, j) });
      i = j;
      continue;
    }
    // Identifier / keyword
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      let type = "ident";
      if (KEYWORDS.has(word)) type = "keyword";
      else if (TYPES.has(word)) type = "type";
      else if (/^[A-Z]/.test(word)) type = "type";
      tokens.push({ type, value: word });
      i = j;
      continue;
    }
    // Number
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      tokens.push({ type: "number", value: line.slice(i, j) });
      i = j;
      continue;
    }
    // Punctuation / operators
    if (/[{}()\[\];,.]/.test(ch)) {
      tokens.push({ type: "punct", value: ch });
      i++;
      continue;
    }
    if (/[+\-*/=<>!&|?:]/.test(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    tokens.push({ type: "text", value: ch });
    i++;
  }
  return tokens;
}

const CLASS: Record<string, string> = {
  keyword: "text-[oklch(0.72_0.18_320)]",
  type: "text-[oklch(0.78_0.15_200)]",
  string: "text-[oklch(0.78_0.16_30)]",
  comment: "text-muted-foreground/70 italic",
  annotation: "text-[oklch(0.82_0.18_90)]",
  number: "text-[oklch(0.75_0.15_150)]",
  ident: "text-code-fg",
  punct: "text-muted-foreground",
  op: "text-[oklch(0.78_0.15_200)]",
  text: "text-code-fg",
};

export function HighlightedLine({ line }: { line: string }): ReactNode {
  const tokens = tokenizeLine(line);
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} className={CLASS[t.type] ?? ""}>{t.value}</span>
      ))}
    </>
  );
}

/** Splits text by a regex and renders highlighted segments around interleaved nodes. */
export function highlightWithBlanks(
  line: string,
  blankRe: RegExp,
  renderBlank: (match: string, idx: number) => ReactNode,
): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let blankIdx = 0;
  blankRe.lastIndex = 0;
  while ((m = blankRe.exec(line))) {
    if (m.index > last) {
      parts.push(<HighlightedLine key={`t-${last}`} line={line.slice(last, m.index)} />);
    }
    parts.push(<Fragment key={`b-${m.index}`}>{renderBlank(m[0], blankIdx++)}</Fragment>);
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    parts.push(<HighlightedLine key={`t-end`} line={line.slice(last)} />);
  }
  return <>{parts}</>;
}
