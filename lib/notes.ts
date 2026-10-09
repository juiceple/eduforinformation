// 요약노트(notes/*.md)를 빌드할 때 읽어 HTML로 바꾼다. 서버(page.tsx)에서만 import한다.
import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import type { NoteDoc } from "./types";

const NOTES: { id: number; file: string; name: string; emoji: string }[] = [
  { id: 1, file: "실기-총요약-1-운영체제.md", name: "운영체제 · 가상화 · 클라우드", emoji: "🖥️" },
  { id: 2, file: "실기-총요약-2-네트워크.md", name: "네트워크", emoji: "🌐" },
  { id: 3, file: "실기-총요약-3-개발환경-테스트-SQL.md", name: "개발환경 · 테스트 · SQL", emoji: "🗄️" },
];

const marked = new Marked({ gfm: true });

const stripTags = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export function loadNotes(): NoteDoc[] {
  return NOTES.map((n) => {
    const md = fs.readFileSync(path.join(process.cwd(), "notes", n.file), "utf8");
    let html = marked.parse(md, { async: false }) as string;
    // 모바일에서 넓은 표는 가로 스크롤
    html = html.replace(/<table>/g, '<div class="note-table"><table>').replace(/<\/table>/g, "</table></div>");
    // ## 제목에 id를 달아 목차에서 바로 이동
    const toc: NoteDoc["toc"] = [];
    html = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner: string) => {
      const id = `note${n.id}-s${toc.length + 1}`;
      toc.push({ id, text: stripTags(inner) });
      return `<h2 id="${id}">${inner}</h2>`;
    });
    return { id: n.id, name: n.name, emoji: n.emoji, html, toc };
  });
}
