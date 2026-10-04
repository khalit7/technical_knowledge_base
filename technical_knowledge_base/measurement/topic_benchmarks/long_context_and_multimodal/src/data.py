"""Published tables transcribed from the extracts in inputs/ (each value checked by eye against the extract).
Imported by recompute.py (checks) and mk_data.py (writes parts/11_js_data.js)."""

# RULER, arXiv 2404.06654v3 Table 3: claimed, published effective, scores at 4K..128K (average of 13 tasks)
RULER_LENS = [4, 8, 16, 32, 64, 128]  # K tokens
RULER = [
 ["Gemini-1.5-Pro", "1M", ">128K", [96.7, 95.8, 96.0, 95.9, 95.9, 94.4]],
 ["GPT-4", "128K", "64K", [96.6, 96.3, 95.2, 93.2, 87.0, 81.2]],
 ["Llama3.1 (70B)", "128K", "64K", [96.5, 95.8, 95.4, 94.8, 88.4, 66.6]],
 ["Qwen2 (72B)", "128K", "32K", [96.9, 96.1, 94.9, 94.1, 79.8, 53.7]],
 ["Command-R-plus (104B)", "128K", "32K", [95.6, 95.2, 94.2, 92.0, 84.3, 63.1]],
 ["GLM4 (9B)", "1M", "64K", [94.7, 92.8, 92.1, 89.9, 86.7, 83.1]],
 ["Llama3.1 (8B)", "128K", "32K", [95.5, 93.8, 91.6, 87.4, 84.7, 77.0]],
 ["GradientAI/Llama3 (70B)", "1M", "16K", [95.1, 94.4, 90.8, 85.4, 80.9, 72.1]],
 ["Mixtral-8x22B", "64K", "32K", [95.6, 94.9, 93.4, 90.9, 84.7, 31.7]],
 ["Yi (34B)", "200K", "32K", [93.3, 92.2, 91.3, 87.5, 83.2, 77.3]],
 ["Phi3-medium (14B)", "128K", "32K", [93.3, 93.2, 91.1, 86.8, 78.6, 46.1]],
 ["Mistral-v0.2 (7B)", "32K", "16K", [93.6, 91.2, 87.2, 75.4, 49.0, 13.8]],
 ["LWM (7B)", "1M", "<4K", [82.3, 78.4, 73.7, 69.1, 68.1, 65.0]],
 ["DBRX (36B/132B)", "32K", "8K", [95.1, 93.8, 83.6, 63.1, 2.4, 0.0]],
 ["Together (7B)", "32K", "4K", [88.2, 81.1, 69.4, 63.0, 0.0, 0.0]],
 ["LongChat (7B)", "32K", "<4K", [84.7, 79.9, 70.8, 59.3, 0.0, 0.0]],
 ["LongAlpaca (13B)", "32K", "<4K", [60.6, 57.0, 56.6, 43.6, 0.0, 0.0]],
]
RULER_THR = 85.6  # Llama2-7B at 4K

