"""The running example as a four-step Metaflow workflow that tracks into MLflow.

  start     split TinyShakespeare 90/10, hash data and code, open an MLflow run
  train     torchrun, 2 ranks, DDP over gloo (the topic's train.py, unchanged); log the loss curve
  evaluate  held-out loss of the final checkpoint
  register  log the model, register a new version of "mi-tiny-gpt", move the "champion" alias if better
  end

Run (see run_lab.sh):  python flow.py run --lr 0.003 --steps 200
Resume after a failure: python flow.py resume            (finished steps are cloned, not rerun)
MLflow: MLFLOW_TRACKING_URI=http://127.0.0.1:5077 (a local server, sqlite + local artifact folder)
"""
import json, os, shutil, subprocess, sys, time

from metaflow import FlowSpec, Parameter, current, step, timeout

LAB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, LAB)
import common as C  # noqa: E402

MODEL_NAME = "mi-tiny-gpt"
EXPERIMENT = "mi-running-example"


def _mlflow():
    import mlflow
    mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])
    return mlflow


class TinyGPTFlow(FlowSpec):
    lr = Parameter("lr", default=0.003, type=float, help="AdamW learning rate")
    steps = Parameter("steps", default=200, type=int, help="training steps")
    seed = Parameter("seed", default=1234, type=int, help="init and batch seed")
    split = Parameter("split", default=0.9, type=float, help="fraction of characters used for training")

    @step
    def start(self):
        src = os.environ["MP_DATA"]
        self.data_sha = C.sha256_file(src)
        assert self.data_sha == C.DATA_SHA, "input.txt is not the pinned TinyShakespeare"
        self.work = os.path.join(os.environ["MP_WORK"], current.run_id)
        info = C.split_text(src, os.path.join(self.work, "data"), self.split)
        self.train_sha, self.val_sha = info["train_sha"], info["val_sha"]
        self.train_chars, self.val_chars = info["train_chars"], info["val_chars"]
        self.code_sha = C.code_sha()
        self.env = C.env_info()
        mlflow = _mlflow()
        mlflow.set_experiment(EXPERIMENT)
        tags = {"mlflow.source.name": "flow.py", "mlflow.runName": "mf-" + current.run_id,
                "metaflow.run": current.flow_name + "/" + current.run_id,
                "code_sha": self.code_sha, "data_sha": self.data_sha, "train_sha": self.train_sha,
                "val_sha": self.val_sha, "torch": self.env["torch"], "python": self.env["python"],
                "platform": self.env["os"] + "-" + self.env["machine"]}
        with mlflow.start_run(tags=tags) as r:
            self.mlflow_run = r.info.run_id
            mlflow.log_params({"lr": self.lr, "steps": self.steps, "seed": self.seed, "split": self.split,
                               "world": 2, "global_batch": 32, "ctx": 64, "d_model": 64, "layers": 2, "heads": 2})
        self.next(self.train)

    @timeout(minutes=5)
    @step
    def train(self):
        t0 = time.time()
        ck, logs = os.path.join(self.work, "ckpt"), os.path.join(self.work, "logs")
        shutil.rmtree(ck, ignore_errors=True); shutil.rmtree(logs, ignore_errors=True)
        # static rendezvous on 127.0.0.1: --standalone hung on macOS resolving the host name (see runs/hang_standalone.txt)
        cmd = [sys.executable, "-m", "torch.distributed.run", "--nnodes", "1", "--nproc-per-node", "2",
               "--master-addr", "127.0.0.1", "--master-port", os.environ.get("MP_PORT", "29577"),
               os.path.join(LAB, "train.py"), "--data", os.path.join(self.work, "data", "train.txt"),
               "--steps", str(self.steps), "--lr", str(self.lr), "--seed", str(self.seed),
               "--ckpt-dir", ck, "--log-dir", logs, "--no-resume"]
        env = dict(os.environ, OMP_NUM_THREADS="1", MI_HOST="laptop")
        subprocess.run(cmd, check=True, env=env, stdout=subprocess.DEVNULL)
        recs = C.read_jsonl(os.path.join(logs, "rank0.jsonl"))
        self.curve = [[r["step"], r["gloss"]] for r in recs if r["ev"] == "step"]
        self.final_gloss = self.curve[-1][1]
        name = open(os.path.join(ck, "latest")).read().strip()
        self.ckpt = open(os.path.join(ck, name), "rb").read()  # 1.4 MB: stored in the Metaflow datastore
        self.ckpt_sha = C.sha256_bytes(self.ckpt)
        self.train_secs = round(time.time() - t0, 2)
        mlflow = _mlflow()
        from mlflow.entities import Metric
        with mlflow.start_run(run_id=self.mlflow_run):
            now = int(time.time() * 1000)
            mlflow.MlflowClient().log_batch(self.mlflow_run, metrics=[Metric("train_loss", v, now, s) for s, v in self.curve])
            mlflow.set_tags({"ckpt_sha": self.ckpt_sha})
            mlflow.log_metric("train_secs", self.train_secs)
        self.next(self.evaluate)

    @step
    def evaluate(self):
        if os.environ.get("MP_FAIL_EVAL") == "1":
            raise RuntimeError("injected failure in evaluate (MP_FAIL_EVAL=1)")
        p = os.path.join(self.work, "eval_ckpt.pt")
        open(p, "wb").write(self.ckpt)
        d = os.path.join(self.work, "data")
        self.val_loss, _, self.ckpt_step = C.evaluate(p, os.path.join(d, "train.txt"), os.path.join(d, "val.txt"))
        mlflow = _mlflow()
        with mlflow.start_run(run_id=self.mlflow_run):
            mlflow.log_metric("val_loss", self.val_loss)
        self.next(self.register)

    @step
    def register(self):
        mlflow = _mlflow()
        import mlflow.pytorch
        p = os.path.join(self.work, "eval_ckpt.pt")
        open(p, "wb").write(self.ckpt)
        d = os.path.join(self.work, "data")
        _, model, _ = C.evaluate(p, os.path.join(d, "train.txt"), os.path.join(d, "val.txt"))
        client = mlflow.MlflowClient()
        with mlflow.start_run(run_id=self.mlflow_run):
            # MLflow 3.17 defaults to serialization_format="pt2" (torch.export), which needs an input example
            import numpy as np
            info = mlflow.pytorch.log_model(model, name="tiny-gpt", code_paths=[os.path.join(LAB, "train.py")],
                                            input_example=np.zeros((1, 64), dtype=np.int64),
                                            pip_requirements=["torch==" + self.env["torch"]],
                                            registered_model_name=MODEL_NAME)
        self.model_id = info.model_id
        self.version = str(info.registered_model_version)
        for k, v in {"val_loss": repr(self.val_loss), "data_sha": self.data_sha, "train_sha": self.train_sha,
                     "code_sha": self.code_sha, "ckpt_sha": self.ckpt_sha,
                     "metaflow_run": current.flow_name + "/" + current.run_id}.items():
            client.set_model_version_tag(MODEL_NAME, self.version, k, v)
        # promotion gate: the champion alias moves only if held-out loss improves
        try:
            champ = client.get_model_version_by_alias(MODEL_NAME, "champion")
            champ_loss = float(champ.tags["val_loss"])
            self.prev_champion = champ.version
        except Exception:
            champ_loss, self.prev_champion = float("inf"), None
        self.promoted = self.val_loss < champ_loss
        if self.promoted:
            client.set_registered_model_alias(MODEL_NAME, "champion", self.version)
        self.next(self.end)

    @step
    def end(self):
        print(json.dumps({"run": current.run_id, "mlflow_run": self.mlflow_run, "version": self.version,
                          "val_loss": self.val_loss, "final_gloss": self.final_gloss, "promoted": self.promoted}))


if __name__ == "__main__":
    TinyGPTFlow()
