# Handoff from Information theory for ML (#6) to Variational inference and generative-model maths (#8)

From the old page (verbatim, checked), carried briefly on #6 section 13; #8 owns the depth.

> The variational-inference identity makes the reverse direction explicit:
> log p(x) = ELBO(q) + D_KL(q(z) || p(z | x)),  ELBO(q) = E_{z~q}[log p(x, z) - log q(z)]
> where x is the observed data and z the latent variable; q(z) is the approximate posterior being fitted, and p(z | x) the true posterior; log p(x) does not depend on q, so raising the ELBO by exactly the amount the reverse KL falls is the same thing as minimising that reverse KL.

Checked: derivation in #6 s13 (five steps); Kingma and Welling 2013 eq. 3 (ELBO = -KL(q(z|x)||p(z)) + E_q log p(x|z)) and Appendix B (Gaussian KL; #6 gives 0.818 nats for mu = 1, sigma = 0.5). Reverse-KL fit narrowness: MacKay ITILA Figure 33.6. #6 s7 animates forward vs reverse KL on a two-humped target (reverse fit mu 1.997, sigma 0.605, KL 0.692 ~ ln 2): link it rather than rebuild.
