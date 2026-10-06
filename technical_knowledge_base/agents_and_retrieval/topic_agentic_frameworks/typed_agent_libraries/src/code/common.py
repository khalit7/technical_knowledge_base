"""Shared pieces of the structured-output experiment: the result type, the prompt, scoring."""
import ast, json, os
from typing import Literal
from pydantic import BaseModel, Field, ValidationError

HERE = os.path.dirname(os.path.abspath(__file__))
CASES = json.load(open(os.path.join(HERE, "cases.json")))
MODEL = "mlx-community/Qwen3-4B-Instruct-2507-4bit"
BASE_URL = "http://127.0.0.1:8291/v1"   # ftyped's locking proxy in front of 8090

INSTRUCTIONS = ("You triage failing tests in small Python modules. "
                "Read the code and the test output and report the bug. Do not explain outside the report.")


class Triage(BaseModel):
    """Triage of one failing test."""
    function: str = Field(description="Name of the function that contains the bug")
    category: Literal["regex", "sort_order", "off_by_one", "wrong_operator", "unhandled_input"]
    failing_test: str = Field(description="Name of the failing test method")
    fixed_line: str = Field(description="The corrected line of code, a single line of Python")
    confidence: int = Field(ge=1, le=5, description="1 = guess, 5 = certain")


def prompt(case):
    return ("Triage this failing test.\n\nmod.py:\n```python\n" + case["code"] + "```\n\n"
            "Test output:\n```\n" + case["test_output"] + "\n```")


def score(case, obj):
    """obj: a Triage or None. Content checks against the case's ground truth."""
    if obj is None:
        return {"valid": False, "function_ok": False, "category_ok": False, "test_ok": False, "line_parses": False}
    try:
        ast.parse(obj.fixed_line.strip())
        lp = "\n" not in obj.fixed_line.strip()
    except SyntaxError:
        lp = False
    return {"valid": True, "function_ok": obj.function.strip() == case["function"],
            "category_ok": obj.category == case["category"],
            "test_ok": obj.failing_test.strip().split(".")[-1].split(" ")[0] == case["failing_test"],
            "line_parses": lp}


def try_parse(text):
    """Strict parse of raw text: json.loads then validation. Returns (obj or None, error or None)."""
    try:
        return Triage.model_validate(json.loads(text)), None
    except json.JSONDecodeError as e:
        return None, "json: " + str(e)[:120]
    except ValidationError as e:
        return None, "schema: " + "; ".join(f"{'.'.join(map(str, x['loc']))}: {x['msg']}" for x in e.errors())[:200]
