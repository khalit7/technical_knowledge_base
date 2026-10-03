// ---- Activation functions: every formula and derivative, pure functions (no DOM) ----
// Checked against torch.nn.functional and autograd in float64 by check_core.mjs + recompute.py.
(function(G){
  const SQ2=Math.SQRT2, SQ2PI=Math.sqrt(2/Math.PI), INV_SQ2PI=1/Math.sqrt(2*Math.PI);
  // erf to about 1e-15: Taylor series for |x| < 2.5, continued fraction for erfc beyond
  function erf(x){
    const ax=Math.abs(x);
    if(ax<2.5){let t=x,s=x,x2=x*x;for(let n=1;n<80;n++){t*=-x2/n;const d=t/(2*n+1);s+=d;if(Math.abs(d)<1e-17*Math.abs(s))break}return 2/Math.sqrt(Math.PI)*s}
    // erfc(ax) by Lentz's continued fraction: erfc(x) = exp(-x^2)/sqrt(pi) * 1/(x + 1/2/(x + 1/(x + 3/2/(x + ...))))
    let f=ax,C=ax,D=0,tiny=1e-300;
    for(let n=1;n<300;n++){const a=n/2;D=ax+a*D;D=D===0?tiny:D;C=ax+a/C;C=C===0?tiny:C;D=1/D;const dl=C*D;f*=dl;if(Math.abs(dl-1)<1e-16)break}
    const erfc=Math.exp(-ax*ax)/Math.sqrt(Math.PI)/f;
    return x>0?1-erfc:erfc-1;
  }
  const Phi=x=>0.5*(1+erf(x/SQ2));
  const phi=x=>INV_SQ2PI*Math.exp(-x*x/2);
  const sig=x=>x>=0?1/(1+Math.exp(-x)):(e=>e/(1+e))(Math.exp(x));
  const softplus=x=>x>20?x:(x<-30?Math.exp(x):Math.log1p(Math.exp(x)));   // PyTorch: beta 1, threshold 20
  const SELU_A=1.6732632423543772848170429916717, SELU_L=1.0507009873554804934193349852946;
  // id, label, family, f, f', PyTorch name, a dead region (slope exactly 0 for x below 0) or not
  const L=[
    {id:'sigmoid',n:'Sigmoid',fam:'sat',f:sig,d:x=>{const s=sig(x);return s*(1-s)},pt:'torch.sigmoid'},
    {id:'tanh',n:'Tanh',fam:'sat',f:Math.tanh,d:x=>{const t=Math.tanh(x);return 1-t*t},pt:'torch.tanh'},
    {id:'relu',n:'ReLU',fam:'relu',dead:1,f:x=>x>0?x:0,d:x=>x>0?1:0,pt:'F.relu'},
    {id:'leaky',n:'Leaky ReLU (0.01)',fam:'relu',f:x=>x>0?x:0.01*x,d:x=>x>0?1:0.01,pt:'F.leaky_relu(x, 0.01)'},
    {id:'prelu',n:'PReLU (a = 0.25)',fam:'relu',f:x=>x>0?x:0.25*x,d:x=>x>0?1:0.25,pt:'F.prelu(x, 0.25)'},
    {id:'elu',n:'ELU (α = 1)',fam:'relu',f:x=>x>0?x:Math.expm1(x),d:x=>x>0?1:Math.exp(x),pt:'F.elu'},
    {id:'selu',n:'SELU',fam:'relu',f:x=>x>0?SELU_L*x:SELU_L*SELU_A*Math.expm1(x),d:x=>x>0?SELU_L:SELU_L*SELU_A*Math.exp(x),pt:'F.selu'},
    {id:'relu2',n:'Squared ReLU',fam:'relu',dead:1,f:x=>x>0?x*x:0,d:x=>x>0?2*x:0,pt:'F.relu(x)**2'},
    {id:'gelu',n:'GELU (exact)',fam:'smooth',f:x=>x*Phi(x),d:x=>Phi(x)+x*phi(x),pt:'F.gelu'},
    {id:'gelut',n:'GELU (tanh approx.)',fam:'smooth',f:x=>{const t=Math.tanh(SQ2PI*(x+0.044715*x*x*x));return 0.5*x*(1+t)},
      d:x=>{const t=Math.tanh(SQ2PI*(x+0.044715*x*x*x));return 0.5*(1+t)+0.5*x*(1-t*t)*SQ2PI*(1+3*0.044715*x*x)},pt:"F.gelu(x, approximate='tanh')"},
    {id:'qgelu',n:'QuickGELU, xσ(1.702x)',fam:'smooth',f:x=>x*sig(1.702*x),d:x=>{const s=sig(1.702*x);return s+1.702*x*s*(1-s)},pt:'x * torch.sigmoid(1.702 * x)'},
    {id:'silu',n:'SiLU / Swish-1',fam:'smooth',f:x=>x*sig(x),d:x=>{const s=sig(x);return s*(1+x*(1-s))},pt:'F.silu'},
    {id:'mish',n:'Mish',fam:'smooth',f:x=>x*Math.tanh(softplus(x)),d:x=>{const t=Math.tanh(softplus(x));return t+x*(1-t*t)*sig(x)},pt:'F.mish'},
    {id:'softplus',n:'Softplus',fam:'smooth',f:softplus,d:x=>sig(x),pt:'F.softplus'}
  ];
  const BY={};L.forEach(a=>BY[a.id]=a);
  // E over z ~ N(0, 1) by Simpson's rule on [-12, 0] and [0, 12] separately (the kinks and jumps sit at 0)
  function simp(g,a,b){const n=2400,h=(b-a)/n;let s=0;for(let i=0;i<=n;i++){const x=i===0?a+1e-12*(b-a):(i===n?b-1e-12*(b-a):a+i*h),w=(i===0||i===n)?1:(i%2?4:2);s+=w*g(x)*phi(x)}return s*h/3}
  function gaussE(g){return simp(g,-12,0)+simp(g,0,12)}
  // statistics of one activation on a standard normal input: mean, second moment, the gain that keeps the second
  // moment at 1 (1/sqrt(E[f^2])), the backward factor E[f'^2], and the share of inputs with slope exactly 0
  function stats(a){const m=gaussE(a.f),m2=gaussE(x=>a.f(x)**2),d2=gaussE(x=>a.d(x)**2);
    return {mean:m,m2:m2,var:m2-m*m,gain:1/Math.sqrt(m2),d2:d2,zero:a.dead?0.5:0}}
  // where the curve is flat: |f'(x)| below eps
  function minOf(a){let best=1e9,bx=0;for(let x=-6;x<=0;x+=1e-4){const v=a.f(x);if(v<best){best=v;bx=x}}return {x:bx,v:best}}
  // softmax over a vector, shift-invariant (subtract the max first, as every library does)
  function softmax(z,T){T=T||1;const m=Math.max(...z);const e=z.map(v=>Math.exp((v-m)/T));const s=e.reduce((p,q)=>p+q,0);return e.map(v=>v/s)}
  // FFN parameter and multiply-add counts per token, no biases
  const ffn={plain:(d,h)=>2*d*h, gated:(d,h)=>3*d*h, matched:d=>8*d/3};
  // Llama's rounding of the SwiGLU hidden width (meta-llama/llama model.py, FeedForward)
  function llamaHidden(dim,multiple_of,mult){let h=Math.trunc(2*(4*dim)/3);if(mult!=null)h=Math.trunc(mult*h);return multiple_of*Math.ceil(h/multiple_of)}
  G.AF={erf,Phi,phi,sig,softplus,L,BY,gaussE,stats,minOf,softmax,ffn,llamaHidden,SELU_A,SELU_L};
})(typeof window!=='undefined'?window:globalThis);
