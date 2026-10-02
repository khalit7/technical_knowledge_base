"""Recompute every derived number the page quotes from the paper's own counts (sections 2, 3.2, 3.3, 4.1, 4.2, 4.5).
Writes inputs/recompute.json; build.sh runs it. Pure arithmetic, no fitted inputs."""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
R = {}
# §3.2 red-team prompts and SL data
R['red_human'], R['red_model'] = 42496, 140335
R['red_total'] = R['red_human'] + R['red_model']            # printed 182,831
assert R['red_total'] == 182831
R['help_prompts'] = 135296
R['revisions_per_prompt'] = 4
R['sl_revisions'] = R['red_total'] * R['revisions_per_prompt']   # 731,324 revisions (all steps kept)
R['sl_help_samples'] = R['help_prompts'] * 2                      # 2 samples per helpfulness prompt
R['sl_sequences'] = R['sl_revisions'] + R['sl_help_samples']
R['sl_steps_one_epoch'] = math.ceil(R['sl_sequences'] / 1024)     # batch 1024 sequences, one epoch
R['red_model_share'] = round(R['red_model'] / R['red_total'], 4)
# §4.2 PM data and RL prompts
R['pm_ai'], R['pm_human'] = 182831, 135296
R['pm_total'] = R['pm_ai'] + R['pm_human']
R['pm_ai_share'] = round(R['pm_ai'] / R['pm_total'], 4)
R['rl_extra_red'], R['rl_extra_help'] = 491142, 474300
R['rl_red'] = R['red_total'] + R['rl_extra_red']
R['rl_help'] = R['help_prompts'] + R['rl_extra_help']
R['rl_prompts'] = R['rl_red'] + R['rl_help']
# §3.3 crowdworker comparisons for Elo
R['cmp_help'], R['cmp_harm'], R['snapshots'] = 10274, 8135, 24
R['cmp_total'] = R['cmp_help'] + R['cmp_harm']
# rough Elo standard error per snapshot if comparisons were spread evenly: each comparison involves two snapshots
for k in ('help', 'harm'):
    n = R['cmp_' + k] * 2 / R['snapshots']
    R['appear_' + k] = round(n)
    R['elo_se_' + k] = round(400 / math.log(10) / 0.25 * 0.5 / math.sqrt(n), 1)   # dElo/dp at p = 0.5 times SE of p
# §2: 438 binary comparisons = 221 (Askell et al. 2021) + 217 new
R['hhh_old'], R['hhh_new'] = 221, 217
R['hhh_total'] = R['hhh_old'] + R['hhh_new']
assert R['hhh_total'] == 438
for acc in (0.7, 0.8, 0.9):
    R['hhh_se_%d' % round(acc * 100)] = round(100 * math.sqrt(acc * (1 - acc) / R['hhh_total']), 1)
# §4.5 absolute harmfulness: 64 prompts x 256 responses
R['abs_prompts'], R['abs_resp'] = 64, 256
R['abs_samples'] = R['abs_prompts'] * R['abs_resp']
# §4.3 clamping: the largest reward gap a Bradley-Terry PM is asked to learn from one label p is logit(p)
logit = lambda p: math.log(p / (1 - p))
R['gap_clamp_60'] = round(logit(0.6), 3)
R['gap_clamp_80'] = round(logit(0.8), 3)
R['gap_soft_95'] = round(logit(0.95), 3)
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
print(json.dumps(R, indent=1))
