import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Check,
  Eye,
  GripVertical,
  MoreHorizontal,
  Plus,
  Save,
  Send,
  Settings2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { usePublishTest, useReplaceQuestions, useTest } from "@/api/tests";
import type { QuestionDraft, QuestionType } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLoader, Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";
import { apiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { AIPanel } from "./AIPanel";
import { AssignTestDialog } from "./AssignTestDialog";
import { QuestionCard } from "./QuestionCard";
import { TagsButton } from "./TagsButton";
import { TestPreviewDialog } from "./TestPreviewDialog";
import { TestSettingsDialog } from "./TestSettingsDialog";
import { blankQuestion, validateQuestions } from "./question-utils";

function toDraft(q: {
  type: QuestionType;
  text: string;
  options: { id: string; text: string }[];
  correct: string[];
  points: number;
}): QuestionDraft {
  return { type: q.type, text: q.text, options: q.options, correct: q.correct, points: q.points };
}

type Item = { uid: string; q: QuestionDraft };
const rid = () => crypto.randomUUID();
const wrap = (q: QuestionDraft): Item => ({ uid: rid(), q });

function SortableQuestion({
  item,
  index,
  onChange,
  onRemove,
}: {
  item: Item;
  index: number;
  onChange: (q: QuestionDraft) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.uid,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 opacity-70")}
    >
      <QuestionCard
        index={index}
        question={item.q}
        onChange={onChange}
        onRemove={onRemove}
        dragHandle={
          <button
            type="button"
            className="flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground active:cursor-grabbing"
            title="Перетащить вопрос"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}

function HeaderMoreMenu({
  onPreview,
  onSettings,
}: {
  onPreview: () => void;
  onSettings: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Ещё"
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-md border bg-card shadow-lg"
        >
          <button
            role="menuitem"
            onClick={() => run(onPreview)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span>Предпросмотр</span>
          </button>
          <button
            role="menuitem"
            onClick={() => run(onSettings)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
          >
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <span>Настройки</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function TestEditorPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const aiSeed = (location.state as { aiSeed?: { prompt: string; count: number } } | null)?.aiSeed;
  const { data: test, isLoading } = useTest(id);
  const replace = useReplaceQuestions(id);
  const publish = usePublishTest(id);
  const toast = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [dirty, setDirty] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (test && !loaded) {
      setItems(test.questions.map((q) => wrap(toDraft(q))));
      setLoaded(true);
    }
  }, [test, loaded]);

  const draft = useMemo(() => items.map((it) => it.q), [items]);
  const issues = useMemo(() => validateQuestions(draft), [draft]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (isLoading || !test) return <PageLoader />;

  const publishBlockReason =
    draft.length === 0
      ? "Добавьте хотя бы один вопрос, чтобы опубликовать тест"
      : dirty
        ? "Сохраните черновик, чтобы опубликовать тест"
        : issues.length > 0
          ? `Исправьте вопрос ${issues[0].index + 1}: ${issues[0].message}`
          : null;

  const addQuestion = () => {
    setItems((p) => [...p, wrap(blankQuestion())]);
    setDirty(true);
  };

  const changeAt = (uid: string, nq: QuestionDraft) => {
    setItems((p) => p.map((it) => (it.uid === uid ? { ...it, q: nq } : it)));
    setDirty(true);
  };

  const removeAt = (uid: string) => {
    setItems((p) => p.filter((it) => it.uid !== uid));
    setDirty(true);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((p) => {
      const from = p.findIndex((it) => it.uid === active.id);
      const to = p.findIndex((it) => it.uid === over.id);
      return from < 0 || to < 0 ? p : arrayMove(p, from, to);
    });
    setDirty(true);
  };

  const save = async () => {
    if (issues.length) {
      toast(`Вопрос ${issues[0].index + 1}: ${issues[0].message}`, "error");
      return;
    }
    try {
      await replace.mutateAsync(draft);
      setDirty(false);
      toast("Черновик сохранен", "success");
    } catch (e) {
      toast(apiError(e), "error");
    }
  };

  const doPublish = async (value: boolean) => {
    if (value && dirty) {
      toast("Сначала сохраните изменения", "error");
      return;
    }
    try {
      await publish.mutateAsync(value);
      toast(value ? "Тест опубликован" : "Снят с публикации", "success");
    } catch (e) {
      toast(apiError(e), "error");
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
        <div className="container flex flex-wrap items-center gap-3 py-2.5 sm:h-14 sm:flex-nowrap sm:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link to="/teacher/tests" className="shrink-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="min-w-0 shrink truncate font-semibold" title={test.title}>
                {test.title}
              </span>
              <TagsButton subject={test.subject} status={test.status} align="right" />
              {dirty && <Badge variant="warning" className="shrink-0">не сохранено</Badge>}
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            <Button size="sm" onClick={save} disabled={replace.isPending}>
              {replace.isPending ? <Spinner /> : <Save className="h-4 w-4" />}
              <span>Сохранить</span>
            </Button>
            {test.status === "published" ? (
              <Button size="sm" variant="outline" onClick={() => doPublish(false)}>
                Снять с публикации
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => doPublish(true)}
                disabled={publish.isPending || publishBlockReason !== null}
                title={publishBlockReason ?? undefined}
              >
                <Check className="h-4 w-4" />
                <span>Опубликовать</span>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAssignOpen(true)}
              disabled={test.status !== "published"}
              title={test.status !== "published" ? "Сначала опубликуйте тест" : undefined}
            >
              <Send className="h-4 w-4" />
              <span>Назначить</span>
            </Button>
            <HeaderMoreMenu onPreview={() => setPreviewOpen(true)} onSettings={() => setSettingsOpen(true)} />
          </div>
        </div>
      </header>

      <div className="container grid gap-6 py-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {test.status !== "published" && publishBlockReason && (
            <div className="flex items-center gap-1.5 rounded-md bg-warning/10 p-2.5 text-xs text-warning">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
              <span>{publishBlockReason}</span>
            </div>
          )}
          {draft.length === 0 && (
            <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
              Вопросов пока нет. Добавьте вручную или сгенерируйте через ИИ справа.
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={items.map((it) => it.uid)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {items.map((it, i) => (
                  <SortableQuestion
                    key={it.uid}
                    item={it}
                    index={i}
                    onChange={(nq) => changeAt(it.uid, nq)}
                    onRemove={() => removeAt(it.uid)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <Button variant="outline" onClick={addQuestion} className="w-full">
            <Plus className="h-4 w-4" />
            <span>Добавить вопрос</span>
          </Button>
        </div>

        <div>
          <AIPanel
            testId={id}
            draft={draft}
            initialPrompt={aiSeed?.prompt}
            initialCount={aiSeed?.count}
            autoGenerate={!!aiSeed && loaded && test.questions.length === 0}
            onResult={(qs, mode) => {
              setItems((prev) => (mode === "append" ? [...prev, ...qs.map(wrap)] : qs.map(wrap)));
              setDirty(true);
            }}
          />
        </div>
      </div>

      <TestPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        questions={draft}
        title={test.title}
      />
      <TestSettingsDialog test={test} open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AssignTestDialog
        testId={id}
        published={test.status === "published"}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
      />
    </div>
  );
}
