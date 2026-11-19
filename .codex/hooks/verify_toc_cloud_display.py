#!/usr/bin/env python3
"""Stop-hook: do not let a TOC mentor continue past an unseen Cloud.

The ChatGPT client can occasionally fail to render an image even when the
tool result contains an ``input_image`` block.  A Stop hook cannot inspect the
user's screen, so the reliable acceptance signal is the user's explicit
confirmation that the image is visible.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable


ACTIVATION_MARKERS = (
    "$toc-cloud-display",
    "toc-cloud-display",
)

IMAGE_CLAIM_RE = re.compile(
    r"(?:изображени[ея]\s+(?:показано|выведено|отображено)|"
    r"(?:показываю|показал(?:а|о)?)\s+(?:актуальную\s+|итоговую\s+)?тучу)",
    re.IGNORECASE,
)

CLOUD_QUESTION_RE = re.compile(
    r"(?:туч[аеуы]|блок\s+[ABCDD][\u2019']?|связ[ьи]\s+[ABCDD]|"
    r"конфликт[ае]?\s+[DD][\u2013\-][DD][\u2019']?|"
    r"предположени[ея].{0,40}(?:туч[аи]|стрелк[аи]|связ[ьи]))",
    re.IGNORECASE,
)

VISIBILITY_CHECK_RE = re.compile(
    r"(?:видите|виден|видна|появил(?:ось|ась)|отображается|читается).{0,80}"
    r"(?:изображени[ея]|рисунок|туч[ауи])|"
    r"(?:изображени[ея]|рисунок|туч[аи]).{0,80}"
    r"(?:видите|виден|видна|появил(?:ось|ась)|отображается|читается)",
    re.IGNORECASE | re.DOTALL,
)

NEGATIVE_CONFIRMATION_RE = re.compile(
    r"^\s*(?:нет|не\s+видно|не\s+вижу|не\s+появил(?:ось|ась)|"
    r"не\s+отображается|рисунк[ае]\s+нет|изображени[ея]\s+нет)\b",
    re.IGNORECASE,
)

POSITIVE_CONFIRMATION_RE = re.compile(
    r"^\s*(?:да|вижу|видно|появил(?:ось|ась)|отображается|читается)\b",
    re.IGNORECASE,
)


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as stream:
        for line in stream:
            try:
                item = json.loads(line)
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue
            if isinstance(item, dict):
                rows.append(item)
    return rows


def _response_items_for_turn(
    rows: Iterable[dict[str, Any]], turn_id: str
) -> list[dict[str, Any]]:
    rows = list(rows)
    item_ids: set[str] = set()
    call_ids: set[str] = set()
    selected: list[dict[str, Any]] = []

    for row in rows:
        payload = row.get("payload", {})
        if row.get("type") != "event_msg" or payload.get("turn_id") != turn_id:
            continue
        event_item = payload.get("item")
        if isinstance(event_item, dict) and isinstance(event_item.get("id"), str):
            item_ids.add(event_item["id"])
        if isinstance(event_item, dict) and event_item.get("type") == "McpToolCall":
            selected_event = dict(event_item)
            selected_event["type"] = "mcp_tool_call_event"
            selected.append(selected_event)

    for row in rows:
        if row.get("type") != "response_item":
            continue
        payload = row.get("payload", {})
        metadata = payload.get("internal_chat_message_metadata_passthrough", {})
        belongs_to_turn = (
            payload.get("id") in item_ids
            or (
                isinstance(metadata, dict)
                and metadata.get("turn_id") == turn_id
            )
        )
        if belongs_to_turn:
            selected.append(payload)
            if payload.get("type") == "custom_tool_call" and payload.get("call_id"):
                call_ids.add(payload["call_id"])

    # Some transcript revisions omit item ids on tool outputs.  Bind them to
    # the turn through the call id of a selected tool call.
    for row in rows:
        if row.get("type") != "response_item":
            continue
        payload = row.get("payload", {})
        if (
            payload.get("type") == "custom_tool_call_output"
            and payload.get("call_id") in call_ids
            and payload not in selected
        ):
            selected.append(payload)

    return selected


def _text_from_content(content: Any, allowed_types: set[str]) -> str:
    parts: list[str] = []
    if not isinstance(content, list):
        return ""
    for block in content:
        if not isinstance(block, dict) or block.get("type") not in allowed_types:
            continue
        value = block.get("text")
        if isinstance(value, str):
            parts.append(value)
    return "\n".join(parts)


def _user_text(items: Iterable[dict[str, Any]]) -> str:
    texts = []
    for item in items:
        if item.get("type") == "message" and item.get("role") == "user":
            texts.append(_text_from_content(item.get("content"), {"input_text"}))
    return "\n".join(texts).strip()


def _has_image(items: Iterable[dict[str, Any]]) -> bool:
    for item in items:
        if item.get("type") == "mcp_tool_call_event":
            is_cloud_display = (
                item.get("server") == "toc-cloud-display"
                and item.get("tool") == "show_cloud"
            )
            result = item.get("result")
            if (
                is_cloud_display
                and item.get("status") == "completed"
                and isinstance(result, dict)
                and not result.get("isError")
            ):
                return True

        if item.get("type") != "custom_tool_call_output":
            continue
        output = item.get("output")
        if not isinstance(output, list):
            continue
        if any(
            isinstance(block, dict)
            and block.get("type") in {"input_image", "image", "output_image"}
            for block in output
        ):
            return True
    return False


def _session_uses_cloud_guard(rows: Iterable[dict[str, Any]]) -> bool:
    for row in rows:
        payload = row.get("payload", {})
        if row.get("type") == "event_msg":
            event_item = payload.get("item", {})
            if (
                isinstance(event_item, dict)
                and event_item.get("type") == "McpToolCall"
                and event_item.get("server") == "toc-cloud-display"
                and event_item.get("tool") == "show_cloud"
            ):
                return True
        if row.get("type") != "response_item" or payload.get("type") != "message":
            continue
        text = _text_from_content(
            payload.get("content"), {"input_text", "output_text"}
        ).lower()
        if any(marker in text for marker in ACTIVATION_MARKERS):
            return True
    return False


def evaluate(event: dict[str, Any], rows: list[dict[str, Any]]) -> str | None:
    """Return a blocking reason, or ``None`` when Stop may proceed."""
    if event.get("stop_hook_active"):
        return None
    if not _session_uses_cloud_guard(rows):
        return None

    turn_id = str(event.get("turn_id") or "")
    if not turn_id:
        return None
    items = _response_items_for_turn(rows, turn_id)
    user_text = _user_text(items)
    assistant_text = str(event.get("last_assistant_message") or "").strip()
    image_present = _has_image(items)

    if NEGATIVE_CONFIRMATION_RE.search(user_text):
        if CLOUD_QUESTION_RE.search(assistant_text) and not re.search(
            r"(?:не\s+продолжа|останов|не\s+перехож)", assistant_text, re.IGNORECASE
        ):
            return (
                "Пользователь сообщил, что Туча не видна. Не продолжай построение, "
                "проверку или обсуждение Тучи. Признай сбой показа и остановись; "
                "новый содержательный вопрос допустим только после фактически "
                "показанного рисунка и явного подтверждения пользователя."
            )
        return None

    cloud_turn = bool(
        IMAGE_CLAIM_RE.search(assistant_text)
        or CLOUD_QUESTION_RE.search(assistant_text)
    )
    if not cloud_turn:
        return None

    if not image_present:
        return (
            "Ответ относится к Туче, но в текущем ходе нет графического блока "
            "изображения. До завершения ответа фактически выведи актуальную Тучу "
            "через $toc-cloud-display. Ссылка, путь к PNG/SVG и текстовое заявление "
            "о показе не считаются изображением. После вывода задай только вопрос, "
            "видит ли пользователь рисунок."
        )

    if image_present and not VISIBILITY_CHECK_RE.search(assistant_text):
        return (
            "Графический блок создан, но интерфейс может его не отобразить. "
            "Не считай показ успешным и не продолжай работу с Тучей. Заверши ответ "
            "одним вопросом: «Вы видите изображение Тучи и можете прочитать текст?»"
        )

    return None


def main() -> int:
    try:
        event = json.load(sys.stdin)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return 0

    transcript = event.get("transcript_path")
    if not isinstance(transcript, str):
        return 0

    cwd = event.get("cwd")
    if not isinstance(cwd, str):
        return 0
    try:
        workspace = Path(r"C:\Users\tocpeople\IWE").resolve()
        current = Path(cwd).resolve()
        current.relative_to(workspace)
    except (OSError, ValueError):
        return 0

    path = Path(transcript)
    if not path.is_file():
        return 0

    try:
        reason = evaluate(event, _read_jsonl(path))
    except OSError:
        return 0

    if reason:
        json.dump(
            {"decision": "block", "reason": reason},
            sys.stdout,
            ensure_ascii=False,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
