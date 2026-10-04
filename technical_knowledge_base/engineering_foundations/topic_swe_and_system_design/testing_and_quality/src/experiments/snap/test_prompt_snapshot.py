from prompt import build_messages

HISTORY = [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "Hello!"},
           {"role": "user", "content": "price?"}, {"role": "assistant", "content": "$10/month."},
           {"role": "user", "content": "annual?"}, {"role": "assistant", "content": "$100/year."}]

def test_prompt_is_stable(snapshot):
    assert build_messages(HISTORY, "refund?") == snapshot
