import {
  BarChart3,
  BookOpen,
  Check,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { Link } from "react-router-dom";

import dashboardDark from "@/assets/landing-dashboard-dark.png";
import dashboardLight from "@/assets/landing-dashboard.png";
import heroDark from "@/assets/landing-hero-dark.png";
import heroLight from "@/assets/landing-hero.png";
import resultsDark from "@/assets/landing-results-dark.png";
import resultsLight from "@/assets/landing-results.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/lib/theme";
import { Reveal } from "./Reveal";
import { SchoolRequestForm } from "./SchoolRequestForm";
import { TiltCard } from "./TiltCard";

// цветовые чипы иконок: полные классы прописаны буквально, чтобы Tailwind их не срезал
const CHIP: Record<string, string> = {
  ai: "bg-ai/10 text-ai",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
};

const FEATURES: {
  icon: ComponentType<{ className?: string }>;
  color: keyof typeof CHIP;
  title: string;
  text: string;
}[] = [
  {
    icon: Wand2,
    color: "ai",
    title: "Вопросы за секунды",
    text: "Опишите тему, и ИИ соберет тест: один вариант, несколько, верно-неверно или короткий ответ. Черновик всегда можно доработать вручную.",
  },
  {
    icon: BookOpen,
    color: "primary",
    title: "Готовые шаблоны",
    text: "Темы по школьной программе или задания ОГЭ, ЕГЭ и ВПР. Выберите класс и предмет, тема и запрос для ИИ подставятся сами.",
  },
  {
    icon: Check,
    color: "success",
    title: "Проверка без учителя",
    text: "Ответ ученика сверяется автоматически, оценка выставляется по настроенным порогам сразу после сдачи теста.",
  },
  {
    icon: Users,
    color: "primary",
    title: "Ученики без почты",
    text: "Учитель заводит аккаунты прямо в классе: логин и пароль, карточка для печати с QR-кодом на вход.",
  },
  {
    icon: BarChart3,
    color: "info",
    title: "Результаты и статистика",
    text: "Разбор по каждому вопросу, процент выполнения и оценка, выгрузка в Excel для отчетности.",
  },
  {
    icon: ShieldCheck,
    color: "success",
    title: "Честный результат",
    text: "Правильные ответы никогда не видны ученику заранее, а число попыток и время задает учитель.",
  },
];

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur">
      <div className="container flex h-14 items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
          <span>Edutest</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a href="#school-request" className="hidden sm:block">
            <Button variant="ghost" size="sm">
              Оставить заявку
            </Button>
          </a>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Войти
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Регистрация</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Screenshot({
  src,
  alt,
  aspect,
  onClick,
}: {
  src: string;
  alt: string;
  aspect?: string;
  onClick?: () => void;
}) {
  const card = (
    <TiltCard
      className={`overflow-hidden rounded-xl border bg-card shadow-2xl shadow-primary/10 ${aspect ?? ""}`}
    >
      <img
        src={src}
        alt={alt}
        className={aspect ? "h-full w-full object-cover object-top" : "w-full"}
      />
    </TiltCard>
  );

  if (!onClick) return card;

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full cursor-zoom-in text-left transition duration-150 ease-out hover:opacity-90 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
      aria-label={`Открыть увеличенное изображение: ${alt}`}
    >
      {card}
    </button>
  );
}

export function LandingPage() {
  const { theme } = useTheme();
  const hero = theme === "dark" ? heroDark : heroLight;
  const dashboard = theme === "dark" ? dashboardDark : dashboardLight;
  const results = theme === "dark" ? resultsDark : resultsLight;
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  return (
    <div className="min-h-screen">
      <Header />

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            <div className="absolute left-1/2 top-[-12rem] h-[28rem] w-[52rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute right-[-10rem] top-24 h-72 w-72 rounded-full bg-ai/15 blur-3xl" />
          </div>

          <div className="container py-16 sm:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="ai" className="mb-4 gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Тесты, которые собирает ИИ</span>
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Тесты и проверка знаний без часов ручной работы
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Соберите тест сами или доверьте это ИИ, назначьте классу: ученики проходят
                его онлайн, а оценки появляются сразу после сдачи.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a href="#school-request">
                  <Button size="lg">Оставить заявку</Button>
                </a>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    Войти
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mx-auto mt-14 max-w-5xl">
              <Screenshot src={hero} alt="Редактор теста Edutest: вопросы слева, панель EduAI справа" />
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/40 py-16">
          <div className="container">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Что меняется для учителя
              </h2>
              <p className="mt-3 text-muted-foreground">
                Раньше: печатать вопросы, сверять ответы каждого ученика вручную,
                считать баллы и выставлять оценки, часы работы после каждого теста.
                Сейчас: вопросы собирает ИИ или вы сами за пару минут, ответы Edutest
                проверяет автоматически, а оценка готова сразу после сдачи теста.
              </p>
            </Reveal>

            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
              <Reveal>
                <Screenshot
                  src={dashboard}
                  alt="Обзор учителя: классы, тесты, последние тесты"
                  aspect="aspect-[5/2]"
                  onClick={() =>
                    setLightbox({ src: dashboard, alt: "Обзор учителя: классы, тесты, последние тесты" })
                  }
                />
                <p className="mt-3 text-center text-sm text-muted-foreground">Обзор для учителя</p>
              </Reveal>
              <Reveal delay={100}>
                <Screenshot
                  src={results}
                  alt="Результаты теста по классу с оценками"
                  aspect="aspect-[5/2]"
                  onClick={() =>
                    setLightbox({ src: results, alt: "Результаты теста по классу с оценками" })
                  }
                />
                <p className="mt-3 text-center text-sm text-muted-foreground">Результаты класса</p>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="container py-16 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Возможности</h2>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <Card className="transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary hover:shadow-md motion-reduce:hover:translate-y-0">
                  <CardContent className="space-y-3 pt-6">
                    <div
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${CHIP[f.color]}`}
                    >
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold tracking-tight">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.text}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="school-request" className="border-t bg-muted/40 py-16 sm:py-24">
          <div className="container">
            <Reveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Подключить школу
              </h2>
              <p className="mt-3 text-muted-foreground">
                Оставьте заявку - мы свяжемся с вами, создадим школу и передадим код
                регистрации для учителей.
              </p>
            </Reveal>

            <Reveal delay={100} className="mx-auto mt-10 max-w-xl">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Заявка на подключение</CardTitle>
                </CardHeader>
                <CardContent>
                  <SchoolRequestForm />
                </CardContent>
              </Card>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t py-6">
        <div className="container flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 shrink-0" />
            <span>Edutest</span>
          </div>
          <span>© {new Date().getFullYear()} Edutest</span>
        </div>
      </footer>

      <Dialog
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
        className="max-w-4xl p-2 sm:p-2"
      >
        {lightbox && (
          <img src={lightbox.src} alt={lightbox.alt} className="w-full rounded-lg" />
        )}
      </Dialog>
    </div>
  );
}
