"""Reduce the cached arXiv HTML (not committed) to the small table extracts in inputs/.
Usage: python3 extract_inputs.py <cache dir with <id>.html files and jb_nemotron.csv>
Each table is written as TSV exactly as parsed from the arXiv HTML (arxiv_tables.py); quotes.json holds
verbatim sentences used for numbers that sit in prose or in tables the parser cannot read."""
import sys, os, json, re, shutil
from arxiv_tables import tables
C = sys.argv[1]; H = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(H, 'inputs')
T = {  # out name: (arxiv file, table index)
 'judgebench_v2_T1': ('2410.12784v2', 0), 'judgebench_v2_T2': ('2410.12784v2', 1), 'judgebench_v2_T3': ('2410.12784v2', 2),
 'judgebench_v2_T6': ('2410.12784v2', 5), 'judgebench_v1_T2': ('2410.12784v1', 1),
 'mtbench_T5a': ('2306.05685v4', 3), 'mtbench_T5b': ('2306.05685v4', 4), 'mtbench_T2': ('2306.05685v4', 1),
 'poll_T1': ('2404.18796v2', 0), 'poll_T2': ('2404.18796v2', 1),
 'prometheus2_T4': ('2405.01535v2', 3),
 'rewardbench_T2': ('2403.13787v2', 1), 'rewardbench_T8': ('2403.13787v2', 7),
 'rewardbench2_T3': ('2506.01937v2', 2),
 'llmbar_T2': ('2310.07641v2', 1), 'llmbar_T5': ('2310.07641v2', 4),
 'judgelm_T2': ('2310.17631v2', 1), 'judgelm_T3': ('2310.17631v2', 2),
 'autoj_T1': ('2310.05470v2', 0),
 'reliability_T1': ('2606.19544v1', 0), 'reliability_T4': ('2606.19544v1', 3), 'reliability_T9': ('2606.19544v1', 8),
 'ajbench_T3': ('2604.18240v1', 2), 'ifrewardbench_T4': ('2603.04738v2', 3),
 'longjudgebench_T3': ('2606.01629v4', 2), 'longjudgebench_T2': ('2606.01629v4', 1), 'mobilejudgebench_T2': ('2608.11434v1', 1),
 'agentjudge_T3': ('2410.10934v2', 2),
}
for name, (f, i) in T.items():
    t = tables(os.path.join(C, f + '.html'))[i]
    with open(os.path.join(O, name + '.tsv'), 'w') as w:
        w.write('# ' + f + ' ' + t['cap'] + '\n')
        for r in t['rows']: w.write('\t'.join(r) + '\n')
