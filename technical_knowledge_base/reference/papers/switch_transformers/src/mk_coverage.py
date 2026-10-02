"""Write coverage.json: every fact, number, mechanism step, caveat and link of live.md (the Notion page
before migration) with where the HTML carries it, and verify each item's check strings against the built
index.html (tags stripped, scripts kept, whitespace normalised).
usage: python3 mk_coverage.py   (after build.sh)"""
import html, json, re, sys

raw = open('../index.html', encoding='utf-8').read()
txt = html.unescape(re.sub(r'<[^>]+>', ' ', raw))
txt = re.sub(r'\s+', ' ', txt)
R = 'The paper tab'
C = [
 # header and links
 ('Reading time line "10 min read, +~4h 45m resources"', 'dropped: replaced by the build-computed reading time and resources total for the new page', ['min to read', 'of resources']),
 ('Authors: William Fedus, Barret Zoph, Noam Shazeer (Google Brain)', R + ', headline card', ['William Fedus', 'Barret Zoph', 'Noam Shazeer', 'Google Brain']),
 ('Date: January 2021, arXiv v1 2021-01-11, published JMLR 2022', R + ', headline card', ['January 2021', 'arXiv v1 11 January 2021', 'JMLR 2022']),
 ('Link arXiv 2101.03961 (~1h 30m, JMLR-length paper)', 'card and Further reading', ['https://arxiv.org/abs/2101.03961', '(1h 30m)', 'JMLR length']),
 ('Link JAX code + checkpoints (t5x), ~20 min for README and entry path', 'card, Further reading, Using it', ['https://github.com/google-research/t5x', 'about 20 minutes for the README and entry path']),
 ('Link Mesh-TensorFlow reference implementation moe.py (~15 min)', 'Further reading; Balancing loss; Appendices; Using it', ['https://github.com/tensorflow/mesh/blob/master/mesh_tensorflow/transformer/moe.py', '(15 min)']),
 ('Added to KB: 2026-08-24', 'dropped: a Notion bookkeeping date, kept in the database row; the page itself is dated by its sources', []),
 # resources
 ('HF blog Mixture of Experts Explained (~30 min): canonical explainer; Switch routing, capacity factor, load balancing, selective precision restated', 'Further reading', ['https://huggingface.co/blog/moe', 'the canonical MoE explainer', 'essentially a modern restatement of this paper']),
 ('Grootendorst Visual Guide to MoE (~30 min): router, expert capacity, token dropping diagrams; Switch simplification step by step', 'Further reading', ['https://newsletter.maartengrootendorst.com/p/a-visual-guide-to-mixture-of-experts', 'walks through the Switch simplification step by step']),
 ('Cameron Wolfe MoE LLMs deep dive (~40 min): lineage Shazeer 2017, GShard, Mixtral, DeepSeekMoE; sparse vs active math', 'Further reading', ['https://cameronrwolfe.substack.com/p/moe-llms', 'DeepSeekMoE', '(40 min)']),
 ('Yannic Kilcher walkthrough (~1h)', 'Further reading', ['https://www.youtube.com/watch?v=iAR8LkkMMIM', 'an hour-long read-through']),
 # problem
 ('Kaplan-era scaling: bigger dense better; every dense parameter touched by every token, so parameters and FLOPs per token scale together', R + ', Problem', ['Kaplan-era scaling said bigger dense models are better', 'every parameter is touched by every token']),
 ('Sparse MoE (Shazeer 2017, GShard) showed decoupling', R + ', Problem', ['Shazeer et al. 2017; GShard, Lepikhin et al. 2020', 'decoupled']),
 ('Three reasons for little adoption: complexity (top-k, multiple aux losses, capacity juggling), instability (bf16; GShard fell back to float32), communication cost', R + ', Problem', ['Complexity', 'separate auxiliary losses, capacity juggling', 'Training instability', 'trains with float32 precision throughout', 'Communication cost']),
 ('Question: can MoE be simple, stable, fast enough to make parameter count a routine fourth scaling axis at constant FLOPs per token', R + ', Problem', ['routine fourth scaling axis', 'FLOPs) per example constant']),
 # method
 ('Take T5, replace the FFN in every other block with a Switch layer: N expert FFNs plus a linear router W_r', R + ', Idea', ['replace the feed-forward network (FFN) in every other Transformer block', 'expert FFNs plus a linear router']),
 ('Router logits h(x) = W_r x, softmax to p_i(x), send to the argmax expert', R + ', Idea; animation', ['softmax turns them into gate values', 'the token goes to the single expert with the largest one']),
 ('Output = chosen expert output scaled by gate value p_i(x), keeps router differentiable', R + ', Idea', ['multiplied by its gate value', 'keeps the router differentiable']),
 ('Shazeer 2017 conjectured k >= 2 needed for useful router gradients', R + ', Idea', ['conjectured that routing to', 'non-trivial gradients to the routing functions']),
 ('k = 1 preserves quality; router compute drops; capacity at least halved; dispatch and all-to-all simpler and cheaper', R + ', Idea; animation counters', ['less router computation', 'can be at least halved', 'simpler routing implementation and lower communication cost', 'preserves model quality']),
 ('At 128 experts Switch beats top-2 MoE on speed-quality and tolerates lower capacity factors better', R + ', Against top-2; Tables tab', ['both sparse models with 128 experts', 'perform[s] better at lower capacity factors']),
 ('TPU static shapes, dynamic routing, so fixed buffer per expert', R + ', Capacity', ['TPUs compile static shapes', 'each expert gets a fixed buffer']),
 ('Expert capacity = tokens per batch / num experts x capacity factor', R + ', Capacity (Eq. 3); animation', ['expert capacity = (tokens per batch / number of experts) × capacity factor']),
 ('CF > 1 buys slack at padding cost in compute and memory', R + ', Capacity', ['creates additional buffer', 'wasting compute and memory']),
 ('Overflow tokens dropped: skip the FFN, pass through the residual unchanged', R + ', Capacity; animation; toy', ['passed directly to the next layer through the residual connection']),
 ('With good balancing drops under about 1%', R + ', Capacity (quoted, "typically <1%"; marked not checkable in the Tables tab)', ['typically <1%']),
 ('Low CF 1.0 to 1.25 is the sweet spot; matters most at large scale where memory is scarce', R + ', Capacity', ['Low capacity factors (1.0 to 1.25) are the sweet spot', 'where model memory is very scarce']),
 ('Aux loss per Switch layer: f_i fraction dispatched (argmax, non-differentiable), P_i mean router probability (differentiable), loss = alpha N sum f_i P_i', R + ', Balancing loss', ['loss = α · N · Σ', 'an argmax count with no gradient', 'which is differentiable']),
 ('Minimised by uniform routing at 1/N; N factor keeps magnitude constant across expert counts; alpha = 1e-2 balances without disturbing LM loss', R + ', Balancing loss', ['is minimized under a uniform distribution', 'keeps it constant as the expert count changes', 'small enough not to interfere with the cross-entropy objective']),
 ('This single loss replaces the separate load and importance losses of Shazeer 2017', R + ', Balancing loss', ['separate load-balancing and importance-weighting losses']),
 ('Pure bfloat16 diverges (router softmax and exponentials); pure float32 stable but float32 all-to-all (1160 vs 1390 examples/s)', R + ', Precision; Table 2 bars', ['Pure bfloat16 diverged', '1,160', '1,390']),
 ('Fix: cast to float32 only inside the router, locally; recast dispatch and combine tensors to bf16 before communication; float32 stability at bf16 speed', R + ', Precision', ['compute only the router function in float32, locally on each device', 'recast the dispatch and combine tensors to bfloat16', "Float32's stability at bfloat16's speed"]),
 ('Initialisation scale reduced 10x (s = 0.1)', R + ', Precision and init; toy', ['by ten, to 0.1']),
 ('Expert dropout 0.4 vs 0.1 elsewhere when fine-tuning on small tasks', R + ', Precision and init; Table 4 bars', ['0.4 inside the experts']),
 ('Expert parallelism: each device holds its own experts; batch data-parallel; dispatch mask [n, B/n, E, C]; all-to-all reshards data to expert dimension and back', R + ', Parallelism; Figure 9 widget', ['one expert per core', 'binary dispatch tensor of shape', 'reshards from the data dimension to the expert dimension', 'a second all-to-all brings the outputs back']),
 ('Section 5 design space of data, model, expert parallelism; all three for the biggest models', R + ', Parallelism', ['combining three ways of splitting work', 'Expert, model and data parallelism']),
 ('Switch-C 1.6T, 2048 experts, expert + data only; Switch-XXL 395B, 64 experts, adds model parallelism for larger d_model/d_ff at fewer experts', R + ', Trillion scale (64 experts corrected against the released 128)', ['2,048 experts in every FFN layer', 'expert and data parallelism only', '395B parameters', 'Table 9 says 64 experts', 'uses model parallelism for its larger dimensions']),
 # results
 ('7x pretraining speedup at equal FLOPs: Switch-Base 64e to T5-Base quality in one-seventh wall-clock on the same 32 TPUv3 cores (7.5x step basis)', R + ', card and Scaling', ['one-seventh the time', '7.5x step speedup', '32 TPUv3 cores']),
 ('Quality improves monotonically with expert count up to 256 experts, 14.7B params, constant FLOPs', R + ', Scaling; toy sweep', ['256 (14.7B parameters)', 'improves test loss every time']),
 ('Switch-Base outperforms T5-Large per step, 2.5x wall-clock speedup despite T5-Large 3.5x more FLOPs per token', R + ', Scaling', ['more sample efficient than T5-Large and 2.5x faster', '3.5x more FLOPs per token']),
 ('Beats top-2 MoE: fastest to threshold (62.8h vs 80+ for MoE-Base variants), smaller compute footprint', R + ', Against top-2 (corrected: MoE-Base at CF 2.0 took 68.7h, faster than Switch-Base at 2.0)', ['62.8 hours at CF 1.0 against 80.1', 'MoE-Base reaches the threshold in 68.7 hours', 'so its FLOPs are larger']),
 ('Fine-tuning gains almost everywhere; SuperGLUE +4.4 over T5-Base, +2 over T5-Large; large gains on Winogrande, closed-book TriviaQA, XSum, ANLI', R + ', Downstream; Table 5 bars', ['SuperGLUE (+4.4 and +2.0)', 'Winogrande, closed-book TriviaQA and XSum', 'ANLI (R3)']),
 ('Distillation keeps about 30% of the gain at 95 to 99% compression, e.g. 3.8B into 223M', R + ', Downstream; Tables tab', ['about 30% of the quality gain', '28% at 99%', '3,800M']),
 ('Multilingual: over mT5-Base on 101 languages, every language improves; mean 5x step speedup, 91% at 4x or more', R + ', Downstream', ['improves in all 101 languages', 'averages 5x', '91% of languages get 4x or more']),
 ('Trillion scale: Switch-C 1.6T trains with no instability; Switch-XXL (10x FLOPs per token) better per step but sporadically unstable', R + ', Trillion scale (10x corrected to 7.1x)', ['exhibits no training instability at all', 'is sometimes unstable', '6.3T / 890B is 7.1x']),
 ('Both 4x speedup over T5-XXL; Switch-XXL upstream perplexity SOTA; gains partially transfer to reasoning fine-tuning (gap flagged)', R + ', Trillion scale (the 4x is stated for Switch-C)', ["The abstract's 4x speedup over T5-XXL", 'state-of-the-art upstream perplexity', 'its gains have not yet fully translated to SOTA downstream performance']),
 # why it matters
 ('Made sparse MoE practical; demolished the k > 1 belief; one balancing loss; bf16 with a one-line precision fix', R + ', Why it matters', ['This is the paper that made sparse MoE practical', 'was not necessary', 'compressed MoE\'s losses into one balancing loss']),
 ('Vocabulary: expert capacity, capacity factor, token dropping, expert parallelism, sparse vs active parameters', R + ', Why it matters', ['expert capacity, capacity factor, token dropping, expert parallelism, sparse against active parameters']),
 ('Parameter count as a scaling axis independent of FLOPs; 1.6T Switch-C first trillion-parameter model trained', R + ', Why it matters (refined: first with reported results; GShard trained a 1T model but did not report it)', ['scaling axis separate from FLOPs', 'first trillion-parameter model with reported results', 'encountered several trainability issues']),
 ('Lineage: GLaM, ST-MoE, Mixtral (top-2, coarse experts, open weights), DeepSeekMoE/V3 (fine-grained + shared, aux-loss-free fixing the balance vs quality tension), frontier high-sparsity MoE (GPT-4-class, Llama 4, Qwen3-MoE, Kimi K2)', R + ', Why it matters; Then and now tab', ['GLaM', 'ST-MoE', 'open weights', 'fine-grained plus shared experts', 'auxiliary-loss-free bias balancing', 'GPT-4-class models, Llama 4, Qwen3-MoE, Kimi K2']),
 ('Pain points: token dropping motivated dropless kernels (MegaBlocks); instability motivated router z-loss (ST-MoE)', R + ', Why it matters; Then and now', ['token dropping motivated dropless kernels', 'router z-loss line of work']),
 # connections
 ('Mixtral: open-weights descendant; top-2 vs top-1; no capacity-factor machinery on GPUs', R + ', Connections; Further reading', ['3c65c17b0d0d81eba72af0ac91ddc6b3', 'no capacity-factor machinery on GPUs']),
 ('DeepSeek-V3: high-sparsity MoE; aux-loss-free balancing responds to the aux loss introduced here', R + ', Connections; Further reading', ['3c65c17b0d0d815fb8dac9ba1e35ab81', 'direct response to the auxiliary loss introduced here']),
 ('Scaling laws: dense results Switch extends with a fourth axis', R + ', Connections; Further reading', ['3c65c17b0d0d81b08a1debb0c15cd252', 'extends with a fourth axis']),
 ('Megatron-LM: tensor model parallelism combined with expert and data parallelism in section 5', R + ', Connections; Parallelism', ['3c65c17b0d0d8133ae92fbe90a1f308e', 'combines with expert and data parallelism in §5']),
 ('Attention Is All You Need: the Transformer whose FFN sub-block the Switch layer replaces', R + ', Connections; Further reading', ['3c65c17b0d0d81999af7f16f8ed8ee9e', 'whose FFN sub-block the Switch layer replaces']),
 ('Topics: llm-training-and-post-training (expert parallelism, distributed training, distillation); llms (MoE architecture lineage)', R + ', Connections; Further reading, Topics', ['3c65c17b0d0d81b6876ee72b7056793b', '3c65c17b0d0d812d9e00f6ec89965286', 'expert parallelism, distributed training, distillation', 'MoE architecture lineage']),
 ('Database property Takeaway', 'stays in the database; also shown in the headline card', ['Simplified MoE to top-1 routing with a single balancing loss and selective fp32']),
]
norm = lambda s: re.sub(r'\s+', ' ', s)
out, miss = [], []
for fact, where, checks in C:
    found = [c for c in checks if norm(c) in txt or c in raw]
    ok = len(found) == len(checks)
    if not ok: miss.append((fact, [c for c in checks if c not in found]))
    out.append({'fact': fact, 'where': where, 'checks': checks, 'verified': ok})
json.dump({'source': 'live.md (Notion page as of 2026-09-20T17:35)', 'items': len(out), 'verified': sum(o['verified'] for o in out),
           'dropped': [o['fact'] for o in out if o['where'].startswith('dropped')], 'items_list': out}, open('coverage.json', 'w'), indent=1, ensure_ascii=False)
print('coverage items', len(out), 'verified', sum(o['verified'] for o in out))
for f, m in miss: print('MISSING', f[:60], m)
sys.exit(1 if miss else 0)
