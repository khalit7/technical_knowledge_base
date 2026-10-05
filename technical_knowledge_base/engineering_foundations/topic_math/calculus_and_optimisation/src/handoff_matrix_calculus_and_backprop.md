# Hand-off to Matrix calculus and backprop (from Calculus and optimisation for ML, 2026-10-05)

The old "Calculus and optimisation for ML" page (saved verbatim in `live.md`) had a "Chain rule, backprop, VJPs" section and a few mistakes and resources about backprop. They belong to the matrix-calculus page; the calculus page links it instead of repeating them. Verbatim from `live.md` (lines 79 to 96, 220 to 221, 242, 247 to 248), then the checks.

## Chain rule, backprop, VJPs
For a composition $`L = f_k(f_{k-1}(\dots f_1(x)))`$ the chain rule says the Jacobians multiply:
$$
\frac{\partial L}{\partial x} = J_{f_k} \, J_{f_{k-1}} \cdots J_{f_1}.
$$
where $`J_{f_i}`$ is the Jacobian of step $`i`$ evaluated at the input it saw on this forward pass. Because $`L`$ is a scalar, $`J_{f_k}`$ is a single row, and the product is the same whichever end you start from, but the cost is not.
- **Reverse mode (backprop)** starts at the loss end and carries a row vector leftwards through the product: $`v^\top \leftarrow v^\top J_{f_i}`$, from $`i = k`$ down to 1, the opposite direction to the forward pass. Each step is a **vector-Jacobian product (VJP)**: each operation answers "given the gradient of the loss with respect to my output ($`v`$), what is it with respect to my inputs?" without ever building $`J`$. One backward pass gives the gradient with respect to every parameter. The backward pass costs about twice the forward pass, so a training step costs about three forward passes; this is the accounting behind the estimate of 6N floating-point operations per training token for a model with N parameters, 2N forward and 4N backward ([Kaplan et al. 2020, section 2.1](https://arxiv.org/abs/2001.08361)). The binding constraint is usually memory rather than compute: the backward pass needs the activations stored during the forward pass. **Activation checkpointing** stores only some of them and recomputes the rest during the backward pass; the scheme of [Chen et al. 2016](https://arxiv.org/abs/1604.06174) trains an $`n`$-layer network in $`O(\sqrt{n})`$ activation memory for the cost of one extra forward pass per mini-batch. Reverse mode is the right choice when outputs (one loss) are far fewer than inputs (billions of parameters).
- **Forward mode** carries a column vector $`u`$ from the input end alongside the forward pass, computing **Jacobian-vector products (JVPs)** $`Ju`$: the derivative of every output along one input direction. It is efficient when inputs are few and outputs many; for a gradient over $`n`$ parameters it would need $`n`$ passes.
- **Hessian-vector products** combine the two: $`Hv = \nabla_\theta(\nabla_\theta L \cdot v)`$. Take the gradient, dot it with a fixed vector $`v`$, and differentiate again. The cost is a small constant multiple of one gradient, and the $`n \times n`$ matrix is never formed.
Example VJPs, where a bar denotes the gradient of the loss with respect to that quantity ($`\bar{X} = \partial L / \partial X`$, the same shape as $`X`$):
- Matrix multiply $`Y = XW`$, with $`X`$ of shape $`b \times d`$, $`W`$ of shape $`d \times m`$ and $`Y`$ of shape $`b \times m`$: $`\bar{X} = \bar{Y}W^\top`$ ($`b \times m`$ times $`m \times d`$) and $`\bar{W} = X^\top \bar{Y}`$ ($`d \times b`$ times $`b \times m`$). The shapes force the answer.
- Elementwise $`y = \phi(x)`$: $`\bar{x} = \bar{y} \odot \phi'(x)`$, where $`\odot`$ is the elementwise product. For ReLU, $`\phi'`$ is 1 where $`x > 0`$ and 0 elsewhere, so the gradient is simply masked.
- A bias added to every row of a batch: its gradient is the sum of $`\bar{Y}`$ over the rows, because one parameter fed $`b`$ outputs.
Worked example: one logistic-regression unit, with $`x = (1, 2)`$, $`w = (0.5, -0.25)`$, $`b = 0.1`$ and label $`y = 1`$.
1. Forward: $`z = w \cdot x + b = 0.5 - 0.5 + 0.1 = 0.1`$, $`p = \sigma(0.1) = 0.525`$, loss $`-\log 0.525 = 0.644`$.
2. Backward through the loss: $`\bar{z} = p - y = -0.475`$.
3. Backward through $`z = w \cdot x + b`$: $`\bar{w} = \bar{z}\,x = (-0.475, -0.950)`$, $`\bar{b} = \bar{z} = -0.475`$, and $`\bar{x} = \bar{z}\,w = (-0.2375, 0.1188)`$, which is what an earlier layer would receive.
4. A gradient step with $`\eta = 0.1`$ gives $`w = (0.5475, -0.155)`$ and $`b = 0.1475`$; the new logit is $`0.5475 - 0.31 + 0.1475 = 0.385`$ and $`p = 0.595`$: the probability of the true class rose.

- **Transposed gradients.** A paper's $`\partial L / \partial W`$ may be the transpose of the gradient autograd stores on `W`, which always has the shape of `W`.
- **"Backprop costs the same as the forward pass."** It costs about twice as much, and memory for stored activations, not compute, is usually what runs out.

- [CS231n backprop notes](https://cs231n.github.io/optimization-2/) (\~30 min): backprop as local gradient routing, staged computation.
- [Chen et al. 2016, Training Deep Nets with Sublinear Memory Cost](https://arxiv.org/abs/1604.06174) (paper, \~40 min): activation checkpointing.
- [Kaplan et al. 2020, Scaling Laws for Neural Language Models, section 2.1](https://arxiv.org/abs/2001.08361) (\~10 min for the section): the 6N compute accounting.

## Checks
- Chain rule as a product of Jacobians; reverse mode as repeated VJPs; forward mode as JVPs; Hessian-vector product identity: verified (standard; Pearlmutter 1994 for exact HVPs).
- "Backward about twice forward; 6N FLOPs per token, 2N forward and 4N backward": verified (Kaplan et al. 2020, section 2.1, non-embedding compute), as in the root's `src/read/children_notes.md`.
- Chen et al. 2016: O(sqrt n) activation memory for one extra forward pass per mini-batch: verified (abstract and section 4).
- Example VJPs (matmul, elementwise, bias sum): verified by shapes.
- Logistic unit: z 0.1, p 0.525, loss 0.644, zbar -0.475, wbar (-0.475, -0.950), bbar -0.475, xbar (-0.2375, 0.1188), new w (0.5475, -0.155), b 0.1475, z 0.385, p 0.595: all verified by `recompute.py` (lu_*). The matrix-calculus page already carries it (its section 5a).
- No corrections needed in this section. The calculus page keeps the meaning of the Hessian, Newton, the loss gradients (with the corrected softmax sum 11.213) and uses HVPs only as a tool (power iteration in section 17).
