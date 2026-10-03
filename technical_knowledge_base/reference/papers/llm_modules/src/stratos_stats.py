"""What the released training code (model.py) actually trained on: Bespoke-Stratos-17k as prepare_dataset() builds it.

  curl -sL -o /tmp/stratos.parquet https://huggingface.co/datasets/bespokelabs/Bespoke-Stratos-17k/resolve/main/data/train-00000-of-00001.parquet
  curl -sL -o /tmp/qwen_tokenizer.json https://huggingface.co/Qwen/Qwen2-1.5B/resolve/main/tokenizer.json
  uv run --with pyarrow --with tokenizers --with numpy python stratos_stats.py /tmp/stratos.parquet /tmp/qwen_tokenizer.json

Mirrors model.py: the same system message and "User:/Assistant:" text, the Qwen2 tokenizer (no BOS added), a 30% subset
per epoch drawn with datasets' shuffle(seed=epoch) (numpy default_rng(seed).permutation), examples over 4,096 tokens
dropped, the last 10% of the filtered subset as validation. GPT-Neo has 2,048 positions, so ModifiedGptNeo.forward
cuts every sequence to its first 2,048 tokens and the loss only covers those. The loss is on every token
(labels = input_ids), so the fixed system message is part of the reported loss. Writes inputs/stratos_stats.json.
"""
import json, os, sys
import numpy as np
import pyarrow.parquet as pq
from tokenizers import Tokenizer

HERE = os.path.dirname(os.path.abspath(__file__))
SYSTEM = (
    "System:\n\n**Your role as an assistant involves thoroughly exploring questions through a systematic "
    "long thinking process before providing the final precise and accurate solutions. This requires "
    "engaging in a comprehensive cycle of analysis, summarizing, exploration, reassessment, reflection, "
    "backtracing, and iteration to develop well-considered thinking process. Please structure your "
    "response into two main sections: Thought and Solution. In the Thought section, detail your reasoning "
    "process using the specified format: <|begin_of_thought|> {thought with steps separated with '\\n\\n'} "
    "<|end_of_thought|> Each step should include detailed considerations such as analisying questions, "
    "summarizing relevant findings, brainstorming new ideas, verifying the accuracy of the current steps, "
    "refining any errors, and revisiting previous steps. In the Solution section, based on various "
    "attempts, explorations, and reflections from the Thought section, systematically present the final "
    "solution that you deem correct. The solution should remain a logical, accurate, concise expression "
    "style and detail necessary step needed to reach the conclusion, formatted as follows: "
    "<|begin_of_solution|> {final formatted, precise, and clear solution} <|end_of_solution|> "
    "Now, try to solve the following question through the above guidelines:**"
)


def main(parquet, tokpath):
    rows = pq.read_table(parquet).to_pylist(); n = len(rows)
    tok = Tokenizer.from_file(tokpath)
    texts, users = [], []
    for r in rows:
        t = SYSTEM + "\n\n"; u = ''
        for c in r['conversations']:
            if c['from'] == 'user': t += "User:\n\n" + c['value'] + "\n\n"; u = "User:\n\n" + c['value'] + "\n\n"
            elif c['from'] == 'assistant': t += "Assistant:\n\n" + c['value'] + "\n\n"
        texts.append(t); users.append(u)
    L = np.array([len(e.ids) for e in tok.encode_batch(texts, add_special_tokens=False)])
    sys_len = len(tok.encode(SYSTEM + "\n\n", add_special_tokens=False).ids)
    U = np.array([len(e.ids) for e in tok.encode_batch(users, add_special_tokens=False)])
    keep = L <= 4096
    # loss positions: min(L, 2048) - 1 per example (shifted labels); the system message occupies the first sys_len tokens
    trained = np.minimum(L, 2048)
    k = keep
    loss_tok = (trained[k] - 1).sum()
    sys_share = (sys_len * k.sum() - k.sum()) / loss_tok        # system tokens that are labels (the first token is never a label)
    user_share = np.minimum(U[k], np.maximum(trained[k] - sys_len, 0)).sum() / loss_tok
    cut = (L[k] > 2048)
    cut_tok_share = (L[k] - trained[k]).sum() / L[k].sum()
    # epochs: subset 30% with shuffle(seed=epoch), filter, last 10% validation
    sub = int(n * 0.3); epochs = []
    seen_train = set()
    for e in range(15):
        perm = np.random.default_rng(e).permutation(n)[:sub]
        f = [int(i) for i in perm if keep[i]]
        nv = int(len(f) * 0.1); tr, va = f[:len(f) - nv], f[len(f) - nv:]
        overlap = sum(1 for i in va if i in seen_train) / len(va)
        epochs.append(dict(epoch=e + 1, subset=sub, after_filter=len(f), train=len(tr), val=len(va), val_seen_in_earlier_train=round(overlap, 4)))
        seen_train |= set(tr)
    # scenarios: s = the first epoch whose validation loss is below 1.8 (model.py reshuffles from the next epoch on).
    # Epochs 1..s train on the seed-0 split; epoch e > s draws a fresh split with seed e - 1.
    splits = {}
    def split_of(seed):
        if seed not in splits:
            perm = np.random.default_rng(seed).permutation(n)[:sub]
            f = [int(i) for i in perm if keep[i]]; nv = int(len(f) * 0.1)
            splits[seed] = (set(f[:len(f) - nv]), f[len(f) - nv:])
        return splits[seed]
    scen = []
    for s in range(1, 16):
        seen = set(); row = []
        for e in range(1, 16):
            tr, va = split_of(0 if e <= s else e - 1)
            seen |= tr                       # validation runs after the epoch's training
            row.append(round(sum(1 for i in va if i in seen) / len(va), 4))
        scen.append(dict(first_below_1_8=s, val_seen=row, distinct_trained=len(seen)))
    trained_tok_mean = float(np.minimum(L[keep], 2048).mean())
    out = dict(rows=n, trained_tokens_mean=round(trained_tok_mean, 1), scenarios=scen, system_tokens=sys_len, tokens_median=int(np.median(L)), tokens_mean=round(float(L.mean()), 1),
               tokens_p90=int(np.percentile(L, 90)), share_rows_le_4096=round(float(keep.mean()), 4),
               share_kept_rows_over_2048=round(float(cut.mean()), 4), share_kept_tokens_beyond_2048=round(float(cut_tok_share), 4),
               loss_share_system_prompt=round(float(sys_share), 4), loss_share_user_question=round(float(user_share), 4),
               loss_share_answer=round(float(1 - sys_share - user_share), 4),
               rows_ever_trained_if_reshuffled_every_epoch=len(seen_train), share_ever_trained=round(len(seen_train) / n, 4),
               epochs=epochs,
               note='model.py reshuffles only when the previous validation loss is below 1.8; epochs assume it always was (the blog reports a final validation loss of about 1.1). The 30% subset and 15 epochs come from main(); the paper text does not mention the subset.')
    json.dump(out, open(os.path.join(HERE, 'inputs', 'stratos_stats.json'), 'w'), indent=1)
    print(json.dumps({k: v for k, v in out.items() if k not in ('epochs', 'scenarios')}, indent=1)); print([ (x['first_below_1_8'], x['val_seen'][-1], x['distinct_trained']) for x in scen]); print(epochs[1], epochs[-1])


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