# NoLiMa, arXiv 2502.05167v3 Table 3 (1K..32K, 26 placements) and Table 10 (adds 64K, 128K with 11 placements)
NOLIMA_LENS = [1, 2, 4, 8, 16, 32, 64, 128]
N = None
NOLIMA = [  # name, claimed, published effective, base, scores, table
 ["GPT-4.1", "1M", "16K", 97.0, [95.6, 95.2, 91.7, 87.5, 84.9, 79.8, 69.7, 64.7], "T10"],
 ["GPT-4o", "128K", "8K", 99.3, [98.1, 98.0, 95.7, 89.2, 81.6, 69.7, 62.4, 56.0], "T3+T10"],
 ["Llama 3.3 70B", "128K", "2K", 97.3, [94.2, 87.4, 81.5, 72.1, 59.5, 42.7, N, N], "T3"],
 ["Llama 3.1 405B", "128K", "2K", 94.7, [89.0, 85.0, 74.5, 60.1, 48.4, 38.0, N, N], "T3"],
 ["Llama 3.1 70B", "128K", "2K", 94.5, [91.0, 81.8, 71.2, 62.7, 51.8, 43.2, N, N], "T3"],
 ["Gemini 2.5 Flash (no thinking)", "1M", "2K", 94.4, [90.1, 86.1, 79.4, 68.2, 57.9, 48.4, N, N], "T10"],
 ["Gemini 1.5 Pro", "2M", "2K", 92.6, [86.4, 82.7, 75.4, 63.9, 55.5, 48.2, N, N], "T3"],
 ["Jamba 1.5 Mini", "256K", "1K", 92.4, [76.3, 74.1, 70.8, 62.2, 52.7, 43.6, N, N], "T3"],
 ["Command R+", "128K", "1K", 90.9, [77.0, 73.5, 66.2, 39.5, 21.3, 7.4, N, N], "T3"],
 ["Llama 4 Maverick", "1M", "2K", 90.1, [81.6, 78.3, 68.8, 49.0, 34.3, 24.5, N, N], "T10"],
 ["Gemini 2.0 Flash", "1M", "4K", 89.4, [87.7, 87.5, 77.9, 64.7, 48.2, 41.0, 33.0, 16.4], "T3+T10"],
 ["Gemma 3 27B", "128K", "1K", 88.6, [73.3, 65.6, 48.1, 32.7, 20.2, 9.5, N, N], "T10"],
 ["Mistral Large 2", "128K", "2K", 87.9, [86.1, 85.5, 73.3, 51.4, 32.6, 18.8, N, N], "T3"],
 ["Claude 3.5 Sonnet", "200K", "4K", 87.5, [85.4, 84.0, 77.6, 61.7, 45.7, 29.8, N, N], "T3"],
 ["Gemma 3 12B", "128K", "1K", 87.4, [74.7, 61.8, 39.9, 27.4, 16.8, 7.3, N, N], "T10"],
 ["GPT-4o mini", "128K", "1K", 84.8, [67.7, 58.2, 44.2, 32.6, 20.6, 13.7, N, N], "T3"],
 ["Gemini 1.5 Flash", "1M", "1K", 84.7, [68.6, 61.6, 51.0, 44.4, 35.5, 28.6, N, N], "T3"],
 ["Llama 4 Scout", "10M", "1K", 81.7, [72.3, 61.8, 50.8, 35.5, 26.9, 21.6, N, N], "T10"],
 ["GPT-4.1 Mini", "1M", "1K", 80.9, [66.7, 62.8, 58.7, 51.9, 46.2, 38.8, N, N], "T10"],
 ["GPT-4.1 Nano", "1M", "1K", 80.7, [60.8, 48.2, 36.7, 28.8, 19.5, 9.4, N, N], "T10"],
 ["Llama 3.1 8B", "128K", "1K", 76.7, [65.7, 54.4, 44.1, 31.9, 22.6, 14.2, N, N], "T3"],
 ["Gemma 3 4B", "128K", "1K", 73.6, [50.3, 35.3, 16.4, 7.5, 2.3, 0.9, N, N], "T10"],
]
NOLIMA_T3 = ["GPT-4o", "Llama 3.3 70B", "Llama 3.1 405B", "Llama 3.1 70B", "Gemini 1.5 Pro", "Jamba 1.5 Mini", "Command R+",
             "Gemini 2.0 Flash", "Mistral Large 2", "Claude 3.5 Sonnet", "Gemini 1.5 Flash", "GPT-4o mini", "Llama 3.1 8B"]
# Table 6, Llama 3.3 70B at 8K, 16K, 32K
NOLIMA_T6 = {"Direct": [98.3, 98.5, 98.5], "One-hop": [84.1, 73.2, 56.2], "One-hop, with literal match (MC)": [98.7, 97.4, 93.1],
             "Two-hop": [57.4, 42.7, 25.9], "Two-hop, with literal match (MC)": [96.3, 94.6, 87.2]}
# Table 1, ROUGE precision of question tokens in the relevant context (R-1, R-2, R-L)
NOLIMA_T1 = [["InfiniteBench QA", 0.966, 0.545, 0.960], ["InfiniteBench MC", 0.946, 0.506, 0.932], ["RULER QA", 0.809, 0.437, 0.693],
             ["HELMET (RAG)", 0.689, 0.304, 0.555], ["Vanilla NIAH", 0.905, 0.789, 0.855], ["RULER S-NIAH", 0.571, 0.461, 0.500],
             ["BABILong (0K)", 0.553, 0.238, 0.522], ["NoLiMa", 0.069, 0.002, 0.067]]

# Needles and questions quoted from their sources
PAIRS = {
 "niah": {"needle": "The best thing to do in San Francisco is eat a sandwich and sit in Dolores Park on a sunny day.",
          "q": "What is the most fun thing to do in San Francisco?", "src": "Kamradt 2023, as quoted by Anthropic (6 Dec 2023)"},
 "direct": {"needle": "Actually, Yuki lives next to the Semper Opera House.",
            "q": "Which character lives next to the Semper Opera House?", "src": "NoLiMa needle; Direct question worded here from the paper's definition (illustrative)"},
 "one": {"needle": "Actually, Yuki lives next to the Semper Opera House.", "q": "Which character has been to Dresden?", "src": "NoLiMa v3, Section 3"},
 "two": {"needle": "Actually, Yuki lives next to the Semper Opera House.", "q": "Which character has been to the state of Saxony?", "src": "NoLiMa v3, Section 3"},
}

