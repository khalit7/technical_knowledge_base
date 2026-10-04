"""chatsummary: title and summarise a chat with any LLM.

The public API is exactly what __all__ lists. Everything in _core is internal and may change.
"""
import warnings
from collections.abc import Sequence

from ._core import (ChatModel, ChatNotFound, ChatStore, HttpChatModel, Message, ModelOutputError,
                    ModelUnavailable, SqliteChatStore, Summary, SummarizeError, summarize_chat)
from ._core import render_transcript as _render_transcript

__all__ = ["summarize_chat", "render_transcript", "Summary", "Message", "ChatModel", "ChatStore",
           "HttpChatModel", "SqliteChatStore", "SummarizeError", "ChatNotFound", "ModelOutputError",
           "ModelUnavailable"]
__version__ = "0.3.0"


def render_transcript(messages: Sequence[Message], *, limit: int = 8000, max_chars: int | None = None) -> str:
    """The conversation as plain text, keeping the last `limit` characters.

    `max_chars` was renamed `limit` in 0.3.0; the old name works until 0.5.0 with a DeprecationWarning.
    """
    if max_chars is not None:
        warnings.warn("render_transcript(max_chars=...) is deprecated since 0.3.0 and will be removed in 0.5.0; "
                      "use limit=...", DeprecationWarning, stacklevel=2)
        limit = max_chars
    return _render_transcript(messages, limit)
