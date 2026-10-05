"""3. Pydantic AI: typed tools, a structured result, ModelRetry."""
import os
from pydantic import BaseModel
from pydantic_ai import Agent, ModelRetry
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.usage import UsageLimits
import tools_impl as T

model = OpenAIChatModel(os.environ["MODEL"],
                        provider=OpenAIProvider(base_url=os.environ["BASE_URL"], api_key="local"))

class FixReport(BaseModel):          # The result is validated against this type.
    files_changed: list[str]
    summary: str

agent = Agent(model, instructions=T.SYSTEM, output_type=FixReport,
              model_settings={"max_tokens": 2048})

# Tool definitions: schema from type hints and docstring.
@agent.tool_plain
def list_files() -> str:
    """List every file in the repository."""
    return T.list_files()

@agent.tool_plain
def read_file(path: str) -> str:
    """Return the text of one file."""
    return T.read_file(path)

@agent.tool_plain
def edit_file(path: str, old: str, new: str) -> str:
    """Replace the exact text old with new in a file; old must occur exactly once."""
    out = T.edit_file(path, old, new)
    if out.startswith("error"):
        raise ModelRetry(out)        # Sent back to the model as a retry prompt.
    return out

@agent.tool_plain
def run_tests() -> str:
    """Run the test suite and return its output."""
    return T.run_tests()

# The loop and state live inside run_sync; the limit stops it.
result = agent.run_sync(T.TASK, usage_limits=UsageLimits(request_limit=15))
print(result.output)
