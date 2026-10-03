// ---- Training lab, part b: defaults, control lists and presets (data only, no DOM; src/lab/check_presets.mjs runs every preset over seeds 1 to 10 with these exact definitions) ----
(function(root){
'use strict';
const LB=root.LB;
// the starting configuration of both runs
LB.DEF={loss:'ce',act:'relu',init:'he',norm:'none',place:'pre',resid:false,depth:4,width:24,opt:'adam',lr:0.01,sched:'cosine',warm:0.05,bs:32,wdMode:'l2',wd:0,drop:0,early:false};
LB.SHDEF={task:'spiral',n:200,noise:0,steps:1500,seed:1};
// the overfitting setting shared by four presets: few points, a fifth of their labels flipped, a wide net, a constant learning rate
const OV={width:48,depth:3,lr:0.003,sched:'constant',warm:0},OVSH={task:'moons',n:80,noise:0.2,steps:2000};
const DEEP={depth:8,opt:'momentum',lr:0.05},SH15={task:'spiral',n:200,noise:0,steps:1500},SH20={task:'spiral',n:200,noise:0,steps:2000};
// Each preset: shared settings, the two runs (A the reference, B the change), what to look at, and claims.
// Every claim has a judge(A, B) on the end-of-run figures (LB.summ) and `ok`, the number of seeds out of 10 on which it holds; check_presets.mjs recomputes `ok` and fails if it differs.
LB.PRESETS=[
 {id:'zeros',name:'All-zero init never breaks symmetry',sh:SH15,a:{},b:{init:'zeros'},link:'n',
  see:'B starts with every weight at zero. Its loss stays at ln 2 = 0.693 and its accuracy at 50% for the whole run, and its gradient bars stay empty: zero weights pass nothing forward and nothing back. A, the same net with He init, learns the spiral.',
  why:'Zero is the extreme case of a symmetric start: units that start identical get identical gradients and stay identical, so the net never uses its width.',
  claims:[{t:'B ends at 50% validation accuracy with loss 0.693',j:(A,B)=>B.vaA===0.5&&Math.abs(B.trL-Math.LN2)<0.005,ok:10},{t:'A ends above 95%',j:(A,B)=>A.vaA>0.95,ok:10}]},
 {id:'sigmoid',name:'Sigmoid plus a deep net: the gradient vanishes',sh:SH20,a:{...DEEP},b:{...DEEP,act:'sigmoid',init:'xavier'},link:'a',
  see:'Eight layers, SGD with momentum. In B (sigmoid) the gradient bars fall layer by layer going back from the output, and the first layer gets about a hundred-thousandth of the last layer\'s gradient; its loss never leaves 0.693. A (ReLU, He init) learns, to between 80% and 100% depending on the seed.',
  why:'A sigmoid\'s slope is at most 0.25, so each layer scales the backward signal down; eight of them leave the first layers almost no gradient to learn from.',
  claims:[{t:'B stays at or below 55% and its first-layer gradient is under 1/1,000 of its last layer\'s',j:(A,B)=>B.vaA<=0.55&&B.gratio<1e-3,ok:10},{t:'A ends above 75%',j:(A,B)=>A.vaA>0.75,ok:10}]},
 {id:'bnfix',name:'BatchNorm rescues the deep sigmoid net',sh:SH20,a:{...DEEP,act:'sigmoid',init:'xavier'},b:{...DEEP,act:'sigmoid',init:'xavier',norm:'bn',place:'post'},link:'n',
  see:'The same eight sigmoid layers. B adds BatchNorm after each layer: its gradient bars stay roughly level from the first layer to the last and it reaches about 99%, while A stays at 50%.',
  why:'Normalising each layer\'s output keeps the sigmoid\'s inputs near zero, where its slope is largest, so the backward signal no longer shrinks at every layer.',
  claims:[{t:'B ends above 95% with its first-layer gradient at least a tenth of its last layer\'s',j:(A,B)=>B.vaA>0.95&&B.gratio>0.1,ok:10},{t:'A stays at or below 55%',j:(A,B)=>A.vaA<=0.55,ok:10}]},
 {id:'warmup',name:'No warmup diverges at a high learning rate',sh:SH15,a:{depth:8,width:32,resid:true,opt:'sgd',lr:0.3,warm:0.2},b:{depth:8,width:32,resid:true,opt:'sgd',lr:0.3,warm:0},link:'o',
  see:'Eight residual layers, no normalisation, plain SGD at learning rate 0.3 with a cosine decay. B starts at the full rate and diverges within its first few steps. A raises the rate linearly over the first 20% of steps and trains. The activation bars show why: they grow layer by layer at the start.',
  why:'Without normalisation each residual layer adds to the signal, so the starting activations and gradients are large; a full-size first step overshoots, while small early steps let the weights settle before the rate peaks.',
  claims:[{t:'B diverges within its first 10 steps',j:(A,B)=>B.div>0&&B.div<=10,ok:10},{t:'A trains to above 90% without diverging',j:(A,B)=>!A.div&&A.vaA>0.9,ok:10}]},
 {id:'adamw',name:'Adam with L2 against AdamW',sh:OVSH,a:{...OV,opt:'adamw',wd:0.1},b:{...OV,opt:'adam',wd:0.1},link:'o',
  see:'The same λ = 0.1 on both. A (AdamW) shrinks every weight by the factor 1 − lr·λ per step and still fits the noisy labels. B (Adam with L2) adds λw to the gradient, and Adam then divides it by the gradient\'s running size, so weights whose loss gradient is small are pulled to zero at the full step size: watch B\'s weight-norm bars collapse.',
  why:'In Adam, L2 and the learning rate are entangled with the gradient scale; AdamW decouples the decay, so λ means the same thing for every weight.',
  claims:[{t:'B\'s weights end under a tenth of A\'s',j:(A,B)=>B.wn<0.1*A.wn,ok:10},{t:'B ends at chance (55% or below)',j:(A,B)=>B.vaA<=0.55,ok:8,dep:true}]},
 {id:'dropout',name:'Dropout closes the generalisation gap',sh:OVSH,a:{...OV},b:{...OV,drop:0.4},link:'r',
  see:'80 training points, a fifth of their labels flipped. A memorises them: training loss near zero, validation loss climbing, a boundary with islands around the flipped points. B drops 40% of the hidden units at each step: its training and validation losses stay close and its boundary stays smooth.',
  why:'A net that cannot rely on any one unit cannot memorise single points cheaply, so it fits the shape the clean majority draws.',
  claims:[{t:'B\'s gap (validation minus training loss) is smaller than A\'s',j:(A,B)=>B.gap<A.gap,ok:10},{t:'B\'s validation accuracy is higher than A\'s',j:(A,B)=>B.vaA>A.vaA,ok:10}]},
 {id:'early',name:'Early stopping keeps the best validation loss',sh:OVSH,a:{...OV},b:{...OV,early:true},link:'r',
  see:'The same overfitting setting. B stops once validation loss has not improved for 15% of the run (300 steps), a few hundred steps in; A carries on and its validation loss keeps rising.',
  why:'Validation loss bottoms out early and then rises as the net starts fitting the flipped labels; stopping near the bottom is the cheapest regulariser there is. (B stops; it does not roll back to its best step, so its loss at the stop is a little above its best.)',
  claims:[{t:'B stops early',j:(A,B)=>B.stopped>0,ok:10},{t:'B\'s validation loss at the stop is below A\'s at the end',j:(A,B)=>B.vaL<A.vaL,ok:10}]},
 {id:'smooth',name:'Label smoothing caps overconfidence',sh:OVSH,a:{...OV},b:{...OV,loss:'ls'},link:'l',
  see:'B trains on targets of 0.95 and 0.05 instead of 1 and 0 (smoothing 0.1 over two classes). Its validation loss rises far less than A\'s, because it never becomes certain about points it gets wrong. Its accuracy is another matter: higher than A\'s on some seeds, lower on others.',
  why:'Cross-entropy punishes a confident mistake without limit; capping the target caps the confidence, which is a change to calibration more than to the boundary.',
  claims:[{t:'B\'s validation loss is below A\'s',j:(A,B)=>B.vaL<A.vaL,ok:10},{t:'B\'s validation accuracy is higher than A\'s',j:(A,B)=>B.vaA>A.vaA,ok:6,dep:true}]}
];
// which child page owns each preset's depth (Notion ids)
LB.PAGES={l:['Loss functions','3c65c17b0d0d8161a72bc8c572f37d55'],a:['Activation functions','3c65c17b0d0d819f8049c255e6f206e2'],r:['Regularisation','3c65c17b0d0d81e988b5c3cb5e197f98'],
  o:['Optimisers','3c65c17b0d0d817080bbc90954681d09'],n:['Normalisation and initialisation','3c65c17b0d0d81369e1cc38ed4e11d48']};
})(typeof window!=='undefined'?window:globalThis);
