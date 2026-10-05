"""2. LangGraph: the loop written as a StateGraph, saved by a checkpointer."""
import os
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.prebuilt import ToolNode, tools_condition
import tools_impl as T

# Tool definitions: the decorator builds the JSON Schema from the signature and docstring.
@tool
def list_files() -> str:
    """List every file in the repository."""
    return T.list_files()

@tool
def read_file(path: str) -> str:
    """Return the text of one file."""
    return T.read_file(path)

@tool
def edit_file(path: str, old: str, new: str) -> str:
    """Replace the exact text old with new in a file; old must occur exactly once."""
    return T.edit_file(path, old, new)

@tool
def run_tests() -> str:
    """Run the test suite and return its output."""
    return T.run_tests()

TOOLS = [list_files, read_file, edit_file, run_tests]
model = ChatOpenAI(model=os.environ["MODEL"], base_url=os.environ["BASE_URL"], api_key="local",
                   max_tokens=2048).bind_tools(TOOLS)

# State: a typed dict whose "messages" key appends instead of overwriting.
def agent(state: MessagesState):
    return {"messages": [model.invoke([("system", T.SYSTEM)] + state["messages"])]}

# The loop is a graph: agent -> tools -> agent, until the reply has no tool call.
g = StateGraph(MessagesState)
g.add_node("agent", agent)
g.add_node("tools", ToolNode(TOOLS))           # runs every tool call, appends ToolMessages
g.add_edge(START, "agent")
g.add_conditional_edges("agent", tools_condition)  # tool calls -> "tools", else -> END
g.add_edge("tools", "agent")
app = g.compile(checkpointer=InMemorySaver())  # state saved after every step, per thread_id

config = {"configurable": {"thread_id": "run-1"}, "recursion_limit": 31}  # 15 model turns
result = app.invoke({"messages": [("user", T.TASK)]}, config)
print(result["messages"][-1].content)
