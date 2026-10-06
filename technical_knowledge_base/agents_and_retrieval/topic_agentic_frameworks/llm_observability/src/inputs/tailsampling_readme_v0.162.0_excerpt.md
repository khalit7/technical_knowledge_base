- `sampling_strategy` (default = `trace-complete`): Controls decision timing and evaluation scope. `trace-complete` evaluates accumulated trace data on timer handling; `span-ingest` evaluates each incoming batch on ingest, finalizing terminal outcomes immediately and non-terminal traces on cleanup. See [Sampling Strategies](#sampling-strategies) for details.
- `decision_wait` (default = 30s): Time before timer handling for a trace. When `sampling_strategy` is `trace-complete`, this controls decision timing. When `sampling_strategy` is `span-ingest`, this controls pending cleanup finalization timing.
- `decision_wait_after_root_received` (default = 0s): Additional root-span-based acceleration for timer handling. When `sampling_strategy` is `trace-complete`, this can make decisions earlier. When `sampling_strategy` is `span-ingest`, this can finalize pending traces earlier on cleanup. `0s` disables it.
- `num_traces` (default = 50000): Number of traces kept in memory.
- `expected_new_traces_per_sec` (default = 0): Expected number of new traces (helps in allocating data structures)
- `decision_cache`: Options for configuring caches for sampling decisions. You may want to vary the size of these caches
  depending on how many "keep" vs "drop" decisions you expect from your policies. For example, you may allocate a
  larger `non_sampled_cache_size` if you expect most traces to be dropped.
  Additionally, if using, configure this as much greater than `num_traces` so decisions for trace IDs are kept
  longer than the span data for the trace.
  - `sampled_cache_size` (default = 0): Configures amount of trace IDs to be kept in an LRU cache,
  persisting the "keep" decisions for traces that may have already been released from memory.
  By default, the size is 0 and the cache is inactive.
  - `non_sampled_cache_size` (default = 0) Configures amount of trace IDs to be kept in an LRU cache,
    persisting the "drop" decisions for traces that may have already been released from memory.
    By default, the size is 0 and the cache is inactive.
- `sample_on_first_match`: Make decision as soon as a policy matches. Do not combine with the `processor.tailsamplingprocessor.usetracestate` feature gate: stopping at the first match can skip a later policy that would have reported a less strict sampling threshold, throwing off downstream adjusted counts; see [Tracestate handling](#tracestate-handling).
