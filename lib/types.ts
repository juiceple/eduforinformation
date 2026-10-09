export type SubjectId = 1 | 2 | 3;

/** 교재 한 항목. 본문의 [[키워드]]는 교재 밑줄(핵심어)로, 빈칸 퀴즈 정답이 된다. */
export interface Item {
  /** 교재 번호 (001~200) */
  n: number;
  /** 제목 */
  t: string;
  /** 연관 묶음 id */
  c: string;
  /** 본문 포인트 */
  p: string[];
  /** 예제·보충 풀이 */
  ex?: string;
  /** 암기 훅 (두문자·비유·연결) */
  m: string;
  /** 연결해서 같이 볼 항목 번호 */
  r: number[];
}

export interface Cluster {
  id: string;
  subject: SubjectId;
  name: string;
  emoji: string;
  /** 묶음 전체를 한 흐름으로 꿰는 이야기 */
  story: string;
}

export interface Subject {
  id: SubjectId;
  name: string;
  range: [number, number];
}

/** 실기 요약 테스트 범위: 1 운영체제 / 2 네트워크 / 3 개발환경·테스트·SQL */
export type ExamSet = 1 | 2 | 3;

/** 실기 요약 테스트 단답형 문제 (기존 200문항과 별개) */
export interface ExamQ {
  id: string;
  set: ExamSet;
  topic: string;
  q: string;
  /** 문제에 딸린 코드·표 */
  code?: string;
  /** 인정 답안 — 대소문자·띄어쓰기·기호 무시 */
  a: string[];
  /** 화면에 보여줄 모범 답안 (없으면 a[0]) */
  show?: string;
  /** 쉼표로 여러 개 쓰는 답에서 순서를 따지지 않음 */
  anyOrder?: boolean;
  ex?: string;
}
