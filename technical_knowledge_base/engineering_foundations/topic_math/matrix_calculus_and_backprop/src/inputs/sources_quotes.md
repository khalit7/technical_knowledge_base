# Verified quotes: matrix calculus and automatic differentiation

All quotes were extracted on 2026-10-05 from the fetched source (PDFs via `pdftotext -layout`; HTML via text extraction). Page numbers are PDF page numbers, which match the printed page numbers in every PDF used here unless noted. Hyphenation line breaks from PDFs were rejoined; nothing else was changed. "FLAG" marks places where the source does not say what was expected.

---

## 1. Wikipedia, "Matrix calculus"

URL: https://en.wikipedia.org/wiki/Matrix_calculus (read via `?action=raw`, current revision)

Lead (intro, para 2), on fields and inconsistency:
> "A single convention can be somewhat standard throughout a single field that commonly uses matrix calculus (e.g. econometrics, statistics, estimation theory and machine learning). However, even within a given field different authors can be found using competing conventions. Authors of both groups often write as though their specific conventions were standard."

Section "Layout conventions", opening:
> "Although there are largely two consistent conventions, some authors find it convenient to mix the two conventions in forms that are discussed below."

Numerator layout (list item 1):
> "Numerator layout, i.e. lay out according to y and x^T (i.e. contrarily to x). This is sometimes known as the Jacobian formulation. This corresponds to the m×n layout in the previous example"

Denominator layout (list item 2):
> "Denominator layout, i.e. lay out according to y^T and x (i.e. contrarily to y). This is sometimes known as the Hessian formulation. Some authors term this layout the gradient, in distinction to the Jacobian (numerator layout), which is its transpose."

Gradient shape under each layout:
> "If we choose numerator layout for ∂y/∂x, we should lay out the gradient ∂y/∂x as a row vector, and ∂y/∂x as a column vector."
(first is vector-by-vector, second is scalar-by-vector gradient, third is vector-by-scalar; the raw text distinguishes them with bold.)

Mixed usage:
> "Not all math textbooks and papers are consistent in this respect throughout. That is, sometimes different conventions are used in different contexts within the same book or paper. For example, some choose denominator layout for gradients (laying them out as column vectors), but numerator layout for the vector-by-vector derivative ∂y/∂x."

> "Keep in mind that various authors use different combinations of numerator and denominator layouts for different types of derivatives, and there is no guarantee that an author will consistently use either numerator or denominator layout for all types."

"Mixed layout" is also a named term, for matrices: "Mixed layout, which lays out ∂Y/∂x according to Y and ∂y/∂X according to X."

FLAG: the article does NOT say which specific field uses which layout. It only says a convention "can be somewhat standard throughout a single field" and lists fields without assigning layouts. The only attribution is "Jacobian formulation" = numerator, "Hessian formulation" = denominator.

---

## 2. Baydin, Pearlmutter, Radul, Siskind, "Automatic differentiation in machine learning: a survey"

URL: https://arxiv.org/abs/1502.05767 (PDF v4 used: https://arxiv.org/pdf/1502.05767; JMLR 18(153):1--43, 2018)

(a) Forward mode, Section 3.1 "Forward Mode", p. 10:
> "Forward mode AD is efficient and straightforward for functions f : R → R^m, as all the derivatives dy_i/dx can be computed with just one forward pass. Conversely, in the other extreme of f : R^n → R, forward mode AD requires n evaluations to compute the gradient"
and: "which also corresponds to a 1 × n Jacobian matrix that is built one column at a time with the forward mode in n evaluations."

(b) Reverse mode, Section 3.2 "Reverse Mode", p. 12:
> "In the extreme case of f : R^n → R, only one application of the reverse mode is sufficient to compute the full gradient ∇f = (∂y/∂x_1, ..., ∂y/∂x_n), compared with the n passes of the forward mode needed for populating the same."
Footnote 12 (p. 12): "Also called adjoint or cotangent linear mode."

