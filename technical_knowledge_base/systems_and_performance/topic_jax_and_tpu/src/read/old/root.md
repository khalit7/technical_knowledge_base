Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81ecbc04eea6aa45ea1a as of 2026-10-15T12:12:18.917Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81ecbc04eea6aa45ea1a" icon="⚡">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-2-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Topic: jax-and-tpu"}
</properties>
<iconMetadata>{"type":"emoji","emoji":"⚡"}</iconMetadata>
<content>
# Video
A narrated 7-minute explainer derived from this page. The page stays canonical: the video is a derived representation, and every figure it states comes from here.
<video src="notion-file-block://3e45c17b-0d0d-8191-8a70-fecca247e510/23160a67-8423-40cf-b753-eb4eb4d7c28a?space_id=13e79c56-ebab-4528-83aa-967a204b1f04&name=topic_jax_and_tpu_overview.mp4">Topic: jax-and-tpu: purity is the price; a compiler that shards a pod is the payoff</video>
⏱ 6 min read · +9h 15m resources
The Google-side stack: JAX (functional array programming compiled through XLA), the
neural-net libraries on top of it, and the TPU hardware it targets. This topic is framed
as a PyTorch-to-JAX translation track: everything you know from PyTorch/FSDP has a JAX
equivalent, usually more explicit and more compiler-driven. Goal state: port a small
PyTorch LM to Flax NNX and train it on a TPU.
## Taxonomy
```mermaid
graph TD
    JAX["JAX core<br/>jit, grad, vmap, shard_map<br/>(pmap = legacy wrapper)"]
    XLA["XLA compiler<br/>GSPMD auto-sharding"]
    PALLAS["Pallas kernels<br/>Mosaic TPU backend"]
    TPU["TPU hardware<br/>v5e / v5p / v6e Trillium / v7 Ironwood"]

    NN["NN libraries"]
    NNX["Flax NNX (recommended)"]
    LINEN["Flax Linen (maintained)"]
    EQX["Equinox"]
    HAIKU["Haiku (legacy, DeepMind moved to Flax)"]

    OPTAX["optax: optimisers as<br/>gradient transformations"]
    ORBAX["orbax: async distributed<br/>checkpointing"]
    GRAIN["grain: deterministic<br/>checkpointable data loading"]

    CODE["LLM codebases"]
    MAXTEXT["MaxText (pretraining reference)"]
    TUNIX["Tunix (post-training: SFT/GRPO/distill)"]
    BV["big_vision (ViT lineage)"]
    LEV["levanter (Stanford)"]

    JAX --> XLA --> TPU
    JAX --> PALLAS --> TPU
    NN --> NNX
    NN --> LINEN
    NN --> EQX
    NN --> HAIKU
    NNX --> JAX
    OPTAX --> JAX
    ORBAX --> JAX
    GRAIN --> JAX
    CODE --> MAXTEXT
    CODE --> TUNIX
    CODE --> BV
    CODE --> LEV
    MAXTEXT --> NNX
    TUNIX --> NNX
```
## Map of the space
- **JAX core**: `jax.numpy` plus composable transformations: `jit`
	(traces the function into a jaxpr and compiles it with **XLA**, the Accelerated Linear Algebra compiler), `grad` (reverse-mode autodiff of a pure function, so gradients come back as a value with the same pytree shape as the parameters, a pytree being any nested container of arrays), `vmap` (auto-vectorisation), and `shard_map` (**SPMD**, single program multiple data: the body sees only this device's shard and you write the collectives). `pmap` is legacy. The
	price: functions must be pure, and state (params, optimiser, RNG) is threaded
	explicitly. See <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b7a0d1faba6cef5561">JAX core: the functional model</mention-page>.
- **Neural-net layer**: Flax NNX is the current recommended API (Pythonic, stateful
	modules, feels close to `nn.Module`); Linen is the older functional API most existing
	code uses; Equinox is a minimal "models are pytrees" library popular in research;
	Haiku is legacy, worth reading only for old DeepMind repos. See <mention-page url="https://app.notion.com/p/3c65c17b0d0d817ea0ace9a2ca8677ec">Flax NNX, optax, orbax: the training stack</mention-page>.
- **Optimisers and training state**: optax expresses optimisers as chainable pure
	gradient transformations (`optax.adamw`, `optax.chain`, schedules as functions of
	step), so clipping, EMA, accumulation, per-parameter masks, Lion and Muon are links in a chain rather than subclasses. orbax handles async, sharded, multi-host checkpointing, which is what makes checkpointing a whole pod slice practical rather than heroic. grain gives
	deterministic, checkpointable input pipelines, so a preempted run resumes mid-epoch. Same page as above.
- **Scaling**: XLA's **GSPMD (General and Scalable Parallelization for ML Computation Graphs)** partitioner takes your single-device program plus layout annotations and inserts the collectives wherever two annotations disagree. You declare a device `Mesh` and
	attach a `NamedSharding` (that `Mesh` plus a `PartitionSpec`) to each array. Data
	parallel, FSDP-style, and tensor parallel are all just different PartitionSpecs, and
	`shard_map` is the escape hatch for hand-written per-device code. See
	<mention-page url="https://app.notion.com/p/3c65c17b0d0d8125b084e6720cc66b3d">Sharding and scale: GSPMD, Mesh, shard_map</mention-page>.
- **TPU stack**: the **MXU (Matrix Multiply Unit)** systolic array (128x128, or 256x256 on some generations), **HBM (High Bandwidth Memory)** staged through the software-managed **VMEM** scratchpad, and **ICI (Inter-Chip Interconnect)** wiring each chip straight to its neighbours in a 2-D or 3-D torus with no switches in the path, so ring and torus collectives are cheap and distant point-to-point traffic is multi-hop; a pod is the resulting fabric of hundreds to thousands of chips that one job can treat as a single machine. **Pallas** is
	the Triton-analogue for writing TPU (and GPU) kernels, lowering through **Mosaic**, the TPU backend compiler.
	Hardware-first view lives in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8151bbc2e0ceea196187"/>; programming
	view in <mention-page url="https://app.notion.com/p/3c65c17b0d0d8129b0a5fd82e44ecf6e">TPU architecture and Pallas</mention-page>.
- **LLM codebases to read**: **MaxText** is Google's pure-JAX LLM pretraining stack and the reference for
	what good sharded JAX looks like. **Tunix** is the post-training counterpart, covering supervised fine-tuning, preference tuning,
	distillation, and RL trainers: **PPO (Proximal Policy Optimization)**, the classic actor-critic method that keeps updates small with a clipped importance ratio; **GRPO (Group Relative Policy Optimization)**, which deletes the value network and instead normalises rewards within a sampled group of completions for the same prompt, cutting memory and complexity enough that it became the standard recipe for training reasoning on verifiable answers; and **GSPO (Group Sequence Policy Optimization)**, its sequence-level variant that forms the importance ratio over the whole sequence rather than per token, which is what stabilises long-generation MoE training. **big_vision** is the ViT lineage written in Linen and the cleanest example of the older functional style. **levanter** is Stanford's non-Google
	perspective, built on Equinox, with an emphasis on bitwise-reproducible training that resumes identically after preemption.
## Learning path (recommended order)
1. <mention-page url="https://app.notion.com/p/3c65c17b0d0d81b7a0d1faba6cef5561">JAX core: the functional model</mention-page>: the functional model, jit/grad/vmap, PRNG, pytrees.
	Do the official JAX tutorial notebooks alongside.
2. <mention-page url="https://app.notion.com/p/3c65c17b0d0d817ea0ace9a2ca8677ec">Flax NNX, optax, orbax: the training stack</mention-page>: build and train an MLP then a tiny
	transformer with NNX + optax on CPU/GPU; add orbax checkpointing.
3. Port the small PyTorch LM to Flax NNX; verify loss curves match on CPU.
4. <mention-page url="https://app.notion.com/p/3c65c17b0d0d8125b084e6720cc66b3d">Sharding and scale: GSPMD, Mesh, shard_map</mention-page> plus chapters 1-5 and 10 of the
	scaling book; shard the LM with a Mesh (data first, then FSDP-style).
5. <mention-page url="https://app.notion.com/p/3c65c17b0d0d8129b0a5fd82e44ecf6e">TPU architecture and Pallas</mention-page>: run on a real TPU
	(Colab v5e, Kaggle v5e-8, then TRC, the TPU Research Cloud), profile, optionally write one Pallas kernel.
6. Read MaxText's decoder and train step end to end; skim Tunix's GRPO trainer.
## Deep dives
<table header-row="true">
<tr>
<td>Page</td>
<td>Contents</td>
</tr>
<tr>
<td><mention-page url="https://app.notion.com/p/3c65c17b0d0d81b7a0d1faba6cef5561">JAX core: the functional model</mention-page></td>
<td>Pure functions, PRNG keys, jit tracing rules, lax control flow, grad, vmap, pytrees, PyTorch-user footguns</td>
</tr>
<tr>
<td><mention-page url="https://app.notion.com/p/3c65c17b0d0d817ea0ace9a2ca8677ec">Flax NNX, optax, orbax: the training stack</mention-page></td>
<td>Flax NNX vs Linen, optax, orbax, full training-loop skeleton vs PyTorch line by line</td>
</tr>
<tr>
<td><mention-page url="https://app.notion.com/p/3c65c17b0d0d8125b084e6720cc66b3d">Sharding and scale: GSPMD, Mesh, shard_map</mention-page></td>
<td>Mesh, NamedSharding, GSPMD, shard_map, DP/FSDP/TP as PartitionSpecs, multi-host</td>
</tr>
<tr>
<td><mention-page url="https://app.notion.com/p/3c65c17b0d0d8129b0a5fd82e44ecf6e">TPU architecture and Pallas</mention-page></td>
<td>TPU generations, MXU/HBM/ICI, pods, Pallas kernels, cheap TPU access</td>
</tr>
</table>
## Best resources (topic-level)
- [How to Scale Your Model](https://jax-ml.github.io/scaling-book/) (\~3h 30m for ch. 1-5 and 10; \~6h for the full book) (DeepMind, 2025,
	still the canonical text): rooflines, TPUs, sharded matmuls, transformer scaling math,
	JAX parallelism, plus a bonus GPU chapter. Read chapters 1-5 and 10 minimum.
- [JAX documentation](https://docs.jax.dev/) (docs, \~2h for the tutorial set): the tutorials (Thinking in JAX, sharded
	computation, stateful computations) are excellent and current.
- [Flax NNX docs](https://flax.readthedocs.io/) (docs, \~1h 30m for the core pages): NNX basics plus the Linen-to-NNX
	migration guide (useful in reverse as a reading-Linen-code guide).
- [MaxText](https://github.com/AI-Hypercomputer/maxtext) (repo, \~1h 30m for the decoder and train step) and
	[Tunix](https://github.com/google/tunix) (repo, \~45 min for the GRPO trainer): production JAX LLM code to imitate.
## Cross-links
- Hardware view of TPUs: <mention-page url="https://app.notion.com/p/3c65c17b0d0d8151bbc2e0ceea196187"/>
- General distributed training (DP/TP/PP/ZeRO/FSDP concepts): <mention-page url="https://app.notion.com/p/3c65c17b0d0d8103a916c4824abbd82e"/>
- CUDA/Triton counterpart to Pallas: <mention-page url="https://app.notion.com/p/3c65c17b0d0d81c39f34d5e070d783c1"/>
<page url="https://app.notion.com/p/3c65c17b0d0d81b7a0d1faba6cef5561">JAX core: the functional model</page>
<page url="https://app.notion.com/p/3c65c17b0d0d817ea0ace9a2ca8677ec">Flax NNX, optax, orbax: the training stack</page>
<page url="https://app.notion.com/p/3c65c17b0d0d8125b084e6720cc66b3d">Sharding and scale: GSPMD, Mesh, shard_map</page>
<page url="https://app.notion.com/p/3c65c17b0d0d8129b0a5fd82e44ecf6e">TPU architecture and Pallas</page>
<page url="https://app.notion.com/p/3fa5c17b0d0d8135adcedefac9e1bb48">XLA and compilation: jaxprs, StableHLO, fusion and recompiles</page>
<page url="https://app.notion.com/p/3fa5c17b0d0d81c5abb9fedab418578d">PyTorch to JAX: porting a small LM</page>
<page url="https://app.notion.com/p/3fa5c17b0d0d817699fcf65d085402e7">Pallas kernels</page>
<page url="https://app.notion.com/p/3fa5c17b0d0d81f8bd5ad523e9f2dde0">JAX LLM codebases: MaxText, Tunix, levanter</page>
</content>
</page>