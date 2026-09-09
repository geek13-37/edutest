import { Fragment, type ReactNode } from "react";

/**
 * Инлайновое форматирование в текстах тестов (вопросы и варианты ответов).
 * Виден ученику при прохождении и учителю в разборе.
 *
 * Поддерживается markdown-синтаксис и небольшой набор тегов:
 *   `код`  или  <code>код</code>          — моноширинный код
 *   *курсив*, _курсив_  или  <i>курсив</i> — курсив (напр. для формул, переменных)
 *   **жирный**  или  <b>жирный</b>
 *   ~~зачёркнутый~~  или  <s>…</s>
 *   <sup>верхний</sup>, <sub>нижний</sub>  — степени и индексы
 *
 * Сырой HTML НЕ рендерится: разбор идёт в React-элементы, неизвестные теги
 * остаются обычным текстом. Переносы строк превращаются в <br>.
 */

type Rule = { re: RegExp; wrap: (inner: ReactNode, key: string) => ReactNode };

const codeCls = "rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]";

// Порядок важен: при совпадении на одной позиции выигрывает правило выше по списку.
const RULES: Rule[] = [
  { re: /`([^`\n]+)`/, wrap: (i, k) => <code key={k} className={codeCls}>{i}</code> },
  { re: /<code>([\s\S]+?)<\/code>/i, wrap: (i, k) => <code key={k} className={codeCls}>{i}</code> },
  { re: /\*\*(\S(?:[^\n]*?\S)?)\*\*/, wrap: (i, k) => <strong key={k}>{i}</strong> },
  { re: /<(?:b|strong)>([\s\S]+?)<\/(?:b|strong)>/i, wrap: (i, k) => <strong key={k}>{i}</strong> },
  { re: /~~(\S(?:[^\n]*?\S)?)~~/, wrap: (i, k) => <s key={k}>{i}</s> },
  { re: /<(?:s|del)>([\s\S]+?)<\/(?:s|del)>/i, wrap: (i, k) => <s key={k}>{i}</s> },
  {
    re: /(?<![\p{L}\p{N}*])\*(\S(?:[^*\n]*?\S)?)\*(?![\p{L}\p{N}*])/u,
    wrap: (i, k) => <em key={k}>{i}</em>,
  },
  {
    re: /(?<![\p{L}\p{N}_])_(\S(?:[^_\n]*?\S)?)_(?![\p{L}\p{N}_])/u,
    wrap: (i, k) => <em key={k}>{i}</em>,
  },
  { re: /<(?:i|em)>([\s\S]+?)<\/(?:i|em)>/i, wrap: (i, k) => <em key={k}>{i}</em> },
  { re: /<sup>([\s\S]+?)<\/sup>/i, wrap: (i, k) => <sup key={k}>{i}</sup> },
  { re: /<sub>([\s\S]+?)<\/sub>/i, wrap: (i, k) => <sub key={k}>{i}</sub> },
];

function parseInline(text: string, keyBase: string): ReactNode[] {
  let hit: { rule: Rule; m: RegExpExecArray } | null = null;
  for (const rule of RULES) {
    const m = rule.re.exec(text);
    if (m && (hit === null || m.index < hit.m.index)) hit = { rule, m };
  }
  if (!hit) return [text];

  const { rule, m } = hit;
  const key = `${keyBase}.${m.index}`;
  return [
    text.slice(0, m.index),
    rule.wrap(<Fragment>{parseInline(m[1], `${key}i`)}</Fragment>, key),
    ...parseInline(text.slice(m.index + m[0].length), `${key}a`),
  ];
}

function render(text: string): ReactNode[] {
  const lines = text.split("\n");
  return lines.flatMap((line, i) =>
    i < lines.length - 1
      ? [...parseInline(line, `l${i}`), <br key={`br${i}`} />]
      : parseInline(line, `l${i}`),
  );
}

export function RichText({
  children,
  className,
  as: Tag = "span",
}: {
  children: string | null | undefined;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  return <Tag className={className}>{render(children ?? "")}</Tag>;
}
