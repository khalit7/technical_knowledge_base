Here is the result of "fetch" for the Page with URL https://app.notion.com/p/3c65c17b0d0d81eb8b49ed6a0f897f3b as of 2026-09-30T16:04:35.784Z:
<page url="https://app.notion.com/p/3c65c17b0d0d81eb8b49ed6a0f897f3b">
<ancestor-path>
<parent-page url="https://app.notion.com/p/3c65c17b0d0d81cdb851c0835b25a538" title="Topic: math"/>
<ancestor-2-page url="https://app.notion.com/p/3c65c17b0d0d81c7b646e548e65d9446" title="Technical knowledge base"/>
<ancestor-3-page url="https://app.notion.com/p/3b75c17b0d0d8148b63dd36e88459017" title="Me"/>
</ancestor-path>
<properties>
{"title":"Calculus and optimisation for ML"}
</properties>
<iconMetadata>null</iconMetadata>
<content>
<embed src="notion-file-block://d38cd48a-75e3-4790-9c8f-393e0707b035/35c1b2b4-1f89-4385-b977-077531412a71?space_id=13e79c56-ebab-4528-83aa-967a204b1f04&name=calculus-and-optimisation-for-ml.html">Interactive: Calculus and optimisation for ML</embed>
⏱ 25 min read · +8h 45m resources
## What it is and why it matters
Training a model means choosing parameters $`\theta`$ that make one scalar number, the loss $`L(\theta)`$, small. Calculus says which way is downhill and how sharply the ground curves; optimisation turns that into steps. Almost every practical question about training is one of four questions about that loss surface:
- **Which way is down?** The gradient. For the standard losses it has a strikingly simple form at the output, prediction minus target, and that is why the losses are computed on logits.
- **How do you get the gradient of a billion parameters at once?** Reverse-mode automatic differentiation (backprop), which chains local vector-Jacobian products and never builds a Jacobian, so a backward pass costs about twice a forward pass.
- **How far should you step?** The curvature, held in the Hessian. It sets the largest learning rate that does not diverge, explains why long narrow valleys make training slow, and is what second-order methods such as Newton's method and XGBoost's leaf weights exploit.
- **When is the answer guaranteed?** Convexity says when a local minimum is the global one, and Lagrange multipliers handle optimising under a constraint, such as a KL budget on a policy update.
The picture to carry through the page: a gradient is a local linear model of the loss, a Hessian is a local quadratic model, and every optimiser is a rule for how far to trust that model.
## Definitions
- **Gradient.** For a scalar function $`L : \mathbb{R}^n \to \mathbb{R}`$, the vector $`g = \nabla L`$ of partial derivatives $`g_i = \partial L / \partial \theta_i`$. It points in the direction of steepest increase, so $`-g`$ is steepest descent, and for a small step $`\delta`$, $`L(\theta + \delta) \approx L(\theta) + g^\top \delta`$.
- **Jacobian.** For a vector function $`f : \mathbb{R}^n \to \mathbb{R}^m`$, the $`m \times n`$ matrix $`J_{ij} = \partial f_i / \partial x_j`$; row $`i`$ is the gradient of output $`i`$. Whether a gradient is written as a row or a column (numerator versus denominator layout) is covered on <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d89c26e1dab2fcb701"/>; autograd always returns a gradient in the shape of the parameter.
- **Hessian.** The $`n \times n`$ matrix of second derivatives $`H_{ij} = \partial^2 L / \partial \theta_i \partial \theta_j`$, symmetric whenever those derivatives are continuous. Its eigenvalues are the curvatures along its eigenvectors: large means a steep wall, small a flat floor, negative a direction that curves downwards.
- **Logit.** The model's raw score $`z`$ before the final activation; a sigmoid or softmax turns it into a probability.
- **Stationary (critical) point.** A point where $`g = 0`$: a minimum, a maximum or a saddle.
- **Gradient descent and learning rate.** The update $`\theta \leftarrow \theta - \eta g`$, where the learning rate (LR) $`\eta > 0`$ is the step size.
- **Condition number.** $`\kappa = \lambda_{\max}(H) / \lambda_{\min}(H)`$, the ratio of the largest to the smallest Hessian eigenvalue at a minimum: how elongated the valley is.
## Differentiation of each cost function (flagged question)
Setup: $`n`$ examples; the model's output before the final activation is the logit $`z = f_\theta(x)`$, where $`f_\theta`$ is the network with parameters $`\theta`$ and $`x`$ is the input. The gradient of the loss with respect to $`z`$ is what backprop pushes into the network, so it is the one derivative worth knowing by heart for each loss. All three standard losses produce the same form: prediction minus target.
### MSE (linear output)
Mean squared error (MSE) with an identity output, $`\hat{y}_i = z_i`$:
$$
L = \frac{1}{n}\sum_{i=1}^{n} (\hat{y}_i - y_i)^2, \qquad \frac{\partial L}{\partial z_i} = \frac{2}{n}(\hat{y}_i - y_i).
$$
where $`\hat{y}_i`$ is the prediction for example $`i`$, $`y_i`$ its real-valued target and $`n`$ the number of examples. The constant $`2/n`$ is absorbed by the learning rate.
For linear regression, $`\hat{y} = Xw`$:
$$
\nabla_w L = \frac{2}{n} X^\top (Xw - y), \qquad \nabla_w L = 0 \iff X^\top X w = X^\top y.
$$
where $`X`$ is the $`n \times d`$ design matrix (one row per example, one column per feature), $`w`$ the $`d`$-vector of weights and $`y`$ the $`n`$-vector of targets. The right-hand equation is the **normal equations**: at the optimum the residual $`Xw - y`$ is orthogonal to every column of $`X`$.
Worked example: the points $`(x, y) = (1, 1), (2, 3), (3, 4)`$ with an intercept column, so the rows of $`X`$ are $`(1, x_i)`$. Then $`X^\top X = \begin{pmatrix} 3 & 6 \\ 6 & 14 \end{pmatrix}`$ and $`X^\top y = (8, 19)`$. The determinant is $`3 \cdot 14 - 6 \cdot 6 = 6`$, so $`w = \frac{1}{6}\begin{pmatrix} 14 & -6 \\ -6 & 3 \end{pmatrix}(8, 19) = (-1/3,\ 3/2)`$: the line $`\hat{y} = -0.333 + 1.5x`$. Check: the residuals $`\hat{y}_i - y_i`$ are $`(0.167, -0.333, 0.167)`$; they sum to 0 (orthogonal to the intercept column) and $`1(0.167) + 2(-0.333) + 3(0.167) = 0`$ (orthogonal to the $`x`$ column).
### BCE + sigmoid
Binary cross-entropy (BCE) for a label $`y \in \{0, 1\}`$:
$$
L = -\big[y \log p + (1-y)\log(1-p)\big], \qquad p = \sigma(z) = \frac{1}{1+e^{-z}}.
$$
where $`p`$ is the predicted probability of class 1, $`\sigma`$ the logistic sigmoid and $`\log`$ the natural logarithm. Two ingredients:
$$
\frac{\partial L}{\partial p} = -\frac{y}{p} + \frac{1-y}{1-p} = \frac{p - y}{p(1-p)}, \qquad \sigma'(z) = \sigma(z)(1 - \sigma(z)) = p(1-p).
$$
The first blows up as $`p \to 0`$ or $`1`$; the second is the sigmoid's self-referential derivative. The chain rule multiplies them:
$$
\frac{\partial L}{\partial z} = \frac{\partial L}{\partial p} \cdot \frac{\partial p}{\partial z} = \frac{p - y}{p(1-p)} \cdot p(1-p) = p - y.
$$
The $`p(1-p)`$ factors cancel exactly. This is why you compute BCE on logits, not on probabilities: the combined gradient never divides by $`p`$ or $`1-p`$, so nothing blows up when $`p \to 0`$ or $`1`$, and the loss itself can be written as $`\log(1 + e^{z}) - yz = \max(z, 0) - yz + \log(1 + e^{-|z|})`$, which never exponentiates a large positive number (PyTorch's `BCEWithLogitsLoss`).
Worked example: $`z = -6`$, $`y = 1`$, a confidently wrong prediction. $`p = \sigma(-6) = 0.0025`$, the loss is $`-\log 0.0025 = 6.0025`$ and the gradient is $`p - y = -0.9975`$, close to the largest push the loss can give. At $`z = 2`$, $`y = 1`$: $`p = 0.8808`$, loss $`0.1269`$, gradient $`-0.1192`$, a small push, because the prediction is already right.
### Cross-entropy + softmax
For $`K`$ classes, softmax cross-entropy (CE):
$$
L = -\log p_y, \qquad p_k = \frac{e^{z_k}}{\sum_{j=1}^{K} e^{z_j}}.
$$
where $`z \in \mathbb{R}^K`$ is the logit vector, $`p_k`$ the predicted probability of class $`k`$ and $`y`$ the index of the true class. The softmax Jacobian is
$$
\frac{\partial p_k}{\partial z_j} = p_k(\delta_{kj} - p_j), \qquad \text{i.e. } J = \operatorname{diag}(p) - pp^\top.
$$
where $`\delta_{kj}`$ is 1 if $`k = j`$ and 0 otherwise (the Kronecker delta) and $`\operatorname{diag}(p)`$ is the diagonal matrix with $`p`$ on its diagonal. Since $`\partial L / \partial p_y = -1/p_y`$:
$$
\frac{\partial L}{\partial z_j} = -\frac{1}{p_y}\cdot p_y(\delta_{yj} - p_j) = p_j - \delta_{yj}, \qquad \text{i.e. } \nabla_z L = p - \mathbf{1}_y.
$$
where $`\mathbf{1}_y`$ is the one-hot vector of the true class. Again exactly prediction minus one-hot target. With soft labels, a target distribution $`q`$ instead of a single class (as in knowledge distillation or label smoothing), $`L = -\sum_k q_k \log p_k`$ and $`\nabla_z L = p - q`$.
Worked example: $`z = (2, 1, 0.1)`$ with class 1 true. $`e^{z} = (7.389, 2.718, 1.105)`$, summing to $`11.212`$, so $`p = (0.659, 0.242, 0.099)`$. The loss is $`-\log 0.659 = 0.417`$ and the gradient is $`p - \mathbf{1}_y = (-0.341, 0.242, 0.099)`$. The components sum to zero, because adding the same constant to every logit leaves the softmax unchanged; the true logit is pushed up and each other logit is pushed down in proportion to the probability it took. A finite-difference check (nudge each logit by $`\pm 10^{-5}`$ and difference the loss) reproduces all three numbers to four decimals.
### Why the simplification matters
1. **Numerical stability.** Nothing takes the log of, or divides by, a saturated probability. Frameworks fuse softmax and CE (`CrossEntropyLoss` takes logits) and use the log-sum-exp trick $`\log \sum_j e^{z_j} = m + \log \sum_j e^{z_j - m}`$ with $`m = \max_j z_j`$, so the largest exponent is $`e^0 = 1`$. For logits $`(1000, 1001)`$, $`e^{1001}`$ overflows even in float64, while the trick gives $`1001 + \log(e^{-1} + 1) = 1001.313`$.
2. **No vanishing gradient at the output.** A confidently wrong prediction ($`p \to 0`$ for the true class) still gives a gradient of magnitude close to 1, whereas MSE on a sigmoid output, $`L = (p - y)^2`$, has $`\partial L / \partial z = 2(p - y)\,p(1-p)`$ and so multiplies by $`\sigma'(z) \to 0`$ and stalls. At $`z = -6`$, $`y = 1`$: CE gives $`-0.9975`$, MSE gives $`2(0.0025 - 1)(0.0025)(0.9975) = -0.0049`$, about 200 times smaller. This is the concrete reason CE, not MSE, is used for classification.
3. **Cheap backprop.** The $`K \times K`$ softmax Jacobian, $`O(K^2)`$, is never materialised; the fused gradient $`p - \mathbf{1}_y`$ costs $`O(K)`$. For a language model $`K`$ is the vocabulary size, so a $`K \times K`$ matrix per token would be prohibitive.
4. **The same story from the generalised linear model (GLM) view.** A GLM models the target with an exponential-family distribution whose natural parameter is the logit. With the canonical link (logit for Bernoulli, log for Poisson, identity for Gaussian), the gradient of the negative log-likelihood with respect to the natural parameter is always mean minus target, $`\nabla_z L = \mu - y`$. Sigmoid with Bernoulli, softmax with categorical and identity with Gaussian (MSE up to a constant) are instances, which is why the three derivations above end in the same place. How each loss is the negative log-likelihood of its distribution is derived on <mention-page url="https://app.notion.com/p/3c65c17b0d0d815f9a47d613409b5a0c"/>.
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
## Second-order differentiation (flagged question)
The Hessian is the symmetric matrix of curvatures, and it is the second term of the Taylor expansion of the loss:
$$
L(\theta + \delta) \approx L(\theta) + g^\top \delta + \tfrac{1}{2}\delta^\top H \delta.
$$
where $`g = \nabla L(\theta)`$ is the gradient, $`H`$ the Hessian at $`\theta`$ and $`\delta`$ a small step. Along a unit eigenvector $`u`$ of $`H`$ with eigenvalue $`\lambda`$, the loss curves like $`\tfrac{1}{2}\lambda t^2`$ as you move a distance $`t`$. Five places this matters follow.
### Newton's method
Minimise the quadratic model exactly: its gradient is $`g + H\delta`$, and setting that to zero gives
$$
\delta = -H^{-1} g.
$$
where $`\delta`$ is the Newton step. It divides each eigendirection by its curvature: big steps along flat directions, small steps along steep ones. On an exact quadratic it lands on the minimum in one step from anywhere, and it is invariant to linear reparameterisation (rescaling a parameter by 1000 changes nothing). It needs $`H \succ 0`$: with a negative eigenvalue the step heads towards a maximum or a saddle, which is why practical versions add damping or a trust region. It is impractical at $`n = 10^9`$ parameters, where $`H`$ has $`10^{18}`$ entries ($`O(n^2)`$ memory, $`O(n^3)`$ to solve). Hence the approximations:
- **Quasi-Newton methods** such as L-BFGS (limited-memory Broyden-Fletcher-Goldfarb-Shanno), which build a low-rank curvature estimate from the last few gradient differences.
- **K-FAC** (Kronecker-factored approximate curvature), which approximates each layer's block of the curvature as a Kronecker product of two small matrices.
- **Hessian-free methods**, which solve $`H\delta = -g`$ by conjugate gradient using only Hessian-vector products.
- **Diagonal methods.** Adam's second-moment estimate is a running mean of squared gradients, closer to the diagonal of the empirical Fisher matrix than to the Hessian's diagonal, and Adam divides by its square root: a crude diagonal curvature proxy, not a Newton step. The optimiser mechanics live on <mention-page url="https://app.notion.com/p/3c65c17b0d0d817080bbc90954681d09"/>.
### XGBoost's leaves are Newton steps
XGBoost (extreme gradient boosting) adds one regression tree per round to the current prediction $`\hat{y}^{(t-1)}`$, and fits it using a second-order Taylor expansion of the loss for each example ([XGBoost docs, Introduction to boosted trees](https://xgboost.readthedocs.io/en/stable/tutorials/model.html)):
$$
g_i = \frac{\partial\, l(y_i, \hat{y}_i^{(t-1)})}{\partial \hat{y}}, \qquad h_i = \frac{\partial^2 l(y_i, \hat{y}_i^{(t-1)})}{\partial \hat{y}^2}.
$$
where $`l`$ is the per-example loss. A leaf $`j`$ collects the examples $`I_j`$ with sums $`G_j = \sum_{i \in I_j} g_i`$ and $`H_j = \sum_{i \in I_j} h_i`$. Minimising $`G_j w + \tfrac{1}{2}(H_j + \lambda) w^2`$ over the leaf value $`w`$ gives
$$
w_j^* = -\frac{G_j}{H_j + \lambda}, \qquad \text{obj}^* = -\frac{1}{2}\sum_{j=1}^{T} \frac{G_j^2}{H_j + \lambda} + \gamma T.
$$
and a candidate split of a leaf into left and right children is scored by
$$
\text{Gain} = \frac{1}{2}\left[\frac{G_L^2}{H_L + \lambda} + \frac{G_R^2}{H_R + \lambda} - \frac{(G_L + G_R)^2}{H_L + H_R + \lambda}\right] - \gamma.
$$
where $`\lambda`$ is the L2 penalty on leaf values, $`\gamma`$ the penalty per leaf, $`T`$ the number of leaves, and $`L`$, $`R`$ the two children. $`w^*`$ is a per-leaf Newton step, $`-G/H`$ damped by $`\lambda`$, which is why XGBoost needs losses with defined second derivatives.
Worked example, logistic loss, where $`g = p - y`$ and $`h = p(1 - p)`$: four examples at a current prediction of 0 (so $`p = 0.5`$) with labels 1, 1, 1, 0, and $`\lambda = 1`$. Then $`g = (-0.5, -0.5, -0.5, 0.5)`$ and every $`h = 0.25`$. As one leaf: $`G = -1`$, $`H = 1`$, $`w^* = 1/(1 + 1) = 0.5`$, a step of half a unit of log-odds towards the majority label. Splitting the three positives from the negative: $`G_L = -1.5`$, $`H_L = 0.75`$, $`G_R = 0.5`$, $`H_R = 0.25`$, so $`\text{Gain} = \tfrac{1}{2}[2.25/1.75 + 0.25/1.25 - 1/2] - \gamma = \tfrac{1}{2}[1.286 + 0.2 - 0.5] - \gamma = 0.493 - \gamma`$. The split is made if $`\gamma < 0.493`$, and the children get $`w_L = 1.5/1.75 = 0.857`$ and $`w_R = -0.5/1.25 = -0.4`$.
### Curvature and conditioning
On a quadratic $`L = \tfrac{1}{2}\theta^\top H \theta`$ (the Taylor model near a minimum), gradient descent treats each eigendirection of $`H`$ separately:
$$
\theta_i^{(t)} = (1 - \eta\lambda_i)^t \, \theta_i^{(0)}.
$$
where $`\theta_i`$ is the component of $`\theta`$ along the eigenvector with eigenvalue $`\lambda_i`$ and $`t`$ counts steps. Three consequences follow.
- **Stability.** Every component shrinks only if $`|1 - \eta\lambda_i| < 1`$, so gradient descent diverges if $`\eta > 2/\lambda_{\max}`$: the steepest direction overshoots by more each step.
- **Rate.** With the best fixed step, $`\eta = 2/(\lambda_{\max} + \lambda_{\min})`$, the error contracts per step by $`\frac{\kappa - 1}{\kappa + 1}`$, where $`\kappa = \lambda_{\max}/\lambda_{\min}`$. An ill-conditioned surface (large $`\kappa`$, a long narrow valley) forces a step small enough for the steep walls, so the flat floor is crossed slowly and the path zig-zags. Heavy-ball momentum with tuned settings improves the contraction to $`\frac{\sqrt{\kappa} - 1}{\sqrt{\kappa} + 1}`$, and normalisation layers and good initialisation are largely conditioning fixes.
- **Edge of stability.** In full-batch gradient descent on neural networks the top Hessian eigenvalue rises during training until it hovers just above $`2/\eta`$, and the loss still falls over long timescales while oscillating over short ones ([Cohen et al. 2021](https://arxiv.org/abs/2103.00065)).
Worked example: $`H = \operatorname{diag}(1, 10)`$, so $`\kappa = 10`$. Gradient descent diverges above $`\eta = 2/10 = 0.2`$. The best fixed step is $`\eta = 2/11 = 0.182`$, contracting the error by $`9/11 = 0.818`$ per step, so cutting it a thousandfold takes $`\ln 1000 / \ln(11/9) = 34.4`$, that is 35 steps. Momentum contracts by $`(\sqrt{10} - 1)/(\sqrt{10} + 1) = 0.519`$ per step, about 11 steps. Newton's method takes one.
### Classifying critical points
At a point with $`g = 0`$: $`H \succ 0`$ (every eigenvalue positive) is a local minimum, $`H \prec 0`$ a local maximum, and mixed signs a saddle; a zero eigenvalue leaves the test inconclusive. Example: $`f(x, y) = x^2 - y^2`$ has $`g = 0`$ at the origin and $`H = \operatorname{diag}(2, -2)`$, a saddle, a minimum along $`x`$ and a maximum along $`y`$. In high dimensions saddles are the main obstacle rather than local minima ([Dauphin et al. 2014](https://arxiv.org/abs/1406.2572)); the noise in stochastic gradient descent (SGD) helps escape them, because a saddle is unstable along its negative-curvature direction and any push along it grows.
### Second-order structure elsewhere
- The **Gauss-Newton matrix** and the **Fisher information matrix** are positive semidefinite (PSD) approximations of the Hessian. The natural gradient preconditions by the inverse Fisher, and K-FAC approximates it.
- **Influence functions** estimate how the model would change if one training example were removed, and $`H^{-1}`$ appears in the estimate.
- **Sharpness-aware minimisation (SAM)** seeks flat minima, neighbourhoods of low curvature, by minimising the worst-case loss within a small ball around the parameters.
- **Optimal Brain Damage (OBD)** pruning scores each weight by $`\tfrac{1}{2}H_{ii}w_i^2`$, its diagonal-Hessian estimate of how much the loss rises when the weight is removed.
## Convexity basics
A function $`f`$ is convex if and only if, for all $`x, y`$ and every $`t \in [0, 1]`$,
$$
f(tx + (1-t)y) \le t f(x) + (1-t) f(y).
$$
where $`t`$ is an interpolation weight: every chord lies on or above the graph. Equivalently, for differentiable $`f`$, $`f(y) \ge f(x) + \nabla f(x)^\top (y - x)`$: the function sits above every tangent, so a point with $`\nabla f = 0`$ is a global minimum. Equivalently, for twice-differentiable $`f`$, $`H \succeq 0`$ everywhere. Consequences: every local minimum is global, first-order stationarity suffices, and the set of minimisers is convex. For $`f(x) = x^2`$ between $`-1`$ and $`3`$ at $`t = 0.5`$: $`f(1) = 1 \le \tfrac{1}{2}(1 + 9) = 5`$.
Convex in their parameters: least squares, logistic regression, support vector machines (SVMs) and the lasso. Deep networks are not: permuting the hidden units of a layer gives a different point with the same loss, so there are many separate minima, and the average of two of them is usually not a minimum. But CE with logits is convex in the logits: $`L(z) = \log \sum_j e^{z_j} - z_y`$, and its Hessian with respect to $`z`$ is $`\operatorname{diag}(p) - pp^\top \succeq 0`$, the softmax Jacobian again. That is part of why the last layer is well behaved, and logistic regression is convex because a convex function of a linear map is convex.
Strong convexity with constant $`\mu > 0`$ and smoothness with constant $`\beta`$ (often written $`L`$) bound the curvature on both sides:
$$
\mu I \preceq H \preceq \beta I.
$$
where $`I`$ is the identity. Then gradient descent with $`\eta = 1/\beta`$ converges linearly: the gap $`f(\theta_t) - f^*`$ shrinks by a factor of at most $`1 - \mu/\beta = 1 - 1/\kappa`$ per step, with $`\kappa = \beta/\mu`$ the same condition number as above.
## Lagrange multipliers, briefly
To optimise $`f(x)`$ subject to $`g(x) = 0`$ (here $`g`$ is a constraint function, not a gradient): walking along the constraint, $`f`$ stops changing where every direction you are allowed to move, tangent to the constraint, is perpendicular to $`\nabla f`$. That happens exactly when the two gradients are parallel:
$$
\nabla f(x^*) = \lambda \nabla g(x^*), \qquad \mathcal{L}(x, \lambda) = f(x) - \lambda g(x).
$$
where $`x^*`$ is a constrained optimum, $`\lambda`$ the **Lagrange multiplier** and $`\mathcal{L}`$ the **Lagrangian**. The stationary points of $`\mathcal{L}`$ in both $`x`$ and $`\lambda`$ are the constrained candidates, because $`\partial \mathcal{L} / \partial \lambda = 0`$ is the constraint itself. The multiplier is a **shadow price**: if the constraint is $`g(x) = c`$, then $`\lambda = df^*/dc`$, how much the optimum improves per unit the constraint is relaxed.
Worked example: maximise $`f = x + y`$ on the unit circle, $`g = x^2 + y^2 - 1`$. Then $`(1, 1) = \lambda(2x, 2y)`$ gives $`x = y = 1/(2\lambda)`$, and the constraint gives $`x = y = 1/\sqrt{2} = 0.707`$, $`\lambda = 1/\sqrt{2} = 0.707`$ and $`f^* = \sqrt{2} = 1.414`$. Check the shadow price: on the circle $`x^2 + y^2 = c`$ the optimum is $`f^* = \sqrt{2c}`$, whose derivative $`1/\sqrt{2c}`$ is $`0.707`$ at $`c = 1`$, equal to $`\lambda`$.
Inequality constraints $`h_i(x) \le 0`$ bring the **Karush-Kuhn-Tucker (KKT) conditions**. To minimise $`f`$: stationarity $`\nabla f + \sum_i \mu_i \nabla h_i = 0`$, feasibility $`h_i(x) \le 0`$, multipliers $`\mu_i \ge 0`$, and complementary slackness $`\mu_i h_i(x) = 0`$ (a constraint either binds or has a zero multiplier). For a convex problem with a strictly feasible point (Slater's condition) they are necessary and sufficient.
ML sightings:
- **Softmax as maximum entropy.** Maximising entropy subject to a fixed expected score and probabilities summing to 1 gives $`p_k \propto e^{\beta s_k}`$ for scores $`s_k`$: a softmax, with the inverse temperature $`\beta`$ set by the multiplier.
- **Regularisation as a constraint.** Minimising the loss subject to $`\|w\|^2 \le t`$ is, through the KKT conditions, the same as minimising the loss plus $`\lambda\|w\|^2`$ for a matching $`\lambda \ge 0`$: the penalty weight is the multiplier of a norm-ball constraint.
- **SVM duality.** The SVM's dual problem has one multiplier per training example, and complementary slackness makes it zero for every example except the support vectors.
- **Trust-region policy updates.** TRPO (trust region policy optimisation) maximises a policy's surrogate objective subject to a bound on the average KL divergence between the old and new policies; the constraint's curvature is the Fisher matrix, so the step is a natural-gradient step computed with conjugate gradient. <mention-page url="https://app.notion.com/p/3c65c17b0d0d8180b808c8c0cf8ddbe6"/> explains it and the clipped objective of PPO that replaced it.
## Trade-offs: which method when
<table header-row="true">
<tr>
<td>Method</td>
<td>Uses</td>
<td>Cost per step</td>
<td>When</td>
</tr>
<tr>
<td>Gradient descent, SGD</td>
<td>Gradient</td>
<td>$`O(n)`$ memory, one backward pass</td>
<td>The default for deep networks; slow when $`\kappa`$ is large</td>
</tr>
<tr>
<td>Momentum, Adam</td>
<td>Gradient plus $`O(n)`$ running state</td>
<td>$`O(n)`$ extra memory per state vector</td>
<td>Deep learning in practice: momentum tolerates ill-conditioning, Adam adds diagonal rescaling</td>
</tr>
<tr>
<td>Newton</td>
<td>Gradient and full Hessian</td>
<td>$`O(n^2)`$ memory, $`O(n^3)`$ solve</td>
<td>Small smooth problems where the Hessian fits in memory; converges in few steps near a minimum</td>
</tr>
<tr>
<td>L-BFGS</td>
<td>Gradient plus the last $`m`$ gradient differences</td>
<td>$`O(mn)`$</td>
<td>Full-batch deterministic problems of moderate size; noisy mini-batch gradients corrupt its curvature estimate</td>
</tr>
<tr>
<td>Hessian-free, K-FAC</td>
<td>Hessian-vector products, or Kronecker factors per layer</td>
<td>A few gradients per step</td>
<td>When curvature matters and a full Hessian is out of reach</td>
</tr>
<tr>
<td>XGBoost leaves</td>
<td>Per-example $`g_i`$ and $`h_i`$</td>
<td>Two scalars per example</td>
<td>Boosted trees, where one Newton step per leaf is cheap</td>
</tr>
</table>
For derivatives themselves: reverse mode when there are few outputs and many inputs (every training loss), forward mode when there are few inputs and many outputs (sensitivity of many quantities to one hyperparameter), and Hessian-vector products whenever curvature is needed without the matrix.
## Common mistakes and misconceptions
- **Squashing twice.** Applying a sigmoid or softmax and then passing probabilities to a loss that expects logits (`BCEWithLogitsLoss`, `CrossEntropyLoss`) squashes twice and shrinks the gradients.
- **Log of a softmax in two steps.** Computing `softmax` and then `log` underflows to $`\log 0`$ for tiny probabilities; use the fused log-softmax, which applies the log-sum-exp trick.
- **MSE for classification.** On a sigmoid output it vanishes exactly when the model is confidently wrong: 200 times smaller than CE in the example above.
- **Transposed gradients.** A paper's $`\partial L / \partial W`$ may be the transpose of the gradient autograd stores on `W`, which always has the shape of `W`.
- **"Backprop costs the same as the forward pass."** It costs about twice as much, and memory for stored activations, not compute, is usually what runs out.
- **"Adam is a second-order method."** It rescales by the square root of a running mean of squared gradients, a diagonal quantity that is not the Hessian.
- **Blaming the data for a learning-rate blow-up.** A loss that oscillates and grows right after the learning rate was raised is the $`2/\lambda_{\max}`$ bound.
- **Treating **$`g = 0`$** as a minimum.** In high dimensions a stationary point is far more likely to be a saddle; check the curvature.
- **Newton with an indefinite Hessian.** Without damping it can step towards a maximum or a saddle.
- **Assuming the whole network is convex** because CE is convex in the logits. Convexity in the logits says nothing about convexity in the weights of earlier layers.
- **Mixing up the lambdas.** On this page $`\lambda`$ is an eigenvalue, a Lagrange multiplier and XGBoost's L2 penalty; the Lagrange view is what links the last two.
## How it connects
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81cdb851c0835b25a538">Topic: math</mention-page>: the map of the four mathematical areas, and the two objects they share: cross-entropy (a maximum-likelihood estimator, a code length, the quantity whose gradient is $`p - y`$, and the InfoNCE contrastive objective) and curvature (the Hessian, a matrix's condition number and the Fisher information).
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81d89c26e1dab2fcb701"/>: the eigendecomposition behind $`\kappa`$, the matrix calculus layout conventions, and Jacobians and Hessians as matrices.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d815f9a47d613409b5a0c"/>: why each loss here is the negative log-likelihood of a distribution (Bernoulli to BCE, categorical to CE, Gaussian to MSE), the same fact as the GLM view above seen from the probability side.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81c6baf3f778a62e14e5"/>: cross-entropy read as a code length, and the KL divergence that TRPO constrains.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8161a72bc8c572f37d55"/>: the catalogue of losses and when to use each; this page supplies their gradients.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d817080bbc90954681d09"/>: how SGD, momentum and Adam work and how learning rates are scheduled; this page supplies why curvature limits them.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d81ffb886ff30176bc6ce"/>: gradient boosting and XGBoost among the other classical methods.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8103a916c4824abbd82e"/>: activation checkpointing and the rest of the memory budget of the backward pass at scale.
- <mention-page url="https://app.notion.com/p/3c65c17b0d0d8180b808c8c0cf8ddbe6"/>: TRPO's KL-constrained update and PPO.
## Best resources
- [The Matrix Calculus You Need For Deep Learning](https://explained.ai/matrix-calculus/) (\~1h 30m): Parr and Howard; the DL-focused refresher, covers every chain-rule form used above.
- [Mathematics for Machine Learning, ch. 5 and 7](https://mml-book.github.io/) (book, \~1h 45m for ch. 5 and 7): Deisenroth et al.; vector calculus and continuous optimisation.
- [Convex Optimization](https://web.stanford.edu/~boyd/cvxbook/) (book, \~5h for ch. 2-5): Boyd and Vandenberghe, free PDF; ch. 2-5 for convexity, duality, KKT.
- [CS231n backprop notes](https://cs231n.github.io/optimization-2/) (\~30 min): backprop as local gradient routing, staged computation.
## Further reading
- [XGBoost docs, Introduction to boosted trees](https://xgboost.readthedocs.io/en/stable/tutorials/model.html) (\~20 min): the derivation of the leaf weight and split gain used above.
- [Cohen et al. 2021, Gradient Descent on Neural Networks Typically Occurs at the Edge of Stability](https://arxiv.org/abs/2103.00065) (paper, \~1h): the $`2/\eta`$ sharpness observation.
- [Dauphin et al. 2014, Identifying and attacking the saddle point problem](https://arxiv.org/abs/1406.2572) (paper, \~45 min): why saddles, not local minima, dominate in high dimensions.
- [Chen et al. 2016, Training Deep Nets with Sublinear Memory Cost](https://arxiv.org/abs/1604.06174) (paper, \~40 min): activation checkpointing.
- [Kaplan et al. 2020, Scaling Laws for Neural Language Models, section 2.1](https://arxiv.org/abs/2001.08361) (\~10 min for the section): the 6N compute accounting.
</content>
</page>