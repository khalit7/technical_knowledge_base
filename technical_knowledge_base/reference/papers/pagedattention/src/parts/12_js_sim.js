// ---- The KV cache simulator: a line-for-line port of src/sim.py (see its docstring for the model). ----
// SIM.run(o) returns time averages; with o.trace it also records every step's memory layout (the toy animation).
// check_page.mjs compares SIM.check() with inputs/sim_check.json written by sim.py.
const SIM=(function(){
  function sampler(bins,rnd){const mass=bins.map(b=>b[2]*(b[1]-b[0]));const tot=mass.reduce((a,b)=>a+b,0);const cum=[];let c=0;mass.forEach(m=>{c+=m/tot;cum.push(c)});
    return ()=>{const u=rnd();let i=0;while(i<cum.length-1&&u>cum[i])i++;const b=bins[i];return Math.max(1,Math.floor(b[0]+(b[1]-b[0])*rnd()))}}
  const pow2=x=>{let p=1;while(p<x)p*=2;return p};
  function Buddy(total){const free={};let off=0,s=1;while(s*2<=total)s*=2;
    while(s>=1){if(off+s<=total){(free[s]=free[s]||[]).push(off);off+=s}else s=Math.floor(s/2)}
    const used={};
    return {free,used,
      alloc(size){const s=pow2(size);let c=s;while(!free[c]||!free[c].length){c*=2;if(c>(1<<30))return null}
        const off=Math.min(...free[c]);free[c].splice(free[c].indexOf(off),1);
        while(c>s){c=c/2;(free[c]=free[c]||[]).push(off+c)}used[off]=s;return off},
      release(off){let s=used[off];delete used[off];
        for(;;){const bud=off^s,lo=Math.min(off,bud);const L=free[s];
          if(L&&L.indexOf(bud)>=0&&Math.floor(lo/(2*s))*2*s===lo){L.splice(L.indexOf(bud),1);off=lo;s*=2}else break}
        (free[s]=free[s]||[]).push(off)}}}
  function run(o){
    const system=o.system,F=o.F||PAPER.figs,steps=o.steps||6000,warm=o.warm==null?1500:o.warm,slots=o.slots||15728,block=o.block||16,n=o.n||1,
      maxLen=o.maxLen||2048,watermark=o.watermark==null?0.01:o.watermark,maxTokens=o.maxTokens||2560,maxSeqs=o.maxSeqs||256,reqs=o.reqs||null;
    const rnd=mulberry32(o.seed||1);let din=null,dout=null;
    if(!reqs){const H=F['fig11_'+o.data].bins;din=sampler(H.input,rnd);dout=sampler(H.output,rnd)}
    const prnd=mulberry32(97+(o.seed||1));// picks physical block ids only (for the drawing); never changes a count
    let nxt=0;
    function newReq(){let p,outs;
      if(reqs){if(nxt>=reqs.length)return null;p=reqs[nxt][0];outs=reqs[nxt][1].slice()}
      else{let q;for(;;){p=din();q=dout();if(p>=4&&p<=1024&&q>=4&&p+q<=maxLen)break}outs=[];for(let i=0;i<n;i++)outs.push(q)}
      nxt++;const k=outs.length;return {id:nxt,p,outs,g:new Array(k).fill(0),done:new Array(k).fill(false),st:new Array(k).fill(0),arr:null}}
    const waiting=[],running=[],paged=system==='vllm';
    const nb=paged?Math.floor(slots/block):0,freeL=[];for(let i=0;i<nb;i++)freeL.push(i);
    const wm=paged?Math.floor(watermark*nb):0;const bud=paged?null:Buddy(slots);
    const takeB=()=>{const j=Math.floor(prnd()*freeL.length);const b=freeL[j];freeL[j]=freeL[freeL.length-1];freeL.pop();return b};
    const acc={batch:0,seqs:0,token:0,resv:0,internal:0,saved:0,unshared:0,preempt:0,finished:0,gen:0};let m=0;
    const tr=o.trace?[]:null;let ev=[];
    function admit(r){const k=r.outs.length;
      if(paged){const sh=Math.floor(r.p/block);const bl=[];for(let i=0;i<k;i++)bl.push(r.done[i]?0:Math.ceil((r.p+r.g[i])/block)-sh);
        const need=sh+bl.reduce((a,b)=>a+b,0);if(freeL.length-need<wm)return false;
        r.sb=[];for(let j=0;j<sh;j++)r.sb.push(takeB());r.pb=bl.map(c=>{const L=[];for(let j=0;j<c;j++)L.push(takeB());return L});r.sh=sh;r.bl=bl}
      else{const R=r.outs.map(q=>system==='max'?maxLen:system==='pow2'?Math.min(maxLen,r.p+pow2(q)):r.p+q);const offs=[];
        for(let i=0;i<k;i++){if(r.done[i]){offs.push(null);continue}const off=bud.alloc(R[i]);
          if(off===null){offs.forEach(x=>{if(x!==null)bud.release(x)});return false}offs.push(off)}
        r.R=R;r.off=offs}
      r.st=r.outs.map((_,i)=>r.p+r.g[i]);return true}
    function release(r){if(paged){r.sb.forEach(b=>freeL.push(b));r.pb.forEach(L=>L.forEach(b=>freeL.push(b)));r.sb=[];r.pb=r.pb.map(()=>[]);r.sh=0;r.bl=r.bl.map(()=>0)}
      else{r.off.forEach(x=>{if(x!==null)bud.release(x)});r.off=r.off.map(()=>null)}}
    for(let step=0;step<steps;step++){ev=[];
      while(waiting.length<64){const q=newReq();if(!q)break;waiting.push(q)}
      let preempted=false;
      if(paged){let k=0;
        while(k<running.length){const r=running[k];let need=0;for(let i=0;i<r.outs.length;i++)if(!r.done[i]&&r.st[i]+1>(r.sh+r.bl[i])*block)need++;
          let gone=false;
          while(need>freeL.length){const v=running.pop();release(v);waiting.unshift(v);acc.preempt++;preempted=true;ev.push(['pre',v.id]);if(v===r){gone=true;break}}
          if(gone)break;
          for(let i=0;i<r.outs.length;i++)if(!r.done[i]&&r.st[i]+1>(r.sh+r.bl[i])*block){r.bl[i]++;const b=takeB();r.pb[i].push(b);ev.push(['blk',r.id,b])}
          k++}}
      const fin=[];
      for(const r of running){for(let i=0;i<r.outs.length;i++){if(r.done[i])continue;r.st[i]++;r.g[i]++;if(step>=warm)acc.gen++;
          if(r.g[i]>=r.outs[i]){r.done[i]=true;if(paged){r.pb[i].forEach(b=>freeL.push(b));r.pb[i]=[];r.bl[i]=0}else{bud.release(r.off[i]);r.off[i]=null}}}
        if(r.done.every(x=>x))fin.push(r)}
      for(const r of fin){if(paged){r.sb.forEach(b=>freeL.push(b));r.sb=[];r.sh=0}running.splice(running.indexOf(r),1);ev.push(['fin',r.id]);if(step>=warm)acc.finished++}
      if(!preempted){let ntok=0;running.forEach(r=>r.outs.forEach((_,i)=>{if(!r.done[i])ntok++}));let nseq=ntok;
        while(waiting.length){const h=waiting[0];const live=h.done.filter(x=>!x).length;
          if(ntok+h.p+Math.max(...h.g)>maxTokens||nseq+live>maxSeqs)break;if(!admit(h))break;
          running.push(waiting.shift());ntok+=h.p+Math.max(...h.g);nseq+=live;ev.push(['adm',h.id])}}
      running.sort((a,b)=>a.id-b.id);
      if(tr)tr.push(snap());
      if(step>=warm){m++;let tok=0,resv=0,internal=0,saved=0,unshared=0;
        for(const r of running){const live=[];r.outs.forEach((_,i)=>{if(!r.done[i])live.push(i)});
          if(paged){const base=r.sh*block;tok+=base;unshared+=live.length*r.sh;saved+=Math.max(0,live.length-1)*r.sh;
            for(const i of live){const fl=r.p+r.outs[i]-base,own=r.bl[i]*block,t=r.st[i]-base;tok+=t;resv+=Math.min(own,fl)-t;internal+=Math.max(0,own-fl);unshared+=r.bl[i]}}
          else for(const i of live){const fl=r.p+r.outs[i],own=r.R[i],t=r.st[i];tok+=t;resv+=Math.min(own,fl)-t;internal+=Math.max(0,own-fl)}
          acc.seqs+=live.length}
        acc.batch+=running.length;acc.token+=tok;acc.resv+=resv;acc.internal+=internal;acc.saved+=saved;acc.unshared+=unshared}
      if(reqs&&!waiting.length&&!running.length&&nxt>=reqs.length)break}
    const S=slots;m=Math.max(m,1);
    const out={batch:acc.batch/m,seqs:acc.seqs/m,token:100*acc.token/m/S,resv:100*acc.resv/m/S,internal:100*acc.internal/m/S,preempt:acc.preempt,finished:acc.finished,tokens_per_step:acc.gen/m,saving:acc.unshared?100*acc.saved/acc.unshared:0};
    out.external=100-out.token-out.resv-out.internal;if(tr)out.trace=tr;return out;
    function snap(){return {ev:ev.slice(),wait:waiting.map(r=>r.id),run:running.map(r=>({id:r.id,p:r.p,outs:r.outs.slice(),st:r.st.slice(),done:r.done.slice(),
      off:r.off?r.off.slice():null,R:r.R?r.R.slice():null,sb:r.sb?r.sb.slice():null,pb:r.pb?r.pb.map(L=>L.slice()):null})),free:paged?freeL.length:null}}}
  // the defaults sim.py writes to inputs/sim_check.json
  function check(){const res={};const F=PAPER.figs;
    for(const d of ['sharegpt','alpaca'])for(const s of ['max','pow2','oracle','vllm'])res[d+'_'+s]=run({system:s,data:d,F});
    for(const n of [2,4,6])for(const d of ['alpaca','sharegpt']){res[d+'_vllm_n'+n]=run({system:'vllm',data:d,F,n});res[d+'_oracle_n'+n]=run({system:'oracle',data:d,F,n})}
    for(const b of [1,4,8,32,64,128,256])res['alpaca_vllm_b'+b]=run({system:'vllm',data:'alpaca',F,block:b});
    return res}
  return {run,check,pow2}})();
window.__simCheck=()=>SIM.check();
