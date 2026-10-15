# Coverage

New page: there was no old Notion text for "JAX LLM codebases" (the old topic's four children did not include it), so nothing to carry over.

Facts this page found that differ from what other pages of the topic say (suggested to the lead, not edited here):
- The training stack page says the stable `CheckpointManager` is what "MaxText and Tunix use". At MaxText main 1a95d1e5 MaxText uses Orbax's v1 API, `ocp.training.Checkpointer` (`src/maxtext/common/checkpointing.py:52`, `:575`; base.yml:94 "Orbax v1 is now always used"); Tunix v0.1.7 does use `ocp.CheckpointManager`.
- The root's Reading tab section 7 shows MaxText's tiering MFU table: 5 of its 8 MFU figures reproduce (within 0.02 points) only with MaxText's pre-July-2025 non-causal FLOP count; under the current count Llama 3.1 8B on v6e is 40.41%, not 45.46% (`runs/lc_mfu.py`).
