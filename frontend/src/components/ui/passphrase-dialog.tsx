import { Copy, RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PASSPHRASE_OPTS,
  generatePassphrase,
  type PassphraseOptions,
  passphraseBits,
  strengthLabel,
} from "@/lib/passphrase";

const TONE_TEXT = {
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
} as const;

const TONE_BAR = {
  warning: "bg-warning",
  info: "bg-info",
  success: "bg-success",
} as const;

export function PassphraseDialog({
  open,
  onClose,
  onUse,
}: {
  open: boolean;
  onClose: () => void;
  onUse: (passphrase: string) => void;
}) {
  const toast = useToast();
  const [opts, setOpts] = useState<PassphraseOptions>(DEFAULT_PASSPHRASE_OPTS);
  const [phrase, setPhrase] = useState(() => generatePassphrase(DEFAULT_PASSPHRASE_OPTS));

  useEffect(() => {
    if (open) {
      setOpts(DEFAULT_PASSPHRASE_OPTS);
      setPhrase(generatePassphrase(DEFAULT_PASSPHRASE_OPTS));
    }
  }, [open]);

  const apply = (patch: Partial<PassphraseOptions>) => {
    const next = { ...opts, ...patch };
    setOpts(next);
    setPhrase(generatePassphrase(next));
  };

  const bits = passphraseBits(opts);
  const strength = strengthLabel(bits);
  const barWidth = Math.min(100, Math.round((bits / 50) * 100));

  const copy = () => {
    navigator.clipboard?.writeText(phrase);
    toast("Пароль скопирован", "success");
  };

  return (
    <Dialog open={open} onClose={onClose} title="Генератор пароля">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Парольная фраза из нескольких простых слов: надежная и легко запоминается.
        </p>

        <div className="rounded-md border bg-muted/40 p-3">
          <div className="flex items-start gap-2">
            <code className="flex-1 break-all font-mono text-lg font-semibold">{phrase}</code>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Сгенерировать заново"
                onClick={() => setPhrase(generatePassphrase(opts))}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" title="Скопировать" onClick={copy}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className={cn("h-full rounded-full transition-all", TONE_BAR[strength.tone])}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className={cn("text-xs font-medium", TONE_TEXT[strength.tone])}>
              {strength.label}
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">Слов в пароле</span>
            <div className="flex gap-1">
              {[3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => apply({ words: n })}
                  className={cn(
                    "h-8 w-8 rounded-md border text-sm font-medium transition-colors",
                    opts.words === n
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>Цифра в конце</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={opts.includeNumber}
              onChange={(e) => apply({ includeNumber: e.target.checked })}
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
            <span>Каждое слово с большой буквы</span>
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={opts.capitalize}
              onChange={(e) => apply({ capitalize: e.target.checked })}
            />
          </label>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span>Разделитель</span>
            <div className="flex gap-1">
              {(["-", ".", "_"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => apply({ separator: s })}
                  className={cn(
                    "h-8 w-8 rounded-md border font-mono text-sm transition-colors",
                    opts.separator === s
                      ? "border-primary bg-primary/5 text-primary"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-warning/10 p-2.5 text-xs">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>
            Запишите этот пароль и сохраните в надежном месте (менеджер паролей, заметка).
            Свой пароль вы восстановить не сможете, его сбрасывает только администратор школы.
          </span>
        </div>

        <Button type="button" className="w-full" onClick={() => onUse(phrase)}>
          Использовать этот пароль
        </Button>
      </div>
    </Dialog>
  );
}
