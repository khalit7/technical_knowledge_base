"""JAX's derivative transforms on the root page's tiny model (x = (2, 1), W rows (1,0),(0,1),(1,-2), target sat)."""
import json, jax, jax.numpy as jnp
jax.config.update("jax_enable_x64", True)

W = jnp.array([[1., 0.], [0., 1.], [1., -2.]])
x = jnp.array([2., 1.])
y = 2

def loss(W, x):
    z = W @ x
    return jax.nn.logsumexp(z) - z[y]

out = {"jax": jax.__version__}
out["loss"] = float(loss(W, x))
gW, gx = jax.grad(loss, argnums=(0, 1))(W, x)
out["grad_W"] = gW.tolist(); out["grad_x"] = gx.tolist()
# forward mode: one JVP along a direction of x
u = jnp.array([1., 0.])
val, tan = jax.jvp(lambda x: loss(W, x), (x,), (u,))
out["jvp_x_e1"] = float(tan)
# reverse mode: VJP of z = W x with the cotangent p - y
z, vjp_fn = jax.vjp(lambda x: W @ x, x)
p = jax.nn.softmax(z)
cot = p - jnp.eye(3)[y]
out["vjp_x"] = vjp_fn(cot)[0].tolist()
out["jaxpr_grad_x"] = str(jax.make_jaxpr(jax.grad(loss, argnums=1))(W, x))
out["jaxpr_loss"] = str(jax.make_jaxpr(loss)(W, x))
# Hessian-vector product, forward-over-reverse, against the explicit Hessian in x
hvp = jax.jvp(jax.grad(lambda x: loss(W, x)), (x,), (u,))[1]
H = jax.hessian(lambda x: loss(W, x))(x)
out["hvp_x_e1"] = hvp.tolist(); out["hessian_x"] = H.tolist()
json.dump(out, open("out/jax.json", "w"), indent=1)
print(json.dumps({k: v for k, v in out.items() if not k.startswith("jaxpr")}))
print(out["jaxpr_loss"]); print(out["jaxpr_grad_x"])
