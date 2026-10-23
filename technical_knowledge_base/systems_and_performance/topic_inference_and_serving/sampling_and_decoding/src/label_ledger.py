"""Labels for src/ledger.json (2026-10-23 rebuild). Run once after ledger.py init: python3 src/label_ledger.py"""
import json, pathlib
p = pathlib.Path(__file__).with_name('ledger.json')
U = json.loads(p.read_text())
SPEC = 'systems_and_performance/topic_inference_and_serving/speculative_decoding'
GDM = 'models_and_training/topic_llm_landscape/google_deepmind_gemini_and_gemma'
NEWS = 'reference/tech_news/2026_08_24_tech_news'
L = {  # id: (label, key, note)
 1: ('fat', '', 'header blurb rewritten'), 2: ('core', 'Every distribution on this page is real', ''),
 3: ('fat', '', 'parent link and date in the new header'), 4: ('fat', '', 'old reading-time line'),
 5: ('fat', '', 'wind-up; the core sentence carries it'), 6: ('core', 'a separate rule, the decoder', ''),
 7: ('core', 'writes loops, sensible prose, noise or valid JSON', ''), 8: ('fat', '', 'table of contents in prose'),
 9: ('fat', '', 'where-this-sits note; the header links the parent'), 10: ('core', 'rejection sampling', ''),
 11: ('core', 'Numbers are published, with the source linked', ''), 12: ('core', '50,257', ''),
 13: ('core', 'only differences between logits matter', ''), 14: ('core', 'Decoders fall into two families', ''),
 15: ('core', 'looks for a high-probability sequence', ''), 16: ('core', 'draws at random from a reshaped distribution', ''),
 17: ('core', 'Constraints sit before either', ''), 18: ('core', 'takes the argmax token at every step', ''),
 19: ('core', 'locally optimal', ''), 20: ('core', 'fine only for short factual answers', ''),
 21: ('core', 'highest-probability partial sequences', ''), 22: ('core', 'machine translation and summarisation', ''),
 23: ('core', 'chat LLMs essentially do not use it', ''), 24: ('core', 'Three Men in a Boat', ''), 25: ('core', '(1889)', ''),
 26: ('core', "every score is the model's own log-probability", ''), 27: ('core', 'step to 4 in beam mode', ''),
 28: ('core', 'was very', ''), 29: ('core', '6.7 times more probable', ''), 30: ('core', 'More probable is not better', ''),
 31: ('core', 'Run both for 80 tokens', ''), 32: ('core', 'bland and strangely repetitive', ''), 33: ('core', '73.66%', ''),
 34: ('core', 'reruns that comparison on twelve decoders', ''), 35: ('core', 'Greedy is deterministic for a fixed computation', ''),
 36: ('core', 'reduction order', ''), 37: ('core', '80 different completions', ''), 38: ('core', 'never guaranteed identical outputs', ''),
 39: ('core', '22.73', ''), 40: ('core', 'temperature, then truncation, then renormalise, then sample', ''),
 41: ('core', 'Temperature T divides the logits', ''), 42: ('core', 'sharpens towards greedy', ''), 43: ('core', 'T 0.6 to 1.0', ''),
 44: ('core', 'k = 10 for stories', ''), 45: ('core', 'A fixed k ignores the shape', ''), 46: ('core', 'on a sharp step it lets junk in', ''),
 47: ('core', 'Eq. 2', ''), 48: ('core', 'V(p)', ''), 49: ('core', 'long-time default', ''), 50: ('core', '0.05 to 0.1', ''),
 51: ('core', 'confident steps become near-greedy', ''), 52: ('core', 'enables it by default', ''), 53: ('core', 'Disputed', ''),
 54: ('core', 'the method min-p was proposed to replace', ''), 55: ('core', '"Canberra" 96%', ''),
 56: ('core', 'the last row is every other token together', ''), 57: ('core', 'probability before the cut', ''),
 58: ('core', '6,099', ''), 59: ('core', '5,166', ''), 60: ('core', 'falls from 96% to 59%', ''), 61: ('core', '35,700', ''),
 62: ('core', 'whole argument for min-p', ''), 63: ('core', 'GPQA, GSM8K and AlpacaEval', ''),
 64: ('core', 'min-p did not outperform baselines', ''), 65: ('core', 'The mechanism above is not in dispute', ''),
 66: ('core', 'measured on text', ''), 67: ('core', 'temperature, top-k, top-p, min-p, typical', ''),
 68: ('core', 'keeps 14 tokens with temperature last and 34', ''), 69: ('core', 'has the switch', ''),
 70: ('core', '≈ 1.2 a good balance', ''), 71: ('core', 'around 0.1 to 1', ''), 72: ('core', 'language mixing', ''),
 73: ('core', 'no_repeat_ngram_size', ''), 74: ('core', 'cannot tell a loop from a correct repeat', ''),
 75: ('core', 'red, blue, red, blue, red,', ''), 76: ('fat', '', 'pointer to the lab; the figure now shows it'),
 77: ('depth', 'Most are niche', ''), 78: ('depth', 'entropy-relative', ''), 79: ('core', 'trades diversity for staying', ''),
 80: ('core', '16 times per decoder', ''), 81: ('core', "53% of greedy's 4-grams", ''), 82: ('core', '31.6 against 31.0', ''),
 83: ('core', '16.1 at T 1.5, 40.0 at T 2', ''), 84: ('core', 'Qwen3 non-thinking T 0.7', ''), 85: ('core', 'pass@100 is 0.8', ''),
 86: ('volatile', 'refuse them', 'kept in the dated Updated box: it decides which knobs a reader can use'),
 87: ('volatile', 'returns a 400 error', 'kept, dated box'), 88: ('volatile', 'GPT-6 Astra', 'kept, dated box'),
 89: ('core', 'open models you serve yourself', ''), 90: ('core', 'compiles the constraint to an automaton', ''),
 91: ('core', '{"name": string, "age": integer}', ''), 92: ('core', 'a made-up person', ''),
 93: ('depth', 'whitespace capped at two characters', ''), 94: ('core', 'A tick marks tokens the grammar allows', ''),
 95: ('core', 'step 0 in both modes', ''), 96: ('core', 'puts 57% on', ''), 97: ('core', '0.0004%', ''),
 98: ('core', 'one-space indentation', ''), 99: ('core', 'transitions between the states of a finite-state machine', ''),
 100: ('core', 'popularised near-zero-overhead', ''), 101: ('core', 'pushdown automaton', ''), 102: ('core', '1134 out of 128k', ''),
 103: ('core', 'under 40 µs per token', ''), 104: ('core', 'tries XGrammar first and falls back to llguidance', ''),
 105: ('core', 'this mechanism plus training', ''), 106: ('core', 'better understand complicated schemas', ''),
 107: ('core', 'JSON mode guarantees valid JSON', ''), 108: ('core', 'Grammar-constrained tool-call parsing', ''),
 109: ('core', 'It guarantees the format, not the content', ''), 110: ('core', 'conditioned on text it would not have written', ''),
 111: ('core', 'Schema design', ''), 112: ('core', 'GSM8K 0.78 against 0.77', ''),
 113: ('core', 'Whitespace and token boundaries are the classic bugs', ''), 114: ('core', 'emit spaces forever', ''),
 115: ('core', 'Wang et al., 2022', ''), 116: ('core', 'reward-hacking amplifier', ''), 117: ('core', 'pass@k, voting and best-of-n', ''),
 118: ('core', 'Medusa and EAGLE', ''), 119: ('owned:' + SPEC, 'min(1, p(x)/q(x))', 'acceptance rule taught on the owner'),
 120: ('core', "exactly the target's", ''), 121: ('owned:' + SPEC, 'tokens per target pass', 'formula on the owner; the 3.4 at alpha 0.8, gamma 4 example dropped'),
 122: ('core', 'the batch size where it stops paying', ''), 123: ('core', 'Test-time compute scaling', ''), 124: ('core', 'decoding-side half', ''),
 125: ('fat', '', 'common mistake restating section 1 (80 completions)'), 126: ('fat', '', 'restates the predict block and section 2'),
 127: ('fat', '', 'restates section 2 order'), 128: ('fat', '', 'restates section 1'), 129: ('fat', '', 'restates sections 4 and 5'),
 130: ('core', '32 real next-token distributions', ''), 131: ('core', 'Draw 200', ''), 132: ('fat', '', 'control labels'),
 133: ('core', 'an orange border marks a token already in the context', ''), 134: ('core', 'including the chat template and system prompt', ''),
 135: ('core', 'within 1%', ''), 136: ('core', 'Penalties are not applied to tokens beyond the top 60', ''), 137: ('core', 'Sharp against flat', ''),
 138: ('core', 'Cat, position 3', ''), 139: ('core', 'keeps 39 tokens', ''), 140: ('core', 'Top-p and min-p adapt', ''),
 141: ('core', '58,000 to 77,000', ''), 142: ('core', 'flip the order', ''), 143: ('core', 'Penalties hurt correct repeats', ''),
 144: ('core', 'Pattern, position 7', ''), 145: ('core', '99.9% to 73.6%', ''), 146: ('core', '99.7%', ''),
 147: ('depth', 'four of the five uncertain steps', ''), 148: ('core', 'float32 on CPU', ''), 149: ('core', 'Sampler rules follow', ''),
 150: ('core', 'Chat rule of thumb', ''), 151: ('fat', '', 'tab lead question; section 3 lead carries it'), 152: ('core', 'Holtzman et al.', ''),
 153: ('fat', '', 'sentence fragment'), 154: ('core', 'GPT-2 small (124M)', ''), 155: ('core', 'human reference', ''),
 156: ('core', 'distinct-2 over the 16 samples', ''), 157: ('depth', 'same random seed', ''), 158: ('depth', 'newlines are shown as', ''),
 159: ('depth', 'slurs, sexual and violent words', ''), 160: ('depth', "Em-dashes in Jerome's text were replaced", ''),
 161: ('depth', 'make_data.py degen', ''), 162: ('core', 'Links open in a new tab', ''), 163: ('core', 'in either sampler order', ''),
 164: ('fat', '', 'card for the removed Twelve decoders tab'), 165: ('core', 'one request through a serving engine', ''),
 166: ('core', 'Speculative decoding: draft models', ''), 167: ('core', 'Batching, KV cache and scheduling in depth', ''),
 168: ('core', 'structured-output mask run', ''), 169: ('core', 'Topic: llm-training-and-post-training', ''),
 170: ('core', 'Deeper: test-time compute', ''), 171: ('core', 'amplifier of reward-model errors', ''),
 172: ('core', 'rejection sampling for SFT', ''), 173: ('core', 'Why token boundaries make grammar masks hard', ''),
 174: ('owned:' + GDM, 'Table 4', 'speculative decoding calculator lives on the DeepMind page; card kept in Further reading'),
 175: ('owned:' + NEWS, 'autoregressive decoding writes one token per pass', 'animation lives on the news issue; card kept'),
 176: ('core', 'DiffusionGemma', ''), 177: ('core', 'length penalty 0.6', ''), 178: ('core', 'Chip Huyen', ''),
 179: ('core', 'ICLR 2025 oral', ''), 180: ('core', 'Min-p, Max Exaggeration', ''), 181: ('core', 'The Curious Case of Neural Text Degeneration', ''),
 182: ('core', 'the nucleus-sampling paper', ''), 183: ('core', 'XGrammar paper', ''), 184: ('core', 'Efficient Guided Generation', ''),
 185: ('core', 'Defeating Nondeterminism', ''), 186: ('core', 'Fast Inference from Transformers', ''), 187: ('core', 'Source of this page', ''),
}
for u in U:
    if u['id'] in L:
        u['label'], u['key'], note = L[u['id']]
        if note: u['note'] = note
