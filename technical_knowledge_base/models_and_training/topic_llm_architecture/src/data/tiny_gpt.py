"""tiny_gpt.py: ONE readable decoder-only GPT where every architectural choice is a config switch.

Shared by every lab and child page of Topic: llm-architecture (the running example). Read top to bottom:
  GPTConfig            every switch, with defaults (the "baseline" preset is GPTConfig() itself)
  norms, positions     LayerNorm / RMSNorm; learned, sinusoidal, RoPE (+ linear, NTK, YaRN scaling), ALiBi, NoPE
  Attention            MHA / GQA / MQA (n_kv_head), MLA (latent KV + decoupled RoPE key), sliding window,
                       QK-norm, learned attention sinks, a KV cache, and a recorded attention map
  SSM                  a small Mamba-2 style selective state-space mixer (pure PyTorch: chunk-free "dual" form
                       for training, a recurrent step for decoding), for hybrids
  FFN, MoE             GELU MLP or SwiGLU; mixture of experts with top-k routing, shared experts, aux-loss or
                       bias (aux-loss-free) balancing, an optional capacity factor that drops tokens
  Block, GPT           pre-norm, post-norm or sandwich; tied embeddings; record=True returns residual norms,
                       attention maps, router choices; kv_cache_bytes_per_token(); param_groups()
Shapes: B batch, T sequence, D d_model, H query heads, Hk key/value heads, hd head_dim.
"""
import math
from dataclasses import dataclass, field, asdict
from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F


