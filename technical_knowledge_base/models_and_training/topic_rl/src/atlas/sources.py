"""Every source the Method atlas cites, with a verified link and its date.

ax: arXiv id (title, authors and v1 date are filled from inputs/arxiv.json, fetched with fetch_arxiv.py);
doi: checked through Crossref (inputs/other_sources.json, fetch_other.py);
corpus: where check_atlas_data.py looks for the quoted words (abstract, inputs/extracts.json, repo paper texts).
Docs and READMEs carry the date they were read (2026-10-03), not a publication date.
"""
READ = '2026-10-03'
SB_URL = 'http://incompleteideas.net/book/RLbook2020.pdf'

SRC = {
 # book and classic papers
 'sb': dict(t='Sutton and Barto, Reinforcement Learning: An Introduction, 2nd ed.', u=SB_URL, d='2018', kind='book'),
 'bellman57': dict(t='Bellman, A Markovian Decision Process (J. Math. Mech. 6)', u='https://doi.org/10.1512/iumj.1957.6.56038', d='1957', kind='paper'),
 'sutton88': dict(t='Sutton, Learning to predict by the methods of temporal differences (Machine Learning 3)', u='https://doi.org/10.1007/BF00115009', d='1988-08', kind='paper'),
 'watkins89': dict(t='Watkins, Learning from Delayed Rewards (PhD thesis, Cambridge)', u='https://www.cs.rhul.ac.uk/~chrisw/new_thesis.pdf', d='1989', kind='thesis'),
 'wd92': dict(t='Watkins and Dayan, Q-learning (Machine Learning 8)', u='https://doi.org/10.1007/BF00992698', d='1992-05', kind='paper'),
 'rummery94': dict(t='Rummery and Niranjan, On-line Q-learning using connectionist systems (CUED/F-INFENG/TR 166)', u='https://mi.eng.cam.ac.uk/reports/svr-ftp/auto-pdf/rummery_tr166.pdf', d='1994', kind='report'),
 'sutton90': dict(t='Sutton, Integrated Architectures for Learning, Planning, and Reacting Based on Approximating Dynamic Programming (ICML 1990)', u='https://doi.org/10.1016/B978-1-55860-141-3.50030-4', d='1990', kind='paper'),
 'williams92': dict(t='Williams, Simple statistical gradient-following algorithms for connectionist reinforcement learning (Machine Learning 8)', u='https://doi.org/10.1007/BF00992696', d='1992-05', kind='paper'),
 'bsa83': dict(t='Barto, Sutton and Anderson, Neuronlike adaptive elements that can solve difficult learning control problems (IEEE SMC)', u='https://doi.org/10.1109/TSMC.1983.6313077', d='1983-09', kind='paper'),
 'tesauro95': dict(t='Tesauro, Temporal difference learning and TD-Gammon (CACM 38)', u='https://doi.org/10.1145/203330.203343', d='1995-03', kind='paper'),
 'alvinn88': dict(t='Pomerleau, ALVINN: An Autonomous Land Vehicle in a Neural Network (NeurIPS 1988)', u='https://papers.nips.cc/paper/1988/hash/812b4ba287f5ee0bc9d43bbf5bbe87fb-Abstract.html', d='1988', kind='paper'),
 'mnih15': dict(t='Mnih et al., Human-level control through deep reinforcement learning (Nature 518)', u='https://doi.org/10.1038/nature14236', d='2015-02-26', kind='paper'),
 'alphago': dict(t='Silver et al., Mastering the game of Go with deep neural networks and tree search (Nature 529)', u='https://doi.org/10.1038/nature16961', d='2016-01-28', kind='paper'),
 'agz': dict(t='Silver et al., Mastering the game of Go without human knowledge (Nature 550)', u='https://doi.org/10.1038/nature24270', d='2017-10', kind='paper'),
 'kool19': dict(t='Kool, van Hoof and Welling, Buy 4 REINFORCE Samples, Get a Baseline for Free! (ICLR 2019 workshop, OpenReview; read via the Wayback capture of 2026-05-11)', u='https://openreview.net/forum?id=r1lgTGL5DE', d='2019', kind='paper'),
 'a2c': dict(t='OpenAI (Wu, Mansimov, Liao, Radford, Schulman), OpenAI Baselines: ACKTR and A2C (blog; Wayback capture)', u='https://web.archive.org/web/20190213165907/https://blog.openai.com/baselines-acktr-a2c/', d='2017-08-18', kind='blog'),
 'dreamerv3n': dict(t='Hafner et al., Mastering diverse control tasks through world models (Nature, DreamerV3)', u='https://doi.org/10.1038/s41586-025-08744-2', d='2025-04-17', kind='paper'),
 # arXiv papers
 'mnih13': dict(ax='1312.5602'), 'ddqn': dict(ax='1509.06461'), 'dueling': dict(ax='1511.06581'), 'per': dict(ax='1511.05952'),
 'c51': dict(ax='1707.06887'), 'qrdqn': dict(ax='1710.10044'), 'rainbow': dict(ax='1710.02298'), 'a3c': dict(ax='1602.01783'),
 'trpo': dict(ax='1502.05477'), 'ppo': dict(ax='1707.06347'), 'gae': dict(ax='1506.02438'), 'ddpg': dict(ax='1509.02971'),
 'td3': dict(ax='1802.09477'), 'sac': dict(ax='1801.01290'), 'sacapps': dict(ax='1812.05905'), 'az17': dict(ax='1712.01815'),
 'muzero': dict(ax='1911.08265'), 'dreamer': dict(ax='1912.01603'), 'dreamerv3': dict(ax='2301.04104'), 'gail': dict(ax='1606.03476'),
 'cql': dict(ax='2006.04779'), 'iql': dict(ax='2110.06169'), 'dt': dict(ax='2106.01345'), 'christiano17': dict(ax='1706.03741'),
 'ziegler19': dict(ax='1909.08593'), 'instructgpt': dict(ax='2203.02155'), 'dpo': dict(ax='2305.18290'), 'dsmath': dict(ax='2402.03300'),
 'r1': dict(ax='2501.12948'), 'rloo24': dict(ax='2402.14740'), 'drgrpo': dict(ax='2503.20783'), 'dapo': dict(ax='2503.14476'),
 'gspo': dict(ax='2507.18071'), 'tulu3': dict(ax='2411.15124'), 'samrpo': dict(ax='2608.16072'), 'gdpo': dict(ax='2601.05242'),
 'dota': dict(ax='1912.06680'), 'muzerovp9': dict(ax='2202.06626'), 'llama3': dict(ax='2407.21783'), 'agent57': dict(ax='2003.13350'),
 # docs, READMEs and repo pages (date = when read)
 'sb3': dict(t='Stable-Baselines3 README, Implemented Algorithms table', u='https://github.com/DLR-RM/stable-baselines3#implemented-algorithms', d=READ, kind='docs'),
 'cleanrl': dict(t='CleanRL README, Algorithms Implemented', u='https://github.com/vwxyzjn/cleanrl#algorithms-implemented', d=READ, kind='docs'),
 'verl': dict(t='verl README (Volcano Engine RL for LLMs), key features and news', u='https://github.com/volcengine/verl', d=READ, kind='docs'),
 'trl': dict(t='Hugging Face TRL README', u='https://github.com/huggingface/trl', d=READ, kind='docs'),
 'trl_rloo': dict(t='Hugging Face TRL docs, RLOO Trainer', u='https://huggingface.co/docs/trl/rloo_trainer', d=READ, kind='docs'),
 'imitation': dict(t='HumanCompatibleAI imitation library README', u='https://github.com/HumanCompatibleAI/imitation', d=READ, kind='docs'),
 'corl': dict(t='CORL (Clean Offline RL) README', u='https://github.com/tinkoff-ai/CORL', d=READ, kind='docs'),
 'chatgpt': dict(t='OpenAI, Introducing ChatGPT (as quoted on the InstructGPT paper page)', u='https://openai.com/index/chatgpt/', d='2022-11-30', kind='blog'),
 'samrpo_page': dict(t='Knowledge base paper page: Learn What\'s Left, Not What\'s Mastered (SA-MRPO), README', u='n:3c65c17b0d0d81e38b0fe72f3daf44bc', d=READ, kind='kb'),
}

