"""Ways of running the running example's forward that the page compares. They call the model's own
submodules (tok, pos, blocks, ln_f, head) in the model's order; nothing is redefined.
forward(model, x, y, how) -> loss, where how is one of:
  plain       model(x, y) itself
  ckpt        every block under torch.utils.checkpoint (non-reentrant), as GPTConfig(checkpoint=True)
  sac_mm      selective checkpointing: save matmul and attention outputs, recompute the rest
  sac_attn    selective: save only attention outputs (SDPA), recompute matmuls and pointwise
  lce_ref     plain blocks, then F.linear_cross_entropy with options=None: the reference path (no chunking)
  lce         the same with options=LinearCrossEntropyOptions(): the chunked path that never holds all logits
"""
import functools
import torch
import torch.nn.functional as F
from torch.utils.checkpoint import checkpoint, create_selective_checkpoint_contexts, CheckpointPolicy

aten = torch.ops.aten
MM_OPS = {aten.mm.default, aten.addmm.default, aten.bmm.default,
          aten._scaled_dot_product_flash_attention_for_cpu.default,
          aten._scaled_dot_product_efficient_attention.default,
          aten._scaled_dot_product_flash_attention.default}
ATTN_OPS = {aten._scaled_dot_product_flash_attention_for_cpu.default,
            aten._scaled_dot_product_efficient_attention.default,
            aten._scaled_dot_product_flash_attention.default}


def _policy(save):
    def pol(ctx, op, *args, **kwargs):
        return CheckpointPolicy.MUST_SAVE if op in save else CheckpointPolicy.PREFER_RECOMPUTE
    return pol


def hidden(model, x, block_fn):
    B, T = x.shape
    h = model.tok(x) + model.pos(torch.arange(T, device=x.device))
    for blk in model.blocks:
        h = block_fn(blk, h)
    return model.ln_f(h)


def forward(model, x, y, how="plain"):
    if how == "plain":
        return model(x, y)[1]
    if how == "ckpt":
        fn = lambda blk, h: checkpoint(blk, h, use_reentrant=False)
    elif how in ("sac_mm", "sac_attn"):
        save = MM_OPS if how == "sac_mm" else ATTN_OPS
        ctx = functools.partial(create_selective_checkpoint_contexts, _policy(save))
        fn = lambda blk, h: checkpoint(blk, h, use_reentrant=False, context_fn=ctx)
    elif how in ("lce", "lce_ref"):
        from torch.nn.modules.linear_cross_entropy_options import LinearCrossEntropyOptions
        h = hidden(model, x, lambda blk, h: blk(h))
        opts = LinearCrossEntropyOptions() if how == "lce" else None
        return F.linear_cross_entropy(h.view(-1, h.size(-1)), model.head.weight, y.view(-1), options=opts)
    else:
        raise ValueError(how)
    h = hidden(model, x, fn)
    logits = model.head(h)
    return F.cross_entropy(logits.view(-1, logits.size(-1)), y.view(-1))
