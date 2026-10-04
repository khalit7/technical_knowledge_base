"""The same job as before.py, split into a functional core and an imperative shell.

core:     render_transcript, parse_summary          (pure: no I/O, trivially testable)
ports:    ChatModel, ChatStore                      (Protocols: what the shell needs, not who provides it)
adapters: HttpChatModel, SqliteChatStore            (the only code that touches the network or the disk)
shell:    summarize_chat                            (wires them; dependencies passed in, no globals)
In a real package each group would be its own module; one file here so the page can show it whole.
"""
from __future__ import annotations

import json
import sqlite3
import time
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Literal, Protocol

import httpx
from pydantic import BaseModel, Field, ValidationError


# ---------- errors: one base class, one subclass per thing a caller may handle differently ----------
class SummarizeError(Exception):
    """Base class: catch this to handle every failure of this module."""

class ChatNotFound(SummarizeError):
    pass

class ModelOutputError(SummarizeError):
    """The model answered, but not with a usable summary. Retrying the same prompt rarely helps."""

class ModelUnavailable(SummarizeError):
    """Transient: rate limited or the provider failed. Safe to retry later."""
    retryable = True


# ---------- core: pure functions ----------
@dataclass(frozen=True)
class Message:
    role: Literal["user", "assistant", "system"]
    content: str

class Summary(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1)

SPEAKER = {"user": "User", "assistant": "Assistant"}

def render_transcript(messages: Sequence[Message], max_chars: int = 8000) -> str:
    """The conversation as plain text, keeping the most recent max_chars characters."""
    text = "".join(f"{SPEAKER[m.role]}: {m.content}\n" for m in messages if m.role in SPEAKER)
    return text[-max_chars:]

def parse_summary(reply: str) -> Summary:
    """Models sometimes wrap JSON in prose; take the outermost {...} and validate it."""
    start, end = reply.find("{"), reply.rfind("}")
    if start < 0 or end < start:
        raise ModelOutputError(f"no JSON object in reply: {reply[:60]!r}")
    try:
        return Summary.model_validate(json.loads(reply[start:end + 1]))
    except (json.JSONDecodeError, ValidationError) as e:
        raise ModelOutputError(str(e)) from e


# ---------- ports: what the shell needs ----------
class ChatModel(Protocol):
    def complete(self, system: str, user: str) -> str: ...

class ChatStore(Protocol):
    def messages(self, chat_id: str) -> list[Message]: ...
    def save_summary(self, chat_id: str, s: Summary) -> None: ...


# ---------- adapters: the only code with I/O ----------
class HttpChatModel:
    """OpenAI-style chat completions over HTTP. Retries only what is worth retrying."""
    def __init__(self, url: str, key: str, model: str = "small", *, attempts: int = 3,
                 sleep: Callable[[float], None] = time.sleep, client: httpx.Client | None = None):
        self.url, self.key, self.model, self.attempts, self.sleep = url, key, model, attempts, sleep
        self.client = client or httpx.Client(timeout=30)

    def complete(self, system: str, user: str) -> str:
        body = {"model": self.model, "messages": [{"role": "system", "content": system},
                                                  {"role": "user", "content": user}]}
        for attempt in range(self.attempts):
            try:
                r = self.client.post(self.url, json=body, headers={"Authorization": f"Bearer {self.key}"})
            except httpx.TransportError as e:          # connection refused, timeout, reset
                last: str = repr(e)
            else:
                if r.status_code != 429 and r.status_code < 500:
                    r.raise_for_status()               # a 4xx bug of ours: fail loudly, do not retry
                    content: str = r.json()["choices"][0]["message"]["content"]
                    return content
                last = f"HTTP {r.status_code}"
            if attempt + 1 < self.attempts:
                self.sleep(2 ** attempt)
        raise ModelUnavailable(last)

class SqliteChatStore:
    def __init__(self, conn: sqlite3.Connection):
        self.conn = conn

    def messages(self, chat_id: str) -> list[Message]:
        rows = self.conn.execute("select role, content from messages where chat_id=? order by created_at",
                                 (chat_id,)).fetchall()
        return [Message(role, content) for role, content in rows]

    def save_summary(self, chat_id: str, s: Summary) -> None:
        with self.conn:
            self.conn.execute("update chats set title=?, summary=? where id=?", (s.title, s.summary, chat_id))


# ---------- shell: wiring ----------
SYSTEM = 'Reply with JSON: {"title": ..., "summary": ...}'

def summarize_chat(chat_id: str, *, store: ChatStore, model: ChatModel) -> Summary:
    messages = store.messages(chat_id)
    if not messages:
        raise ChatNotFound(chat_id)
    summary = parse_summary(model.complete(SYSTEM, render_transcript(messages)))
    store.save_summary(chat_id, summary)
    return summary
