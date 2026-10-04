# Research A: Model-based RL and planning (verbatim quotes)

All quotes copied from `pdftotext` output of the PDFs saved in this folder (`*.pdf`, `*_raw.txt`). Page = PDF page unless a journal or book page is given. Line breaks and hyphenation from the PDF are joined; mathematical symbols rebuilt where the text extraction mangled them (marked [math rebuilt]). Nothing here is paraphrased inside quotation marks.

Sources fetched:
- AlphaGo, Nature 529:484-489 (2016): https://storage.googleapis.com/deepmind-media/alphago/AlphaGoNaturePaper.pdf (PDF p1 = journal p484, p2 = 485, p3 = 486, p4 = 487, p5 = 488; Methods from p7)
- AlphaGo Zero author copy: https://discovery.ucl.ac.uk/id/eprint/10045895/1/agz_unformatted_nature.pdf (42 pp, unformatted manuscript)
- AlphaZero arXiv v1: https://arxiv.org/pdf/1712.01815v1
- AlphaZero Science 2018 (DeepMind-hosted author preprint of the Science paper, 32 pp): https://storage.googleapis.com/deepmind-media/DeepMind.com/Blog/alphazero-shedding-new-light-on-chess-shogi-and-go/alphazero_preprint.pdf (science.org itself not fetched)
- MuZero arXiv v2 (21 Feb 2020): https://arxiv.org/pdf/1911.08265v2
- EfficientZero arXiv v2 (12 Dec 2021): https://arxiv.org/pdf/2111.00210 ; also v1: https://arxiv.org/pdf/2111.00210v1 ; repo README https://github.com/YeWR/EfficientZero
- Kocsis and Szepesvari 2006 (UCT): http://ggp.stanford.edu/readings/uct.pdf (12 pp)
- Coulom 2006: https://www.remi-coulom.fr/CG2006/CG2006.pdf (HAL copy blocked by a bot wall)
- Browne et al. 2012 survey: http://www.incompleteideas.net/609%20dropbox/other%20readings%20and%20resources/MCTS-survey.pdf
- Tesauro and Galperin, NIPS 9 (1996, published 1997), pp. 1068-1074: https://proceedings.neurips.cc/paper/1996/file/996009f2374006606f4c0b0fda878af1-Paper.pdf
- Sutton and Barto, 2nd ed. (2018): local `scratchpad/sb.txt`, book page numbers given.

---

## 1. AlphaGo (Silver et al. 2016, Nature 529)

**SL policy: 13 layers, 30 million positions, 57.0%** (p485, "Supervised learning of policy networks"):
> "We trained a 13-layer policy network, which we call the SL policy network, from 30 million positions from the KGS Go Server. The network predicted expert moves on a held out test set with an accuracy of 57.0% using all input features, and 55.7% using only raw board position and move history as inputs, compared to the state-of-the-art from other research groups of 44.4% at date of submission"

Methods (PDF p8, "Neural network architecture") confirms 13 layers: first hidden layer 5x5, "Each of the subsequent hidden layers 2 to 12 ... convolves k filters of kernel size 3 × 3", "The final layer convolves 1 filter of kernel size 1 × 1"; "The match version of AlphaGo used k = 192 filters".

**Rollout policy: 24.2%, 2 microseconds** (p485):
> "We also trained a faster but less accurate rollout policy pπ(a|s), using a linear softmax of small pattern features (see Extended Data Table 4) with weights π; this achieved an accuracy of 24.2%, using just 2 μs to select an action, rather than 3 ms for the policy network."

Methods (PDF p8): "π of the rollout policy are trained from 8 million positions from human games" and "Rollouts execute at approximately 1,000 simulations per second per CPU thread".

**RL policy: >80% vs SL, 85% vs Pachi** (p485, "Reinforcement learning of policy networks"):
> "When played head-to-head, the RL policy network won more than 80% of games against the SL policy network. We also tested against the strongest open-source Go program, Pachi, a sophisticated Monte Carlo search program, ranked at 2 amateur dan on KGS, that executes 100,000 simulations per move. Using no search at all, the RL policy network won 85% of games against Pachi."
Note: "more than 80%", not "80%".

**Value network data set** (p486, "Reinforcement learning of value networks"):
> "To mitigate this problem, we generated a new self-play data set consisting of 30 million distinct positions, each sampled from a separate game. Each game was played between the RL policy network and itself until the game terminated. Training on this data set led to MSEs of 0.226 and 0.234 on the training and test set respectively, indicating minimal overfitting."
Preceding sentence: training on full KGS games "memorized the game outcomes rather than generalizing to new positions, achieving a minimum MSE of 0.37 on the test set, compared to 0.19 on the training set."
Note: the value network is 15 layers, not 13 (Methods p8: "Hidden layers 2 to 11 are identical to the policy network, hidden layer 12 is an additional convolution layer, hidden layer 13 convolves 1 filter of kernel size 1 × 1 with stride 1, and hidden layer 14 is a fully connected linear layer with 256 rectifier units. The output layer is a fully connected linear layer with a single tanh unit."). Sutton and Barto's "another 13-layer deep convolutional ANN" is slightly off.

**Leaf evaluation mixing, lambda** (p486, "Searching with policy and value networks"):
> "The leaf node is evaluated in two very different ways: first, by the value network vθ(sL); and second, by the outcome zL of a random rollout played out until terminal step T using the fast rollout policy pπ; these evaluations are combined, using a mixing parameter λ, into a leaf evaluation V(sL)
> V(sL) = (1 − λ)vθ(sL) + λzL"