# Lost in the Middle, arXiv 2307.03172v3 Table 6 (20 documents; gold at index 0, 4, 9, 14, 19) and Table 1 (closed-book, oracle)
LITM_POS = [1, 5, 10, 15, 20]
LITM = [
 ["GPT-3.5-Turbo", [75.8, 57.2, 53.8, 55.4, 63.2], 56.1, 88.3],
 ["GPT-3.5-Turbo (16K)", [75.7, 57.3, 54.1, 55.4, 63.1], 56.0, 88.6],
 ["Claude-1.3", [59.9, 55.9, 56.8, 57.2, 60.1], 48.3, 76.1],
 ["Claude-1.3 (100K)", [59.8, 55.9, 57.0, 57.4, 60.0], 48.2, 76.4],
 ["MPT-30B-Instruct", [53.7, 51.8, 52.2, 52.7, 56.3], 31.5, 81.9],
 ["LongChat-13B (16K)", [68.6, 57.4, 55.3, 52.5, 55.0], 35.0, 83.4],
]

# MMStar, arXiv 2403.20330v2 Table 3, MMMU-Val column: LLM base text-only, LVLM without image, LVLM with image
MMSTAR = {"random": 22.1,
 "GPT-4V": {"llm": ["GPT4-Turbo", 41.2], "blind": 45.1, "full": 53.6},
 "GeminiPro-Vision": {"llm": ["GeminiPro", 42.9], "blind": 39.4, "full": 44.4}}
# MMMU arXiv 2311.16502v4 Table 2 (validation)
MMMU_T2 = {"random": 22.1, "frequent": 26.8, "expert_low": 76.2, "expert_med": 82.6, "expert_best": 88.6, "gpt4v": 56.8, "gpt4_text": 34.9}
# MMMU-Pro arXiv 2409.02813v3 Table 1: standard 4 options, standard 10 options, vision, MMMU val, printed deltas
MMMUPRO = [
 ["Random choice", 24.9, 12.8, 12.4, 22.1, -9.3, -9.7],
 ["Frequent choice", 27.8, 12.1, 12.1, 26.8, -14.7, -14.7],
 ["Human expert (low)", 75.4, 73.0, 73.0, 76.2, -3.2, -3.2],
 ["Human expert (medium)", 82.1, 80.8, 80.8, 82.6, -1.8, -1.8],
 ["Human expert (high)", 88.6, 85.4, 85.4, 88.6, -3.2, -3.2],
 ["GPT-4o (0513)", 64.7, 54.0, 49.7, 69.1, -15.1, -19.4],
 ["Claude 3.5 Sonnet", 63.7, 55.0, 48.0, 68.3, -13.3, -20.3],
 ["Gemini 1.5 Pro (0801)", 60.6, 49.4, 44.4, 65.8, -16.4, -21.4],
 ["Gemini 1.5 Pro (0523)", 57.6, 46.5, 40.5, 62.2, -15.7, -21.7],
 ["GPT-4o mini", 55.3, 39.9, 35.2, 59.4, -19.5, -24.2],
 ["Qwen2-VL-72B", 59.3, 49.2, 43.3, 64.5, -15.3, -21.2],
 ["InternVL2-Llama3-76B", 55.0, 41.9, 38.0, 58.3, -16.4, -20.3],
 ["LLaVA-OneVision-72B", 52.3, 38.0, 24.0, 56.8, -18.8, -32.8],
 ["VILA-1.5-40B", 46.8, 35.9, 14.1, 51.9, -16.0, -37.8],
 ["Pixtral-12B", 47.5, 33.4, 25.0, 52.5, -19.1, -27.5],
 ["Phi-3.5-Vision", 37.8, 26.3, 13.1, 43.0, -16.7, -29.9],
]

# Sizes for binomial half-widths (item counts from the papers / cards)
SIZES = [["LongBench v2", 503, 63.3], ["AA-LCR", 100, 88.7], ["GDP.pdf (tasks)", 100, 34.2], ["MMMU validation", 900, 85.4],
         ["MMMU-Pro (per setting)", 1730, 86.9], ["MathVista testmini", 1000, 85.2], ["Video-MME", 2700, 89.2], ["Video-MMMU", 900, 88.0]]

# Function words ignored when counting content words shared by question and needle (our measure, stated on the page)
STOP = ["a", "an", "the", "is", "are", "was", "to", "of", "in", "on", "and", "or", "what", "which", "who", "has", "have", "been", "do", "does", "most", "best", "next", "actually"]
