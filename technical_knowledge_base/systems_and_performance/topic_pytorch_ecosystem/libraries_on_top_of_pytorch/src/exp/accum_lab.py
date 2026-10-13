"""Gradient accumulation and loss averaging: the same 8 rows of the running example, with a different number of
valid target tokens per row (the rest set to -100, as padding would be), seen as one batch of 8 or as 4
micro-batches of 2. Which gradient does each library compute?

  reference : one batch of 8, mean over all valid tokens (what you would compute with enough memory)
  naive     : mean over each micro-batch's tokens, divided by 4, summed (a mean of means)
  weighted  : sum over each micro-batch's tokens, divided by the total valid tokens of all 4 (equals the reference)

Then the same 8 rows through the HF Trainer (a model without **kwargs, and one that accepts num_items_in_batch),
Accelerate's accumulate(), and Lightning's accumulate_grad_batches, reading the gradient just before
optimizer.step(). Deterministic, CPU, no timing.  Run: python accum_lab.py"""
from common import *
import torch.nn.functional as F
torch.set_num_threads(2)
from model import GPTConfig, GPT, make_model, get_batch, make_optimizer

cfg = GPTConfig()
G = torch.Generator().manual_seed(7)


def masked_batch(step, lengths=None):
    x, y = get_batch(cfg, step)
    y = y.clone()
    if lengths is None:
        lengths = torch.randint(4, cfg.block_size + 1, (cfg.batch_size,), generator=G).tolist()
    for i, L in enumerate(lengths):
        y[i, L:] = -100
    return x, y, lengths


X, Y, LENS = masked_batch(0, [64, 60, 4, 6, 50, 40, 8, 5])   # chosen to make the micro-batches unequal
MICRO = 2
K = cfg.batch_size // MICRO


def new_model(cls=GPT):
    torch.manual_seed(cfg.seed); m = cls(cfg); m.load_state_dict(make_model(cfg, "cpu").state_dict()); return m


def flat_grad(m):
    return torch.cat([p.grad.detach().flatten() for p in m.parameters()])


def rel(a, b):
    return round(((a - b).norm() / b.norm()).item(), 6)


res = {"lengths": LENS, "micro_batch": MICRO, "accum_steps": K}
tok = [int((Y[i] != -100).sum()) for i in range(cfg.batch_size)]
res["tokens_per_row"] = tok
res["tokens_per_micro"] = [sum(tok[j * MICRO:(j + 1) * MICRO]) for j in range(K)]
res["tokens_total"] = sum(tok)

# reference
m = new_model(); _, loss = m(X, Y); loss.backward(); g_ref = flat_grad(m); res["loss_ref"] = round(loss.item(), 6)
# naive mean of means
m = new_model(); tot = 0.0
for j in range(K):
    _, l = m(X[j * MICRO:(j + 1) * MICRO], Y[j * MICRO:(j + 1) * MICRO]); (l / K).backward(); tot += l.item() / K
g_naive = flat_grad(m); res["loss_naive"] = round(tot, 6)
# token-weighted
m = new_model(); tot = 0.0
for j in range(K):
    logits, _ = m(X[j * MICRO:(j + 1) * MICRO])
    s = F.cross_entropy(logits.reshape(-1, logits.size(-1)), Y[j * MICRO:(j + 1) * MICRO].reshape(-1), reduction="sum")
    (s / res["tokens_total"]).backward(); tot += s.item() / res["tokens_total"]
