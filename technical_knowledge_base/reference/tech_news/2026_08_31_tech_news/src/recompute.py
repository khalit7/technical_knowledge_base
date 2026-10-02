#!/usr/bin/env python3
"""Every derived number on the 2026-08-31 page, with asserts where a source states the figure.
Run from src/: python3 recompute.py"""
import json, datetime as dt
def close(a, b, tol): assert abs(a - b) <= tol, (a, b); return a
D = lambda s: dt.date.fromisoformat(s)

print('== Top stories and Compute')
close(12.9 / 4.5, 2.87, 0.005); print('Hugging Face: 12.9 / 4.5 =', round(12.9 / 4.5, 2), '("roughly 3x")')
close(96.22 / 46.7, 2.06, 0.005); print('Nvidia revenue: 96.22 / 46.7 =', round(96.22 / 46.7, 2), '(more than double; $92.17B was the estimate)')
print('JIT-Agent gains:', round(81.8 - 74.1, 1), round(75.5 - 66.7, 1)); close(81.8 - 74.1, 7.7, 1e-9); close(75.5 - 66.7, 8.8, 1e-9)
g = (D('2026-08-31') - D('2026-06-03')).days; print('Grok: Jun 3 to Aug 31 =', g, 'days =', round(g / 7, 1), 'weeks'); assert g == 89
c = (D('2026-11-12') - D('2026-08-29')).days; print('Cursor: Aug 29 to Nov 12 =', c, 'days =', round(c / 7, 1), 'weeks'); assert c == 75
print('AMD Helios: 31 TB / 72 =', round(31e3 / 72, 1), 'GB per GPU (AMD: 432 GB); 23.3 TB/s x 72 =', round(23.3 * 72 / 1000, 2), 'PB/s (1.7)')
print('Rubin package 288 GB; NVL144 counts two dies per package: 144 GB per counted GPU')
print('15 GW / 66 GW =', round(100 * 15 / 66, 1), '%')
print('DeepSeek 0813 NVFP4 storage 941.1 GB against 1,781.8 GB:', round(1781.8 / 941.1, 2), 'x smaller')

print('\n== DFlash 2 (model card tables)')
T = {'1': {'GSM8K': [68.9, 178.5, 185.3, 236.1], 'MATH-500': [69.0, 172.8, 174.5, 230.7], 'HumanEval': [69.0, 151.9, 159.9, 214.6], 'MBPP': [69.0, 153.1, 163.3, 226.9], 'MT-Bench': [68.9, 134.9, 137.6, 184.0]},
     '8': {'GSM8K': [467.2, 1022.1, 1040.8, 1328.7], 'MATH-500': [480.0, 1023.5, 1025.8, 1368.3], 'HumanEval': [483.4, 934.2, 956.5, 1291.5], 'MBPP': [478.0, 938.1, 974.1, 1328.0], 'MT-Bench': [480.5, 835.2, 802.3, 1090.2]},
     '32': {'GSM8K': [1329.8, 1381.1, 1506.5, 1922.5], 'MATH-500': [1505.8, 1415.6, 1429.0, 1951.8], 'HumanEval': [1546.5, 1296.8, 1330.1, 1799.0], 'MBPP': [1507.7, 1314.9, 1361.3, 1886.8], 'MT-Bench': [1507.4, 1159.7, 1115.5, 1525.3]}}
PRINTED = {'1': {'GSM8K': [2.59, 2.69, 3.43], 'MATH-500': [2.51, 2.53, 3.34], 'HumanEval': [2.20, 2.32, 3.11], 'MBPP': [2.22, 2.37, 3.29], 'MT-Bench': [1.96, 2.00, 2.67]},
           '8': {'GSM8K': [2.19, 2.23, 2.84], 'MATH-500': [2.13, 2.14, 2.85], 'HumanEval': [1.93, 1.98, 2.67], 'MBPP': [1.96, 2.04, 2.78], 'MT-Bench': [1.74, 1.67, 2.27]},
           '32': {'GSM8K': [1.04, 1.13, 1.45], 'MATH-500': [0.94, 0.95, 1.30], 'HumanEval': [0.84, 0.86, 1.16], 'MBPP': [0.87, 0.90, 1.25], 'MT-Bench': [0.77, 0.74, 1.01]}}
n = 0
for k, rows in T.items():
    for task, r in rows.items():
        for j in range(3):
            close(r[j + 1] / r[0], PRINTED[k][task][j], 0.006); n += 1
