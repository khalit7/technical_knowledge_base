"""A deliberately tangled LLM call, written for this page in the shape such code usually grows into.

It titles and summarises a chat: reads the messages, builds a prompt, calls an OpenAI-style chat
completions endpoint with retries, digs JSON out of the reply, saves it. Everything is in one function.
"""
import json, logging, os, sqlite3, time

import httpx

URL = "https://llm.example.com/v1/chat/completions"


def summarize(chat_id, db_path=None):
    conn = sqlite3.connect(db_path or os.environ["CHAT_DB"])
    rows = conn.execute("select role, content from messages where chat_id=? order by created_at",
                        (chat_id,)).fetchall()
    if not rows:
        return None
    text = ""
    for r in rows:
        if r[0] == "user":
            text += "User: " + r[1] + "\n"
        elif r[0] == "assistant":
            text += "Assistant: " + r[1] + "\n"
    if len(text) > 8000:
        text = text[-8000:]
    for attempt in range(3):
        try:
            resp = httpx.post(URL, headers={"Authorization": "Bearer " + os.environ["LLM_KEY"]},
                              json={"model": "small", "messages": [
                                  {"role": "system", "content": "Reply with JSON: {\"title\": ..., \"summary\": ...}"},
                                  {"role": "user", "content": text}]}, timeout=30)
            if resp.status_code == 429 or resp.status_code >= 500:
                time.sleep(2 ** attempt)
                continue
            resp.raise_for_status()
            out = resp.json()["choices"][0]["message"]["content"]
            try:
                data = json.loads(out)
            except Exception:
                data = json.loads(out[out.find("{"):out.rfind("}") + 1])
            if "title" not in data or "summary" not in data:
                return None
            conn.execute("update chats set title=?, summary=? where id=?",
                         (data["title"][:200], data["summary"], chat_id))
            conn.commit()
            return data
        except Exception as e:
            logging.error("summarize failed: %s", e)
            time.sleep(2 ** attempt)
    return None