Extended Data Table 5 "Parameters used by AlphaGo" (PDF p14): β softmax temperature 0.67; **λ mixing parameter 0.5**; nvl virtual loss 3; nthr expansion threshold 40; **cpuct exploration constant 5**.

Result (p488):
> "We also assessed variants of AlphaGo that evaluated positions using just the value network (λ = 0) or just rollouts (λ = 1) (see Fig. 4b). Even without rollouts AlphaGo exceeded the performance of all other Go programs, demonstrating that value networks provide a viable alternative to Monte Carlo evaluation in Go. However, the mixed evaluation (λ = 0.5) performed best, winning ≥95% of games against other variants."

**Selection rule (PUCT variant)** (Methods, PDF p7, "Selection"): [math rebuilt]
> "a_t = argmax_a (Q(s_t, a) + u(s_t, a)) using a variant of the PUCT algorithm, u(s, a) = cpuct P(s, a) sqrt(Σ_b N_r(s, b)) / (1 + N_r(s, a)), where cpuct is a constant determining the level of exploration; this search control strategy initially prefers actions with high prior probability and low visit count, but asymptotically prefers actions with high action value."
Note: in AlphaGo the counts are N_r (rollout visit counts); AlphaGo Zero uses plain N.

Main text (p486): "The output probabilities are stored as prior probabilities P for each legal action a, P(s, a) = pσ(a|s)." and "Once the search is complete, the algorithm chooses the most visited move from the root position."

**SL policy as prior beats RL policy** (p486):
> "It is worth noting that the SL policy network pσ performed better in AlphaGo than the stronger RL policy network pρ, presumably because humans select a diverse beam of promising moves, whereas RL optimizes for the single best move. However, the value function vθ(s) ≈ v^pρ(s) derived from the stronger RL policy network performed better in AlphaGo than a value function vθ(s) ≈ v^pσ(s) derived from the SL policy network."

**Hardware** (p487):
> "The final version of AlphaGo used 40 search threads, 48 CPUs, and 8 GPUs. We also implemented a distributed version of AlphaGo that exploited multiple machines, 40 search threads, 1,202 CPUs and 176 GPUs."

Training compute (Methods p8; already verified, quoted for completeness): RL policy "using 50 GPUs, for one day"; value network "mini-batches of 32 positions, using 50 GPUs, for one week."

### Sutton and Barto, Section 16.6 (book pp. 441-450)

p442: "By the time of Silver et al.'s 2016 publication, AlphaGo had been shown to be decisively stronger than other Go programs, and it had defeated the European Go champion Fan Hui 5 games to 0. These were the first victories of a Go program over a professional human Go player without handicap in full Go games. Shortly thereafter, a similar version of AlphaGo won stunning victories over the 18-time world champion Lee Sedol, winning 4 out of a 5 games in a challenge match"



p444 (16.6.1): "The DeepMind team called AlphaGo's modification of basic MCTS "asynchronous policy and value MCTS," or APV-MCTS." ... "APV-MCTS, as implemented in AlphaGo, expanded its tree by choosing an edge according to probabilities supplied by a 13-layer deep convolutional ANN, called the SL-policy network, trained previously by supervised learning to predict moves contained in a database of nearly 30 million human expert moves."
Book eq. 16.4 uses η for the mixing weight: "v(s) = (1 − η)vθ(s) + ηG, where G was the return of the rollout and η controlled the mixing".

p446: "By simulating many games in parallel on 50 processors, the DeepMind team trained the RL policy network on a million games in a single day. In testing the final RL policy, they found that it won more than 80% of games played against the SL policy, and it won 85% of games played against a Go program using MCTS that simulated 100,000 games per move."
p446: "the DeepMind team constructed a data set of 30 million positions each chosen randomly from a unique self-play game. Then training was done using 50 million mini-batches each of 32 positions drawn from this data set. Training took one week on 50 GPUs."
p446: "The rollout policy network allowed approximately 1,000 complete game simulations per second to be run on each of the processing threads that AlphaGo used."
p446: "The team actually found that AlphaGo played better against human opponents when APV-MCTS used as the SL policy instead of the RL policy. They conjectured that the reason for this was that the latter was tuned to respond to optimal moves rather than to the broader set of moves characteristic of human play."
p447: "The best play resulted from setting η = 0.5, indicating that combining the value network with rollouts was particularly important to AlphaGo's success."