print('speed-ups recomputed from throughput:', n, 'of 45 match the printed ones')
d32 = [T['32'][t][3] / T['32'][t][0] for t in T['32']]; m32 = [T['32'][t][1] / T['32'][t][0] for t in T['32']]
print('concurrency 32: DFlash 2 %.2f to %.2fx, MTP %.2f to %.2fx' % (min(d32), max(d32), min(m32), max(m32)))
ACC = {'GSM8K': [5.02, 4.36, 5.46]}
AR = 1000 / 68.9; MTP = 1000 * 5.02 / 178.5; DSP = 1000 * 4.36 / 185.3; D2 = 1000 * 5.46 / 236.1
print('time per verification, GSM8K, one request (ms): plain %.2f, MTP %.2f, DSpark %.2f, DFlash 2 %.2f' % (AR, MTP, DSP, D2))
print('draft cost assuming a verification costs one plain step (ms): MTP %.2f, DSpark %.2f, DFlash 2 %.2f, DFlash (assumed 1%% cheaper) %.2f' % (MTP - AR, DSP - AR, D2 - AR, (D2 - AR) / 1.01))
cyc = {'plain': 16 * AR, 'one at a time': 3 * MTP, 'DFlash': 4 * (AR + (D2 - AR) / 1.01), 'DFlash 2': 3 * D2}
print('animation totals for 16 tokens (ms):', {k: round(v, 1) for k, v in cyc.items()})
for L in ([6, 4, 6], [3, 5, 4, 4], [6, 5, 5]): assert sum(L) == 16

print('\n== Parameters and bytes (Hugging Face API, src/inputs/hf_meta.json)')
M = json.load(open('inputs/hf_meta.json'))['models']
BY = {'BF16': 2, 'F32': 4, 'F8_E4M3': 1, 'U8': 1, 'I8': 1, 'I64': 8, 'F8_E8M0': 1}
def stored(i): return sum(v * BY[k] for k, v in M[i]['safetensors']['parameters'].items()) / 1e9
glm = stored('zai-org/GLM-5.3-Flash'); print('GLM-5.3-Flash: %.2f GB = %.1f GiB (MarkTechPost: about 306 GiB)' % (glm, glm * 1e9 / 2**30)); close(glm * 1e9 / 2**30, 306, 1)
q = M['Qwen/Qwen3.8-Flash-Next']['safetensors']['total'] / 1e9; print('Qwen3.8-Flash-Next: %.2fB stored = 125 + 51 + 4; %.1f GB' % (q, stored('Qwen/Qwen3.8-Flash-Next'))); close(q, 125 + 51 + 4, 0.01)
hy = stored('tencent/Hy4-preview'); print('Hy4 preview: %.2f GB (issue: roughly 1.56TB); repository %.2f GB' % (hy, M['tencent/Hy4-preview']['usedStorage'] / 1e9)); close(hy, 1560, 1)
print('Cohere Parse 5: 2.3B x 2 bytes = 4.6 GB (Cohere docs: ~4.6 GB)')
print('Apodex 1.1 Mini: %.1f GB; DFlash 2 drafter: %.2f GB' % (stored('apodex/Apodex-1.1-mini'), stored('incoai/Qwen3.8-27B-DFlash2')))
ds = M['deepseek-ai/DeepSeek-V4-Pro-0813']['safetensors']['total'] / 1e9
print('DeepSeek-V4-Pro-0813 at 4.5 bits: %.0f GB, against %.1f GB for the NVFP4 repository' % (ds * 4.5 / 8, M['nvidia/DeepSeek-V4-Pro-0813-NVFP4']['usedStorage'] / 1e9))
print('active shares: GLM %.1f%%, Qwen %.1f%% (of 125) or %.1f%% (of 180), Hy4 %.1f%%, DeepSeek %.1f%%' % (100 * 18 / 320, 100 * 6 / 125, 100 * 6 / 180, 100 * 49 / 770, 100 * 49 / 1600))
print('Qwen headline against stored: +%.0f%%' % (100 * (180 / 125 - 1)))
for k in ['nvidia/DeepSeek-V4-Pro-NVFP4', 'nvidia/DeepSeek-V4-Pro-0813-NVFP4', 'deepseek-ai/DeepSeek-V4-Pro-0813', 'nvidia/GLM-5.3-Flash-NVFP4', 'nvidia/Qwen3.8-Flash-Next-NVFP4']:
    print('  created', M[k]['createdAt'][:10], k)
print('days from original to NVFP4 build: 0813 %d, GLM %d, Qwen %d' % ((D('2026-08-27') - D('2026-08-13')).days, (D('2026-09-02') - D('2026-08-25')).days, (D('2026-09-02') - D('2026-08-24')).days))

