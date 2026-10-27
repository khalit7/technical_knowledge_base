Source: https://github.com/kvcache-ai/AgentENV (fetched 2026-10-03; licence MIT per GitHub API; repo created 2026-07-23)
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/heading-logo-dark.svg" />
    <img src="assets/heading-logo.svg" alt="AgentENV" />
  </picture>
  <p><strong>Running agent environments at scale</strong></p>
  <p>
    <a href="https://github.com/kvcache-ai/AgentENV/actions/workflows/coverage.yml">
      <img src="https://github.com/kvcache-ai/AgentENV/actions/workflows/coverage.yml/badge.svg?branch=main&event=push" alt="Coverage workflow status">
    </a>
    <a href="https://github.com/kvcache-ai/AgentENV/blob/coverage-data/coverage/coverage.json">
      <img src="https://github.com/kvcache-ai/AgentENV/blob/coverage-data/coverage/badge.svg?raw=1" alt="Latest coverage report">
    </a>
  </p>
  <p>
    📖 Full documentation:
    <a href="https://kvcache-ai.github.io/AgentENV/latest/">Stable</a> |
    <a href="https://kvcache-ai.github.io/AgentENV/dev/">Dev</a>
  </p>
</div>

AgentENV (AENV) is a platform for running agent environments at scale, powering agentic RL training for **Kimi K3**.

---

## 🚀 Why AgentENV

- **Scale across diverse environments**: AENV runs massive numbers of Firecracker environments across machines, loading diverse OCI-compatible images on demand via [overlaybd](https://containerd.github.io/overlaybd/#/) and scaling to [1.5 million images in production](https://github.com/MoonshotAI/Kimi-K3/blob/main/k3_tech_report.pdf). Local disk acts as a bounded cache, retaining hot data and evicting cold, so the aggregate image and snapshot footprint can exceed local disk capacity by several orders of magnitude while startup stays fast cluster-wide, without pre-warming every host.
- **Make idle environments inexpensive**: Snapshot-backed environments boot or resume in under 50 ms and pause in under 100 ms. Idle environments can quickly release CPU and memory, then return when new work arrives.
- **Native snapshot and fork support**: AENV snapshots memory and filesystem changes incrementally, completing in under 100 ms even under heavy disk modification. A running environment can fork into multiple independent sandboxes for parallel agent workflows. Snapshots persist to S3-compatible object storage or a shared distributed filesystem to prevent data loss.