16.6.2 AlphaGo Zero, p447: "AlphaGo Zero implemented a form of policy iteration (Section 4.3), interleaving policy evaluation with policy improvement." ... "A significant difference between AlphaGo Zero and AlphaGo is that AlphaGo Zero used MCTS to select moves throughout self-play reinforcement learning, whereas AlphaGo used MCTS for live play after (but not during) learning." [book uses a dash; replaced by parentheses here]
p447: "AlphaGo Zero's MCTS was simpler than the version used by AlphaGo in that it did not include rollouts of complete games, and therefore did not need a rollout policy. Each iteration of AlphaGo Zero's MCTS ran a simulation that ended at a leaf node of the current search tree instead of at the terminal position of a complete game simulation."
p447: "Silver et al. (2017a) wrote that "MCTS may therefore be viewed as a powerful policy improvement operator.""
p449: "The network before the split consisted of 41 convolutional layers, each followed by batch normalization, and with skip connections added to implement residual learning by pairs of layers (see Section 9.7). Overall, move probabilities and values were computed by 43 and 44 layers respectively."
p449: "the policy output by the ANN with the latest weights was evaluated by simulating 400 games (using MCTS with 1,600 iterations to select each move) against the current best policy."
p449: "The DeepMind team trained AlphaGo Zero over 4.9 million games of self-play, which took about 3 days. Each move of each game was selected by running MCTS for 1,600 iterations, taking approximately 0.4 second per move. Network weights were updated over 700,000 batches each consisting of 2,048 board configurations."
p449: "The Elo ratings of AlphaGo Zero, the version of AlphaGo that played against Fan Hui, and the version that played against Lee Sedol were respectively 4,308, 3,144, and 3,739." [4,308 is the 3-day, 20-block version; 5,185 is the 40-day version]
p449-450: "Final tests of AlphaGo Zero's algorithm were conducted with a version having a larger ANN and trained over 29 million self-play games, which took about 40 days, again starting with random weights. This version achieved an Elo rating of 5,185." ... "AlphaGo Master's Elo rating was 4,858, and it had defeated the strongest human professional players 60 to 0 in online games. In a 100 game match, AlphaGo Zero with the larger network and more extensive learning defeated AlphaGo Master 89 games to 11"

---

## 2. AlphaGo Zero (Silver et al. 2017, Nature 550; UCL author copy)

**Four differences, no rollouts** (p2-3):
> "Our program, AlphaGo Zero, differs from AlphaGo Fan and AlphaGo Lee in several important aspects. First and foremost, it is trained solely by self-play reinforcement learning, starting from random play, without any supervision or use of human data. Second, it only uses the black and white stones from the board as input features. Third, it uses a single neural network, rather than separate policy and value networks. Finally, it uses a simpler tree search that relies upon this single neural network to evaluate positions and sample moves, without performing any Monte-Carlo rollouts."

**Policy improvement operator** (p3):
> "These search probabilities usually select much stronger moves than the raw move probabilities p of the neural network fθ(s); MCTS may therefore be viewed as a powerful policy improvement operator. Self-play with search – using the improved MCTS-based policy to select each move, then using the game winner z as a sample of the value – may be viewed as a powerful policy evaluation operator."

**Loss** (p6, Eq. 1):
> "l = (z − v)^2 − π^T log p + c||θ||^2 (1) where c is a parameter controlling the level of L2 weight regularisation (to prevent overfitting)."
Methods (p24): "The cross-entropy and mean-squared error losses are weighted equally (this is reasonable because rewards are unit scaled, r ∈ {−1, +1}) and the L2 regularisation parameter is set to c = 10^−4."

**Network size** (p6): "Over the course of training, 4.9 million games of self-play were generated, using 1,600 simulations for each MCTS, which corresponds to approximately 0.4s thinking time per move. Parameters were updated from 700,000 mini-batches of 2,048 positions. The neural network contained 20 residual blocks (see Methods for further details)."
Methods (p27): "The input features st are processed by a residual tower that consists of a single convolutional block followed by either 19 or 39 residual blocks." Note: "20 blocks" and "40 blocks" count the initial conv block; strictly 19 or 39 residual blocks.

**PUCT** (Methods p26, "Select"): [math rebuilt]
> "a_t = argmax_a (Q(s_t, a) + U(s_t, a)), using a variant of the PUCT algorithm, U(s, a) = cpuct P(s, a) sqrt(Σ_b N(s, b)) / (1 + N(s, a)) where cpuct is a constant determining the level of exploration; this search control strategy initially prefers actions with high prior probability and low visit count, but asympotically prefers actions with high action-value." [sic "asympotically"]
No numeric value of cpuct is given in the AGZ paper.

**Differences from AlphaGo's MCTS** (p27):
> "Compared to the MCTS in AlphaGo Fan and AlphaGo Lee, the principal differences are that AlphaGo Zero does not use any rollouts; it uses a single neural network instead of separate policy and value networks; leaf nodes are always expanded, rather than using dynamic expansion; each search thread simply waits for the neural network evaluation, rather than performing evaluation and backup asynchronously; and there is no tree policy."

**Evaluator gating** (p24):
> "Each evaluation consists of 400 games, using an MCTS with 1,600 simulations to select each move, using an infinitesimal temperature τ → 0 (i.e. we deterministically select the move with maximum visit count, to give the strongest possible play). If the new player wins by a margin of > 55% (to avoid selecting on noise alone) then it becomes the best player αθ∗, and is subsequently used for self-play generation, and also becomes the baseline for subsequent comparisons."

**Self-play with best player, temperature, Dirichlet, resignation** (p24-25):
> "Self-Play The best current player αθ∗, as selected by the evaluator, is used to generate data. In each iteration, αθ∗ plays 25,000 games of self-play, using 1,600 simulations of MCTS to select each move (this requires approximately 0.4s per search). For the first 30 moves of each game, the temperature is set to τ = 1; this selects moves proportionally to their visit count in MCTS, and ensures a diverse set of positions are encountered. For the remainder of the game, an infinitesimal temperature is used, τ → 0. Additional exploration is achieved by adding Dirichlet noise to the prior probabilities in the root node s0, specifically P(s, a) = (1 − ε)p_a + εη_a, where η ∼ Dir(0.03) and ε = 0.25; this noise ensures that all moves may be tried, but the search may still overrule bad moves. In order to save computation, clearly lost games are resigned. The resignation threshold v_resign is selected automatically to keep the fraction of false positives (games that could have been won if AlphaGo had not resigned) below 5%. To measure false positives, we disable resignation in 10% of self-play games and play until termination."
(ε symbols dropped by text extraction; rebuilt.)


