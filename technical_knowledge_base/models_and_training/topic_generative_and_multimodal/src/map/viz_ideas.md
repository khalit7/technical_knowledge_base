# Model map: visualisation ideas (2026-10-17)

Central question of the tab: across every model family, what can I use (licence, size, status), and how did the architecture shift over time?

## Built
1. **Filterable, sortable table with a detail panel** (score: high; the data page's main visual). Every field kept, licence verbatim, HF metadata and arXiv check per row, vendor vs secondary evidence tagged, verdicts tagged as judgement.
2. **Timeline by lane coloured by architecture family, with a year sweep** (high: "across all models, how does the family change"). Play moves a cursor year by year; dots after the cursor fade; two stacked bars give the family mix of the table's rows dated that year for generators and for understanding models. Caveat on the page: counts of curated rows, not of the field. Legend chips hide families.
3. **One prompt, six pipelines (before/after animation)** (highest: recomputes real numbers from configs). SD 1.5 -> SDXL -> PixArt-Sigma -> Sana -> Qwen-Image -> Z-Image-Turbo, each slot read from model_index/scheduler/VAE/denoiser configs and safetensors headers, the replaced value struck through, plus parameter bars by component on one scale. Finding it surfaces: text encoders grew faster than denoisers (PixArt-Sigma's T5 is about 8x its DiT; Qwen-Image conditions on a whole 8.3B VLM). A VLM mode does the same for LLaVA-1.5 -> Qwen2-VL -> SmolVLM -> Gemma 4 31B -> Gemma 4 12B Unified (encoder-free), with token cost per image.
4. **"Which model for which job" picker** (medium-high): job, licence need, hardware, precision; weights-only memory = params x bytes, against 75% of memory (a stated heuristic); shows passing models and the best excluded ones with the reason.
5. **Licence reading guide** with the four clause types and the "same family, different licence" box (Qwen-Image vs 2.1, FLUX.2 klein 4B vs 9B, Gemma 3 vs 4, DINOv2 vs v3).

## Rejected
- Quality-vs-size scatter from arena Elo: arenas move weekly, versions get spliced, and evaluation belongs to the Reading tab and the evaluating_generative_models child page.
- Download-count bars: HF downloads are a rolling 30-day count and mirrors split them; misleading as popularity.
- Licence "commercial yes/no" matrix: hides thresholds and territory clauses; the verbatim licence text per row replaces it.
- Price table for closed APIs: prices change often and the topic is not about cost; left to inference pages.

## What the methodology lacked
- A rule for repositories that vanish (SD 2.1 now HTTP 401; runwayml SD 1.5 redirects): used the Wayback CDX API for the original date and recorded the removal as status.
- HF repo creation dates precede launches (FLUX.1 repo a day before, Llama 4 three days before); the page labels each date's kind.
