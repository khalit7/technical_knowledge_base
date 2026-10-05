#!/usr/bin/env python3
"""Run mini-swe-agent 2.4.6 (text-based config, unchanged prompts) on the running example,
with Claude as the model through `claude -p` (Claude subscription, no API key).

The adapter: mini-swe-agent keeps its own message list; each step, the system message becomes
--system-prompt and the rest of the list is sent as one text prompt (claude -p takes no message
list). All built-in Claude Code tools are off (--tools ""), so the model only returns text and
mini-swe-agent parses the one ```mswea_bash_command block``` itself and runs it in a Docker
container (python:3.13-slim) with the repository copy mounted at /work.

Usage: run_mswe.py LABEL MODEL      (MODEL: haiku | sonnet)
Writes runs/LABEL/{repo/, traj.json, calls.jsonl, meta.json}
"""
import json, os, platform, shutil, subprocess, sys, time
from pathlib import Path

os.environ.setdefault("MSWEA_SILENT_STARTUP", "1")
HERE = Path(__file__).resolve().parent
os.environ["MSWEA_GLOBAL_CONFIG_DIR"] = str(HERE / "mswea_cfg")  # keep its config out of the home folder
os.environ["MSWEA_COST_TRACKING"] = "ignore_errors"

import litellm, yaml  # noqa: E402
from minisweagent import __version__ as MSWEA_VERSION  # noqa: E402
from minisweagent.agents.default import DefaultAgent  # noqa: E402
from minisweagent.environments.docker import DockerEnvironment  # noqa: E402
from minisweagent.models.litellm_textbased_model import LitellmTextbasedModel  # noqa: E402
import minisweagent  # noqa: E402

LABEL, MODEL = sys.argv[1], sys.argv[2]
TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."
SRC = HERE.parent / "task_repo"
OUT = HERE / "runs" / LABEL
EMPTY = HERE / "empty"
NO_EMDASH = "Never use the em-dash character."
FRAME = ("The conversation so far is below, oldest first. You are the assistant. "
         "Write only your next assistant message, then stop: the user's reply (the command output) "
         "will come in the next turn.\n\n")


class ClaudeCLIModel(LitellmTextbasedModel):
    """mini-swe-agent's text-based model, with litellm.completion replaced by one `claude -p` call."""

    def _query(self, messages, **kwargs):
        system = messages[0]["content"]
        convo = "".join(f"<{m['role']}>\n{m['content']}\n</{m['role']}>\n\n" for m in messages[1:])
        t = time.time()
        p = subprocess.run(
            ["claude", "-p", "--output-format", "stream-json", "--verbose", "--no-session-persistence",
             "--setting-sources", "project", "--strict-mcp-config", "--model", MODEL, "--tools", "",
             "--system-prompt", system + "\n" + NO_EMDASH],
            input=FRAME + convo, capture_output=True, text=True, cwd=EMPTY, timeout=600)
        recs = [json.loads(l) for l in p.stdout.splitlines() if l.strip().startswith("{")]
        res = [r for r in recs if r.get("type") == "result"]
        if not res:
            raise RuntimeError("claude -p returned no result record: " + p.stderr[-500:])
        res = res[-1]
        with open(OUT / "calls.jsonl", "a") as f:
            f.write(json.dumps({"call": len(open(OUT / "calls.jsonl").read().splitlines()) if (OUT / "calls.jsonl").exists() else 0,
                                "wall_s": round(time.time() - t, 2), "records": recs}) + "\n")
        if res.get("is_error"):
            raise RuntimeError("claude -p error: " + str(res.get("result"))[:300])
        self._last_cost = res.get("total_cost_usd", 0.0)
        return litellm.ModelResponse(
            model=MODEL,
            choices=[{"index": 0, "finish_reason": "stop",
                      "message": {"role": "assistant", "content": res["result"]}}])

    def _calculate_cost(self, response):
        return {"cost": getattr(self, "_last_cost", 0.0)}


class NamedDocker(DockerEnvironment):
    """mini-swe-agent's DockerEnvironment with a container name carrying this tab's prefix, and the
    container's own uname in the prompt (the stock class reports the host's, which on a Mac host
    tells the model to use BSD `sed -i ''` inside a Linux container)."""

    def _start_container(self):
        name = f"ahatlas-mswe-{LABEL}"
        subprocess.run(["docker", "rm", "-f", name], capture_output=True)
        cmd = ["docker", "run", "-d", "--name", name, "-w", self.config.cwd, *self.config.run_args,
               self.config.image, "sleep", self.config.container_timeout]
        self.container_id = subprocess.run(cmd, capture_output=True, text=True, check=True).stdout.strip()
        u = subprocess.run(["docker", "exec", self.container_id, "uname", "-srvm"], capture_output=True, text=True).stdout.split()
        self._uname = {"system": u[0], "release": u[1], "version": " ".join(u[2:-1]), "machine": u[-1]}

    def get_template_vars(self, **kwargs):
        return {**super().get_template_vars(**kwargs), **self._uname}


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    EMPTY.mkdir(exist_ok=True)
    shutil.copytree(SRC, OUT / "repo")
    cfg = yaml.safe_load(open(Path(minisweagent.__file__).parent / "config" / "mini_textbased.yaml"))
    acfg = {k: v for k, v in cfg["agent"].items() if k != "mode"}
    acfg["step_limit"] = 30
    acfg["output_path"] = OUT / "traj.json"
    mcfg = {k: v for k, v in cfg["model"].items() if k != "model_kwargs"}
    model = ClaudeCLIModel(model_name=f"claude-cli/{MODEL}", **mcfg)
    env = NamedDocker(image="python:3.13-slim", cwd="/work", env=cfg["environment"]["env"],
                      run_args=["--rm", "-v", f"{OUT / 'repo'}:/work"], timeout=60)
    t = time.time()
    try:
        result = DefaultAgent(model, env, **acfg).run(TASK)
    finally:
        wall = time.time() - t
        test = subprocess.run(["docker", "exec", env.container_id, "python3", "tests/test_core.py"],
                              capture_output=True, text=True)
        subprocess.run(["docker", "rm", "-f", env.container_id], capture_output=True)
    diff = subprocess.run(["diff", "-ru", str(SRC), str(OUT / "repo"), "-x", "__pycache__"],
                          capture_output=True, text=True).stdout
    meta = {"label": LABEL, "model_alias": MODEL, "mini_swe_agent": MSWEA_VERSION, "config": "mini_textbased.yaml",
            "image": "python:3.13-slim", "step_limit": 30, "exit_status": result.get("exit_status"),
            "wall_s": round(wall, 1), "tests_exit": test.returncode, "tests_out": test.stdout + test.stderr,
            "diff": diff, "date": time.strftime("%Y-%m-%d")}
    (OUT / "meta.json").write_text(json.dumps(meta, indent=1))
    print(LABEL, result.get("exit_status"), "tests_exit", test.returncode, f"{wall:.0f}s")


main()