**Raw network without search** (p12): "The raw neural network, without using any lookahead, achieved an Elo rating of 3,055. AlphaGo Zero achieved a rating of 5,185, compared to 4,858 for AlphaGo Master, 3,739 for AlphaGo Lee and 3,144 for AlphaGo Fan." (Useful: the same network gains about 2,100 Elo from search.)

---

## 3. AlphaZero

### arXiv 1712.01815v1 (Dec 2017)
p3: "AlphaGo Zero estimates and optimises the probability of winning, assuming binary win/loss outcomes. AlphaZero instead estimates and optimises the expected outcome, taking account of draws or potentially other outcomes."
p3: "The rules of chess and shogi are asymmetric, and in general symmetries cannot be assumed. AlphaZero does not augment the training data and does not transform the board position during MCTS."
p3: "In AlphaGo Zero, self-play games were generated by the best player from all previous iterations. After each iteration of training, the performance of the new player was measured against the best player; if it won by a margin of 55% then it replaced the best player and self-play games were subsequently generated by this new player. In contrast, AlphaZero simply maintains a single neural network that is updated continually, rather than waiting for an iteration to complete."
p4: "Self-play games are generated by using the latest parameters for this neural network, omitting the evaluation step and the selection of best player. AlphaGo Zero tuned the hyper-parameter of its search by Bayesian optimisation. In AlphaZero we reuse the same hyper-parameters for all games without game-specific tuning. The sole exception is the noise that is added to the prior policy to ensure exploration; this is scaled in proportion to the typical number of legal moves for that game type."
p5: "AlphaZero searches just 80 thousand positions per second in chess and 40 thousand in shogi, compared to 70 million for Stockfish and 35 million for Elmo."
p14 (Methods, Configuration): "During training, each MCTS used 800 simulations." ... "Dirichlet noise Dir(α) was added to the prior probabilities in the root node; this was scaled in inverse proportion to the approximate number of legal moves in a typical position, to a value of α = {0.3, 0.15, 0.03} for chess, shogi and Go respectively."
Note: v1 main text says noise is "scaled in proportion to the typical number of legal moves" while Methods says "in inverse proportion". The alpha values (0.3 chess > 0.03 Go) show inverse is right.

### Science 2018 version (author preprint hosted by DeepMind; science.org not fetched)
p3: "AlphaZero instead estimates and optimizes the expected outcome."
p3: "To accommodate a broader class of games, AlphaZero does not assume symmetry; the rules of chess and shogi are asymmetric (e.g. pawns only move forward, and castling is different on kingside and queenside). AlphaZero does not augment the training data and does not transform the board position during MCTS."
p3: "By contrast, AlphaZero simply maintains a single neural network that is updated continually, rather than waiting for an iteration to complete. Self-play games are always generated by using the latest parameters for this neural network."
p4: "The hyperparameters of AlphaGo Zero were tuned by Bayesian optimization. In AlphaZero we reuse the same hyperparameters, algorithm settings and network architecture for all games without game-specific tuning. The only exceptions are the exploration noise and the learning rate schedule"
p4: "Training proceeded for 700,000 steps (in mini-batches of 4,096 training positions) starting from randomly initialized parameters. During training only, 5,000 first-generation tensor processing units (TPUs) were used to generate self-play games, and 16 second-generation TPUs were used to train the neural networks. Training lasted for approximately 9 hours in chess, 12 hours in shogi and 13 days in Go"
p4: "In chess, AlphaZero first outperformed Stockfish after just 4 hours (300,000 steps); in shogi, AlphaZero first outperformed Elmo after 2 hours (110,000 steps); and in Go, AlphaZero first outperformed AlphaGo Lee after 30 hours (74,000 steps)."
p4-5: "Stockfish and Elmo used 44 central processing unit (CPU) cores (as in the TCEC world championship), whereas AlphaZero and AlphaGo Zero used a single machine with four first-generation TPUs and 44 CPU cores" ... "All matches were played using time controls of 3 hours per game, plus an additional 15 seconds for each move."
p5: "In Go, AlphaZero defeated AlphaGo Zero, winning 61% of games." ... "In chess, AlphaZero defeated Stockfish, winning 155 games and losing 6 games out of 1,000" ... "In shogi, AlphaZero defeated Elmo, winning 98.2% of games when playing black, and 91.2% overall."
p5: "AlphaZero searches just 60,000 positions per second in chess and shogi, compared with 60 million for Stockfish and 25 million for Elmo (table S4)."
p5: "AlphaZero also defeated Stockfish when given 1/10 as much thinking time as its opponent (i.e. searching ~ 1/10,000 as many positions), and won 46% of games against Elmo when given 1/100 as much time"
p10 note 25: "AlphaGo Zero was ultimately trained for 3.1 million steps over 40 days."
p19: same Dirichlet sentence as v1 ("scaled in inverse proportion ... α = {0.3, 0.15, 0.03} for chess, shogi and Go respectively").
p19: "Stockfish was configured according to its 2016 TCEC world championship superfinal settings: 44 threads on 44 cores (two 2.2GHz Intel Xeon Broadwell CPUs with 22 cores), a hash size of 32GB, syzygy endgame tablebases, at 3 hour time controls with 15 additional seconds per move."
Table S3 (p27): Mini-batches 700k / 700k / 700k; Training time 9h / 12h / 13d; Training games 44 million / 24 million / 140 million; Thinking time 800 sims, ~40 ms / ~80 ms / ~200 ms (chess / shogi / Go).

