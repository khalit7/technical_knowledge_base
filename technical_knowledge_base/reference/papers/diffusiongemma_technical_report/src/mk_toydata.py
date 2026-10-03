"""Write parts/_gen_toydata.js (window.TOY): the toy's offline sweep (model/results.json), the forward check
(model/check_forward.json), the training logs, the Reading tab's demo problem (picked by running the page's own
JavaScript in node) and the findings text, every number in it read from those files.
usage: python3 mk_toydata.py   (build.sh runs it; needs node for the demo pick)"""
import json, os, re, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(HERE, *a)
out = {}
R = json.load(open(P('model', 'results.json'))) if os.path.exists(P('model', 'results.json')) else {'runs': []}
CF = json.load(open(P('model', 'check_forward.json'))) if os.path.exists(P('model', 'check_forward.json')) else None
out['results'] = {'runs': [{k: r[k] for k in ('variant', 'task', 'N', 'b', 'selfcond', 'acc', 'tpf')} for r in R['runs']]}
logs = {}
for v in ('multinomial', 'masked'):
    f = P('model', v + '.log')
    if not os.path.exists(f): continue
    g = {'step': [], 'a_seq': [], 'a_conv': [], 'd_seq': [], 'd_conv': []}
    for line in open(f):
        m = re.match(r'step (\d+) .*AR answer loss seq ([\d.]+) conv ([\d.]+) \| denoise loss seq ([\d.]+) conv ([\d.]+)', line)
        if m:
            g['step'].append(int(m.group(1)))
            for k, i in (('a_seq', 2), ('a_conv', 3), ('d_seq', 4), ('d_conv', 5)): g[k].append(float(m.group(i)))
    logs[v] = g
out['logs'] = logs

# demo: a held-out seq problem the multinomial toy solves exactly, near a typical pass count (16 for 24 bits), preferably with a revision
NODE = r'''
const fs=require('fs');globalThis.window=globalThis;
globalThis.mulberry32=function(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
eval(fs.readFileSync(process.argv[1]+'/parts/20_model_data.js','utf8'));
eval(fs.readFileSync(process.argv[1]+'/parts/22_js_model.js','utf8')+';globalThis.TD=TD;');
const o={N:48,b:0.1,estop:0.005,tmax:0.8,tmin:0.4,sc:true,seed:1};const Mm=TD.load('multinomial'),Mk=TD.load('masked');const cands=[];
for(const r of TD.testRules)for(let s=0;s<8;s++){const bits=[(s>>2)&1,(s>>1)&1,s&1];const pb=TD.problem('seq',r,bits);
  const a=TD.diffuse(Mm,pb.prompt,o),b=TD.diffuse(Mk,pb.prompt,o);const okA=a.ans.every((x,i)=>x===pb.ref[i]),okB=b.ans.filter((x,i)=>x===pb.ref[i]).length;
  if(okA)cands.push({rule:r,bits,rev:a.revisions,fwd:a.fwd,mk:okB,score:(a.revisions>0?10:0)+(24-okB)/4-Math.abs(a.fwd-16)/2})}
cands.sort((x,y)=>y.score-x.score);process.stdout.write(JSON.stringify(cands.slice(0,5)));
'''
if os.path.exists(P('parts', '20_model_data.js')):
    try:
        c = json.loads(subprocess.run(['node', '-e', NODE, HERE], capture_output=True, text=True, check=True).stdout)
        if c: out['demo'] = {'task': 'seq', 'rule': c[0]['rule'], 'bits': c[0]['bits'], 'why': c[0]}
    except Exception as e:
        print('demo pick failed', e)


def agg(v, task, N=48, b=0.1, sc=True):
    rs = [r for r in R['runs'] if r['variant'] == v and r['N'] == N and r['b'] == b and r['selfcond'] == sc and (task is None or r['task'] == task)]
    if not rs: return None
    return {k: sum(r[k] for r in rs) / len(rs) for k in ('acc', 'bit_acc', 'steps_per_canvas', 'tpf', 'revisions', 'ar_acc')}