# repo texts that hold the full paper text for a source (checked for quotes; never shipped)
REPO_TEXT = {
 'instructgpt': ['technical_knowledge_base/reference/papers/instructgpt/src/inputs/paper_v1.txt'],
 'chatgpt': ['technical_knowledge_base/reference/papers/instructgpt/src/inputs/later_extracts.txt'],
 'r1': ['technical_knowledge_base/reference/papers/deepseek_r1/src/inputs/paper_v1.txt'],
 'llama3': ['technical_knowledge_base/reference/papers/llama_3_herd/src/inputs/paper_v3.txt'],
 'samrpo_page': ['technical_knowledge_base/reference/papers/learn_whats_left_not_whats_mastered/src/README.md'],
}

# knowledge base pages a row links to (Notion ids)
PAGES = {
 'dp': ['Dynamic programming', '3c65c17b0d0d81baada7e1c05ce69d01'],
 'mf': ['Model-free methods', '3c65c17b0d0d81898a0cd4c05c744969'],
 'deep': ['Deep RL', '3c65c17b0d0d8180b808c8c0cf8ddbe6'],
 'llm': ['RL for LLMs', '3c65c17b0d0d818c9bcff7177325fe56'],
 'align': ['Alignment: SFT, RLHF, DPO Family, RLVR', '3c65c17b0d0d81d5bed7e608d4061c7a'],
}
PAPER_PAGES = {
 'instructgpt': ['InstructGPT paper page', '3c65c17b0d0d8180b958d8299996a063'],
 'dpo': ['DPO paper page', '3c65c17b0d0d818bb1d8cafd30e20f9e'],
 'dsmath': ['DeepSeekMath paper page', '3c65c17b0d0d817f9fc5cb9a9fbcbee5'],
 'r1': ['DeepSeek-R1 paper page', '3c65c17b0d0d813faca4f7a51eaa0c65'],
 'samrpo': ['SA-MRPO paper page', '3c65c17b0d0d81e38b0fe72f3daf44bc'],
}