print('\n== WikiSkill Table 1: averages recomputed')
W = {'Qwen-3.5-4B': {'No skill': [29.1, 32.5, 14.6, 30.2, 24.4, 26.2], 'Trace2Skill': [31.5, 37.6, 17.5, 31.0, 42.8, 32.1], 'EvoSkill': [41.7, 37.3, 18.6, 29.5, 41.5, 33.7], 'SkillOpt': [48.7, 33.3, 14.0, 34.5, 45.3, 35.2], 'WikiSkill': [49.7, 39.4, 21.1, 28.5, 53.7, 38.5]},
     'Qwen-3.5-9B': {'No skill': [28.2, 26.3, 24.3, 35.9, 34.7, 29.9], 'Trace2Skill': [33.1, 36.9, 26.5, 38.4, 48.8, 36.7], 'EvoSkill': [58.1, 34.5, 35.4, 34.9, 48.5, 42.3], 'SkillOpt': [48.7, 29.4, 29.0, 38.0, 55.7, 40.2], 'WikiSkill': [56.3, 43.1, 33.6, 40.5, 63.4, 47.4]},
     'Qwen-3.6-27B': {'No skill': [33.9, 27.5, 40.8, 42.1, 52.8, 39.4], 'Trace2Skill': [36.3, 37.3, 53.3, 54.3, 55.5, 47.3], 'EvoSkill': [57.3, 32.9, 59.5, 52.5, 64.2, 53.3], 'SkillOpt': [51.9, 34.5, 53.2, 54.8, 59.2, 50.7], 'WikiSkill': [61.9, 41.6, 81.7, 53.7, 77.6, 63.3]},
     'Gemma-4-31B': {'No skill': [33.9, 30.6, 48.3, 43.3, 50.4, 41.3], 'Trace2Skill': [32.3, 37.7, 58.5, 43.2, 57.2, 45.8], 'EvoSkill': [29.8, 38.4, 56.4, 39.9, 52.6, 43.4], 'SkillOpt': [40.1, 36.1, 63.1, 44.4, 61.9, 49.1], 'WikiSkill': [56.7, 41.2, 68.0, 44.2, 64.4, 54.9]},
     'Gemini-3.5-Flash': {'No skill': [33.0, 29.4, 50.5, 48.6, 85.9, 49.5], 'Trace2Skill': [41.9, 44.3, 56.0, 50.0, 85.9, 55.6], 'EvoSkill': [44.6, 43.6, 55.4, 51.2, 85.9, 56.1], 'SkillOpt': [49.7, 28.2, 66.1, 49.8, 85.9, 55.9], 'WikiSkill': [72.6, 44.7, 76.6, 60.7, 85.9, 68.1]}}
n = 0
for m, rows in W.items():
    for meth, r in rows.items():
        close(sum(r[:5]) / 5, r[5], 0.051); n += 1
print('averages matching their five columns:', n, 'of 25')
worse = [(m, j) for m in W for j in range(5) if W[m]['WikiSkill'][j] < W[m]['No skill'][j]]; print('WikiSkill below no skill:', worse)
print('Qwen-3.5-9B + WikiSkill %.1f > Gemma-4-31B no skill %.1f; Qwen-3.6-27B + WikiSkill %.1f > Gemini no skill %.1f' % (W['Qwen-3.5-9B']['WikiSkill'][5], W['Gemma-4-31B']['No skill'][5], W['Qwen-3.6-27B']['WikiSkill'][5], W['Gemini-3.5-Flash']['No skill'][5]))

print('\n== AI traffic (Brainlabs)')
O0, O1, gain = 140.1, 125.4, 0.8
close((O1 / O0 - 1) * 100, -10.5, 0.05); print('organic: %.1f%%, lost %.1f million' % ((O1 / O0 - 1) * 100, O0 - O1))
A0 = gain / 1.63; A1 = A0 + gain; print('AI sessions: before %.3f, after %.3f million; offset %.1f%% of organic loss ("around 5%%")' % (A0, A1, 100 * gain / (O0 - O1)))
ke = 0.134 * (A0 + A1); K0 = ke / 5.35; K1 = ke - K0; lost = (O0 - O1) * 0.104
print('AI key events: before %.4f, after %.4f million (x%.2f); organic key events lost at 10.4%%: %.3f million; AI offset %.1f%%' % (K0, K1, K1 / K0, lost, 100 * (K1 - K0) / lost))
print('implied AI key-event rates: before %.1f%%, after %.1f%%' % (100 * K0 / A0, 100 * K1 / A1))

print('\n== MCP animation counters (scenario)')
old = [1, 1, 1, 1, 0, 1, 2, 1, 1, 0]; new = [1, 1, 1, 0, 1, 1, 1, 0]
print('round trips: with sessions', sum(old), '(4 handshake), without', sum(new)); assert sum(old) == 9 and sum(new) == 6
