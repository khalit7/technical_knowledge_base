# Pallas kernels

Notion: https://app.notion.com/p/3fa5c17b0d0d817699fcf65d085402e7 (child of Topic: jax-and-tpu, 3c65c17b0d0d81ecbc04eea6aa45ea1a)

HTML-only page built in this folder: `index.html` (built by `src/build.sh`). JAX's kernel language from zero for a PyTorch and CUDA reader: eleven kernels written on the running example (ten run and checked in interpret mode on CPU, all eleven lowered for TPU), the production kernels of jax and tokamax read (and three run on the same tensors), pipelining, scalar prefetch, testing without a TPU, block sizes. Tabs: Reading, Grid and BlockSpec, Kernel playground, Flash tiles, Further reading. Sources and scripts in `src/` (see `src/README.md`).
