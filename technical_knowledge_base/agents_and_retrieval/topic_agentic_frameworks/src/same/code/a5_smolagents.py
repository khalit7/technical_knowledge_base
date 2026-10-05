"""5. smolagents CodeAgent: the model writes Python that calls the tools."""
import os
from smolagents import CodeAgent, OpenAIServerModel, tool
import tools_impl as T

model = OpenAIServerModel(model_id=os.environ["MODEL"], api_base=os.environ["BASE_URL"],
                          api_key="local", max_tokens=2048)

# Tool definitions: the docstring's Args section is required and becomes the description.
@tool
def list_files() -> str:
    """List every file in the repository."""
    return T.list_files()

@tool
def read_file(path: str) -> str:
    """Return the text of one file.

    Args:
        path: file path relative to the repository root.
    """
    return T.read_file(path)

@tool
def edit_file(path: str, old: str, new: str) -> str:
    """Replace the exact text old with new in a file; old must occur exactly once.

    Args:
        path: file path relative to the repository root.
        old: the exact text to replace.
        new: the replacement text.
    """
    return T.edit_file(path, old, new)

@tool
def run_tests() -> str:
    """Run the test suite and return its output."""
    return T.run_tests()

# Code actions run in smolagents' local Python interpreter (an AST walker with an import
# allow-list, not a sandbox); executor_type="docker" or "e2b" etc. move them out of process.
agent = CodeAgent(tools=[list_files, read_file, edit_file, run_tests], model=model,
                  instructions=T.SYSTEM, max_steps=15)
print(agent.run(T.TASK))