shutil.copy(os.path.join(C, 'jb_nemotron.csv'), os.path.join(O, 'judgebench_leaderboard_nemotron.csv'))
# Sentences quoted verbatim (from the text renderings of the same HTML)
Q = {
 'mtbench_votes': ('2306.05685v4', r'We publicly release 80 MT-bench questions, 3K expert votes[^.]*\.'),
 'mtbench_setup': ('2306.05685v4', r'We generate answers for all 80 questions with 6 models[^.]*\.'),
 'poll_cost': ('2404.18796v2', r'running the entire three model PoLL is seven to eight times less expensive than running a single GPT-4 judge\.'),
 'poll_price': ('2404.18796v2', r'whereas the cost of running GPT-4 Turbo is \$10/input \+ \$30/output\.'),
 'llmbar_size': ('2310.07641v2', r'LLMBar consists of 419 instances,'),
 'llmbar_expert': ('2310.07641v2', r'The agreement rate between expert annotators on the sampled LLMBar set is 94%\.'),
 'rb2_random': ('2506.01937v2', r'There is only one correct chosen response, meaning the random baseline is 25% accuracy[^.]*\.'),
 'rb2_lower': ('2506.01937v2', r'models score about 20 points on average lower on RewardBench 2 compared to RewardBench'),
 'jb_random': ('2410.12784v2', r'Many of the fine-tuned judges we evaluate score below the random guessing baseline of 50%\.'),
 'jb_incons': ('2410.12784v2', r'JudgeLM-7B and JudgeLM-13B were inconsistent on 59\.71% and 54\.57% of pairs respectively\. Likewise, Prometheus2-7b was inconsistent on 52\.29% of pairs\.'),
 'pandalm_t2': ('2306.05087v2', r'GPT-4 0\.6647 0\.6620 0\.6815 0\.6180 PandaLM-7B 0\.5926 0\.5728 0\.5923 0\.5456 PandaLM-70B-LoRA 0\.6186 0\.7757 0\.6186 0\.6654 PandaLM-70B 0\.6687 0\.7402 0\.6687 0\.6923'),
 'pandalm_swap': ('2306.05087v2', r'we swap the input response order and infer twice to procure the final evaluation output\. The conflicting evaluation results are revised to .Tie.\.'),
 'offsetbias_t4': ('2407.06551v2', r'Total n=34 n=28 n=26 n=24 n=24 n=24 n=160 GPT-4o-0513 91\.2 92\.9 50\.0 100\.0 91\.7 95\.8 86\.9 .*?\+OFFSETBIAS‡ 85\.3 100\.0 92\.3 95\.8 50\.0 83\.3 85\.0 .*?FsfairX-LLaMA3-RM 41\.2 100\.0 53\.8 91\.7 58\.3 91\.7 71\.3'),
 'rmbench_style': ('2410.16184v1', r'State-of-the-art reward models, such as Skyword-Reward \(Liu & Zeng, 2024\), fail to resist style biases, achieving only 46\.6% accuracy, falling short of random guess accuracy under style interference\.'),
 'rmbench_340b': ('2410.16184v1', r'Even the giant reward model, such as Nemotron-340B-Reward \(Adler et al\., 2024\), struggle on RM-Bench, achieving only 69\.5% accuracy\.'),
 'genrm_abs': ('2408.15240v3', r'resulting in large performance gains with Best-of-N, namely 5%.{0,40}45\.3%.{0,40}on algorithmic tasks and 73%.{0,40}93\.4%.{0,40}on GSM8K\.'),
 'aaj_align': ('2410.10934v2', r'when evaluating OpenHands, Agent-as-a-Judge reaches 92\.07%.{0,20}and 90\.44%.{0,20}, surpassing LLM-as-a-Judge.s 70\.76%.{0,20}and 60\.38%.{0,20}in both gray-box and black-box settings\.'),
 'aaj_cost': ('2410.10934v2', r'Agent-as-a-Judge cost only 30\.58.{0,15}USD in API calls and took only 118\.43.{0,20}minutes'),
 'aaj_human': ('2410.10934v2', r'a full evaluation under DevAI would cost around 1297\.50.{0,15}USD'),
 'aaj_disagree': ('2410.10934v2', r'the disagreement rates between pairs of evaluators range from around 10%.{0,10}to 30%'),
 'aaj_size': ('2410.10934v2', r'which contains 55.{0,5}real-world comprehensive AI app development tasks'),
 'rel_deflation': ('2606.19544v1', r'raw agreement overstates chance-corrected discrimination by 33–41pp in all 21 evaluated models'),
 'rel_ranks': ('2606.19544v1', r'judge rankings are non-transferable: models shift by as many as 14 positions across benchmarks'),
 'rubric_gpt4o': ('2603.25133v1', r'even GPT-4o, a widely adopted judge in instruction-following benchmarks, achieves only 55\.97% on Hard subset'),
 'rubric_size': ('2603.25133v1', r'a substantial set of 3,486 quality-controlled instances'),
 'ajb_size': ('2604.18240v1', r'comprising 155 tasks and 516 annotated trajectories'),
 'mjb_size': ('2608.11434v1', r'931 human-annotated trajectories spanning 6 mobile agent benchmarks, 4 agent models, and 68 apps'),
 'ropoll_claim': ('2606.30931v1', r'RoPoLL dominates PoLL on every biased corruption type[^.]*\.'),
 'ropoll_unbounded': ('2606.30931v1', r'PoLL incurs unbounded bias under any positive contamination[^.]*\.'),
 'devai_365': ('2410.10934v2', r'across all 365.{0,8}requirements'),
 'aaj_pct': ('2410.10934v2', r'2\.29%.{0,12}of the cost and 2\.36%.{0,12}of the time of Human-as-a-Judge'),
 'aaj_saves': ('2410.10934v2', r'Agent-as-a-Judge saves 97\.72% of the time and 97\.64% of the cost compared to involving three human experts\.'),
 'rel_window': ('2606.19544v1', r'We conducted model evaluation in seven phases over a five-week window during March and April 2026\.'),
}
qs = {}
for k, (f, pat) in Q.items():
    s = open(os.path.join(C, f + '.txt'), errors='ignore').read().replace('\n', ' ')
    s = re.sub(r'\s+', ' ', s)
    m = re.search(pat, s)
    if not m: print('MISSING quote', k); continue
    qs[k] = {'arxiv': f, 'text': m.group(0)}
json.dump(qs, open(os.path.join(O, 'quotes.json'), 'w'), indent=1, ensure_ascii=False)
print(len(T), 'tables,', len(qs), 'quotes')
