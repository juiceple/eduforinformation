import { getCluster, ITEMS, subjectOf, SUBJECTS } from "@/lib/content";
import { isDue, type Progress } from "@/lib/progress";
import type { Item } from "@/lib/types";
import type { Scope } from "./AppContext";

export function scopeItems(scope: Scope, progress: Progress, pool: Item[] = ITEMS): Item[] {
  const now = Date.now();
  switch (scope.kind) {
    case "due":
      return pool.filter((it) => isDue(progress.map[it.n], now));
    case "new":
      return pool.filter((it) => !progress.map[it.n]);
    case "weak":
      return pool.filter((it) => {
        const s = progress.map[it.n];
        return s && (s.box <= 1 || s.wrong > s.right);
      });
    case "subject":
      return pool.filter((it) => subjectOf(it.n) === scope.id);
    case "cluster":
      return pool.filter((it) => it.c === scope.id);
    default:
      return pool;
  }
}

export function scopeLabel(scope: Scope): string {
  switch (scope.kind) {
    case "due": return "오늘 복습";
    case "new": return "새 항목";
    case "weak": return "약점(오답)";
    case "all": return "전체 200";
    case "subject": return `${scope.id}과목 ${SUBJECTS[scope.id - 1].name}`;
    case "cluster": return getCluster(scope.id).name;
  }
}
