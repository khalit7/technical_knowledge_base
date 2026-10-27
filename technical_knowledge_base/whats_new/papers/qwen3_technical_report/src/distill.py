"""Toy Table 21: on-policy distillation against reinforcement learning, from the same off-policy-distilled student.

  uv run --with torch --with numpy python distill.py [seed ...]     # model/distill_<seed>.json (default seeds 1 2 3)
  uv run --with torch --with numpy python distill.py summary        # model/distill.json (all seeds)

Mirrors §4.5 and §4.7 of the report (https://arxiv.org/html/2505.09388v1#S4.SS7) at toy scale:
  teacher   the fused toy Qwen3 (train.py, 'fused', 6-bit weights as shipped), 28,496 parameters
  student   the same architecture, smaller (d = 24, 3 layers), 16,188 parameters
  phase 1   off-policy distillation: the student is fine-tuned on the teacher's own responses in /think and
            /no_think modes (greedy), for a fixed short budget, so it ends imperfect (the shared checkpoint)
  phase 2a  RL: GRPO-style, G = 8 sampled responses per question (temperature 1, /think), reward 1 if the answer
            is right, advantage = reward minus the group mean, divided by the group standard deviation; one
            on-policy update per batch (so no ratio clipping is needed)
  phase 2b  on-policy distillation: the student samples one response per question (temperature 1, /think or
            /no_think as in the report) and minimises the exact per-token KL divergence KL(student || teacher)
            over the whole vocabulary at every response position
Both phase-2 runs see the same number of sampled responses per step (256) and the same number of steps.
Measured on the held-out test set: pass@1 (greedy), avg@16 and pass@16 at temperature 1, both for the answer
and for a fully correct thinking trace; compute counted as model-token passes (student forward and backward,
teacher forward), and wall-clock seconds on this CPU.
"""
import json, math, os, random, sys, time
import torch
import torch.nn.functional as F
import train as T
import evaluate as E

HERE = T.HERE
SCFG = dict(T.CFG, d=24, hq=4, hkv=2, hd=6, L=3, ff=48)
OFF_STEPS, P2_STEPS, LR_OFF, LR_RL, LR_OD = 800, 300, 3e-3, 1e-3, 1e-3
G, QB = 8, 32  # RL: 32 questions x 8 samples = 256 responses per step; OD: 256 questions x 1 sample


def teacher():
    m, _ = E.load('fused', True)
    for p in m.parameters(): p.requires_grad_(False)
    return m


@torch.no_grad()
def sample_batch(m, qs, mode, temp=1.0, gen=None):
    """Sample one response per question with the batched decoder; returns token lists of full sequences and the
    index where the response starts."""
    seqs = []
    for n, group in sorted(E.by_n(qs).items()):
        outs = T.batched_decode(m, group, mode, None, temp=temp, gen=gen)
        flag = [T.FT] if mode == 'think' else [T.FN]
        for q, o in zip(group, outs):
            prompt = [T.U] + q + flag + [T.A]
            resp = o['toks']  # exactly the tokens sampled (and any forced), ending at the answer
            seqs.append((q, prompt + resp, len(prompt), o))
    return seqs


def pad(seqs):
    L = max(len(s) for _, s, _, _ in seqs)
    x = torch.full((len(seqs), L), T.PAD); mask = torch.zeros(len(seqs), L)
    for i, (_, s, st, _) in enumerate(seqs):
        x[i, :len(s)] = torch.tensor(s)
        mask[i, st - 1:len(s) - 1] = 1  # positions whose next token is a response token
    return x, mask


def evaluate(m, qs, gen):
    m.eval(); res = {}
    greedy = E.run(m, qs, 'think')
    res['pass1_greedy'] = round(sum(r['correct'] for r in greedy) / len(greedy), 4)
    res['trace_greedy'] = round(sum(r['correct'] and r['think'] == T.psums(r['q']) for r in greedy) / len(greedy), 4)
    K = 16; hits = [[] for _ in qs]; trace = [[] for _ in qs]
    groups = {}
    for i, q in enumerate(qs): groups.setdefault(len(q), []).append(i)
    for _ in range(K):
        for n, idx in groups.items():
            group = [qs[i] for i in idx]
            for i, q, o in zip(idx, group, T.batched_decode(m, group, 'think', None, temp=1.0, gen=gen)):
                ok = o['ans'] == T.psums(q)[-1]; hits[i].append(ok); trace[i].append(ok and o['think'] == T.psums(q))
    res['avg16'] = round(sum(sum(v) for v in hits) / (K * len(qs)), 4)
    res['pass16'] = round(sum(any(v) for v in hits) / len(qs), 4)
    res['trace_avg16'] = round(sum(sum(v) for v in trace) / (K * len(qs)), 4)
    res['trace_pass16'] = round(sum(any(v) for v in trace) / len(qs), 4)
    nothink = E.run(m, qs, 'nothink'); res['nothink_greedy'] = round(sum(r['correct'] for r in nothink) / len(nothink), 4)
    m.train(); return res


