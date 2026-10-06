"""The JSON schema each library generates for the same Python function (no model call).
Usage: schemas.py OUT.json   (run once with env for pai/oai/smol, once with adkenv for adk; merges into OUT)"""
import json, os, sys

def edit_file(path: str, old: str, new: str, count: int = 1) -> str:
    """Replace the exact text old with new in a file.

    Args:
        path: File to edit, relative to the repository root.
        old: Text to find; must occur exactly `count` times.
        new: Replacement text.
        count: How many occurrences to expect.
    """
    return "ok"

out_path = sys.argv[1]
out = json.load(open(out_path)) if os.path.exists(out_path) else {}
try:
    import pydantic_ai
    from pydantic_ai import Agent
    from pydantic_ai.models.function import FunctionModel, AgentInfo
    from pydantic_ai.messages import ModelResponse, TextPart
    seen = {}
    def fm(messages, info: AgentInfo):
        seen["tools"] = [{"name": t.name, "description": t.description, "parameters": t.parameters_json_schema} for t in info.function_tools]
        return ModelResponse(parts=[TextPart("done")])
    a = Agent(FunctionModel(fm)); a.tool_plain(edit_file); a.run_sync("x")
    out["pydantic_ai"] = {"version": pydantic_ai.__version__, **seen["tools"][0]}
    from agents import function_tool
    import agents
    ft = function_tool(edit_file)
    out["openai_agents"] = {"version": agents.__version__ if hasattr(agents, "__version__") else "0.23.1",
                            "name": ft.name, "description": ft.description, "parameters": ft.params_json_schema, "strict": ft.strict_json_schema}
    import smolagents
    from smolagents import tool
    st = tool(edit_file)
    from smolagents.models import get_tool_json_schema
    out["smolagents"] = {"version": smolagents.__version__, **get_tool_json_schema(st)["function"]}
except ImportError:
    import google.adk
    from google.adk.tools import FunctionTool
    d = FunctionTool(edit_file)._get_declaration()
    dj = d.model_dump(exclude_none=True, mode="json")
    out["google_adk"] = {"version": google.adk.__version__, **dj}
json.dump(out, open(out_path, "w"), indent=1)
print(json.dumps(out, indent=1)[:4000])
