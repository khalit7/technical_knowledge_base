// ---- EPLB: a port of deepseek-ai/EPLB eplb.py (one layer), with naive placement for comparison ----
(function(){
function balancedPacking(w,np){const n=w.length,per=n/np;if(per===1)return {pack:w.map((_,i)=>i),rank:w.map(()=>0)};
  const ord=w.map((v,i)=>i).sort((a,b)=>w[b]-w[a]||a-b);const pw=Array(np).fill(0),pi=Array(np).fill(0),pack=Array(n),rank=Array(n);
  for(const g of ord){let best=-1;for(let p=0;p<np;p++)if(pi[p]<per&&(best<0||pw[p]<pw[best]))best=p;pack[g]=best;rank[g]=pi[best];pw[best]+=w[g];pi[best]++}
  return {pack,rank}}
function replicate(w,nphy){const nl=w.length,p2l=[...Array(nl).keys()],rk=Array(nl).fill(0),cnt=Array(nl).fill(1);
  for(let i=nl;i<nphy;i++){let b=0;for(let j=1;j<nl;j++)if(w[j]/cnt[j]>w[b]/cnt[b])b=j;p2l.push(b);rk.push(cnt[b]);cnt[b]++}return {p2l,rk,cnt}}
function rebalance(w,nrep,ng,nn,ngpu){if(ng%nn!==0){ng=1;nn=1}
  const nl=w.length,gs=nl/ng,gpn=ng/nn,ppg=nrep/ngpu;
  const tpg=[];for(let g=0;g<ng;g++){let s=0;for(let j=0;j<gs;j++)s+=w[g*gs+j];tpg.push(s)}
  const gp=balancedPacking(tpg,nn);
  const log2m=Array(nl);for(let g=0;g<ng;g++)for(let j=0;j<gs;j++)log2m[g*gs+j]=(gp.pack[g]*gpn+gp.rank[g])*gs+j;
  const m2l=Array(nl);log2m.forEach((m,l)=>m2l[m]=l);
  const per=nl/nn,phyN=nrep/nn,out=[];
  for(let n=0;n<nn;n++){const tw=[];for(let j=0;j<per;j++)tw.push(w[m2l[n*per+j]]);
    const rp=replicate(tw,phyN);const tp=rp.p2l.map(m=>tw[m]/rp.cnt[m]);
    const pk=balancedPacking(tp,ngpu/nn);const pp=Array(phyN);
    for(let i=0;i<phyN;i++)pp[pk.pack[i]*ppg+pk.rank[i]]=i;
    for(let i=0;i<phyN;i++){const mlog=rp.p2l[pp[i]]+n*per;out.push(m2l[mlog])}}
  return out}
  const EX=[90,132,40,61,104,165,39,4,73,56,183,86],EXOUT='5,6,5,7,8,4,3,4,10,9,10,2,0,1,11,1';
  const PRE={ex:{E:12,R:16,g:4,n:2,G:8},pre:{E:256,R:288,g:8,n:4,G:32},dec:{E:256,R:288,g:8,n:18,G:144}};
  let view='eplb';
  function loads(E,k){const r=mulberry32(7),w=[];for(let i=0;i<E;i++){const u=Math.max(1e-9,r()),v=r();w.push(100*Math.exp(k*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)))}return w}
  function draw(){
    const key=$('epP').value,c=PRE[key],k=+$('epK').value/10;$('epKv').textContent=k.toFixed(1);$('epK').disabled=key==='ex';
    const w=key==='ex'?EX:loads(c.E,k),tot=w.reduce((a,b)=>a+b,0),mean=tot/c.G,per=c.R/c.G;
    let gpus=[];
    if(view==='naive'){for(let g=0;g<c.G;g++)gpus.push({e:[],l:0});w.forEach((x,i)=>{const g=gpus[i%c.G];g.e.push(i);g.l+=x})}
    else{const glob=view==='glob',p2l=glob?rebalance(w,c.R,1,1,c.G):rebalance(w,c.R,c.g,c.n,c.G),cnt=Array(c.E).fill(0);p2l.forEach(l=>cnt[l]++);
      for(let g=0;g<c.G;g++){const e=p2l.slice(g*per,(g+1)*per);gpus.push({e,l:e.reduce((a,l)=>a+w[l]/cnt[l],0)})}
      gpus.p2l=p2l;gpus.cnt=cnt}
    const mx=Math.max(...gpus.map(g=>g.l)),hot=gpus.findIndex(g=>g.l===mx),gpn=c.G/c.n,pol=view==='naive'?'naive':(view==='glob'||c.g%c.n?'global':'hierarchical');
    let h='<div style="display:flex;flex-wrap:wrap;gap:6px">';
    for(let n=0;n<c.n;n++){h+='<div style="border:1px solid var(--line);border-radius:7px;padding:4px;min-width:0"><div class="small mute" style="font-size:10.5px">node '+n+'</div><div style="display:flex;gap:3px">';
      for(let j=0;j<gpn;j++){const gi=n*gpn+j,g=gpus[gi],sh=g.e.length<=4;
        h+='<div title="GPU '+gi+': experts '+g.e.join(', ')+'; load '+g.l.toFixed(0)+'" style="width:'+(c.G>40?14:sh?34:22)+'px;border:1px solid '+(gi===hot?'var(--bad)':'var(--line)')+';border-radius:4px;padding:1px;font-size:9.5px;line-height:1.15;text-align:center"><div style="height:36px;display:flex;align-items:flex-end;background:var(--soft);border-radius:2px"><div style="width:100%;height:'+(100*g.l/mx).toFixed(0)+'%;background:'+(gi===hot?'var(--bad)':'var(--acc)')+';border-radius:2px"></div></div>'+(c.G>40?'':sh?g.e.join(' '):g.e.length+' ex')+'</div>'}
      h+='</div></div>'}
    $('epGrid').innerHTML=h+'</div>';
    const ok=key==='ex'&&view==='eplb'&&gpus.p2l.join(',')===EXOUT;
    $('epOut').innerHTML=stat('Busiest GPU ÷ mean',(mx/mean).toFixed(2)+'×',view==='naive'?'naive placement, no copies':pol+' policy')+stat('Copies per GPU',view==='naive'?'up to '+Math.ceil(c.E/c.G):fmt(per),c.R+' copies of '+c.E+' experts on '+c.G+' GPUs')+(key==='ex'&&view!=='naive'?stat('Placement (physical slot → expert)',gpus.p2l.join(' '),ok?'reproduces the README\'s published output':'global policy: differs from the README'):'');
    $('epNote').innerHTML='Bars: each GPU\'s load (the sum of its copies\' shares) against the busiest, outlined. '+(key==='ex'?'Loads are the README\'s first layer.':'Loads are <span class="ill">illustrative</span>: a seeded random draw whose spread the skew slider sets; DeepSeek do not publish per-expert loads. Expert groups: 8, as in V3\'s config.json; '+(c.g%c.n?'18 nodes do not divide 8 groups, so EPLB falls back to the global policy, as the README advises for decode.':'4 nodes divide 8 groups, so EPLB uses the hierarchical policy, as the README advises for prefill.'));
  }
  segBind('epV',v=>{view=v;draw()});$('epP').addEventListener('change',draw);$('epK').addEventListener('input',draw);draw();
})();
