"""Write pool16.json (16 mixed prompts), xjobs.json (crossover sessions) and drjobs.json (drafter sessions).
Model paths are written <G>/ and resolved by lrun.py. usage: python3 make_jobs.py"""
import json
pool = {
 "code_mean": "Here is a Python function:\n\ndef mean(xs):\n    total = 0\n    for x in xs:\n        total += x\n    return total / len(xs)\n\nRewrite it so it returns 0.0 for an empty list, adds type hints and a docstring, and keeps everything else the same. Show the full function.",
 "sum_mem": "Summarize in about 150 words why large language model inference is usually limited by memory bandwidth during decoding and by compute during prompt processing.",
 "story_light": "Write a short story of about 200 words about a lighthouse keeper who finds a message in a bottle.",
 "list_sq": "List the numbers from 1 to 60, one per line, each followed by its square, like '1: 1'.",
 "code_fib": "Write a Python function fib(n) that returns the n-th Fibonacci number iteratively, with a docstring and three doctest examples.",
 "sum_tcp": "Explain in about 150 words how TCP congestion control works, for a software engineer.",
 "story_robot": "Write a short story of about 200 words about a robot that learns to paint.",
 "list_months": "List the twelve months of the year, one per line, each followed by its number of days.",
 "code_json": "Write a Python function that reads a JSON file of users (name, age, email), skips invalid rows, and returns the average age. Include type hints.",
 "sum_photo": "Summarize in about 150 words how photosynthesis works.",
 "story_train": "Write a short story of about 200 words about a night train crossing a desert.",
 "list_capitals": "List twenty European countries and their capitals, one per line, like 'France: Paris'.",
 "code_sql": "Write a SQL query that returns the ten customers with the highest total order value in 2024, from tables customers(id, name) and orders(id, customer_id, total, created_at). Explain each clause briefly.",
 "sum_git": "Explain in about 150 words what git rebase does and when to prefer it over merge.",
 "story_garden": "Write a short story of about 200 words about a child who plants a garden on a city rooftop.",
 "list_elements": "List the first twenty chemical elements, one per line, with their symbol and atomic number.",
}
json.dump(pool, open("pool16.json", "w"), indent=0)
tgt = ["-m", "<G>/Qwen3-4B-Q4_K_M.gguf", "-ngl", "99", "-fa", "on"]
d06 = ["-md", "<G>/Qwen3-0.6B-Q4_K_M.gguf", "-ngld", "99"]
dr = d06 + ["--spec-type", "draft-simple"]
cfgs = {"base": [], "d3": dr, "d6": dr + ["--spec-draft-n-max", "6"],
        "s25": dr + ["--spec-draft-n-max", "4", "--spec-synth-len", "2.5"],
        "s45": dr + ["--spec-draft-n-max", "4", "--spec-synth-len", "4.5"]}
jobs = []
# one server per configuration with 16 slots; clients at 1, 2, 4, 8 and 16 users in turn, the whole sweep twice
# (idle slots do no work in llama-server, so one 16-slot server serves every user count)
for name, extra in cfgs.items():
    jobs.append({"tag": "x_%s" % name, "args": tgt + extra + ["-np", "16", "-c", str(768 * 16)],
                 "client": [{"B": B, "rep": rep, "rounds": 4 if B == 1 else (3 if B == 2 else 2), "np": 192, "prompts": "pool16.json"}
                            for rep in (1, 2) for B in (1, 2, 4, 8, 16)]})
json.dump(jobs, open("xjobs.json", "w"), indent=1)
t1 = tgt + ["-np", "1", "-c", "4096"]
dc = {
 "base": [], "d06_k3": d06 + ["--spec-type", "draft-simple"], "d06_k6": d06 + ["--spec-type", "draft-simple", "--spec-draft-n-max", "6"],
 "eagle3_k3": ["-md", "<G>/Qwen3-4B-EAGLE3-F16.gguf", "-ngld", "99", "--spec-type", "draft-eagle3"],
 "eagle3_k6": ["-md", "<G>/Qwen3-4B-EAGLE3-F16.gguf", "-ngld", "99", "--spec-type", "draft-eagle3", "--spec-draft-n-max", "6"],
 "dflash_k15": ["-md", "<G>/Qwen3-4B-DFlash-b16-F16.gguf", "-ngld", "99", "--spec-type", "draft-dflash", "--spec-draft-n-max", "15"],
 "dflash_k7": ["-md", "<G>/Qwen3-4B-DFlash-b16-F16.gguf", "-ngld", "99", "--spec-type", "draft-dflash", "--spec-draft-n-max", "7"],
 "dspark_k7": ["-md", "<G>/Qwen3-4B-DSpark-block7-F16.gguf", "-ngld", "99", "--spec-type", "draft-dspark", "--spec-draft-n-max", "7"],
 "base_mid": [],
 "ng_simple": ["--spec-type", "ngram-simple", "--spec-draft-n-max", "16"],
 "ng_simple_n4": ["--spec-type", "ngram-simple", "--spec-ngram-simple-size-n", "4", "--spec-ngram-simple-size-m", "16", "--spec-draft-n-max", "16"],
 "ng_mapk_n4": ["--spec-type", "ngram-map-k", "--spec-ngram-map-k-size-n", "4", "--spec-ngram-map-k-size-m", "16", "--spec-draft-n-max", "16"],
 "ng_mod": ["--spec-type", "ngram-mod"],
 "ng_mod_n8": ["--spec-type", "ngram-mod", "--spec-ngram-mod-n-match", "8", "--spec-ngram-mod-n-min", "4", "--spec-ngram-mod-n-max", "16"],
 "ng_cache": ["--spec-type", "ngram-cache"],
 "d06_ng4": d06 + ["--spec-type", "draft-simple,ngram-simple", "--spec-ngram-simple-size-n", "4", "--spec-ngram-simple-size-m", "16"],
 "base2": [],
}
json.dump([{"tag": "dr_" + k, "args": t1 + v, "client": [{"B": 1, "rounds": 6, "np": 512, "prompts": "ngram_prompts.json"}]} for k, v in dc.items()],
          open("drjobs.json", "w"), indent=1)
print(len(jobs), len(dc))
