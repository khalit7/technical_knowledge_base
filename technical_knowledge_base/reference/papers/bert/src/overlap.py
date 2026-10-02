"""Measure how the test set relates to the training data. Replays the toy BERT's pretraining stream (same
seed and the same random calls as train.py's pretrain, masking included) to collect every sentence seen in
pretraining, then compares it with the 2,000 tagging test sentences and the 128-sentence labelled set of
seed 0, and counts the grammar's sentence space.
  uv run --with torch --with numpy python overlap.py      (writes model/overlap.json)"""
import json, os, random
import grammar as G
import train as T

def main():
    c = T.CFG; r = random.Random(c['seed']); seen = set()
    for step in range(c['steps']):
        for _ in range(c['batch']):
            a, b, nx = G.pretrain_pair(r); seen.add(tuple(a)); seen.add(tuple(b))
            T.mask_example(T.pack(a, b)[0], r)
    test = [tuple(w) for w, *_ in T.test_sets()['tok']]
    lab = set(tuple(w) for w, *_ in T.make_split(128, 5000, seen=True, task='tok'))
    out = {'space': G.space_size(), 'pretraining_unique_sentences': len(seen),
           'test_in_pretraining': sum(t in seen for t in test) / len(test),
           'test_in_labels': sum(t in lab for t in test) / len(test),
           'test_unique': len(set(test))}
    json.dump(out, open(os.path.join(T.MD, 'overlap.json'), 'w'), indent=1); print(out)

if __name__ == '__main__':
    main()