Corrections between versions (important): v1 vs Science differ on several numbers. Training TPUs: v1 64 second-gen, Science 16 second-gen. Search speed: v1 80k vs 70 million (Stockfish) and 40k vs 35 million (Elmo); Science 60,000 vs 60 million and 25 million. Stockfish setup: v1 64 threads, 1 GB hash, 1 minute per move, 100 games; Science 44 threads, 32 GB hash, 3h+15s, 1,000 games (155 W, 6 L, 839 D implied). Quote the version you cite.

---

## 4. MuZero (arXiv 1911.08265v2)

Abstract (p1): "When evaluated on 57 different Atari games - the canonical video game environment for testing AI techniques, in which model-based planning approaches have historically struggled - our new algorithm achieved a new state of the art. When evaluated on Go, chess and shogi, without any knowledge of the game rules, MuZero matched the superhuman performance of the AlphaZero algorithm that was supplied with the game rules."

**No semantics on hidden state** (p2): "There is no direct constraint or requirement for the hidden state to capture all information necessary to reconstruct the original observation, drastically reducing the amount of information the model has to maintain and predict; nor is there any requirement for the hidden state to match the unknown, true state of the environment; nor any other constraints on the semantics of state. Instead, the hidden states are free to represent state in whatever way is relevant to predicting current and future values and policies."

**h, g, f** (p4, Section 3): "The dynamics function, r^k, s^k = gθ(s^(k−1), a^k), is a recurrent process that computes, at each hypothetical step k, an immediate reward r^k and an internal state s^k. ... However, unlike traditional approaches to model-based RL, this internal state s^k has no semantics of environment state attached to it – it is simply the hidden state of the overall model, and its sole purpose is to accurately predict relevant, future quantities: policies, values, and rewards. In this paper, the dynamics function is represented deterministically; the extension to stochastic transitions is left for future work. The policy and value functions are computed from the internal state s^k by the prediction function, p^k, v^k = fθ(s^k), akin to the joint policy and value network of AlphaZero. The "root" state s^0 is initialized using a representation function that encodes past observations, s^0 = hθ(o_1, ..., o_t); again this has no special semantics beyond its support for future predictions."

**Value target** (p4): "However, unlike AlphaZero, we allow for long episodes with discounting and intermediate rewards by bootstrapping n steps into the future from the search value, z_t = u_(t+1) + γu_(t+2) + ... + γ^(n−1)u_(t+n) + γ^n ν_(t+n). Final outcomes {lose, draw, win} in board games are treated as rewards u_t ∈ {−1, 0, +1} occuring at the final step of the episode." [sic "occuring"]
Appendix G (p15): "For board games, we bootstrap directly to the end of the game, equivalent to predicting the final outcome; for Atari we bootstrap for n = 10 steps into the future."

**Loss** (p4, Eq. 1): [math rebuilt] "l_t(θ) = Σ_(k=0..K) [ l^r(u_(t+k), r^k_t) + l^v(z_(t+k), v^k_t) + l^p(π_(t+k), p^k_t) ] + c||θ||^2". Footnote 1: "For chess, Go and shogi, the same squared error loss as AlphaZero is used for rewards and values. A cross-entropy loss was found to be more stable than a squared error when encountering rewards and values of variable scale in Atari. Cross-entropy was used for the policy loss in both cases."

**K = 5, simulations** (p4): "In each case we trained MuZero for K = 5 hypothetical steps. Training proceeded for 1 million mini-batches of size 2048 in board games and of size 1024 in Atari. During both training and evaluation, MuZero used 800 simulations for each search in board games, and 50 simulations for each search in Atari." Appendix G (p15): "In the experiments reported in this paper, we always unroll for K = 5 steps." Atari acting: "50 simulations every fourth time-step, and then repeating the chosen action four times".

**pUCT constants** (Appendix B, p12): [math rebuilt] "a^k = argmax_a [ Q(s, a) + P(s, a) · sqrt(Σ_b N(s, b)) / (1 + N(s, a)) · ( c1 + log( (Σ_b N(s, b) + c2 + 1) / c2 ) ) ] (2) The constants c1 and c2 are used to control the influence of the prior P(s, a) relative to the value Q(s, a) as nodes are visited more often. In our experiments, c1 = 1.25 and c2 = 19652."

**Min-max normalisation** (p12): "However, since in many environments the value is unbounded, it is necessary to adjust the pUCT rule. A simple solution would be to use the maximum score that can be observed in the environment to either re-scale the value or set the pUCT constants appropriately. However, both solutions are game specific and require adding prior knowledge to the MuZero algorithm. To avoid this, MuZero computes normalized Q value estimates Q ∈ [0, 1] by using the minimum-maximum values observed in the search tree up to that point."