(c) Constant factor, Section 3.2, p. 13:
> "In general, for a function f : R^n → R^m, if we denote the operation count to evaluate the original function by ops(f), the time it takes to calculate the m × n Jacobian by the forward mode is n c ops(f), whereas the same computation can be done via reverse mode in m c ops(f), where c is a constant guaranteed to be c < 6 and typically c ∼ [2, 3] (Griewank and Walther, 2008)."
Citation: Griewank and Walther, "Evaluating Derivatives: Principles and Techniques of Algorithmic Differentiation", SIAM, 2008, doi:10.1137/1.9780898717761.
FLAG: Baydin gives "c < 6, typically c ∼ [2, 3]", not "4" or "ω", and does not use the phrase "cheap gradient principle". The phrase and ω are in Griewank 2012 (see item 13): "OPS{F′(x)} ≤ m ω OPS{F(x)}", with "ω = 3" for multiplications only. Also Introduction p. 2--3: "a small constant factor of overhead and ideal asymptotic efficiency".

(d) Memory, Section 3.2, p. 13:
> "The advantages of reverse mode AD, however, come with the cost of increased storage requirements growing (in the worst case) in proportion to the number of operations in the evaluated function. It is an active area of research to improve storage requirements in implementations by using advanced methods such as checkpointing strategies and data-flow analysis"
Also Section 5 "Implementations", p. 23: checkpointing strategies "allow balancing of application-specific trade-offs between time and space complexities of reverse mode AD by not storing the full tape of intermediate variables in memory and reconstructing these as needed by re-running parts of the forward computation from intermediate checkpoints."

(e) Backprop as special case:
Section 4.2 "Neural Networks, Deep Learning, Differentiable Programming", p. 17:
> "As we have seen, the backpropagation algorithm is only a special case of AD: by applying reverse mode AD to an objective function evaluating a network's error as a function of its weights, we can readily compute the partial derivatives needed for performing weight updates."
Section 3.2, p. 12 (first sentence): "AD in the reverse accumulation mode corresponds to a generalized backpropagation algorithm, in that it propagates derivatives backward from a given output."

(f) Hessian-vector products, Section 4.1 "Gradient-Based Optimization", p. 17:
> "In many cases one does not need the full Hessian but only a Hessian–vector product Hv, which can be computed efficiently using a reverse-on-forward configuration of AD by applying the reverse mode to take the gradient of code produced by the forward mode."
> "This computes Hv with O(n) complexity, even though H is a n × n matrix."
Footnote 16 (p. 17): "Christianson (2012) demonstrates that the second derivative can be computed with the same arithmetic operation sequence using forward-on-reverse, reverse-on-forward, and reverse-on-reverse. The taping overheads of these methods may differ in implementation-dependent ways."
FLAG: Baydin's main text describes REVERSE-on-forward (forward pass computes ∇f·v, then reverse mode on that), not forward-on-reverse. JAX (item 7) recommends the opposite nesting, forward-over-reverse. Footnote 16 says all three give the same operation sequence.

---

## 3. Pearlmutter 1994, "Fast exact multiplication by the Hessian", Neural Computation 6(1):147--160

URL: https://www.bcl.hamilton.ie/~barak/papers/nc-hessian.pdf (preprint dated June 9, 1993, "To appear in Neural Computation"). Publisher page: https://direct.mit.edu/neco/article/6/1/147/5766/Fast-Exact-Multiplication-by-the-Hessian (returned no abstract to curl).