def run(seed):
    torch.set_num_threads(2); torch.manual_seed(seed); rng = random.Random(seed); gen = torch.Generator().manual_seed(seed)
    tch = teacher(); test = [q for i, q in enumerate(T.test_set()) if i % 4 == 0]  # 50 per length, 600 problems
    out = {'seed': seed, 'cfg': {k: SCFG[k] for k in ('d', 'hq', 'hkv', 'hd', 'L', 'ff')}, 'steps': dict(off=OFF_STEPS, p2=P2_STEPS, G=G, QB=QB)}
    # ---- phase 1: off-policy distillation on the teacher's greedy responses ----
    st = T.TinyQwen(SCFG); out['student_params'] = T.nparams(st)
    opt = torch.optim.AdamW(st.parameters(), lr=LR_OFF, betas=(0.9, 0.95), weight_decay=0.01)
    t0 = time.time(); passes = 0
    for step in range(OFF_STEPS):
        qs = [[rng.randrange(10) for _ in range(rng.randint(1, T.NMAX))] for _ in range(256)]
        half = len(qs) // 2
        seqs = sample_batch(tch, qs[:half], 'think', temp=0.0) + sample_batch(tch, qs[half:], 'nothink', temp=0.0)
        x, mask = pad(seqs)
        logits = st(x)[:, :-1]; tgt = x[:, 1:]; mk = mask[:, :-1]
        loss = (F.cross_entropy(logits.reshape(-1, len(T.VOCAB)), tgt.reshape(-1), reduction='none') * mk.reshape(-1)).sum() / mk.sum()
        opt.zero_grad(); loss.backward(); opt.step(); passes += 3 * int(mask.sum())
    out['off'] = dict(eval=evaluate(st, test, gen), seconds=round(time.time() - t0, 1))
    ck = {k: v.clone() for k, v in st.state_dict().items()}
    print(seed, 'off-policy', out['off'], flush=True)
    # ---- phase 2a: RL (GRPO-style) and 2b: on-policy distillation, from the same checkpoint ----
    for method in ('rl', 'od'):
        st = T.TinyQwen(SCFG); st.load_state_dict(ck)
        opt = torch.optim.AdamW(st.parameters(), lr=LR_RL if method == 'rl' else LR_OD, betas=(0.9, 0.95), weight_decay=0.0)
        r2 = random.Random(seed * 7 + (1 if method == 'rl' else 2)); g2 = torch.Generator().manual_seed(seed * 7 + 3)
        curve = []; t0 = time.time(); cost = dict(student_fwd=0, student_bwd=0, teacher_fwd=0, sample_tokens=0)
        for step in range(P2_STEPS + 1):
            if step % 50 == 0:
                e = evaluate(st, test, g2); e.update(step=step, seconds=round(time.time() - t0, 1), **{k: v for k, v in cost.items()}); curve.append(e)
                print(seed, method, e, flush=True)
            if step == P2_STEPS: break
            if method == 'rl':
                qs = [[r2.randrange(10) for _ in range(r2.randint(1, T.NMAX))] for _ in range(QB)]
                qs = [q for q in qs for _ in range(G)]
                st.eval(); seqs = sample_batch(st, qs, 'think', temp=1.0, gen=g2); st.train()
                rew = torch.tensor([1.0 if o['ans'] == T.psums(q)[-1] else 0.0 for q, _, _, o in seqs])
                # group by question (sample_batch reorders by length: regroup by identity of q within the batch)
                groups = {}
                for i, (q, _, _, _) in enumerate(seqs): groups.setdefault(id(q), []).append(i)
                adv = torch.zeros(len(seqs))
                for idx in groups.values():
                    r = rew[idx]; sd = r.std(unbiased=False)
                    adv[idx] = (r - r.mean()) / (sd + 1e-6) if sd > 0 else 0.0
                x, mask = pad(seqs)
                lp = st(x)[:, :-1].log_softmax(-1).gather(-1, x[:, 1:, None])[..., 0]
                mk = mask[:, :-1]
                loss = -(adv[:, None] * lp * mk).sum() / mk.sum()
            else:
                qs = [[r2.randrange(10) for _ in range(r2.randint(1, T.NMAX))] for _ in range(QB * G)]
                half = len(qs) // 2
                st.eval(); seqs = sample_batch(st, qs[:half], 'think', temp=1.0, gen=g2) + sample_batch(st, qs[half:], 'nothink', temp=1.0, gen=g2); st.train()
                x, mask = pad(seqs); mk = mask[:, :-1]
                with torch.no_grad(): tl = tch(x)[:, :-1].log_softmax(-1)
                sl = st(x)[:, :-1].log_softmax(-1)
                kl = (sl.exp() * (sl - tl)).sum(-1)  # KL(student || teacher), exact over the vocabulary
                loss = (kl * mk).sum() / mk.sum()
                cost['teacher_fwd'] += int(x.numel())
            opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(st.parameters(), 1.0); opt.step()
            ntok = int(mask.sum()); cost['sample_tokens'] += ntok
            cost['student_fwd'] += int(x.numel()) + ntok  # scoring pass plus the generation passes (one per sampled token)
            cost['student_bwd'] += int(x.numel())
        out[method] = dict(curve=curve, seconds=round(time.time() - t0, 1))
    json.dump(out, open(os.path.join(HERE, 'model', 'distill_%d.json' % seed), 'w'), indent=1)


def summary():
    runs = [json.load(open(os.path.join(HERE, 'model', f))) for f in sorted(os.listdir(os.path.join(HERE, 'model'))) if f.startswith('distill_') and f.endswith('.json')]
    json.dump({'runs': runs}, open(os.path.join(HERE, 'model', 'distill.json'), 'w'), indent=1)
    for r in runs:
        print(r['seed'], 'off', r['off']['eval'], '\n  rl', r['rl']['curve'][-1], '\n  od', r['od']['curve'][-1])


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'summary': summary()
    else:
        for s in (a or ['1', '2', '3']): run(int(s))
