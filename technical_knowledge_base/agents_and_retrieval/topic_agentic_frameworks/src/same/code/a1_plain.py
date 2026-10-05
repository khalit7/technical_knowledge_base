"""1. Plain loop: the OpenAI chat-completions shape, no framework."""
import json, os
from openai import OpenAI
from tools_impl import TASK, SYSTEM, list_files, read_file, edit_file, run_tests

client = OpenAI(base_url=os.environ["BASE_URL"], api_key="local")
MODEL = os.environ["MODEL"]

# Tool definitions: JSON Schema written by hand.
def schema(name, desc, props=None):
    props = props or {}
    return {"type": "function", "function": {"name": name, "description": desc,
            "parameters": {"type": "object", "properties": {k: {"type": "string"} for k in props},
                           "required": list(props)}}}

TOOLS = [schema("list_files", "List every file in the repository."),
         schema("read_file", "Return the text of one file.", ["path"]),
         schema("edit_file", "Replace the exact text old with new in a file; old must occur exactly once.",
                ["path", "old", "new"]),
         schema("run_tests", "Run the test suite and return its output.")]
FUNCS = {"list_files": list_files, "read_file": read_file, "edit_file": edit_file, "run_tests": run_tests}

# State: the message list is the whole state.
messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": TASK}]

# The loop: call the model, run any tool calls, append observations, repeat.
for turn in range(15):
    reply = client.chat.completions.create(model=MODEL, messages=messages, tools=TOOLS,
                                           max_tokens=2048).choices[0].message
    messages.append(reply.model_dump(exclude_none=True))
    if not reply.tool_calls:          # Stop: the model answered without asking for a tool.
        print(reply.content)
        break
    for call in reply.tool_calls:
        try:
            args = json.loads(call.function.arguments or "{}")
            result = FUNCS[call.function.name](**args)
        except Exception as e:        # A bad call becomes an observation, not a crash.
            result = f"error: {e}"
        messages.append({"role": "tool", "tool_call_id": call.id, "content": result})
