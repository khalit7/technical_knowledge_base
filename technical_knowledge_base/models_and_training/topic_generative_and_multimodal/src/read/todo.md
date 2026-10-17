# Reading tab: lab numbers

All lab numbers were filled on 2026-10-17 from the labs' recorded outputs and checked by `check_data.py` (every number against its source file):
- setup smoke tests (`src/data/smoke/`): example, sd_params, fid_n, the SD slicing peak memory;
- Latent lab (`src/latent/out/`): ae_prior, beta, sdvae, mis_scale;
- Diffusion lab (`src/diff/out/read_numbers.json`): steps, cfg, sd_time (its 15.75 s warm figure and per-piece split), sd_sec_per_pass (the section 10 calculator default), t_diff;
- Flow lab (`src/flow/out/read_numbers.json`, `samples_fm_4000.json`, `samples_extra.json`): flow_vs_diff, t_flow;
- Vision lab (`src/vision/out/`): clip (zero-shot, probes, lowercasing, typographic cosines);
- VLM lab (`src/vlm/out/`): vlm_tokens, vlm_halluc;
- tab reading times t_latent, t_vision, t_vlm, t_map as given by the lead from each tab's own measurement.

Memory figures are MiB as recorded (`peak_mps_mb` is MiB).

Still open:
- Child-page links (Notion ids pending): Vision encoders is built (about 32 min); the others are being built.
- `coverage.md`: the check against the old Notion root and children, when Notion returns.
- Re-measure the reading time (`check_read.mjs`) after any change and update `#rd-time`, `#rd-time-qa` and `#rd-more-time`.
