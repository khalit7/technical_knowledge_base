# Testing and Quality for ML Systems

⏱ 10 min read · +3h 40m resources

### Best resources

- [How to Test Machine Learning Code and Systems](https://eugeneyan.com/writing/testing-ml/) (~30 min): Eugene Yan; the pre-train / post-train test framing with worked code
- [Hypothesis documentation](https://hypothesis.readthedocs.io/en/latest/) (docs, ~45 min for the quick start plus the numpy/pandas extras): property-based testing for Python
- [Made With ML: Testing](https://madewithml.com/courses/mlops/testing/) (~40 min): Goku Mohandas; code + data + model testing with pytest and Great Expectations, CI-ready
- [The ML Test Score](https://research.google/pubs/the-ml-test-score-a-rubric-for-ml-production-readiness-and-technical-debt-reduction/) (paper, ~45 min): Breck et al., Google; the classic 28-test production-readiness rubric, still the best checklist
- [pytest documentation](https://docs.pytest.org/) (docs, ~1h for the core pages): fixtures, parametrize, markers; the substrate everything below runs on
- For LLM regression/eval harnesses, see [Topic: evaluation-and-llm-judges](../evaluation-and-llm-judges/summary.md)

### The three-object model

ML systems have three things to test, with different determinism and different tools:

| Object | Property | Tooling |
| --- | --- | --- |
| Code | Deterministic | pytest units, property tests, types |
| Data | Schema-checkable, distribution-checkable | pydantic/pandera/Great Expectations, drift monitors |
| Model | Statistical | Regression eval suites, behavioural tests, judges |

Most "ML testing" failures come from testing only the first object.

### Unit tests for data transforms

The transforms between raw data and model input are ordinary code and deserve ordinary tests, plus a few ML-specific habits:

- Test on **tiny literal fixtures** (5-row DataFrames constructed inline) so the expected output is verifiable by eye; golden-file tests for bigger cases.
- Test the **invariants**, not just examples: row count preserved (or exactly the filtered delta), no NaNs introduced, dtypes stable, key uniqueness maintained, output vocabulary within the expected set.
- Test **edge inputs** that production will send: empty frame, single row, all-null column, unicode, max-length strings, duplicate keys.
- Tokenization and prompt-assembly code is transform code: assert round-trips (decode(encode(x)) == x where the tokenizer promises it), template rendering with empty/huge/injection-shaped fields, and exact token counts for cost-critical paths.
- Make transforms **pure functions** over explicit inputs; anything touching S3 or a DB gets an interface you can fake. This is test design driving better design.

### Property-based testing with Hypothesis

Instead of hand-picking examples, state a property and let Hypothesis search for a counterexample, then shrink it to a minimal failing case:

```python
from hypothesis import given, strategies as st
import hypothesis.extra.numpy as hnp

@given(hnp.arrays(dtype=np.float32, shape=st.integers(1, 1000)))
def test_normalize_bounds(x):
    out = normalize(x)
    assert out.shape == x.shape
    assert not np.isnan(out).any()
```

Properties that pay off in ML code: shape/dtype preservation, invariance (normalisation is idempotent: f(f(x)) == f(x)), equivalence of a vectorised implementation against a slow reference loop, serialization round-trips (config -> yaml -> config), monotonicity of scoring functions, and "never crashes" over adversarial strings for parsers of LLM output. Use `st.composite` for domain objects and reuse strategies as your typed-fixture library. `hypothesis.extra.numpy` and `.pandas` generate arrays/frames natively. Pin `derandomize=True` or a database in CI if flaky-test policing is strict.

### Regression suites for model behaviour

A model change (checkpoint, prompt, temperature, provider) needs a gate that plays the role unit tests play for code:

- **Golden set**: a versioned eval set (hundreds to low thousands of cases) with expected outputs or graded rubrics; score the candidate, diff against the incumbent's stored scores, and fail on regression beyond a noise threshold (run k times or fix seeds/temperature=0 to control variance).
- **Behavioural tests** (the CheckList idea): minimum-functionality cases ("2+2" must be 4), invariance cases (paraphrase, name-swap, irrelevant-context injection must not flip the answer), and directional cases (adding "answer in French" must change the language).
- **Slice the metrics**: aggregate score can hold while a critical slice (long inputs, one language, one tenant's domain) regresses; store per-slice scores.
- Treat prompts as code: versioned, reviewed, and every prompt edit runs the suite.
- Harness mechanics (LLM judges, pass@k, contamination) live in [Topic: evaluation-and-llm-judges](../evaluation-and-llm-judges/summary.md); the point here is wiring them in as a **merge gate**, not a dashboard.

### Contract tests for LLM outputs

Where an LLM feeds downstream code, the boundary needs a schema contract:

- Define the output as a **pydantic model**; validate every response. Use structured-output modes (JSON schema / tool calling) or constrained decoding (outlines, xgrammar) to make validity near-guaranteed, and still validate.
- Semantic constraints beyond syntax: enum fields actually in the enum, IDs resolve against the catalogue, dates parse, numbers within bounds, citation indices in range. Validators on the pydantic model are the natural home.
- **Repair loop**: on validation failure, one retry with the error message appended; after that, fall back and log. Track repair rate as a quality metric; a rising repair rate is a model or prompt regression signal.
- Contract-test the **providers** too: a recorded-response test suite (VCR-style cassettes) against each provider's API shape, so an upstream API change breaks CI rather than production.

### CI for ML

- **Static gates** on every PR, fast and non-negotiable: ruff (lint + format), mypy (or pyright) on typed packages, pytest unit tier (< a few minutes). Modern baseline: `uv` for env resolution, pre-commit for the local mirror of CI.
- **Test tiers by cost**: unit (every push) -> integration with fakes/small models (every PR) -> GPU/eval tier (merge queue or nightly). Mark with pytest markers (`-m "not gpu"`) so laptops stay usable.
- **GPU CI**: self-hosted runners with GPUs (GitHub Actions self-hosted, or Modal/SkyPilot-launched ephemeral GPU jobs). Keep it cheap: smallest model that exercises the code path (a 0.5B model or a fake engine), cache weights on the runner, and reserve full-size eval runs for nightly. Determinism caveat: GPU kernels are not bit-stable across drivers; assert tolerances, not exact floats.
- **Training smoke test**: one tiny end-to-end run (overfit 10 samples, assert loss drops) catches wiring bugs that unit tests structurally cannot.
- Data pipelines get CI too: run transforms against fixture snapshots; validate output schemas with pandera/Great Expectations before publishing partitions.

### Verifying agent-authored changes at scale

A green suite over a massively parallel refactor is not evidence of safety. Nous Research coordinated 1,393 subagents for about 19 active hours to refactor a million-line Python repository, cutting non-test source by 34.4% for roughly $19,300 in model costs; worktrees and frozen baselines made the parallel integration possible, but community review still caught removed public APIs and changed exception handling that the test suite passed ([write-up](https://nousresearch.com/refactoring-hermes-with-1393-agents), 20 min). The verification gap sits where the tests are silent, not where they fail, and a change of that size travels straight through that region.

What closes it:

- **Public-API diffing as a merge gate**: enumerate the exported surface (`__all__`, public classes, signatures) before and after, and fail on any removal or signature change the diff does not declare. Tests cover what someone thought to call; the surface is the promise.
- **Exception-contract tests**: assert the exception type and the condition that raises it, not merely that an error path exists. Broadened or swallowed exceptions are the behaviour change a happy-path suite structurally cannot see.
- **Frozen baselines and per-agent worktrees**: pin the pre-change commit and diff behaviour against it rather than against a moving trunk; separate worktrees are what make many parallel edits integrable at all.
- **Route review by surface, not by file**: nobody reads a million-line diff, so spend the human attention on the public interface, the error paths, and the deleted code.

### General test design taste

- Test **behaviour through the public interface**, not implementation; tests that break on refactors teach people not to refactor.
- One reason to fail per test; name it after the behaviour (`test_retry_preserves_idempotency_key`).
- The test pyramid still applies; ML adds a small, expensive "eval" apex above integration. Keep the base fat and fast.
- **Flakiness is a defect**, not weather: quarantine, fix, or delete. In ML code the usual causes are unseeded randomness, real network calls, and tolerance-free float asserts.
- Coverage is a floor detector, not a goal: a data transform at 100% coverage with no invariant tests is untested.
- Write the regression test **before** fixing a bug, including model bugs: every production incident should add a case to the golden set.