**Reanalyze** (p5): "Specifically, it reanalyzes old trajectories by re-running the MCTS using the latest network parameters to provide fresh targets (see Appendix H). When applied to 57 Atari games, using 200 million frames of experience per game, MuZero Reanalyze achieved 731% median normalized score, compared to 192%, 231% and 431% for previous state-of-the-art model-free approaches IMPALA, Rainbow and LASER respectively."
Appendix H (p15): "MuZero Reanalyze revisits its past time-steps and re-executes its search using the latest model parameters, potentially resulting in a better quality policy than the original search. This fresh policy is used as the policy target for 80% of updates during MuZero training." ... "and the n-step return was reduced to n = 5 steps instead of n = 10 steps."

**Search scaling in Go (Fig. 3A)** (p6): "MuZero matched the performance of a perfect model, even when doing much larger searches (up to 10s thinking time) than those from which the model was trained (around 0.1s thinking time, see also Figure S3A)." Caption (p7): "(A) Scaling with search time per move in Go, comparing the learned model with the ground truth simulator. Both networks were trained at 800 simulations per search, equivalent to 0.1 seconds per search. Remarkably, the learned model is able to scale well to up to two orders of magnitude longer searches than seen during training."

**Atari scaling (Fig. 3B)** (p6): "The improvements due to planning are much less marked than in Go, perhaps because of greater model inaccuracy; performance improved slightly with search time, but plateaued at around 100 simulations. Even with a single simulation – i.e. when selecting moves solely according to the policy network – MuZero performed well, suggesting that, by the end of training, the raw policy has learned to internalise the benefits of search"

**Ms. Pacman, few simulations (Fig. 3D)** (p6): "Surprisingly, and in contrast to previous work, even with only 6 simulations per move – fewer than the number of actions – MuZero learned an effective policy and improved rapidly. With more simulations performance jumped significantly higher." Caption (p7): "(D) Different networks trained at different numbers of simulations per move, but all evaluated at 50 simulations per move. ... Surprisingly, MuZero can learn effectively even when training with less simulations per move than are enough to cover all 8 possible actions in Ms. Pacman." Note: the number is 6 (not 7); Ms. Pacman has 8 actions here.

**Model-free ablation (Fig. 3C)** (p6): "When evaluated on Ms. Pacman, our model-free algorithm achieved identical results to R2D2, but learned significantly slower than MuZero and converged to a much lower final score. We conjecture that the search-based policy improvement step of MuZero provides a stronger learning signal than the high bias, high variance targets used by Q-learning."

---

## 5. EfficientZero (arXiv 2111.00210)

**Three components** (v2 p2, Introduction): "In this work, we propose EfficientZero, a model-based RL algorithm that achieves high performance with limited data. Our proposed method is built on MuZero. We make three critical changes: (1) use self-supervised learning to learn a temporally consistent environment model, (2) learn the value prefix in an end-to-end manner, thus helping to alleviate the compounding error in the model, (3) use the learned model to correct off-policy value targets."
Value prefix (p6, Section 4.2): "We propose to predict value prefix from the unrolled states (s_t, ŝ_(t+1), ..., ŝ_(t+k−1)) in an end-to-end manner, i.e. value-prefix = f(s_t, ŝ_(t+1), ..., ŝ_(t+k−1)). Here f is some neural network architecture that takes in a variable number of inputs and outputs a scalar. We choose the LSTM in our experiment."
Off-policy correction (p6, Section 4.3): "since we have a model of the environment, we can use the model to imagine an "online experience". More specifically, we propose to use rewards of a dynamic horizon l from the old trajectory, where l < k and l should be smaller if the trajectory is older. This reduces the policy divergence by fewer rollout steps. Further, we redo an MCTS search with the current policy on the last state s_(t+l)"
Consistency (p5): "We note that our temporal consistency loss is similar to SPR, an unsupervised representation method applied on rainbow. However, the consistency loss in our case is applied in a model-based manner, and we use the SimSiam loss function."

**500 times less data, 2 hours** (v2 abstract p1): "Our method achieves 194.3% mean human performance and 109.0% median performance on the Atari 100k benchmark with only two hours of real-time game experience and outperforms the state SAC in some tasks on the DMControl 100k benchmark. This is the first time an algorithm achieves super-human performance on Atari games with such little data. EfficientZero's performance is also close to DQN's performance at 200 million frames while we consume 500 times less data."
p7 (Section 5): "100k steps roughly correspond to 2 hours of real-time gameplay".

**Compute "7 hours on 4 GPUs": UNCONFIRMED.** Not in the paper (v1 or v2: no "hours" besides game time, no GPU count) and not in the repo README, which only says "With 4 GPUs (3090): `bash train.sh`" with example flags `--num_gpus 4`, `--num_cpus 96`. Do not state a wall-clock figure without another source.

**Score versions (surprise):** v1 abstract says "190.4% mean human performance and 116.0% median"; v2 abstract and intro say 194.3% / 109.0% (matching Table 1, 1.943 / 1.090); v2 Section 5.2 text (p7) still says "EfficientZero achieves a mean score of 1.904 and a median score of 1.160", a leftover from v1. Use 194.3% / 109.0% from v2 Table 1. Similarly the Table 1 caption changed from v1 "170% and 180% better" to v2 "176% and 163% better", while v2 Section 5.2 text still says "we are 170% and 180% better".

---

## 6. UCT and MCTS origins

