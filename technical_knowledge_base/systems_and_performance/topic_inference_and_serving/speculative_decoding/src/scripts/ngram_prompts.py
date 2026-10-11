"""Write ngram_prompts.json: code-editing prompts on a 70-line module, and quoting and summarising prompts on
WikiText-2 test articles (raw text file path as argument), plus a story and a list as controls.
usage: python3 ngram_prompts.py <wiki.test.raw>"""
import json, re, sys
raw = open(sys.argv[1], encoding="utf-8").read()
arts = re.split(r"\n = ([^=\n]+) = \n", raw)
pairs = {arts[i].strip(): arts[i + 1] for i in range(1, len(arts) - 1, 2)}
def clean(b, nw):
    b = re.sub(r"\n = = [^\n]+ = = \n", "\n", b)
    b = b.replace(" @-@ ", "-").replace(" @,@ ", ",").replace(" @.@ ", ".")
    b = re.sub(r" ([,.;:)'])", r"\1", b); b = re.sub(r"\( ", "(", b)
    return " ".join(b.split()[:nw])
osb = clean(pairs["Osbert de Bayeux"], 700)
hur = clean(pairs["1933 Treasure Coast hurricane"], 600)
code = open(__file__.replace("ngram_prompts.py", "weather_module.py")).read()
P = {
 "code_hints": "Here is a Python module:\n\n```python\n" + code + "```\n\nAdd type hints to every function signature and keep everything else exactly the same. Output the complete module.",
 "code_rename": "Here is a Python module:\n\n```python\n" + code + "```\n\nRename the function `by_station` to `group_by_station` everywhere and change the wet-day threshold from 0.2 to 0.5. Output the complete updated module with no other changes.",
 "rag_quote": "Read the passage and answer the question using exact sentences quoted from the passage.\n\nPassage:\n" + osb + "\n\nQuestion: What happened to Osbert after the death of William of York? Quote the relevant sentences exactly.",
 "summarize_article": "Summarize the following article in about 150 words.\n\n" + hur,
 "story": "Write a short story of about 200 words about a lighthouse keeper who finds a message in a bottle.",
 "list": "List the numbers from 1 to 60, one per line, each followed by its square, like '1: 1'.",
}
json.dump(P, open(__file__.replace("ngram_prompts.py", "ngram_prompts.json"), "w"), indent=0)
print({k: len(v.split()) for k, v in P.items()})
