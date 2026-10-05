"""4. OpenAI Agents SDK: Agent, function tools, Runner; tracing off."""
import os
from openai import AsyncOpenAI
from agents import Agent, Runner, OpenAIChatCompletionsModel, function_tool, set_tracing_disabled
import tools_impl as T

set_tracing_disabled(True)           # Default exporter sends traces to OpenAI; off here.
model = OpenAIChatCompletionsModel(model=os.environ["MODEL"],
                                   openai_client=AsyncOpenAI(base_url=os.environ["BASE_URL"], api_key="local"))

# Tool definitions: schema from type hints and docstring.
@function_tool
def list_files() -> str:
    """List every file in the repository."""
    return T.list_files()

@function_tool
def read_file(path: str) -> str:
    """Return the text of one file."""
    return T.read_file(path)

@function_tool
def edit_file(path: str, old: str, new: str) -> str:
    """Replace the exact text old with new in a file; old must occur exactly once."""
    return T.edit_file(path, old, new)

@function_tool
def run_tests() -> str:
    """Run the test suite and return its output."""
    return T.run_tests()

agent = Agent(name="fixer", instructions=T.SYSTEM, model=model,
              tools=[list_files, read_file, edit_file, run_tests])

# The loop and state live inside Runner; max_turns stops it.
result = Runner.run_sync(agent, T.TASK, max_turns=15)
print(result.final_output)
