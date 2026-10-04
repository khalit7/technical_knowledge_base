SYSTEM = "You are a helpful assistant for Acme. Answer briefly."

def build_messages(history, user_msg, max_turns=1):
    """The exact message list sent to the model: system prompt, the last few turns, the new message."""
    return [{"role": "system", "content": SYSTEM}] + history[-2 * max_turns:] + [{"role": "user", "content": user_msg}]