**Kocsis and Szepesvari 2006, "Bandit based Monte-Carlo Planning"** (ECML 2006, LNAI 4212; stanford.edu copy)
Abstract (p1): "In this paper we introduce a new algorithm, UCT, that applies bandit ideas to guide Monte-Carlo planning. In finite-horizon or discounted MDPs the algorithm is shown to be consistent and finite sample bounds are derived on the estimation error due to sampling."
p2: "The main idea in this paper it to apply a particular bandit algorithm, UCB1 (UCB stands for Upper Confidence Bounds), for rollout-based Monte-Carlo planning. The new algorithm, called UCT (UCB applied to trees) described in Section 2 is called UCT. Theoretical results show that the new algorithm is consistent" [sic, both typos in original]
UCB1 (p4, eqs 1-2): [math rebuilt] "It keeps track the average rewards X̄_(i,T_i(t−1)) for all the arms and chooses the arm with the best upper confidence bound: I_t = argmax_(i∈{1,...,K}) { X̄_(i,T_i(t−1)) + c_(t−1,T_i(t−1)) }, (1) where c_(t,s) is a bias sequence chosen to be c_(t,s) = sqrt(2 ln t / s). (2)"
p4: "Hence, in UCT, the above expression for the bias terms c_(t,s) needs to replaced by a term that takes into account this drift of payoffs. One of our main results will show despite this drift, bias terms of the form c_(t,s) = 2C_p sqrt(ln t / s) with appropriate constants C_p can still be constructed"
p5: "In UCT the action selection problem as treated as a separate multi-armed bandit for every (explored) internal node."
Theorem 6 (p6): "Consider a finite-horizon MDP with rewards scaled to lie in the [0, 1] interval. ... Then the bias of the estimated expected payoff, X̄_n, is O(log(n)/n). Further, the failure probability at the root converges to zero at a polynomial rate as the number of episodes grows to infinity." Proof sketch: "the tail conditions are satisfied with C_p = 1/√2".

**Coulom 2006, "Efficient Selectivity and Backup Operators in Monte-Carlo Tree Search"** (Computers and Games 2006; remi-coulom.fr copy), abstract p1: "This paper presents a new framework to combine tree search with Monte-Carlo evaluation, that does not separate between a min-max phase and a Monte-Carlo phase. Instead of backing-up the min-max value close to the root, and the average value at some depth, a more general backup operator is defined that progressively changes from averaging to min-max as the number of simulations grows. ... This algorithm was implemented in a 9 × 9 Go-playing program, Crazy Stone, that won the 10th KGS computer-Go tournament."
The paper does not itself claim to coin the term; the attribution comes from Browne et al.

