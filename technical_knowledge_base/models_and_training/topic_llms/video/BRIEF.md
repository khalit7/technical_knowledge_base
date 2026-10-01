---
workflow: faceless-explainer
flow: automation
storyboard: no
message: "Every frontier lab now shares one skeleton, so only two bets separate them: where the test-time budget is spent, and what the model costs to serve."
destination: desktop
aspect: 1920x1080
language: en
audience: "An MSc-level AI engineer (Khalid)"
length: 90s
angle: concept
---

## Intent

A 90-second faceless explainer derived from the Notion page "Topic: llms" in Khalid's
Technical knowledge base. It is a demo, so Khalid can compare a rendered-video approach
with an interactive-HTML approach built separately for the same page. Destination is
desktop playback, embedded in Notion (16:9, 1920x1080). Audience is an MSc-level AI
engineer, so terminology (MoE, active parameters, KV cache, test-time compute, harness)
is used without hand-holding.

Angle: **concept**. The page maps the landscape (labs, dense vs MoE, attention variants,
reasoning models, open vs closed weights, reading benchmarks), but it states its own
thesis in "How to read the rest of this page": once the skeleton is shared (sparse MoE,
a reasoning mode, 1M-token context), only two things are left to separate one lab from
another, the test-time budget and the serving cost. That is a concept, not a listicle of
labs, so the video teaches the frame the page uses to read every release, and lands the
benchmark caveat (Astra 62.7% vs 99.9% on ARC-AGI-3, same weights, different harness)
as the payoff of the same frame: the harness is where the budget is spent. Chosen because
the page's own shape is "shared skeleton, then two axes", and a map of 20 labs does not
fit 90 seconds while the two-bet frame does.

## Notes

- Source is the page text only (`capture/extracted/visible-text.txt`); every fact in the
  video must appear on the page. Fetched read-only; nothing is written to Notion.
- No em-dash characters anywhere (script, on-screen text, captions).
- Intent interview already done by the caller; ask Khalid nothing.
