"""Ask the model to turn a support message into a ticket, and refuse to pass on anything malformed."""
import json
from typing import Literal
import httpx
from pydantic import BaseModel, Field, ValidationError

class Ticket(BaseModel):
    category: Literal["billing", "bug", "account", "other"]
    priority: int = Field(ge=1, le=4)
    summary: str = Field(min_length=1, max_length=200)

def extract_ticket(client: httpx.Client, message: str, retries: int = 1) -> Ticket:
    prompt = f"Return JSON with category, priority (1-4) and summary for: {message}"
    for attempt in range(retries + 1):
        r = client.post("/v1/chat/completions", json={
            "model": "small", "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [{"role": "user", "content": prompt}]})
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        try:
            return Ticket.model_validate_json(text)
        except ValidationError as e:
            prompt += f"\nYour last answer was invalid: {e.errors()[0]['msg']}. Return valid JSON only."
    raise ValueError("model output failed validation after retries")
