"""Published tables and readings used on the page, transcribed from the excerpts in inputs/excerpts/ (and, for readings
shared with the parent root, from ../../src/data/*.json). Each block names its source. Read 2026-10-04."""

# MMLU-Redux (arXiv 2406.04127v3) Table 2: exact match on all MMLU-Redux instances (as per HELM) and on correct
# instances only, with each model's rank among all HELM models in parentheses. Order: (all, rank_all, correct, rank_correct).
REDUX_T2_SUBJECTS = ['Virology', 'Logical Fallacies', 'College Chemistry', 'Professional Law', 'Human Sexuality']
REDUX_T2 = {
    'Claude 3.5 Sonnet (20240620)':   [(0.60, 1, 0.91, 5), (0.93, 1, 0.96, 5), (0.59, 9, 0.73, 4), (0.75, 1, 0.77, 1), (0.94, 1, 0.98, 1)],
    'Claude 3 Opus (20240229)':       [(0.58, 12, 0.88, 8), (0.90, 4, 0.96, 5), (0.60, 5, 0.72, 5), (0.72, 4, 0.72, 3), (0.91, 5, 0.96, 2)],
    'Llama 3.1 Instruct Turbo (405B)': [(0.57, 16, 0.93, 1), (0.92, 2, 0.96, 5), (0.60, 5, 0.76, 1), (0.70, 6, 0.72, 3), (0.86, 20, 0.91, 9)],
    'GPT-4o (2024-05-13)':            [(0.60, 3, 0.91, 5), (0.88, 6, 0.99, 2), (0.61, 4, 0.71, 7), (0.72, 3, 0.70, 5), (0.91, 5, 0.96, 2)],
    'Gemini 1.5 Pro (001)':           [(0.55, 28, 0.91, 5), (0.90, 4, 0.99, 2), (0.62, 2, 0.72, 5), (0.67, 9, 0.67, 7), (0.37, 55, 0.94, 6)],
    'GPT-4 (0613)':                   [(0.60, 3, 0.86, 10), (0.87, 11, 0.99, 2), (0.55, 18, 0.75, 3), (0.73, 2, 0.68, 6), (0.91, 5, 0.43, 10)],
    'Qwen2 Instruct (72B)':           [(0.56, 24, 0.88, 8), (0.91, 3, 0.96, 5), (0.65, 1, 0.68, 8), (0.66, 10, 0.74, 2), (0.89, 11, 0.94, 6)],
    'GPT-4 Turbo (2024-04-09)':       [(0.60, 1, 0.93, 1), (0.87, 11, 1.00, 1), (0.53, 22, 0.76, 1), (0.67, 8, 0.63, 9), (0.90, 9, 0.93, 8)],
    'Gemini 1.5 Pro (0409 preview)':  [(0.58, 10, 0.93, 1), (0.86, 18, 0.92, 10), (0.58, 13, 0.67, 9), (0.64, 13, 0.61, 10), (0.40, 56, 0.95, 5)],
    'Llama 3.1 Instruct Turbo (70B)': [(0.58, 12, 0.93, 1), (0.84, 27, 0.96, 5), (0.59, 9, 0.64, 10), (0.67, 7, 0.65, 8), (0.86, 20, 0.96, 2)],
}

# HLE-Verified (arXiv 2602.13964v1) Table 2, text-only HLE, avg of 5 rollouts:
# (full raw acc, full raw cal err, full verified acc, full verified cal err, subset raw acc, subset raw cal, subset verified acc, subset verified cal)
HLEV_T2 = {
    'Gemini 3 Pro':            (40.42, 56, 48.2, 49, 18.99, 74, 48.93, 45),
    'GPT-5.2 (high)':          (33.35, 45, 43.3, 36, 14.44, 63, 52.48, 28),
    'Claude Opus 4.5':         (30.00, 55, 38.8, 46, 14.20, 70, 48.16, 39),
    'Grok 4.1 fast reasoning': (19.94, 73, 29.0, 63, 8.25, 83, 43.07, 47),
    'Claude Opus 4.6':         (38.95, 40, 46.8, 32, 20.03, 59, 50.16, 27),
    'DeepSeek-V3.2':           (24.90, 56, 36.4, 46, 7.87, 70, 47.45, 28),
    'Qwen3-Max-Thinking':      (30.00, 66, 38.2, 57, 14.2, 79, 48.48, 44),
}
# The paper's prose (section 5.2) states full-set gains that differ from its own table for five models:
HLEV_PROSE_FULL = {'Gemini 3 Pro': 7.58, 'GPT-5.2 (high)': 9.95, 'Claude Opus 4.5': 8.68, 'Grok 4.1 fast reasoning': 9.26,
                   'Claude Opus 4.6': 7.75, 'DeepSeek-V3.2': 10.79, 'Qwen3-Max-Thinking': 8.92}
