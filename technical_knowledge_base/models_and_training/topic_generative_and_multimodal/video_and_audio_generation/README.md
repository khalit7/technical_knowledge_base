# Video and audio generation

Notion: https://app.notion.com/p/3c65c17b0d0d8198bd7be111a3dc4c3a (child of Topic: generative-and-multimodal; reuses an older Notion page, retitled at publish).

Status: HTML-only page built 2026-10-17, published. `index.html` is the whole page, built from `src/` with `sh src/build.sh`; `src/README.md` lists the tabs, scripts, runs and checks.

Child 8 of the topic, overview depth: video as space-time patches of a causal video VAE's latent (Wan 2.1's VAE run on two clips), full against factorised attention, the published video models with token and FLOP counts from seven configs, long-video consistency, audio as waveforms, spectrograms and neural-codec tokens (EnCodec, DAC and Mimi run at every codebook depth, with Opus as baseline), codec language models and flow-matching speech, and evaluation, measured on an Apple M1 Pro CPU. Tabs: Reading, Space-time patch calculator, RVQ codec explorer, Model timeline, Further reading.
