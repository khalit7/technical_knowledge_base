// ---- Recurrent cells in plain JS, the same arithmetic as PyTorch's nn.RNN, nn.GRU and nn.LSTM (one layer) ----
// Weights are the trained ones from model/train_memory.py (exported by export_data.py).
window.CELL=(function(){
  const M=SQ.mem,H=M.H,V=M.sym.length,NK=4,Q=8;
  const sig=x=>1/(1+Math.exp(-x));
  function model(kind,w){return {kind,Wih:w['rnn.weight_ih_l0'],Whh:w['rnn.weight_hh_l0'],bih:w['rnn.bias_ih_l0'],bhh:w['rnn.bias_hh_l0'],Wo:w['out.weight'],bo:w['out.bias']}}
  const G={rnn:1,gru:3,lstm:4};
  // one step from state st={h,c} on one-hot input x; returns the new state and every intermediate vector
  function step(m,x,st){
    const n=G[m.kind]*H,xi=new Array(n),hh=new Array(n);
    for(let r=0;r<n;r++){xi[r]=m.Wih[r*V+x]+m.bih[r];let s=m.bhh[r];for(let k=0;k<H;k++)s+=m.Whh[r*H+k]*st.h[k];hh[r]=s}
    const h=new Array(H),o={};
    if(m.kind==='rnn'){for(let k=0;k<H;k++)h[k]=Math.tanh(xi[k]+hh[k]);o.h=h;return o}
    if(m.kind==='gru'){const r=[],z=[],nn=[];
      for(let k=0;k<H;k++){r[k]=sig(xi[k]+hh[k]);z[k]=sig(xi[H+k]+hh[H+k]);nn[k]=Math.tanh(xi[2*H+k]+r[k]*hh[2*H+k]);h[k]=(1-z[k])*nn[k]+z[k]*st.h[k]}
      // PyTorch's z is the share of the old state kept; the page shows u = 1 - z (share of the candidate written), Cho et al.'s convention
      o.r=r;o.u=z.map(v=>1-v);o.cand=nn;o.h=h;return o}
    const i=[],f=[],g=[],oo=[],c=[];
    for(let k=0;k<H;k++){i[k]=sig(xi[k]+hh[k]);f[k]=sig(xi[H+k]+hh[H+k]);g[k]=Math.tanh(xi[2*H+k]+hh[2*H+k]);oo[k]=sig(xi[3*H+k]+hh[3*H+k]);c[k]=f[k]*st.c[k]+i[k]*g[k];h[k]=oo[k]*Math.tanh(c[k])}
    o.f=f;o.i=i;o.cand=g;o.o=oo;o.c=c;o.h=h;return o}
  function readout(m,h){const l=[];for(let j=0;j<NK;j++){let s=m.bo[j];for(let k=0;k<H;k++)s+=m.Wo[j*H+k]*h[k];l.push(s)}const mx=Math.max(...l),e=l.map(v=>Math.exp(v-mx)),z=e.reduce((a,b)=>a+b,0);return e.map(v=>v/z)}
  // run a whole sequence; p[t] = probabilities the model would give if "?" came right after step t
  function run(m,seq){
    let st={h:new Array(H).fill(0),c:new Array(H).fill(0)};const tr=[],p=[];
    for(let t=0;t<seq.length;t++){const o=step(m,seq[t],st);st={h:o.h,c:o.c||st.c};tr.push(o);
      if(t<seq.length-1){const q=step(m,Q,st);p.push(readout(m,q.h))}else p.push(readout(m,o.h))}
    return {tr,p}}
  // seeded generator for distractors
  function rng(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
  function sequence(key,T,seed){const r=rng(seed),s=[key];for(let t=1;t<T-1;t++)s.push(4+Math.floor(r()*4));s.push(Q);return s}
  const models={};for(const k of ['rnn','gru','lstm'])models[k]=model(k,M.models[k].w);
  models.rnn_short=model('rnn',M.short_rnn.w);
  return {H,V,NK,Q,step,run,readout,sequence,models,sym:M.sym};
})();