# units added by hand: the long-tail table rows and script-rendered content
extra = [
 ('read', 'stochastic sampling', 'Mirostat keeps the text surprise near a target, tau 5 in llama.cpp', 'depth', 'Basu et al., 2020'),
 ('read', 'stochastic sampling', 'Top-a: threshold proportional to the square of the top probability; origin unconfirmed', 'depth', 'square of the top probability'),
 ('read', 'stochastic sampling', 'XTC removes the most likely tokens to break cliches (PR 6335)', 'depth', 'PR 6335'),
 ('read', 'stochastic sampling', 'DRY penalises extending a repeated sequence, base 1.75, allowed length 2', 'depth', 'base 1.75'),
 ('read', 'settings', 'Qwen3 thinking: DO NOT use greedy decoding', 'core', 'DO NOT use greedy decoding'),
 ('read', 'settings', 'DeepSeek-R1 pass@1 is the mean over 64 samples at T 0.6, top-p 0.95', 'core', 'mean over 64 samples'),
 ('read', 'settings', 'DeepSeek-R1: T 0.5 to 0.7, 0.6 recommended', 'core', '0.6 recommended'),
 ('read', 'structured', 'llguidance: Earley parser over regex-derivative lexer, about 50 us per token, shipped in OpenAI for JSON Schema', 'core', 'LLGuidance shipped in OpenAI for JSON Schema'),
 ('read', 'structured', 'XGrammar is the default in SGLang, TensorRT-LLM and MLC-LLM', 'core', 'TensorRT-LLM and MLC-LLM'),
 ('read', 'structured', 'OpenAI: schema converted to a context-free grammar; 100% against under 40% for gpt-4-0613', 'core', 'gpt-4-0613'),
 ('deg', 'twelve decoders (script-rendered table and repro note)', 'greedy 2.26, beam 2.37 against human 31.0; theirs 1.50, 1.48, 12.38', 'core', 'greedy 2.26, beam 2.37'),
 ('read', 'beam animation (script captions)', 'Beam search collapses to one prefix; greedy path dropped at step 4', 'core', 'scores below three other branches'),
]
n = max(u['id'] for u in U)
if not any(u.get('key') == 'Basu et al., 2020' for u in U):
    for tab, sec, text, lab, key in extra:
        n += 1; U.append({'id': n, 'tab': 't-' + tab, 'section': sec, 'text': text, 'label': lab, 'key': key, 'where': ''})
p.write_text(json.dumps(U, indent=1, ensure_ascii=False) + '\n')
print(len(U), 'units')
