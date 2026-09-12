from __future__ import annotations

import json
import logging

from openai import AsyncOpenAI, OpenAIError
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.question import QuestionIn

log = logging.getLogger("edutest.ai")

_SYSTEM = (
    "Ты генератор школьных тестов. Отвечай ТОЛЬКО валидным JSON, без пояснений и без обёртки в ```.\n"
    "Формат ответа:\n"
    "{\n"
    '  "questions": [\n'
    "    {\n"
    '      "type": "single" | "multiple" | "boolean" | "short",\n'
    '      "text": "текст вопроса на русском",\n'
    '      "options": [ {"id": "a", "text": "вариант"}, {"id": "b", "text": "вариант"} ],\n'
    '      "correct": ["a"],\n'
    '      "points": 1\n'
    "    }\n"
    "  ]\n"
    "}\n"
    "Правила:\n"
    "1. type=single: ровно один правильный вариант, 3-4 варианта.\n"
    "2. type=multiple: два и более правильных варианта, 4-5 вариантов.\n"
    "3. type=boolean: ровно 2 варианта {\"id\":\"true\",\"text\":\"Верно\"} и {\"id\":\"false\",\"text\":\"Неверно\"}, correct это один из них.\n"
    "4. type=short: короткий ответ (число, слово или короткая фраза). options это пустой массив []. "
    'correct это 1-3 приемлемых варианта ответа строками, без пояснений, напр. ["12", "12 см"]. '
    "Используй short для задач, где ответ вписывают, а не выбирают.\n"
    "5. id вариантов: короткие латинские строки (a, b, c, d), уникальные внутри вопроса.\n"
    "6. Для single/multiple/boolean correct содержит только id из options этого вопроса.\n"
    "7. Никакого текста вне JSON.\n"
    "8. В текстах вопросов и вариантов не используй тире, пиши обычными предложениями или с двоеточием.\n"
    "9. Внутри значений text (у вопросов и вариантов) применяй лёгкое форматирование, его видит ученик:\n"
    "   `моноширинный код` для кода, команд, имён функций;\n"
    "   *курсив* для переменных, величин и формул, напр. *v = s / t*, *S* = *a* * *b*;\n"
    "   **жирный** для смыслового акцента (умеренно);\n"
    "   <sup>...</sup> и <sub>...</sub> для степеней и индексов, напр. x<sup>2</sup>, H<sub>2</sub>O.\n"
    "   Используй форматирование только там, где оно правда помогает читать. JSON остаётся валидным."
)


def _client() -> AsyncOpenAI:
    return AsyncOpenAI(api_key=settings.chadgpt_api_key, base_url=settings.chadgpt_base_url)


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text
        text = text.removeprefix("json").strip()
    if text.endswith("```"):
        text = text[: text.rfind("```")]
    start, end = text.find("{"), text.rfind("}") + 1
    if start != -1 and end > start:
        text = text[start:end]
    return json.loads(text)


def _clean_text(value: str) -> str:
    for dash in ("—", "–", "―"):  # em dash, en dash, horizontal bar
        value = value.replace(f" {dash} ", ", ").replace(dash, "-")
    return value.strip()


def _parse_questions(raw: dict) -> list[QuestionIn]:
    items = raw.get("questions")
    if not isinstance(items, list):
        raise ValueError("в ответе ИИ нет массива questions")
    out: list[QuestionIn] = []
    for item in items:
        # ИИ иногда ставит type=multiple, но отмечает только один правильный вариант
        # (нарушает инструкцию из системного промпта). Не выбрасываем вопрос, а понижаем
        # до single - это соответствует тому, что модель реально отметила.
        if isinstance(item, dict) and item.get("type") == "multiple":
            correct = item.get("correct")
            if isinstance(correct, list) and len(correct) < 2:
                item = {**item, "type": "single", "correct": correct[:1]}
        try:
            q = QuestionIn.model_validate(item)
        except ValidationError as e:
            log.warning("ИИ вернул невалидный вопрос, пропущен: %s", e)
            continue
        q.text = _clean_text(q.text)
        for opt in q.options:
            opt.text = _clean_text(opt.text)
        out.append(q)
    if not out:
        raise ValueError("ИИ не вернул ни одного валидного вопроса")
    return out


_UNAVAILABLE = "Сервис ИИ временно недоступен, попробуйте позже"


def _models() -> list[str]:
    """Основная модель + резервные: если провайдер перегружен, пробуем следующую."""
    primary = settings.chadgpt_model
    fallbacks = [m.strip() for m in settings.chadgpt_fallback_models.split(",") if m.strip()]
    return list(dict.fromkeys([primary, *fallbacks]))


class AIService:
    @staticmethod
    async def _one_call(model: str, user_content: str) -> str:
        resp = await _client().chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            max_tokens=8000,
            timeout=90,
        )
        # провайдер иногда отдаёт ошибку в теле с кодом 200
        err = getattr(resp, "error", None)
        if err or not getattr(resp, "choices", None):
            raise RuntimeError(err.get("message") if isinstance(err, dict) else "пустой ответ ИИ")
        return (resp.choices[0].message.content or "").strip()

    @staticmethod
    async def _chat(user_content: str) -> list[QuestionIn]:
        last_error: Exception | None = None
        for model in _models():
            try:
                content = await AIService._one_call(model, user_content)
            except (OpenAIError, RuntimeError) as e:
                log.warning("Модель %s недоступна: %s", model, e)
                last_error = e
                continue
            try:
                return _parse_questions(_extract_json(content))
            except (json.JSONDecodeError, ValueError) as e:
                log.warning("Модель %s вернула неразбираемый ответ: %s | %s", model, e, content[:300])
                last_error = e
                continue

        log.error("Все модели ИИ недоступны, последняя ошибка: %s", last_error)
        raise RuntimeError(_UNAVAILABLE)

    @staticmethod
    async def generate(prompt: str, count: int) -> list[QuestionIn]:
        return await AIService._chat(
            f"Составь {count} вопросов. Тема и требования: {prompt}"
        )

    @staticmethod
    async def revise(current: list[dict], prompt: str) -> list[QuestionIn]:
        return await AIService._chat(
            "Текущие вопросы теста (JSON):\n"
            f"{json.dumps(current, ensure_ascii=False)}\n\n"
            f"Внеси правки согласно запросу: {prompt}\n"
            "Верни полный обновленный список вопросов в том же формате."
        )
