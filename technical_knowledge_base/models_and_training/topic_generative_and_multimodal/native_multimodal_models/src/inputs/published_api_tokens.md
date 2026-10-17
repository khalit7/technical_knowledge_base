# Token accounting in a closed API (vendor documentation)

Gemini API, "Understand and count tokens", https://ai.google.dev/gemini-api/docs/tokens (page "Last updated 2026-10-13 UTC", fetched 2026-10-17). Vendor documentation, not a measurement.
- Images: "Images ≤384 pixels in both dimensions count as 258 tokens." "Larger images are tiled into 768x768 pixel tiles, each counting as 258 tokens."
- Video: "263 tokens per second (applies to static processing)." "All frames sampled at 1 FPS." Agentic processing: "~100 tokens/second by default (low resolution) or ~300 tokens/second (high resolution)." Example: "a 1-hour lecture that would use ~1.08M tokens in static mode might use ~108K tokens".
- Audio: "Audio: 32 tokens per second"; "A 60-second audio clip is approximately 32 * 60 = 1,920 tokens".