Abstract, p. 1 (the PDF's math glyphs for H and v do not extract; bracketed symbols restored from context):
> "The result is an exact and numerically stable procedure for computing [Hv], which takes about as much computation, and is about as local, as a gradient evaluation."
Also abstract: "Since a common use of a large matrix like [H] is to compute its product with various vectors, we derive a technique that directly calculates [Hv], where [v] is an arbitrary vector."

FLAG: the O(n) statement is NOT in the abstract; it is in Section 1 "Introduction", p. 2:
> "This takes O(n^2) time when there are n weights. The technique we derive here finds this product in O(n) time and space, and does not make any approximations."

---

## 4. Chen, Xu, Zhang, Guestrin 2016, "Training Deep Nets with Sublinear Memory Cost"

URL: https://arxiv.org/abs/1604.06174 (v2)

Abstract, p. 1:
> "Specifically, we design an algorithm that costs O(√n) memory to train a n layer network, with only the computational cost of an extra forward pass per mini-batch."
Also abstract: "In the extreme case, our analysis also shows that the memory consumption can be reduced to O(log n) with as little as O(n log n) extra cost for forward computation."

Section 4.3 "An O(√n) Memory Cost Algorithm", p. 5, Eq. (1):
> "Assume we divide the n network into k segments the memory cost to train this network is given as follows."
> cost-total = max_{i=1,...,k} cost-of-segment(i) + O(k) = O(n/k) + O(k)    (1)
> "The first part of the equation is the memory cost to run back-propagation on each of the segment. Given that the segment is equally divided, this translates into O(n/k) cost. The second part of equation is the cost to store the intermediate outputs between segments. Setting k = √n, we get the cost of O(2√n). This algorithm only requires an additional forward pass during training"
Note: k is the number of segments (so each segment has n/k = √n layers); they write "O(2√n)".

---

## 5. Griewank and Walther 2000, "Algorithm 799: revolve"

ACM TOMS 26(1):19--45, doi:10.1145/347837.347846. URL: https://dl.acm.org/doi/10.1145/347837.347846 (403 to automated fetch). Abstract text obtained via Crossref metadata: https://api.crossref.org/works/10.1145/347837.347846

Abstract:
> "This article presents the function revolve, which generates checkpointing schedules that are provably optimal with regard to a primary and a secondary criterion."
Also: "In its basic form, the reverse mode of computational differentiation yields the gradient of a scalar-valued function at a cost that is a small multiple of the computational work needed to evaluate the function itself. However, the corresponding memory requirement is proportional to the run-time of the evaluation program."

FLAG: the abstract says "provably optimal", not "binomial". The binomial characterisation (number of steps reversible with c checkpoints and r repetitions = C(c+r, c)) comes from Griewank 1992, "Achieving logarithmic growth of temporal and spatial complexity in reverse automatic differentiation", Optimization Methods and Software 1(1):35--54; I did NOT access that paper, so no quote. Griewank 2012 (item 13, p. 397) states only the logarithmic trade-off: "One possibility in a range of trade-offs is to realize a logarithmic increase for both spatial and temporal complexity".

---

## 6. PyTorch docs (stable, which redirects to 2.14)

### 6a. Autograd mechanics
URL: https://docs.pytorch.org/docs/stable/notes/autograd.html

Section "How autograd encodes the history":
> "Autograd is a reverse automatic differentiation system. Conceptually, autograd records a graph recording all of the operations that created the data as you execute operations, giving you a directed acyclic graph whose leaves are the input tensors and roots are the output tensors."
> "Internally, autograd represents this graph as a graph of Function objects (really expressions), which can be apply() ed to compute the result of evaluating the graph. When computing the forward pass, autograd simultaneously performs the requested computations and builds up a graph representing the function that computes the gradient (the .grad_fn attribute of each torch.Tensor is an entry point into this graph)."
> "An important thing to note is that the graph is recreated from scratch at every iteration, and this is exactly what allows for using arbitrary Python control flow statements, that can change the overall shape and size of the graph at every iteration."

Section "Saved tensors":
> "Some operations need intermediary results to be saved during the forward pass in order to execute the backward pass. For example, the function x↦x^2 saves the input x to compute the gradient."
> "You can explore (for educational or debugging purposes) which tensors are saved by a certain grad_fn by looking for its attributes starting with the prefix _saved."
(Example in the docs: `y = x.pow(2)`, then `x.equal(y.grad_fn._saved_self)  # True` and `x is y.grad_fn._saved_self  # True`.)

Section "In-place operations with autograd" > "In-place correctness checks":
> "Every tensor keeps a version counter, that is incremented every time it is marked dirty in any operation. When a Function saves any tensors for backward, a version counter of their containing Tensor is saved as well. Once you access self.saved_tensors it is checked, and if it is greater than the saved value an error is raised."

### 6b. Extending PyTorch
URL: https://docs.pytorch.org/docs/stable/notes/extending.html, section "Extending torch.autograd" > "How to use"
> "Subclass Function and implement the forward(), (optional) setup_context() and backward() methods."
> "setup_context() (optional). One can either write a "combined" forward() that accepts a ctx object or (as of PyTorch 2.0) a separate forward() that does not accept ctx and a setup_context() method where the ctx modification happens."
> "backward() (or vjp()) defines the gradient formula. It will be given as many Tensor arguments as there were outputs, with each of them representing gradient w.r.t. that output. It is important NEVER to modify these in-place. It should return as many tensors as there were inputs"
> "save_for_backward() should be used to save any tensors needed for the backward pass (as opposed to directly on ctx). You cannot use save_for_backward for non-tensors; you should store those directly on ctx."
Step 4: "It is recommended that you use torch.autograd.gradcheck() to check whether your backward function correctly computes gradients of the forward by computing the Jacobian matrix using your backward function and comparing the value element-wise with the Jacobian computed numerically using finite-differencing."
Section "Combined or separate forward() and setup_context()": "We recommend the second option (separate forward() and setup_context()) because that is closer to how PyTorch native operations are implemented and it composes with torch.func transforms."

### 6c. torch.utils.checkpoint
URL: https://docs.pytorch.org/docs/stable/checkpoint.html, `torch.utils.checkpoint.checkpoint`
> "There are currently two checkpointing implementations available, determined by the use_reentrant parameter. It is recommended that you use use_reentrant=False."
Warning: "The use_reentrant parameter should be passed explicitly. In version 2.9 we will raise an exception if use_reentrant is not passed."
Note on the two variants:
> "Non-reentrant checkpoint stops recomputation as soon as all needed intermediate activations have been recomputed. This feature is enabled by default, but can be disabled with set_checkpoint_early_stop(). Reentrant checkpoint always recomputes function in its entirety during the backward pass."
Parameter: "early_stop (bool, optional) – If True, non-reentrant checkpoint stops recomputation as soon as it has computed all needed Tensors. This argument is ignored if use_reentrant=True. ... Default: True."

### 6d. torch.autograd.gradcheck
URL: https://docs.pytorch.org/docs/stable/generated/torch.autograd.gradcheck.gradcheck.html
> "Check gradients computed via small finite differences against analytical gradients wrt tensors in inputs that are of floating point or complex type and with requires_grad=True."
> "The check between numerical and analytical gradients uses allclose()."
Note: "The default values are designed for input of double precision. This check will likely fail if input is of less precision, e.g., FloatTensor."
Defaults in signature: eps=1e-06, atol=1e-05, rtol=0.001.

---

## 7. JAX, "The Autodiff Cookbook"

URL: https://docs.jax.dev/en/latest/notebooks/autodiff_cookbook.html

(a) Section "Jacobians and Hessians using jacfwd and jacrev":
> "jacfwd uses forward-mode automatic differentiation, which is more efficient for "tall" Jacobian matrices (more outputs than inputs), while jacrev uses reverse-mode, which is more efficient for "wide" Jacobian matrices (more inputs than outputs). For matrices that are near-square, jacfwd probably has an edge over jacrev."

(b) Same section, on `hessian`:
> "To implement hessian, we could have used jacfwd(jacrev(f)) or jacrev(jacfwd(f)) or any other composition of the two. But forward-over-reverse is typically the most efficient. That's because in the inner Jacobian computation we're often differentiating a function wide Jacobian (maybe like a loss function f : R^n → R), while in the outer Jacobian computation we're differentiating a function with a square Jacobian (since ∇f : R^n → R^n), which is where forward-mode wins out."
Section "Hessian-vector products using both forward- and reverse-mode" (code `jvp(grad(f), primals, tangents)[1]` labelled "# forward-over-reverse"); on reverse-over-forward:
> "That's not quite as good, though, because forward-mode has less overhead than reverse-mode, and since the outer differentiation operator here has to differentiate a larger computation than the inner one, keeping forward-mode on the outside works best"
And on the grad-of-grad version: "That's efficient, but we can do even better and save some memory by using forward-mode together with reverse-mode."

(c) Cost, section "JVPs in JAX code":
> "the memory cost is independent of the depth of the computation. In addition, the FLOP cost of the jvp-transformed function is about 3x the cost of just evaluating the function (one unit of work for evaluating the original function, for example sin(x); one unit for linearizing, like cos(x); and one unit for applying the linearized function to a vector, like cos_x * v). Put another way, for a fixed primal point x, we can evaluate v ↦ ∂f(x)·v for about the same marginal cost as evaluating f."
Section "VJPs in JAX code":
> "the FLOP cost for evaluating (x, v) ↦ (f(x), v^T ∂f(x)) is only about three times the cost of evaluating f. In particular, if we want the gradient of a function f : R^n → R, we can do it in just one call."
> "There's a cost, though: though the FLOPs are friendly, memory scales with the depth of the computation."
FLAG (mild): JAX says "about 3x" / "about three times" for both jvp and vjp; "about the same" appears only as "about the same marginal cost" (jvp, fixed primal point) and per Jacobian column: "to get each column costs about the same as one function evaluation."

---

## 8. Kaplan et al. 2020, "Scaling Laws for Neural Language Models"

URL: https://arxiv.org/abs/2001.08361 (v1), Section 2.1 "Parameter and Compute Scaling of Transformers", p. 6--7

Eq. (2.2), p. 6:
> "Evaluating a forward pass of the Transformer involves roughly C_forward ≈ 2N + 2 n_layer n_ctx d_model    (2.2) add-multiply operations, where the factor of two comes from the multiply-accumulate operation used in matrix multiplication."
Table 1 (p. 7), "Total (Non-Embedding)" row: "C_forward = 2N + 2 n_layer n_ctx d_attn".
p. 7:
> "Accounting for the backwards pass (approximately twice the compute as the forwards pass), we then define the estimated non-embedding compute as C ≈ 6N floating point operators per training token."
FLAG (minor): Eq. (2.2) in the text uses d_model, while Table 1 uses d_attn (equal under their standard d_attn = d_model). The 6N drops the context term: "we do not include context-dependent terms in our training compute estimate."

---

## 9. Dao et al. 2022, "FlashAttention"

URL: https://arxiv.org/abs/2205.14135 (v2)

Recompute S and P, Section 3.1 "An Efficient Attention Algorithm With Tiling and Recomputation", p. 5:
> "The backward pass typically requires the matrices S, P ∈ R^{N×N} to compute the gradients with respect to Q, K, V. However, by storing the output O and the softmax normalization statistics (m, ℓ), we can recompute the attention matrix S and P easily in the backward pass from blocks of Q, K, V in SRAM. This can be seen as a form of selective gradient checkpointing"

D_i definition, Appendix B.2 "Memory-efficient backward pass", Eq. (4), p. 18--19:
> "Define D_i = P_{i:}^T dP_{i:} = Σ_j (e^{q_i^T k_j} / L_i) do_i^T v_j = do_i^T Σ_j (e^{q_i^T k_j} / L_i) v_j = do_i^T o_i,    (4)"
followed by "dS_{i:} = P_{i:} ∘ dP_{i:} − D_i P_{i:}" and the softmax Jacobian sentence just before: "Using the fact that the Jacobian of y = softmax(x) is diag(y) − yy^T".
Appendix B.4 "FlashAttention: Backward Pass", p. 20: "Instead we can rewrite D_i = do_i^T o_i and compute the dot product between vectors of size d."
Algorithm 4, line 19 (p. 21): "On chip, compute D_i = rowsum(dO_i ∘ O_i) ∈ R^{B_r}."
So: Eq. (4) is the dot-product form; the rowsum form appears only in Algorithm 4 line 19 (blocked version).

---

## 10. Parr and Howard, "The Matrix Calculus You Need For Deep Learning"

URL: https://arxiv.org/abs/1802.01528 (v3); also https://explained.ai/matrix-calculus/

Section 4 "Matrix calculus", p. 6:
> "Note that there are multiple ways to represent the Jacobian. We are using the so-called numerator layout but many papers and software will use the denominator layout. This is just transpose of the numerator layout Jacobian (flip it around its diagonal)"
Section 10 "Resources", p. 32: "Recall that we use the numerator layout where the variables go horizontally and the functions go vertically in the Jacobian."
Section 3, p. 5: "let's organize them into a horizontal vector. We call this vector the gradient of f(x, y)"

---

## 11. Deisenroth, Faisal, Ong, "Mathematics for Machine Learning"

URL: https://mml-book.github.io/book/mml-book.pdf (draft 2024-01-15; Cambridge University Press 2020)

Gradient as row vector, Section 5.2 "Partial Differentiation and Gradients", Definition 5.5, Eq. (5.40), p. 146:
> "and collect them in the row vector ∇_x f = grad f = df/dx = [∂f(x)/∂x_1  ∂f(x)/∂x_2  ···  ∂f(x)/∂x_n] ∈ R^{1×n},    (5.40)"
> "The row vector in (5.40) is called the gradient of f or the Jacobian and is the generalization of the derivative from Section 5.1."
Remark (Gradient as a Row Vector), p. 147: "It is not uncommon in the literature to define the gradient vector as a column vector, following the convention that vectors are generally column vectors. The reason why we define the gradient vector as a row vector is twofold: First, we can consistently generalize the gradient to vector-valued functions f : R^n → R^m (then the gradient becomes a matrix). Second, we can immediately apply the multi-variate chain rule without paying attention to the dimension of the gradient."

Jacobian, Section 5.3 "Gradients of Vector-Valued Functions", Definition 5.6, Eqs. (5.57)--(5.59), p. 150: "The Jacobian J is an m × n matrix", with "J(i, j) = ∂f_i/∂x_j". Remark, p. 150--151:
> "In this book, we use the numerator layout of the derivative, i.e., the derivative df/dx of f ∈ R^m with respect to x ∈ R^n is an m × n matrix, where the elements of f define the rows and the elements of x define the columns of the corresponding Jacobian; see (5.58). There exists also the denominator layout, which is the transpose of the numerator layout. In this book, we will use the numerator layout."
Note: the explicit "numerator layout" words are in 5.3 (p. 150--151), not 5.2.

Section 5.6 "Backpropagation and Automatic Differentiation" (starts p. 159); Subsection 5.6.2 "Automatic Differentiation", p. 161:
> "It turns out that backpropagation is a special case of a general technique in numerical analysis called automatic differentiation."
Eqs. (5.120)--(5.121), p. 161: "Equation (5.120) would be the reverse mode because gradients are propagated backward through the graph, i.e., reverse to the data flow. Equation (5.121) would be the forward mode"
p. 162:
> "In the following, we will focus on reverse mode automatic differentiation, which is backpropagation. In the context of neural networks, where the input dimensionality is often much higher than the dimensionality of the labels, the reverse mode is computationally significantly cheaper than the forward mode."

---

## 12. Ba, Kiros, Hinton 2016, "Layer Normalization"

URL: https://arxiv.org/abs/1607.06450 (v1), Section 3 "Layer normalization", Eq. (3), p. 2
> "We, thus, compute the layer normalization statistics over all the hidden units in the same layer as follows: μ^l = (1/H) Σ_{i=1}^{H} a_i^l,   σ^l = sqrt( (1/H) Σ_{i=1}^{H} (a_i^l − μ^l)^2 )    (3)  where H denotes the number of hidden units in a layer."
Note: Eq. (3) has no epsilon inside the square root (implementations add one). Eq. (4) is the RNN version.

---

## 13. History: Wengert, Linnainmaa, Rumelhart et al.

Baydin et al. (item 2 URL), Section 3.3 "Origins of AD and Backpropagation", p. 14:
> "Forward mode AD as a general method for evaluating partial derivatives was essentially discovered by Wengert (1964)."
> "Prior to Werbos, the work by Linnainmaa (1970, 1976) is often cited as the first published description of the reverse mode. Speelpenning (1980) subsequently introduced reverse mode AD as we know it, in the sense that he gave the first implementation that was actually automatic"
> "Within the machine learning community, the method has been reinvented several times, such as by Parker (1985), until it was eventually brought to fame by Rumelhart et al. (1986) and the Parallel Distributed Processing (PDP) group."
Reference list entries (Baydin): "Robert E. Wengert. A simple automatic derivative evaluation program. Communications of the ACM, 7:463–4, 1964." / "Seppo Linnainmaa. The representation of the cumulative rounding error of an algorithm as a taylor expansion of the local rounding errors. Master's thesis, University of Helsinki, 1970." / "Seppo Linnainmaa. Taylor expansion of the accumulated rounding error. BIT Numerical Mathematics, 16(2):146–160, 1976." / "David E. Rumelhart, Geoffrey E. Hinton, and Ronald J. Williams. Learning representations by back-propagating errors. Nature, 323(6088):533, 1986." (Article spans pp. 533--536; Baydin gives only the first page.)

Griewank 2012, "Who Invented the Reverse Mode of Differentiation?", Documenta Mathematica, Extra Volume ISMP, 389--400.
URL that worked: https://ftp.gwdg.de/pub/misc/EMIS/journals/DMJDMV/vol-ismp/52_griewank-andreas-b.pdf
p. 389, Prologue:
> "Seppo Linnainmaa (Lin76) of Helsinki says the idea came to him on a sunny afternoon in a Copenhagen park in 1970. He used it as a tool for estimating the effects of arithmetic rounding errors on the results of complex expressions. Gerardi Ostrowski (OVB71) discovered and used it some five years earlier in the context of certain process models in chemical engineering."
p. 391 (the named principle, after quoting Wolfe 1982 that the gradient-to-function cost "ratio is usually 1.5, not (n + 1)"):
> "Obviously this Cheap Gradient Principle is of central importance for the design of nonlinear optimization algorithms"
> "Even now it is generally not well understood that there is no corresponding Cheap Jacobian Principle"
p. 396 ("Temporal complexity"): "OPS{F′(x)} ≤ m ω OPS{F(x)}" and "If one considers only polynomial operations and counts the number of multiplications, the complexity ratio is exactly ω = 3."
p. 398: the adjoint "can be computed at maximally ω = 2 times the computational effort of the forward calculation" (continuous-time/ODE context).

---

## 14. Trace-trick identification rule (Magnus and Neudecker via Minka)

Magnus and Neudecker book: NOT accessed (paywalled); no quote.

Minka, "Old and New Matrix Algebra Useful for Statistics", December 28, 2000.
URL: https://tminka.github.io/papers/matrix/minka-matrix.pdf
Section 1 "Derivatives", p. 1: "The material is based on Magnus and Neudecker (1988)."
Layout, p. 1:
> "The partials with respect to the numerator are laid out according to the shape of Y while the partials with respect to the denominator are laid out according to the transpose of X."
p. 2:
> "Therefore, the derivative of any expression involving matrices can be computed in two steps: 1. compute the differential 2. massage the result into canonical form after which the derivative is immediately read off as the coefficient of dx, dx, or dX."
p. 3, canonical forms include "dy = tr(AdX)"; example Eq. (14): "d/dX tr(AXB) = BA because dtr(AXB) = tr(A(dX)B) = tr(BAdX)".
FLAG: Minka's rule is "dy = tr(A dX) ⇒ dy/dX = A" in his numerator-type layout (derivative laid out by X^T). The expected form "if dφ = tr(A^T dX) then the derivative is A" is the gradient (same shape as X) version; under Minka the gradient is the transpose, A^T of his A. Same content, transposed bookkeeping: state which layout you use when quoting.

---

## 15. Einsum path strategies

numpy.einsum_path (NumPy v2.5 manual): https://numpy.org/doc/stable/reference/generated/numpy.einsum_path.html, parameter `optimize`:
> "'optimal' An algorithm that combinatorially explores all possible ways of contracting the listed tensors and chooses the least costly path. Scales exponentially with the number of terms in the contraction."
> "'greedy' An algorithm that chooses the best pair contraction at each step. Effectively, this algorithm searches the largest inner, Hadamard, and then outer products at each step. Scales cubically with the number of terms in the contraction. Equivalent to the 'optimal' path for most contractions."
"Default is 'greedy'." Also: "if True defaults to the 'greedy' algorithm".

torch.einsum (PyTorch 2.14): https://docs.pytorch.org/docs/stable/generated/torch.einsum.html, Note:
> "If opt-einsum is available, this function will automatically speed up computation and/or consume less memory by optimizing contraction order through our opt_einsum backend torch.backends.opt_einsum (The _ vs - is confusing, I know). This optimization occurs when there are at least three inputs, since the order does not matter otherwise. Note that finding the optimal path is an NP-hard problem, thus, opt-einsum relies on different heuristics to achieve near-optimal results. If opt-einsum is not available, the default order is to contract from left to right."
> "The default strategy is 'auto', and we also support 'greedy' and 'optimal'. Disclaimer that the runtime of 'optimal' is factorial in the number of inputs!"
FLAG (minor): NumPy says 'optimal' "Scales exponentially"; PyTorch says "factorial". Not a real contradiction (factorial is super-exponential), but don't quote both as the same claim.