**Browne et al. 2012, "A Survey of Monte Carlo Tree Search Methods"**, IEEE TCIAIG 4(1), March 2012.
Table 1 timeline (p8): "2006 Coulom describes Monte Carlo evaluations for tree-based search, coining the term Monte Carlo tree search." / "2006 Kocsis and Szepesvari associate UCB with tree-based search to give the UCT algorithm." / "2002 Auer et al. propose UCB1 for multi-armed bandit, laying the theoretical foundation for UCT."
Four steps (p5): "Four steps are applied per search iteration: 1) Selection: Starting at the root node, a child selection policy is recursively applied to descend through the tree until the most urgent expandable node is reached. ... 2) Expansion: One (or more) child nodes are added to expand the tree, according to the available actions. 3) Simulation: A simulation is run from the new node(s) according to the default policy to produce an outcome. 4) Backpropagation: The simulation result is "backed up" (i.e. backpropagated) through the selected nodes to update their statistics."
UCT formula (p7-8): [math rebuilt] "UCT = X̄_j + 2C_p sqrt(2 ln n / n_j) where n is the number of times the current (parent) node has been visited, n_j the number of times child j has been visited and C_p > 0 is a constant." p8: "The value C_p = 1/√2 was shown by Kocsis and Szepesvári to satisfy the Hoeffding ineqality with rewards in the range [0, 1]." [sic] (With C_p = 1/√2 this reduces to UCB1's sqrt(2 ln n / n_j).)

**Tesauro and Galperin, "On-line Policy Improvement using Monte-Carlo Search"** (NIPS 9, 1996 conference, proceedings 1997, pp. 1068-1074). OCR of the NeurIPS scan has glitches ("SP!" for SP1, "TO-Gammon" for TD-Gammon), corrected in brackets.
Abstract (p1068): "In the Monte-Carlo simulation, the long-term expected reward of each possible action is statistically measured, using the initial policy to make decisions in each step of the simulation. The action maximizing the measured expected reward is then taken, resulting in an improved policy. Our algorithm is easily parallelizable and has been implemented on the IBM SP[1] and SP2 parallel-RISC supercomputers. ... Results are reported for a wide variety of initial policies, ranging from a random policy to TD-Gammon, an extremely strong multi-layer neural network. In each case, the Monte-Carlo algorithm gives a substantial reduction, by as much as a factor of 5 or more, in the error rate of the base players."
Rollout term (Section 2): "In backgammon parlance, the expected value of a position is known as the "equity" of the position, and estimating the equity by Monte-Carlo sampling is known as performing a "rollout." This involves playing the position out to completion many times with different random dice sequences, using a fixed policy P to make move decisions for both sides."
Results: "We also note that in each case, there is a huge error reduction of potentially a factor of 4 or more in using the Monte-Carlo technique." ... "we expect that rolling out decisions more extensively would give error reduction ratios closer to factor of 5, albeit at a cost of increased CPU time."
Table 3 (p1073), truncated rollouts, equity loss per move on 800 positions, 32 SP1 nodes: 10 hidden units, base 0.0152, M-C 0.00318 (ratio 4.8, 25 sec/move) and 0.00433 (3.5, 9 sec/move); 80 hidden units (TD-Gammon 2.1 1-ply), base 0.0120, M-C 0.00181 (6.6, 65 sec/move) and 0.00269 (4.5, 18 sec/move).
Discussion (p1073): "our on-line Monte-Carlo algorithm, which basically implements a single step of policy iteration, was found to give very substantial error reductions. Potentially 80% or more of the base player's equity loss can be eliminated, depending on how extensive the Monte-Carlo trials are."

### Sutton and Barto 8.10 and 8.11 (book pp. 183-188)
8.10, p183: "Rollout algorithms are decision-time planning algorithms based on Monte Carlo control applied to simulated trajectories that all begin at the current environment state. They estimate action values for a given policy by averaging the returns of many simulated trajectories that start with each possible action and then follow the given policy."
p184: "the term "rollout" comes from estimating the value of a backgammon position by playing out, i.e., "rolling out," the position many times to the game's end with randomly generated sequences of dice rolls, where the moves of both players are made by some fixed policy."
p184: "In other words, the aim of a rollout algorithm is to improve upon the rollout policy; not to find an optimal policy. Experience has shown that rollout algorithms can be surprisingly effective. For example, Tesauro and Galperin (1997) were surprised by the dramatic improvements in backgammon playing ability produced by the rollout method."
p184: "The result is like one step of the policy-iteration algorithm of dynamic programming discussed in Section 4.3"
8.11, p185: "At its base, MCTS is a rollout algorithm as described above, but enhanced by the addition of a means for accumulating value estimates obtained from the Monte Carlo simulations in order to successively direct simulations toward more highly-rewarding trajectories. MCTS is largely responsible for the improvement in computer Go from a weak amateur level in 2005 to a grandmaster level (6 dan or more) in 2015."
p185: "The core idea of MCTS is to successively focus multiple simulations starting at the current state by extending the initial portions of trajectories that have received high evaluations from earlier simulations."
p187 (four steps): "1. Selection. Starting at the root node, a tree policy based on the action values attached to the edges of the tree traverses the tree to select a leaf node. 2. Expansion. On some iterations (depending on details of the application), the tree is expanded from the selected leaf node by adding one or more child nodes reached from the selected node via unexplored actions. 3. Simulation. From the selected node, or from one of its newly-added child nodes (if any), simulation of a complete episode is run with actions selected by the rollout policy. ... 4. Backup. The return generated by the simulated episode is backed up to update, or to initialize, the action values attached to the edges of the tree traversed by the tree policy in this iteration of MCTS. No values are saved for the states and actions visited by the rollout policy beyond the tree."
Note: S&B call step 4 "Backup"; Browne calls it "Backpropagation". Figure 8.10 is "Adapted from Chaslot, Bakkes, Szita, and Spronck (2008)".
Bibliographical remarks (p193): "The central ideas of MCTS were introduced by Coulom (2006) and by Kocsis and Szepesvári (2006)."

---

## 7. AlphaGo versions (AGZ paper, Methods p21-22, and main text p8, p12)

> "1. AlphaGo Fan is the previously published program that played against Fan Hui in October 2015. This program was distributed over many machines using 176 GPUs.
> 2. AlphaGo Lee is the program that defeated Lee Sedol 4–1 in March, 2016. It was previously unpublished but is similar in most regards to AlphaGo Fan. ... First, the value network was trained from the outcomes of fast games of self-play by AlphaGo, rather than games of self-play by the policy network; this procedure was iterated several times – an initial step towards the tabula rasa algorithm presented in this paper. Second, the policy and value networks were larger than those described in the original paper – using 12 convolutional layers of 256 planes respectively – and were trained for more iterations. This player was also distributed over many machines using 48 TPUs, rather than GPUs, enabling it to evaluate neural networks faster during search.
> 3. AlphaGo Master is the program that defeated top human players by 60–0 in January, 2017. It was previously unpublished but uses the same neural network architecture, reinforcement learning algorithm, and MCTS algorithm as described in this paper. However, it uses the same handcrafted features and rollouts as AlphaGo Lee and training was initialised by supervised learning from human data."

p8: "Surprisingly, AlphaGo Zero outperformed AlphaGo Lee after just 36 hours; for comparison, AlphaGo Lee was trained over several months. After 72 hours, we evaluated AlphaGo Zero against the exact version of AlphaGo Lee that defeated Lee Sedol, under the 2 hour time controls and match conditions as were used in the man-machine match in Seoul (see Methods). AlphaGo Zero used a single machine with 4 Tensor Processing Units (TPUs), while AlphaGo Lee was distributed over many machines and used 48 TPUs. AlphaGo Zero defeated AlphaGo Lee by 100 games to 0"
p12: "In our evaluation, all programs were allowed 5 seconds of thinking time per move; AlphaGo Zero and AlphaGo Master each played on a single machine with 4 TPUs; AlphaGo Fan and AlphaGo Lee were distributed over 176 GPUs and 48 TPUs respectively."
Note: "176 GPUs" for AlphaGo Fan is confirmed by both the 2016 paper (distributed version, 1,202 CPUs and 176 GPUs) and the AGZ paper. AlphaGo Master is a hybrid: AGZ's network, RL and MCTS, plus AlphaGo Lee's handcrafted features, rollouts and supervised initialisation. AGZ says the AlphaGo Lee networks used "12 convolutional layers of 256 planes", not the 13-layer, 192-filter networks of the 2016 paper.
