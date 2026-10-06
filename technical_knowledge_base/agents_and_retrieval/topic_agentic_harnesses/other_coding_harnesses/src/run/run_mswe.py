#!/usr/bin/env python3
"""Run mini-swe-agent 2.4.6 with its stock config on the running example (task_repo), actions executed
in a Docker container (python:3.13-slim, repo copy mounted at /work, container name prefixed hoth-).
Adapted from the Harness atlas tab's run_mswe.py (its NamedDocker fixes the host-uname leak).

Usage: run_mswe.py LABEL CONFIG API_BASE MODEL_ID
  CONFIG   mini (tool calling: one 'bash' tool) | mini_textbased (```mswea_bash_command``` blocks in text)
  API_BASE an OpenAI-compatible base URL: the logging proxy to the local MLX server, or claude_shim.py
Writes runs/LABEL/{repo/, traj.json, meta.json}
"""
import json, os, shutil, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
os.environ["MSWEA_SILENT_STARTUP"] = "1"
os.environ["MSWEA_GLOBAL_CONFIG_DIR"] = str(HERE / "mswea_cfg")  # keep its config out of the home folder
os.environ["MSWEA_COST_TRACKING"] = "ignore_errors"
os.environ.setdefault("OPENAI_API_KEY", "local")

import yaml  # noqa: E402
import minisweagent  # noqa: E402
from minisweagent import __version__ as V  # noqa: E402
from minisweagent.agents.default import DefaultAgent  # noqa: E402
from minisweagent.environments.docker import DockerEnvironment  # noqa: E402
from minisweagent.models.litellm_model import LitellmModel  # noqa: E402
from minisweagent.models.litellm_textbased_model import LitellmTextbasedModel  # noqa: E402

LABEL, CONFIG, API_BASE, MODEL_ID = sys.argv[1:5]
STEP_LIMIT = int(os.environ.get("STEP_LIMIT", "30"))
TASK = "The tests in this repository fail. Find out why and fix the code so they pass. Do not edit the tests."
SRC = HERE.parent / "task_repo"
OUT = HERE / "runs" / LABEL


class NamedDocker(DockerEnvironment):
    def _start_container(self):
        name = f"hoth-mswe-{LABEL}"
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
    shutil.copytree(SRC, OUT / "repo", ignore=shutil.ignore_patterns("__pycache__"))
    cfg = yaml.safe_load(open(Path(minisweagent.__file__).parent / "config" / f"{CONFIG}.yaml"))
    acfg = {k: v for k, v in cfg["agent"].items() if k != "mode"}
    acfg["step_limit"] = STEP_LIMIT
    acfg["output_path"] = OUT / "traj.json"
    mcfg = dict(cfg["model"])
    mk = dict(mcfg.pop("model_kwargs", {}) or {})
    mk.update({"api_base": API_BASE, "api_key": "local"})
    cls = LitellmTextbasedModel if CONFIG.endswith("textbased") else LitellmModel
    mcfg.pop("model_name", None)
    model = cls(model_name=f"openai/{MODEL_ID}", model_kwargs=mk, **mcfg)
    env = NamedDocker(image="python:3.13-slim", cwd="/work", env=cfg.get("environment", {}).get("env", {}),
                      run_args=["--rm", "-v", f"{OUT / 'repo'}:/work"], timeout=60)
    t = time.time()
    result = {}
    try:
        result = DefaultAgent(model, env, **acfg).run(TASK)
    except Exception as e:  # keep the run's record even when the agent class raises
        result = {"exit_status": type(e).__name__, "error": str(e)[:500]}
    finally:
        wall = time.time() - t
        test = subprocess.run(["docker", "exec", env.container_id, "python3", "tests/test_core.py"],
                              capture_output=True, text=True)
        subprocess.run(["docker", "rm", "-f", env.container_id], capture_output=True)
    diff = subprocess.run(["diff", "-ru", str(SRC), str(OUT / "repo"), "-x", "__pycache__"],
                          capture_output=True, text=True).stdout
    meta = {"label": LABEL, "config": f"{CONFIG}.yaml", "model": MODEL_ID, "mini_swe_agent": V,
            "image": "python:3.13-slim", "step_limit": STEP_LIMIT, "exit_status": result.get("exit_status"),
            "error": result.get("error"), "wall_s": round(wall, 1), "tests_exit": test.returncode,
            "tests_out": test.stdout + test.stderr, "diff": diff.replace(str(SRC), "a").replace(str(OUT / "repo"), "b"),
            "date": time.strftime("%Y-%m-%d")}
    (OUT / "meta.json").write_text(json.dumps(meta, indent=1))
    print(LABEL, meta["exit_status"], "tests_exit", test.returncode, f"{wall:.0f}s")


main()
