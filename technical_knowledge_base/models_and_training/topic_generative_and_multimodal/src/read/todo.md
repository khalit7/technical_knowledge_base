# Reading tab: numbers still to fill from the labs

Filled on 2026-10-17 from the setup agent's measured smoke tests (`src/data/smoke/`): example, sd_params, sdvae, sd_time, clip, vlm_tokens, fid_n. Keys ending in `_more` sit inside those filled notes: when a lab supplies one, write it into the parent key's HTML in `read_data.json` (the page fills one level only).

Each item is a `<span data-rd="KEY">` in the Reading or Further reading tab. It shows a red TODO box until `src/read/read_data.json` has `lab.KEY` (HTML, with its label: measured, vendor, derived) and `python3 src/read/make_read_data.py --js` has been run. Copy numbers from the lab's recorded output files only, and keep the prose around each span consistent with them.

| Key | Where | What | From |
|---|---|---|---|
| ae_prior | section 2 | Samples decoded from random codes: plain autoencoder against VAE | Latent lab |
| beta | section 2 | Beta sweep: reconstruction error and sample quality per beta | Latent lab |
| sdvae_more | section 2 (inside the filled sdvae note) | All fixed images through the SD VAE; what decoding without the factor does | Latent lab |
| mis_scale | Mistakes | The measured effect of a wrong or missing scaling factor | Latent lab |
| steps | section 3 | Same noise through 1, 4, 10, 50, 250 steps (DDPM, DDIM), tiny model and SD v1.5; seconds per step | Diffusion lab |
| cfg | section 3 | One prompt at guidance 0 to 10 on SD v1.5 | Diffusion lab |
| flow_vs_diff | section 3 | Flow against diffusion at equal steps on the running example; 2-D paths before and after reflow | Flow lab |
| sd_time_more | section 4 (inside the filled sd_time note) | SD v1.5 split into seconds per U-Net pass and per VAE decode | Diffusion lab |
| sd_sec_per_pass | section 10 calculator default | The same per-pass time as a plain number (seconds) | Diffusion lab |
| clip_more | section 5 (inside the filled clip note) | Zero-shot accuracy of CLIP and SigLIP 2 on the labelled set | Vision lab |
| vlm_tokens_more | section 6 (inside the filled vlm_tokens note) | SmolVLM token counts at other resolutions; the full prompt | VLM lab |
| vlm_halluc | section 6 | Accuracy on the question set, yes rate on absent objects, seconds per image | VLM lab |
| t_latent, t_diff, t_flow, t_vision, t_vlm, t_map | Further reading | Each tab's reading time, as its agent measured it | each tab |

Also, once the labs exist:
- Replace "being built" child-page cards with links when the child pages are published (Notion ids).
- Section 1 animation: consider adding a trained model's real DDIM trajectory from the Diffusion lab beside the exact one-image path (keep the exact path; label each).
- Re-measure the reading time (`src/read/check_read.mjs`) and update `#rd-time`, `#rd-time-qa` and `#rd-more-time`.
- Notion is disconnected: `coverage.md` lists what to check against the old root page and its children when it returns.
