// ---- Seq2seq with and without attention: the trained toy models in plain JS (same arithmetic as model/train_seq2seq.py) ----
window.S2S=(function(){
  const D=SQ.s2s,E=D.E,H=D.H,A=D.A,V=12,BOS=10;
  function dec(t){const [shape,sc,b]=t,r=atob(b),n=r.length,a=new Float32Array(n);for(let i=0;i<n;i++){let v=r.charCodeAt(i);if(v>127)v-=256;a[i]=v*sc}return {s:shape,a}}
  function load(w){const o={};for(const k in w)o[k]=dec(w[k]);return o}
  const sig=x=>1/(1+Math.exp(-x));
  // y = W x + b for a row-major W (rows, cols) with optional column offset
  function lin(W,b,x,rows,cols){const y=new Array(rows);for(let r=0;r<rows;r++){let s=b?b[r]:0;const o=r*cols;for(let k=0;k<cols;k++)s+=W[o+k]*x[k];y[r]=s}return y}
  function gru(Wih,Whh,bih,bhh,x,h,In){
    const gi=lin(Wih,bih,x,3*H,In),gh=lin(Whh,bhh,h,3*H,H),o=new Array(H);
    for(let k=0;k<H;k++){const r=sig(gi[k]+gh[k]),z=sig(gi[H+k]+gh[H+k]),n=Math.tanh(gi[2*H+k]+r*gh[2*H+k]);o[k]=(1-z)*n+z*h[k]}return o}
  function model(name){
    const w=load(SQ.s2s[name]),att=name==='attention',emb=t=>Array.from(w['emb.weight'].a.subarray(t*E,t*E+E));
    function encode(x){let h=new Array(H).fill(0);const hs=[];for(const t of x){h=gru(w['enc.weight_ih_l0'].a,w['enc.weight_hh_l0'].a,w['enc.bias_ih_l0'].a,w['enc.bias_hh_l0'].a,emb(t),h,E);hs.push(h)}return hs}
    // greedy decoding for n steps; returns outputs, attention rows and the probability of each output
    function decode(x,n){
      const hs=encode(x),hT=hs[hs.length-1],Uh=att?hs.map(h=>lin(w['U.weight'].a,w['U.bias'].a,h,A,H)):null;
      let s=hT.slice(),y=BOS;const out=[],atts=[],prob=[];
      for(let t=0;t<n;t++){
        let c=hT,a=null;
        if(att){const Ws=lin(w['W.weight'].a,null,s,A,H),v=w['v.weight'].a;
          const sc=Uh.map(u=>{let z=0;for(let k=0;k<A;k++)z+=v[k]*Math.tanh(Ws[k]+u[k]);return z});
          const mx=Math.max(...sc),e=sc.map(z=>Math.exp(z-mx)),Z=e.reduce((p,q)=>p+q,0);a=e.map(z=>z/Z);
          c=new Array(H).fill(0);hs.forEach((h,j)=>{for(let k=0;k<H;k++)c[k]+=a[j]*h[k]})}
        const e=emb(y);s=gru(w['dec.weight_ih'].a,w['dec.weight_hh'].a,w['dec.bias_ih'].a,w['dec.bias_hh'].a,e.concat(c),s,E+H);
        const lg=lin(w['out.weight'].a,w['out.bias'].a,s.concat(c,e),V,H+H+E),mx=Math.max(...lg),ex=lg.map(z=>Math.exp(z-mx)),Z=ex.reduce((p,q)=>p+q,0);
        y=lg.indexOf(mx);out.push(y);prob.push(ex[y]/Z);atts.push(a)}
      return {hs,out,atts,prob}}
    return {encode,decode,att,params:Object.values(w).reduce((s,t)=>s+t.a.length,0)}}
  return {fixed:model('fixed'),attention:model('attention'),H,BOS,EOS:11};
})();