pc = lambda x: '%.1f%%' % (100 * x)
if R['runs']:
    ms, mc = agg('multinomial', 'seq'), agg('multinomial', 'conv')
    ks, kc = agg('masked', 'seq'), agg('masked', 'conv')
    ns, nc = agg('multinomial', 'seq', sc=False), agg('multinomial', 'conv', sc=False)
    m4s, m4c = agg('multinomial', 'seq', N=4), agg('multinomial', 'conv', N=4)
    l1s, l1c = agg('multinomial', 'seq', b=1.0), agg('multinomial', 'conv', b=1.0)
    out['nums'] = {'ms': ms, 'mc': mc, 'ks': ks, 'kc': kc, 'ns': ns, 'nc': nc, 'm4s': m4s, 'm4c': m4c, 'l1s': l1s, 'l1c': l1c}
    F = []
    F.append('<li><b>Adaptive compute, as in Appendix G.2.</b> At the paper\'s sampler settings the sequential task takes <b>%.1f</b> passes per canvas and the parallel one <b>%.1f</b> (%.1fx), so TPF is %.2f against %.2f. Exact answers on held-out rule tables: %s and %s. The paper\'s two single prompts took 7 and 4 steps.</li>'
             % (ms['steps_per_canvas'], mc['steps_per_canvas'], ms['steps_per_canvas'] / mc['steps_per_canvas'], ms['tpf'], mc['tpf'], pc(ms['acc']), pc(mc['acc'])))
    F.append('<li><b>Multinomial against masked: the mechanism reproduces, the benefit does not.</b> Same architecture, data, step count and seed; only the corruption differs. As Section 3.2 argues, only multinomial noise lets the model revise tokens it has accepted: <b>%.2f</b> revisions per answer (seq) and %.2f (conv), against %.2f and %.2f for the masked twin, which copies whatever is visible. But here the revisions buy nothing: exact answers are %s / %s for multinomial and %s / %s for masked (seq / conv), and masked needs fewer passes (%.1f / %.1f against %.1f / %.1f per canvas), because a [mask] tells the model exactly which positions are unknown. The masked twin\'s own AR mode is also near perfect on conv (%s against %s), so its conv lead is in how well that training run learned to read unseen rule tables, not in the sampler; one training seed per model, so treat the size of the gap as unverified. The paper itself never compares the two at its scale.</li>'
             % (ms['revisions'], mc['revisions'], ks['revisions'], kc['revisions'], pc(ms['acc']), pc(mc['acc']), pc(ks['acc']), pc(kc['acc']), ms['steps_per_canvas'], mc['steps_per_canvas'], ks['steps_per_canvas'], kc['steps_per_canvas'], pc(kc['ar_acc']), pc(mc['ar_acc'])))
    if ns: F.append('<li><b>Self-conditioning earns its place.</b> Switched off at inference (the model saw z = 0 on half its training batches, so it still works): exact %s / %s instead of %s / %s, and %.1f / %.1f passes per canvas instead of %.1f / %.1f. Feeding the previous pass\'s beliefs back in is what lets the parallel task settle in about two passes.</li>'
             % (pc(ns['acc']), pc(nc['acc']), pc(ms['acc']), pc(mc['acc']), ns['steps_per_canvas'], nc['steps_per_canvas'], ms['steps_per_canvas'], mc['steps_per_canvas']))
    F.append('<li><b>Fewer passes, and a looser budget.</b> Capping at 4 passes per canvas costs a little on seq (%s against %s) and nothing on conv, as Figure 10 would suggest for a model this certain. Accepting more tokens per pass (b = 1 instead of 0.1) does not speed the toy up: TPF %.2f against %.2f on seq, with fewer exact answers (%s), because the extra accepted tokens are wrong more often and adaptive stopping then waits while they are revised (%.2f revisions per answer against %.2f).</li>'
             % (pc(m4s['acc']), pc(ms['acc']), l1s['tpf'], ms['tpf'], pc(l1s['acc']), l1s['revisions'], ms['revisions']))
    F.append('<li><b>Dual mode.</b> The multinomial model\'s weights, decoding autoregressively through the causal encoder (one pass per bit, TPF 1): exact %s / %s. The encoder was trained with its next-token loss (Eq. 13), so this is expected rather than emergent, unlike the paper\'s case where AR ability survives a diffusion finetune.</li>'
             % (pc(ms['ar_acc']), pc(mc['ar_acc'])))
    tr = R.get('train_rules')
    if tr: F.append('<li><b>Held-out rules are harder than seen ones.</b> On rule tables seen in training (fresh inputs) the multinomial toy gets %s (seq) and %s (conv) exactly right, against %s and %s on the 32 held-out tables: the small model has partly memorised tables rather than learned to read any table, most of all on conv. Every number on this page is on held-out tables unless it says otherwise.</li>'
             % (pc(tr['multinomial_seq']), pc(tr['multinomial_conv']), pc(ms['acc']), pc(mc['acc'])))
    F.append('<li><b>What it cannot test:</b> anything about quality at scale (the GPQA or AIME gaps), the SD·RL stage (the report gives no objective to implement, so the toy has no second stage), MoE expert traffic, or wall-clock speed: the toy counts passes, and in a browser a pass over 8 tokens is not memory-bound the way a 26B model on a GPU is.</li>')
    out['findings'] = '<ul class="lst">' + ''.join(F) + '</ul>'
if CF:
    mm = CF['multinomial']
    out['facts'] = ('JavaScript against PyTorch on the shipped weights, 64 held-out problems: largest logit difference %.1e (encoder) and %.1e (decoder, with self-conditioning), argmax agreement %s, AR answers identical %s.'
                    % (mm['max_abs_logit_diff']['encoder'], mm['max_abs_logit_diff']['decoder_selfcond'], mm['argmax_agree'], mm['ar_answers_identical']))
out['how'] = ('Toy: d = 48, 4 heads, 3 layers, feed-forward 128, rotary positions, tied embeddings, self-conditioning FFW 48 to 96 to 48; vocabulary of 17 tokens (bits, '
              'eight rule-window tokens, markers) plus [m] for the masked twin. Trained 3,000 steps, batch 192, AdamW (2e-3, warmup 400, cosine), seed 7, on 224 of 256 rule tables; '
              'the other 32 (every 8th) are only ever used for testing, so every test problem is unseen. The problem space is large (2<sup>24</sup> inputs for conv), so train/test overlap is nil by construction. '
              'Weights shipped at 6 bits per matrix weight (one base64 character), float16 vectors. Scripts: train.py, check_forward.py, mk_toydata.py.')
js = '// Generated by mk_toydata.py from model/results.json, model/check_forward.json and the training logs.\nwindow.TOY=' + json.dumps(out, separators=(',', ':')) + ';\n'
open(P('parts', '_gen_toydata.js'), 'w').write(js)
print('mk_toydata:', len(js), 'bytes', 'demo', out.get('demo', {}).get('rule'))