g_w = flat_grad(m); res["loss_weighted"] = round(tot, 6)
res["rel_err"] = {"naive": rel(g_naive, g_ref), "weighted": rel(g_w, g_ref)}
# per-token weight each scheme gives to a token of each row (reference: 1/total)
res["token_weight"] = {"reference": [1 / res["tokens_total"]] * cfg.batch_size,
                       "naive": [1 / (K * res["tokens_per_micro"][i // MICRO]) for i in range(cfg.batch_size)]}

grads = {}


def grab(name, m):
    def hook(o, a, k):
        if name not in grads:
            grads[name] = flat_grad(m)
    return hook


# ---- HF Trainer ---------------------------------------------------------------------------------
from transformers import Trainer, TrainingArguments
ROWS = [{"input_ids": X[i], "labels": Y[i]} for i in range(cfg.batch_size)]


class DS(torch.utils.data.Dataset):
    def __len__(s): return len(ROWS)
    def __getitem__(s, i): return ROWS[i]


class DictGPT(GPT):
    def forward(self, input_ids, labels=None):
        logits, loss = super().forward(input_ids, labels)
        return {"loss": loss, "logits": logits}


class KwGPT(GPT):
    """Accepts **kwargs, so the Trainer passes num_items_in_batch and the model divides a summed loss by it
    (what transformers' own causal-LM loss does)."""
    def forward(self, input_ids, labels=None, num_items_in_batch=None, **kw):
        logits, _ = super().forward(input_ids)
        if labels is None:
            return {"logits": logits}
        red = "sum" if num_items_in_batch is not None else "mean"
        loss = F.cross_entropy(logits.reshape(-1, logits.size(-1)), labels.reshape(-1), reduction=red)
        if num_items_in_batch is not None:
            loss = loss / num_items_in_batch
        return {"loss": loss, "logits": logits}


def hf(name, cls):
    m = new_model(cls); o = make_optimizer(m); o.register_step_pre_hook(grab(name, m))
    args = TrainingArguments(output_dir=os.path.join(SCRATCH, "acc_" + name), max_steps=1, per_device_train_batch_size=MICRO,
                             gradient_accumulation_steps=K, report_to=[], use_cpu=True, save_strategy="no", disable_tqdm=True,
                             train_sampling_strategy="sequential", max_grad_norm=0.0)
    t = Trainer(model=m, args=args, train_dataset=DS(), optimizers=(o, torch.optim.lr_scheduler.LambdaLR(o, lambda s: 1.0)))
    t.train()
    return {"model_accepts_loss_kwargs": t.model_accepts_loss_kwargs}


res["hf_no_kwargs"] = hf("hf_no_kwargs", DictGPT)
res["hf_kwargs"] = hf("hf_kwargs", KwGPT)

# ---- Accelerate -----------------------------------------------------------------------------------
from accelerate import Accelerator
acc = Accelerator(cpu=True, gradient_accumulation_steps=K)
m = new_model(); o = make_optimizer(m); pm, po = acc.prepare(m, o); po.optimizer.register_step_pre_hook(grab("accelerate", m))
for j in range(K):
    with acc.accumulate(pm):
        _, l = pm(X[j * MICRO:(j + 1) * MICRO], Y[j * MICRO:(j + 1) * MICRO]); acc.backward(l); po.step(); po.zero_grad()

# ---- Lightning ------------------------------------------------------------------------------------
import lightning as L


class LM(L.LightningModule):
    def __init__(s): super().__init__(); s.m = new_model()
    def training_step(s, b, i): return s.m(*b)[1]
    def configure_optimizers(s): return make_optimizer(s.m)
    def on_before_optimizer_step(s, o):   # after the last micro-batch's backward, before step()
        grads["lightning"] = flat_grad(s.m)


class IDS(torch.utils.data.IterableDataset):
    def __iter__(s):
        for j in range(K):
            yield X[j * MICRO:(j + 1) * MICRO], Y[j * MICRO:(j + 1) * MICRO]


lm = LM()
L.Trainer(max_steps=1, accelerator="cpu", devices=1, logger=False, enable_checkpointing=False, enable_progress_bar=False,
          enable_model_summary=False, accumulate_grad_batches=K, default_root_dir=os.path.join(SCRATCH, "acc_pl")).fit(
    lm, torch.utils.data.DataLoader(IDS(), batch_size=None))

res["libraries"] = {k: {"rel_err_vs_reference": rel(v, g_ref), "rel_err_vs_naive": rel(v, g_naive)} for k, v in grads.items()}
print(json.dumps(res["libraries"], indent=1), res["rel_err"], res["tokens_per_micro"])

# ---- the cost over training: 100 optimizer steps, naive vs weighted, random lengths each step ------
def run(scheme, steps=100):
    m = new_model(); o = make_optimizer(m); gen = torch.Generator().manual_seed(11); errs = []
    out = []
    for s in range(steps):
        x, y = get_batch(cfg, s); y = y.clone()
        Ls = torch.randint(1, cfg.block_size + 1, (cfg.batch_size,), generator=gen).tolist()
        for i, Lr in enumerate(Ls):
            y[i, Lr:] = -100
        ntot = int((y != -100).sum())
        for j in range(K):
            xs, ys = x[j * MICRO:(j + 1) * MICRO], y[j * MICRO:(j + 1) * MICRO]
            logits, _ = m(xs)
            ssum = F.cross_entropy(logits.reshape(-1, logits.size(-1)), ys.reshape(-1), reduction="sum")
            n = int((ys != -100).sum())
            l = ssum / ntot if scheme == "weighted" else (ssum / max(n, 1)) / K
            l.backward()
        o.step(); o.zero_grad(set_to_none=True)
        if s % 10 == 9:
            with torch.no_grad():
                pl = sum(m(*get_batch(cfg, 10_000 + i))[1].item() for i in range(4)) / 4
            out.append([s + 1, round(pl, 5)])
    return out


res["curve"] = {"naive": run("naive"), "weighted": run("weighted")}
print(res["curve"])
save("accum_lab", res)
