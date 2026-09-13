import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { useCreateSchoolRequest } from "@/api/schoolRequests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { apiError } from "@/lib/api";

const EMPTY = {
  school_name: "",
  city: "",
  region: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  comment: "",
  website: "",
};

export function SchoolRequestForm() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const create = useCreateSchoolRequest();

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-success" />
        <p className="font-medium">Заявка отправлена</p>
        <p className="text-sm text-muted-foreground">
          Мы свяжемся с вами по указанным контактам и пришлём код регистрации.
        </p>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_email.trim() && !form.contact_phone.trim()) {
      setError("Укажите email или телефон для связи");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await create.mutateAsync({
        school_name: form.school_name.trim(),
        city: form.city.trim(),
        region: form.region.trim() || undefined,
        contact_name: form.contact_name.trim(),
        contact_email: form.contact_email.trim() || undefined,
        contact_phone: form.contact_phone.trim() || undefined,
        comment: form.comment.trim() || undefined,
        website: form.website,
      });
      setSent(true);
    } catch (err) {
      setError(apiError(err, "Не удалось отправить заявку"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sr-name">Название школы</Label>
          <Input
            id="sr-name"
            required
            minLength={3}
            value={form.school_name}
            onChange={(e) => setForm({ ...form, school_name: e.target.value })}
            placeholder="МАОУ «СОШ № 3»"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sr-city">Город</Label>
          <Input
            id="sr-city"
            required
            minLength={2}
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="Северодвинск"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sr-region">Регион (необязательно)</Label>
        <Input
          id="sr-region"
          value={form.region}
          onChange={(e) => setForm({ ...form, region: e.target.value })}
          placeholder="Архангельская область"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sr-contact">Контактное лицо</Label>
        <Input
          id="sr-contact"
          required
          minLength={2}
          value={form.contact_name}
          onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          placeholder="Иванова Мария Петровна"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="sr-email">Email</Label>
          <Input
            id="sr-email"
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sr-phone">Телефон</Label>
          <Input
            id="sr-phone"
            type="tel"
            value={form.contact_phone}
            onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
            placeholder="+7 900 000-00-00"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Укажите email или телефон - хотя бы один.</p>

      <div className="space-y-1.5">
        <Label htmlFor="sr-comment">Комментарий (необязательно)</Label>
        <Textarea
          id="sr-comment"
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          placeholder="Сколько классов, какие предметы важны и т.п."
        />
      </div>

      {/* honeypot: обычный человек это поле не видит и не заполняет */}
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="sr-website">Website</label>
        <input
          id="sr-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Spinner />}
        <span>Отправить заявку</span>
      </Button>
    </form>
  );
}