HLEV_SPLIT = {'verified': 668, 'revised': 1143, 'uncertain': 689}

# SimpleQA (arXiv 2411.04368v1) Table 3: correct, not attempted, incorrect, correct given attempted, F-score (%)
SQA_T3 = {
    'Claude 3 Haiku':    (5.1, 75.3, 19.6, 20.6, 8.2),
    'Claude 3 Sonnet':   (5.7, 75.0, 19.3, 22.9, 9.2),
    'Claude 3 Opus':     (23.5, 39.6, 36.9, 38.8, 29.3),
    'Claude 3.5 Sonnet': (28.9, 35.0, 36.1, 44.5, 35.0),
    'GPT-4o-mini':       (8.6, 0.9, 90.5, 8.7, 8.6),
    'GPT-4o':            (38.2, 1.0, 60.8, 38.0, 38.4),
    'o1-mini':           (8.1, 28.5, 63.4, 11.3, 9.4),
    'o1-preview':        (42.7, 9.2, 48.1, 47.0, 44.8),
}

# MMLU-Pro (arXiv 2406.01574v6) Table 3: (MMLU CoT, MMLU direct, MMLU-Pro CoT, MMLU-Pro direct)
MMLUPRO_T3 = {
    'GPT-4o': (88.7, 87.2, 72.6, 53.5),
    'GPT-4-Turbo': (86.5, 86.7, 63.7, 48.4),
    'Phi-3-medium-4k-instruct': (79.4, 78.0, 55.7, 47.5),
    'Llama-3-8B': (62.7, 66.6, 35.4, 31.5),
    'Gemma-7B': (62.4, 66.0, 33.7, 27.0),
}

# What tools add on HLE: (no tools, with tools, set, who ran it, kind, source key)
HLE_TOOLS = [
    ('Claude Opus 5.5', 64.4, 67.7, 'full HLE (2,500)', "Anthropic's harness, max effort, HLE sources blocklisted", 'lab', 'o55'),
    ('Claude Opus 5', 56.6, 63.6, 'full HLE (2,500)', "Anthropic's harness", 'lab', 'o55'),
    ('GPT-6 Astra', 59.9, 82.9, 'HLE-Diamond (1,000)', 'CAIS and Scale, reasoning high, web and code', 'maint', 'hled'),
    ('Claude Opus 5.5', 54.6, 73.9, 'HLE-Diamond (1,000)', 'CAIS and Scale, reasoning high, web and code', 'maint', 'hled'),
    ('Claude Fable 5.1', 50.7, 72.3, 'HLE-Diamond (1,000)', 'CAIS and Scale, reasoning high, web and code', 'maint', 'hled'),
    ('Gemini 3.8 Flash', 33.3, 60.6, 'HLE-Diamond (1,000)', 'CAIS and Scale, reasoning high, web and code', 'maint', 'hled'),
    ('GPT-6 Sol', 32.8, 65.0, 'HLE-Diamond (1,000)', 'CAIS and Scale, reasoning high, web and code', 'maint', 'hled'),
    ('Muse Spark 1.3', 24.6, 55.4, 'HLE-Diamond (1,000)', 'CAIS and Scale, reasoning high, web and code', 'maint', 'hled'),
    ('Grok 4', 26.9, 44.0, 'full HLE (July 2025)', "xAI's figures as quoted by FutureHouse", 'lab2', 'fh'),
]
# HLE-Diamond no-tools board (reasoning high) and its reasoning/knowledge halves (500 + 500)
HLED = [('GPT-6 Astra', 59.9, 74.2, 45.6), ('Claude Opus 5.5', 54.6, 62.4, 46.8), ('GPT-6.1 Sol', 53.2, 67.4, 39.0),
        ('Claude Fable 5.1', 50.7, 60.8, 40.6), ('Gemini 3.8 Flash', 33.3, 36.6, 30.0), ('Claude Sonnet 5.5', 33.1, 42.4, 23.8),
        ('GPT-6 Sol', 32.8, 42.2, 23.4), ('Muse Spark 1.3', 24.6, 30.0, 19.2), ('Grok 4.7', 22.8, 31.2, 14.4)]
