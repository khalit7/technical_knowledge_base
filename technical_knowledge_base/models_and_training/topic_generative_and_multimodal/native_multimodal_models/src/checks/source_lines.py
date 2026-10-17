"""Locate the source lines this page quotes (transformers v5.20.1, commit 0ea8779), by pattern, and write
inputs/source_lines.json.  Usage: python3 source_lines.py <path to the transformers clone>"""
import json, os, sys
root = os.path.join(sys.argv[1], "src", "transformers")
PAT = [
    ("models/chameleon/modeling_chameleon.py", "self.q_norm = ChameleonLayerNorm"),
    ("models/chameleon/modeling_chameleon.py", "query_states = self.q_norm(query_states)"),
    ("models/chameleon/modeling_chameleon.py", "class ChameleonImageVocabularyMapping"),
    ("models/chameleon/modeling_chameleon.py", "# Disallow image tokens"),
    ("models/chameleon/modeling_chameleon.py", "logits[:, :, image_tokens] = torch.finfo(logits.dtype).min"),
    ("generation/logits_process.py", "class ClassifierFreeGuidanceLogitsProcessor"),
    ("generation/logits_process.py", "scores_processed = uncond_logits + (cond_logits - uncond_logits) * self.guidance_scale"),
    ("models/janus/modeling_janus.py", "logits_processor.append(ClassifierFreeGuidanceLogitsProcessor(generation_config.guidance_scale))"),
    ("models/janus/modeling_janus.py", "Setting to default value of 5."),
]
out = []
for f, p in PAT:
    lines = open(os.path.join(root, f)).read().split("\n")
    hits = [i + 1 for i, l in enumerate(lines) if p in l]
    out.append({"file": "src/transformers/" + f, "pattern": p, "lines": hits, "text": [lines[h - 1].strip() for h in hits]})
json.dump({"repo": "huggingface/transformers", "tag": "v5.20.1", "commit": "0ea8779", "found": out},
          open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "inputs", "source_lines.json"), "w"), indent=1)
for o in out:
    print(o["file"], o["lines"], o["text"][:1])