@dataclass
class GPTConfig:
    vocab_size: int = 4096
    n_layer: int = 6
    d_model: int = 256
    n_head: int = 8                    # query heads; head_dim = d_model // n_head
    ctx: int = 256                     # training context length
    # attention
    attn: str = "mha"                  # mha | gqa | mqa | mla
    n_kv_head: Optional[int] = None    # gqa: key/value heads (default n_head // 4); mha -> n_head; mqa -> 1
    mla_kv_latent: int = 64            # mla: d_c, the compressed KV latent cached per token
    mla_rope_dim: int = 16             # mla: d_r, the decoupled RoPE key shared by all heads (cached too)
    window: Optional[int] = None       # sliding-window size (keys within the last `window` positions)
    global_every: int = 0              # with a window: every k-th layer (1-based) stays global (0 = all local)
    qk_norm: bool = False              # RMSNorm on each head's q and k before RoPE (Qwen3, OLMo 2, Gemma 3)
    attn_sink: bool = False            # a learned per-head sink logit (gpt-oss style), so a head can attend "nowhere"
    # normalisation
    norm: str = "layernorm"            # layernorm | rmsnorm
    norm_pos: str = "pre"              # pre | post | sandwich (pre and post around each sub-layer, Gemma 2/3)
    norm_eps: float = 1e-5
    # position
    pos: str = "learned"               # learned | sinusoidal | rope | alibi | nope
    max_pos: Optional[int] = None      # learned table size (default ctx); beyond it learned positions fail loudly
    rope_theta: float = 10000.0
    rope_scaling: Optional[dict] = None  # {"type": "linear"|"ntk"|"yarn", "factor": f, "orig_ctx": ctx}
    # feed-forward
    ffn: str = "gelu"                  # gelu (Linear-GELU-Linear, 4x) | swiglu (3 matrices, about 8/3 x)
    ffn_hidden: Optional[int] = None   # default: 4*D for gelu; Llama rounding of 8/3*D to a multiple of 32 for swiglu
    # mixture of experts (n_experts = 0: dense)
    n_experts: int = 0
    top_k: int = 2
    n_shared: int = 0                  # always-on shared experts (DeepSeekMoE)
    moe_hidden: Optional[int] = None   # per-expert hidden size (default ffn_hidden // top_k: equal active FFN size)
    router: str = "softmax"            # softmax (Switch / Mixtral style) | sigmoid (DeepSeek-V3 style)
    balance: str = "aux"               # aux (Switch aux loss) | bias (aux-loss-free bias, DeepSeek-V3) | none
    aux_coef: float = 0.01
    bias_rate: float = 1e-3
    capacity_factor: Optional[float] = None  # tokens over an expert's capacity are dropped (residual passes them)
    moe_every: int = 1                 # MoE in every k-th layer (others dense)
    # sequence mixer per layer: string of "a" (attention) and "s" (SSM), length n_layer; None = all attention
    layer_types: Optional[str] = None
    ssm_state: int = 16                # N, state size per head
    ssm_head_dim: int = 32             # P, channels per SSM head
    ssm_expand: int = 2                # inner width = expand * D
    ssm_conv: int = 4                  # short causal depthwise conv
    # misc
    tie_embeddings: bool = True
    bias: bool = False
    init_std: float = 0.02
    dropout: float = 0.0

    def __post_init__(self):
        assert self.d_model % self.n_head == 0
        if self.attn == "mha":
            self.n_kv_head = self.n_head
        elif self.attn == "mqa":
            self.n_kv_head = 1
        elif self.attn == "gqa":
            self.n_kv_head = self.n_kv_head or max(1, self.n_head // 4)
            assert self.n_head % self.n_kv_head == 0
        elif self.attn == "mla":
            self.n_kv_head = self.n_head
        else:
            raise ValueError(f"unknown attn {self.attn}")
        if self.ffn_hidden is None:
            if self.ffn == "swiglu":
                h = int(2 * 4 * self.d_model / 3)
                self.ffn_hidden = 32 * ((h + 31) // 32)
            else:
                self.ffn_hidden = 4 * self.d_model
        if self.n_experts and self.moe_hidden is None:
            self.moe_hidden = max(32, self.ffn_hidden // self.top_k)
        if self.layer_types is None:
            self.layer_types = "a" * self.n_layer
        assert len(self.layer_types) == self.n_layer and set(self.layer_types) <= {"a", "s"}
        self.max_pos = self.max_pos or self.ctx

    @property
    def head_dim(self):
        return self.d_model // self.n_head

    def to_dict(self):
        return asdict(self)


# ----------------------------------------------------------------------------------------- norms
def make_norm(cfg, dim=None):
    dim = dim or cfg.d_model
    if cfg.norm == "rmsnorm":
        return nn.RMSNorm(dim, eps=cfg.norm_eps)
    return nn.LayerNorm(dim, eps=cfg.norm_eps, bias=cfg.bias)


# ----------------------------------------------------------------------------------------- positions
def rope_inv_freq(dim, theta, scaling, device=None):
    """Inverse frequencies for RoPE on `dim` channels, plus an attention scale (YaRN's mscale, else 1)."""
    inv = 1.0 / (theta ** (torch.arange(0, dim, 2, device=device, dtype=torch.float32) / dim))
    mscale = 1.0
    if scaling:
        f, kind = float(scaling["factor"]), scaling["type"]
        if kind == "ntk":      # NTK-aware: stretch the base so low frequencies interpolate, high ones barely move
            theta2 = theta * f ** (dim / (dim - 2))
            inv = 1.0 / (theta2 ** (torch.arange(0, dim, 2, device=device, dtype=torch.float32) / dim))
        elif kind == "yarn":   # YaRN: interpolate only the slow dimensions, ramp between, temperature fix
            orig = scaling.get("orig_ctx", 256)
            beta_fast, beta_slow = scaling.get("beta_fast", 32), scaling.get("beta_slow", 1)
            def corr_dim(n_rot):  # dimension index whose wavelength completes n_rot turns over orig ctx
                return (dim * math.log(orig / (n_rot * 2 * math.pi))) / (2 * math.log(theta))
            lo = max(math.floor(corr_dim(beta_fast)), 0)
            hi = min(math.ceil(corr_dim(beta_slow)), dim // 2 - 1)
            ramp = ((torch.arange(dim // 2, device=device, dtype=torch.float32) - lo) / max(hi - lo, 1e-3)).clamp(0, 1)
            extrap = 1 - ramp  # 1 = keep original frequency (fast dims), 0 = interpolate by f (slow dims)
            inv = inv / f * (1 - extrap) + inv * extrap
            mscale = 0.1 * math.log(f) + 1.0
        elif kind != "linear":
            raise ValueError(kind)
    return inv, mscale


class Rope(nn.Module):
    def __init__(self, dim, cfg):
        super().__init__()
        self.dim, self.cfg = dim, cfg
        inv, self.mscale = rope_inv_freq(dim, cfg.rope_theta, cfg.rope_scaling)
        self.register_buffer("inv_freq", inv, persistent=False)

    def forward(self, x, pos):  # x: (B, h, T, dim), pos: (T,) absolute positions
        p = pos.float()
        if self.cfg.rope_scaling and self.cfg.rope_scaling["type"] == "linear":
            p = p / float(self.cfg.rope_scaling["factor"])  # position interpolation
        ang = p[:, None] * self.inv_freq[None, :]            # (T, dim/2)
        cos = torch.cat([ang.cos(), ang.cos()], -1) * self.mscale
        sin = torch.cat([ang.sin(), ang.sin()], -1) * self.mscale
        x1, x2 = x[..., : self.dim // 2], x[..., self.dim // 2:]
        rot = torch.cat([-x2, x1], -1)                        # rotate-half convention (HF Llama)
        return x * cos.to(x.dtype) + rot * sin.to(x.dtype)


def sinusoidal_table(n, d):
    pos = torch.arange(n, dtype=torch.float32)[:, None]
    div = torch.exp(torch.arange(0, d, 2, dtype=torch.float32) * (-math.log(10000.0) / d))
    pe = torch.zeros(n, d)
    pe[:, 0::2], pe[:, 1::2] = torch.sin(pos * div), torch.cos(pos * div)
    return pe


def alibi_slopes(h):
    """Press et al. 2022: geometric slopes 2^(-8/h), 2^(-16/h), ... (h a power of two; otherwise interleaved)."""
    def p2(n):
        start = 2 ** (-(2 ** -(math.log2(n) - 3)))
        return [start * start ** i for i in range(n)]
    if math.log2(h).is_integer():
        return torch.tensor(p2(h))
    c = 2 ** math.floor(math.log2(h))
    return torch.tensor(p2(c) + p2(2 * c)[0::2][: h - c])


def attn_bias(cfg, layer_idx, q_pos, k_pos, device, slopes=None):
    """Additive mask (H or 1, Tq, Tk): causal, optional sliding window, optional ALiBi. 0 = keep, -inf = masked."""
    diff = q_pos[:, None] - k_pos[None, :]                  # how far back each key is
    keep = diff >= 0
    if cfg.window and not (cfg.global_every and (layer_idx + 1) % cfg.global_every == 0):
        keep = keep & (diff < cfg.window)
    bias = torch.zeros(keep.shape, device=device).masked_fill(~keep, float("-inf"))[None]
    if slopes is not None:
        bias = bias - slopes.to(device)[:, None, None] * diff.clamp(min=0)[None].float()
    return bias


def is_local(cfg, layer_idx):
    return bool(cfg.window) and not (cfg.global_every and (layer_idx + 1) % cfg.global_every == 0)


# ----------------------------------------------------------------------------------------- attention
class Attention(nn.Module):
    """Causal self-attention. MHA/GQA/MQA differ only in n_kv_head; MLA caches a latent instead of K and V."""

    def __init__(self, cfg, layer_idx):
        super().__init__()
        self.cfg, self.li = cfg, layer_idx
        D, H, Hk, hd = cfg.d_model, cfg.n_head, cfg.n_kv_head, cfg.head_dim
        self.H, self.Hk, self.hd = H, Hk, hd
        if cfg.attn == "mla":
            dc, dr = cfg.mla_kv_latent, (cfg.mla_rope_dim if cfg.pos == "rope" else 0)
            self.dr = dr
            self.q = nn.Linear(D, H * (hd + dr), bias=cfg.bias)          # per head: q_nope (hd) and q_rope (dr)
            self.kv_down = nn.Linear(D, dc, bias=cfg.bias)               # x -> c_kv: the only thing cached (plus k_rope)
            self.kv_norm = nn.RMSNorm(dc, eps=cfg.norm_eps)
            self.k_up = nn.Linear(dc, H * hd, bias=False)                # c_kv -> k_nope per head
            self.v_up = nn.Linear(dc, H * hd, bias=False)                # c_kv -> v per head
            self.k_rope = nn.Linear(D, dr, bias=cfg.bias) if dr else None  # one RoPE key shared by all heads
            self.rope = Rope(dr, cfg) if dr else None
            self.scale = 1.0 / math.sqrt(hd + dr)
        else:
            self.q = nn.Linear(D, H * hd, bias=cfg.bias)
            self.k = nn.Linear(D, Hk * hd, bias=cfg.bias)
            self.v = nn.Linear(D, Hk * hd, bias=cfg.bias)
            self.rope = Rope(hd, cfg) if cfg.pos == "rope" else None
            self.scale = 1.0 / math.sqrt(hd)
        self.o = nn.Linear(H * hd, D, bias=cfg.bias)
        self.o.is_residual_out = True
        if cfg.qk_norm:
            self.q_norm = nn.RMSNorm(hd, eps=cfg.norm_eps)
            self.k_norm = nn.RMSNorm(hd, eps=cfg.norm_eps)
        if cfg.attn_sink:
            self.sink = nn.Parameter(torch.zeros(H))
        self.register_buffer("slopes", alibi_slopes(H) if cfg.pos == "alibi" else None, persistent=False)

    def forward(self, x, pos, cache=None, record=False):
        """x (B,T,D); pos (T,) absolute positions; cache: dict for this layer (appended in place) or None."""
        cfg, B, T = self.cfg, x.shape[0], x.shape[1]
        H, Hk, hd = self.H, self.Hk, self.hd
        if cfg.attn == "mla":
            q = self.q(x).view(B, T, H, hd + self.dr).transpose(1, 2)
            c = self.kv_norm(self.kv_down(x))                              # (B,T,dc)
            kr = self.k_rope(x)[:, None] if self.dr else None              # (B,1,T,dr)
            if self.dr:
                kr = self.rope(kr, pos)
            if cache is not None:                                          # cache the latent, not K and V
                if "c" in cache:
                    c = torch.cat([cache["c"], c], 1)
                    kr = torch.cat([cache["kr"], kr], 2) if self.dr else None
                cache["c"], cache["kr"] = c, kr
            Tk = c.shape[1]
            k = self.k_up(c).view(B, Tk, H, hd).transpose(1, 2)
            v = self.v_up(c).view(B, Tk, H, hd).transpose(1, 2)
            if cfg.qk_norm:
                q = torch.cat([self.q_norm(q[..., :hd]), q[..., hd:]], -1); k = self.k_norm(k)
            if self.dr:
                q = torch.cat([q[..., :hd], self.rope(q[..., hd:], pos)], -1)
                k = torch.cat([k, kr.expand(B, H, Tk, self.dr)], -1)
        else:
            q = self.q(x).view(B, T, H, hd).transpose(1, 2)
            k = self.k(x).view(B, T, Hk, hd).transpose(1, 2)
            v = self.v(x).view(B, T, Hk, hd).transpose(1, 2)
            if cfg.qk_norm:
                q, k = self.q_norm(q), self.k_norm(k)
            if self.rope is not None:
                q, k = self.rope(q, pos), self.rope(k, pos)
            if cache is not None:                                          # the KV cache: Hk heads, not H
                if "k" in cache:
                    k, v = torch.cat([cache["k"], k], 2), torch.cat([cache["v"], v], 2)
                cache["k"], cache["v"] = k, v
            if Hk != H:                                                    # each KV head serves H/Hk query heads
                k = k.repeat_interleave(H // Hk, 1); v = v.repeat_interleave(H // Hk, 1)
        Tk = k.shape[2]
        k_pos = torch.arange(Tk, device=x.device) + (pos[-1] + 1 - Tk)
        simple = (not record) and (not cfg.attn_sink) and cfg.pos != "alibi" and not is_local(cfg, self.li)
        if simple:
            y = F.scaled_dot_product_attention(q, k, v, is_causal=(cache is None or T > 1) and T == Tk, scale=self.scale,
                                               attn_mask=None if (cache is None or T == Tk) else
                                               attn_bias(cfg, self.li, pos, k_pos, x.device)[None])
            w = None
        else:
            s = (q @ k.transpose(-2, -1)) * self.scale + attn_bias(cfg, self.li, pos, k_pos, x.device, self.slopes)[None]
            if cfg.attn_sink:                                              # an extra column the head can dump mass into
                s = torch.cat([s, self.sink.view(1, H, 1, 1).expand(B, H, T, 1)], -1)
            w = s.float().softmax(-1).to(q.dtype)
            y = w[..., :Tk] @ v
            w = w if record else None
        y = y.transpose(1, 2).reshape(B, T, H * hd)
        return self.o(y), w


# ----------------------------------------------------------------------------------------- SSM (Mamba-2 style)
class SSM(nn.Module):
    """A small selective state-space mixer in the Mamba-2 (SSD) form, pure PyTorch, runs on MPS and CPU.

    Per head h (P channels, state size N), with a scalar decay a_t = exp(dt_t * A_h) that depends on the input:
        state_t = a_t * state_{t-1} + dt_t * x_t B_t^T      (P x N)
        y_t     = state_t C_t + D_h * x_t
    Training uses the equivalent "dual" quadratic form y = (L o C B^T) (dt x), L[i,j] = prod_{j<k<=i} a_k, which is
    exact and fast at T <= 1-2k; decoding uses the recurrence with a constant-size state (no KV cache).
    """

    def __init__(self, cfg, layer_idx):
        super().__init__()
        self.cfg = cfg
        D, E = cfg.d_model, cfg.ssm_expand * cfg.d_model
        self.P, self.N = cfg.ssm_head_dim, cfg.ssm_state
        assert E % self.P == 0
        self.nh, self.E = E // self.P, E
        self.in_proj = nn.Linear(D, 2 * E + 2 * self.N + self.nh, bias=cfg.bias)  # x, z (gate), B, C, dt
        self.conv = nn.Conv1d(E + 2 * self.N, E + 2 * self.N, cfg.ssm_conv, groups=E + 2 * self.N, padding=cfg.ssm_conv - 1)
        self.A_log = nn.Parameter(torch.log(torch.linspace(1, 16, self.nh)))
        self.dt_bias = nn.Parameter(torch.log(torch.expm1(torch.exp(torch.linspace(math.log(1e-3), math.log(1e-1), self.nh)))))
        self.Dskip = nn.Parameter(torch.ones(self.nh))
        self.norm = nn.RMSNorm(E, eps=cfg.norm_eps)
        self.out_proj = nn.Linear(E, D, bias=cfg.bias)
        self.out_proj.is_residual_out = True

    def _causal_conv(self, xp):
        """Depthwise causal conv as k shifted multiply-adds (MPS's grouped conv1d is slow). xp is left-padded."""
        k, T = self.cfg.ssm_conv, xp.shape[-1] - self.cfg.ssm_conv + 1
        w = self.conv.weight[:, 0]                                          # (C, k)
        y = sum(xp[..., i:i + T] * w[:, i, None] for i in range(k))
        return y + self.conv.bias[:, None]

    def forward(self, x, pos, cache=None, record=False):
        B_, T, _ = x.shape
        E, N, nh, P = self.E, self.N, self.nh, self.P
        zxbcdt = self.in_proj(x)
        z, xbc, dt = zxbcdt.split([E, E + 2 * N, nh], -1)
        xbc_t = xbc.transpose(1, 2)                                         # (B, C, T)
        if cache is not None:                                              # keep the last (conv-1) inputs
            prev = cache.get("conv", xbc_t.new_zeros(B_, xbc_t.shape[1], self.cfg.ssm_conv - 1))
            full = torch.cat([prev, xbc_t], -1)
            cache["conv"] = full[..., -(self.cfg.ssm_conv - 1):]
            xbc = self._causal_conv(full)[..., -T:].transpose(1, 2)
        else:
            xbc = self._causal_conv(F.pad(xbc_t, (self.cfg.ssm_conv - 1, 0))).transpose(1, 2)
        xbc = F.silu(xbc)
        xs, Bm, Cm = xbc.split([E, N, N], -1)
        dt = F.softplus(dt + self.dt_bias)                                  # (B,T,nh) step sizes > 0
        A = -torch.exp(self.A_log.float())                                  # (nh,) negative: decay
        la = dt * A                                                         # log a_t, (B,T,nh)
        xh = xs.view(B_, T, nh, P)
        if cache is not None:                                               # recurrent form, one step at a time
            st = cache.get("state", x.new_zeros(B_, nh, P, N))
            ys = []
            for t in range(T):
                st = torch.exp(la[:, t])[..., None, None] * st + (dt[:, t, :, None, None] * xh[:, t, :, :, None]) * Bm[:, t, None, None, :]
                ys.append((st @ Cm[:, t, None, :, None]).squeeze(-1))       # (B,nh,P)
            cache["state"] = st
            y = torch.stack(ys, 1)
        else:                                                               # dual (quadratic) form over the sequence
            cs = torch.cumsum(la, 1).transpose(1, 2)                        # (B,nh,T)
            seg = cs[..., :, None] - cs[..., None, :]                       # (B,nh,Ti,Tj) = sum_{j<k<=i} log a_k
            causal = torch.ones(T, T, dtype=torch.bool, device=x.device).tril()
            L = torch.exp(seg.masked_fill(~causal, float("-inf")))           # decay from j to i, 0 above the diagonal
            G = (Cm @ Bm.transpose(1, 2))[:, None] * L                      # (B,nh,Ti,Tj): like an attention matrix
            y = (G @ (xh * dt[..., None]).transpose(1, 2)).transpose(1, 2)  # (B,T,nh,P)
        y = y + xh * self.Dskip[None, None, :, None]
        y = self.norm(y.reshape(B_, T, E) * F.silu(z))
        return self.out_proj(y), None


# ----------------------------------------------------------------------------------------- FFN and MoE
class FFN(nn.Module):
    def __init__(self, cfg, hidden):
        super().__init__()
        self.kind = cfg.ffn
        D = cfg.d_model
        if self.kind == "swiglu":
            self.gate = nn.Linear(D, hidden, bias=cfg.bias)
        self.up = nn.Linear(D, hidden, bias=cfg.bias)
        self.down = nn.Linear(hidden, D, bias=cfg.bias)
        self.down.is_residual_out = True

    def forward(self, x):
        h = F.silu(self.gate(x)) * self.up(x) if self.kind == "swiglu" else F.gelu(self.up(x), approximate="tanh")
        return self.down(h)


class MoE(nn.Module):
    """Top-k routed experts (+ optional shared experts). Records load, drops and choices for the labs."""

    def __init__(self, cfg):
        super().__init__()
        self.cfg, E = cfg, cfg.n_experts
        self.router = nn.Linear(cfg.d_model, E, bias=False)
        self.experts = nn.ModuleList(FFN(cfg, cfg.moe_hidden) for _ in range(E))
        self.shared = nn.ModuleList(FFN(cfg, cfg.moe_hidden) for _ in range(cfg.n_shared))
        self.register_buffer("e_bias", torch.zeros(E))                    # aux-loss-free balancing bias (not trained by SGD)
        self.last = {}

    def forward(self, x):
        cfg, (B, T, D) = self.cfg, x.shape
        xf = x.reshape(-1, D)
        n, E, k = xf.shape[0], cfg.n_experts, cfg.top_k
        logits = self.router(xf).float()
        scores = logits.sigmoid() if cfg.router == "sigmoid" else logits.softmax(-1)
        sel = scores + self.e_bias if cfg.balance == "bias" else scores     # the bias steers selection only
        top_i = sel.topk(k, -1).indices                                     # (n,k)
        top_w = scores.gather(-1, top_i)
        if cfg.router == "sigmoid" or k > 1:
            top_w = top_w / top_w.sum(-1, keepdim=True)                     # renormalise over the chosen experts
        out = torch.zeros_like(xf)
        load = torch.bincount(top_i.flatten(), minlength=E)                 # assignments per expert, before drops
        cap = math.ceil(cfg.capacity_factor * n * k / E) if cfg.capacity_factor else None
        dropped = 0
        for e in range(E):
            tok, slot = (top_i == e).nonzero(as_tuple=True)
            if cap is not None and tok.numel() > cap:                        # first come first served, the rest dropped
                dropped += tok.numel() - cap
                tok, slot = tok[:cap], slot[:cap]
            if tok.numel():
                out.index_add_(0, tok, self.experts[e](xf[tok]) * top_w[tok, slot, None].to(x.dtype))
        for s in self.shared:
            out = out + s(xf)
        aux = xf.new_zeros(())
        if cfg.balance == "aux" and self.training:                          # Switch: E * sum_i f_i * P_i
            f = load.float() / (n * k)
            aux = E * (f * scores.mean(0)).sum()
        if cfg.balance == "bias" and self.training:                         # DeepSeek-V3: nudge under-loaded experts up
            with torch.no_grad():
                self.e_bias += cfg.bias_rate * torch.sign(load.float().mean() - load.float())
        self.last = {"top_i": top_i.view(B, T, k), "top_w": top_w.view(B, T, k), "load": load,
                     "dropped_frac": dropped / max(1, n * k)}
        return out.view(B, T, D), aux


# ----------------------------------------------------------------------------------------- block and model
class Block(nn.Module):
    def __init__(self, cfg, layer_idx):
        super().__init__()
        self.cfg, self.li = cfg, layer_idx
        self.kind = cfg.layer_types[layer_idx]
        self.mix = Attention(cfg, layer_idx) if self.kind == "a" else SSM(cfg, layer_idx)
        self.is_moe = cfg.n_experts > 0 and (layer_idx + 1) % cfg.moe_every == 0
        self.ffn = MoE(cfg) if self.is_moe else FFN(cfg, cfg.ffn_hidden)
        self.n1, self.n2 = make_norm(cfg), make_norm(cfg)
        if cfg.norm_pos == "sandwich":
            self.n1b, self.n2b = make_norm(cfg), make_norm(cfg)

    def _ffn(self, h):
        if self.is_moe:
            return self.ffn(h)
        return self.ffn(h), h.new_zeros(())

    def forward(self, x, pos, cache=None, record=False):
        p = self.cfg.norm_pos
        if p == "post":        # original transformer / BERT: normalise AFTER the residual add
            a, w = self.mix(x, pos, cache, record)
            x = self.n1(x + a)
            f, aux = self._ffn(x)
            x = self.n2(x + f)
        elif p == "sandwich":  # Gemma 2/3: normalise the sub-layer input and its output, residual stays clean
            a, w = self.mix(self.n1(x), pos, cache, record)
            x = x + self.n1b(a)
            f, aux = self._ffn(self.n2(x))
            x = x + self.n2b(f)
        else:                  # pre-norm (GPT-2 onward): the residual stream is never normalised in place
            a, w = self.mix(self.n1(x), pos, cache, record)
            x = x + a
            f, aux = self._ffn(self.n2(x))
            x = x + f
        return x, w, aux


class GPT(nn.Module):
    def __init__(self, cfg: GPTConfig):
        super().__init__()
        self.cfg = cfg
        self.wte = nn.Embedding(cfg.vocab_size, cfg.d_model)
        if cfg.pos == "learned":
            self.wpe = nn.Embedding(cfg.max_pos, cfg.d_model)
        elif cfg.pos == "sinusoidal":
            self.register_buffer("wpe_table", sinusoidal_table(max(cfg.max_pos, 8192), cfg.d_model), persistent=False)
        self.drop = nn.Dropout(cfg.dropout)
        self.blocks = nn.ModuleList(Block(cfg, i) for i in range(cfg.n_layer))
        self.ln_f = make_norm(cfg) if cfg.norm_pos != "post" else nn.Identity()  # post-norm already ends normalised
        self.lm_head = nn.Linear(cfg.d_model, cfg.vocab_size, bias=False)
        self.apply(self._init)
        if cfg.tie_embeddings:
            self.lm_head.weight = self.wte.weight

    def _init(self, m):
        std = self.cfg.init_std
        if isinstance(m, nn.Linear):
            if getattr(m, "is_residual_out", False):   # GPT-2: scale residual-branch outputs by 1/sqrt(2L)
                std = std / math.sqrt(2 * self.cfg.n_layer)
            nn.init.normal_(m.weight, 0.0, std)
            if m.bias is not None:
                nn.init.zeros_(m.bias)
        elif isinstance(m, nn.Embedding):
            nn.init.normal_(m.weight, 0.0, std)

    def embed(self, idx, start=0):
        T = idx.shape[1]
        pos = torch.arange(start, start + T, device=idx.device)
        x = self.wte(idx)
        if self.cfg.pos == "learned":
            if start + T > self.cfg.max_pos:
                raise IndexError(f"learned positions stop at {self.cfg.max_pos}; got position {start + T - 1}")
            x = x + self.wpe(pos)
        elif self.cfg.pos == "sinusoidal":
            x = x + self.wpe_table[pos].to(x.dtype)
        return self.drop(x), pos

    def forward(self, idx, targets=None, cache=None, record=False, start=0):
        """idx (B,T) token ids. targets (B,T) -> mean cross-entropy. cache: list (one dict per layer) for decoding.
        record=True -> rec dict with resid_norm (L+1, B, T), attn [(B,H,T,Tk) or None], router [dict or None];
        record="hidden" also keeps the residual stream after every block (for the logit lens)."""
        if cache is not None and len(cache) == 0:
            cache.extend({} for _ in self.blocks)
        if cache is not None:
            start = cache[0].get("_len", 0)                     # tokens already in the cache
        x, pos = self.embed(idx, start)
        rec = {"resid_norm": [x.norm(dim=-1)], "attn": [], "router": []} if record else None
        if record == "hidden":
            rec["hidden"] = [x]
        aux_total = x.new_zeros(())
        for i, b in enumerate(self.blocks):
            x, w, aux = b(x, pos, cache[i] if cache is not None else None, bool(record))
            aux_total = aux_total + aux
            if record:
                rec["resid_norm"].append(x.norm(dim=-1)); rec["attn"].append(w)
                rec["router"].append(dict(b.ffn.last) if b.is_moe else None)
                if record == "hidden":
                    rec["hidden"].append(x)
        if cache is not None:
            for c in cache:
                c["_len"] = start + idx.shape[1]
        logits = self.lm_head(self.ln_f(x))
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.float().view(-1, logits.shape[-1]), targets.reshape(-1))
        if record:
            rec["resid_norm"] = torch.stack(rec["resid_norm"])
        return logits, loss, aux_total, rec

    @torch.no_grad()
    def generate(self, idx, n_new, temperature=0.0, top_k=None, generator=None, use_cache=True):
        """Greedy (temperature 0) or sampled continuation. With use_cache, one prefill then one token per step."""
        cache = [] if use_cache else None
        logits, *_ = self(idx, cache=cache)
        out = idx
        for _ in range(n_new):
            lg = logits[:, -1].float()
            if temperature <= 0:
                nxt = lg.argmax(-1, keepdim=True)
            else:
                lg = lg / temperature
                if top_k:
                    v, _ = lg.topk(top_k); lg[lg < v[:, -1:]] = float("-inf")
                nxt = torch.multinomial(lg.softmax(-1), 1, generator=generator)
            out = torch.cat([out, nxt], 1)
            if use_cache:
                logits, *_ = self(nxt, cache=cache)
            else:
                ctx = out[:, -self.cfg.max_pos:] if self.cfg.pos == "learned" else out
                logits, *_ = self(ctx)
        return out

    # ---------------------------------------------------------------- accounting helpers used by the labs
    def param_groups(self):
        """Parameter counts by component; 'active' counts top_k routed experts per token (plus shared)."""
        g = {"embedding": self.wte.weight.numel(), "position": 0, "attention": 0, "ssm": 0, "ffn_dense": 0,
             "moe_experts": 0, "moe_shared": 0, "router": 0, "norms": 0,
             "lm_head": 0 if self.cfg.tie_embeddings else self.lm_head.weight.numel()}
        if self.cfg.pos == "learned":
            g["position"] = self.wpe.weight.numel()
        active_experts = 0
        for b in self.blocks:
            g["attention" if b.kind == "a" else "ssm"] += sum(p.numel() for p in b.mix.parameters())
            for n in ("n1", "n2", "n1b", "n2b"):
                if hasattr(b, n):
                    g["norms"] += sum(p.numel() for p in getattr(b, n).parameters())
            if b.is_moe:
                per = sum(p.numel() for p in b.ffn.experts[0].parameters())
                g["moe_experts"] += per * len(b.ffn.experts)
                g["moe_shared"] += sum(p.numel() for p in b.ffn.shared.parameters())
                g["router"] += b.ffn.router.weight.numel()
                active_experts += per * self.cfg.top_k
            else:
                g["ffn_dense"] += sum(p.numel() for p in b.ffn.parameters())
        g["norms"] += sum(p.numel() for p in self.ln_f.parameters())
        g["total"] = sum(p.numel() for p in self.parameters())   # tied weights counted once
        g["active"] = g["total"] - g["moe_experts"] + active_experts
        g["non_embedding"] = g["total"] - g["embedding"] - g["position"]
        return g


def kv_cache_bytes_per_token(cfg: GPTConfig, bytes_per_el=2, context=None):
    """Bytes cached per token across all layers. Attention layers: 2*Hk*hd (MHA/GQA/MQA) or d_c + d_r (MLA).
    With a sliding window and `context`, local layers hold at most `window` tokens: returns the average per token.
    SSM layers cache a constant state instead (see ssm_state_bytes)."""
    total = 0.0
    for i, t in enumerate(cfg.layer_types):
        if t != "a":
            continue
        per = (cfg.mla_kv_latent + (cfg.mla_rope_dim if cfg.pos == "rope" else 0)) if cfg.attn == "mla" else 2 * cfg.n_kv_head * cfg.head_dim
        if context and is_local(cfg, i):
            per = per * min(cfg.window, context) / context
        total += per * bytes_per_el
    return total


def ssm_state_bytes(cfg: GPTConfig, bytes_per_el=2):
    E = cfg.ssm_expand * cfg.d_model
    per = E * cfg.ssm_state + (E + 2 * cfg.ssm_state) * (cfg.ssm_conv - 1)
    return per * bytes_per_el * cfg.layer_types.count("s")
