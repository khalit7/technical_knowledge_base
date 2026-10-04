CONFIG = {"model": "small", "max_tokens": 512}

def build_request(prompt: str) -> dict:
    return {"model": CONFIG["model"], "max_tokens": CONFIG["max_tokens"], "prompt": prompt}
