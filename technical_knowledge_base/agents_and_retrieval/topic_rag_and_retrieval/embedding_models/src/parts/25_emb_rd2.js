// ---- Reading tab, part 2: fine-tune results, prefixes, lengths, domain shift, MTEB, subsampling ----
(function(){
  const E=window.EMB,esc=RD.esc;
  const draws=[];const reg=f=>{draws.push(f);RD.onRender(f)};RD.onResize(()=>draws.forEach(f=>{try{f()}catch(e){}}));
  const ARM={inbatch:'in-batch, B 32',bm25:'+BM25 negative',dense:'+dense negative',dense_f:'+dense, filtered',inbatch8:'in-batch, B 8',inbatch128:'in-batch, B 128'};
  // ---------- fine-tune results
  reg(function(){const el=document.getElementById('emb-ft-svg');if(!el)return;const lab=document.getElementById('emb-ft-lab');
    if(!E.ft){lab.innerHTML='<span class="emb-pend">pending run</span>';el.innerHTML='<div class="emb-pendbox">The chart appears here once the GPU run has been made (see below).</div>';return}
    lab.innerHTML='<span class="meas">measured here</span>';
    const arms=Object.keys(ARM).filter(a=>E.ft.arms[a]);const W=Math.max(280,Math.min(RD.width(el),760));
    el.innerHTML='';['scifact','nfcorpus'].forEach(ds=>{const d=document.createElement('div');el.appendChild(d);
      const pts=[];arms.forEach((a,i)=>E.ft.arms[a].forEach(r=>pts.push([i,r[ds],ARM[a]+', seed '+r.seed+': '+r[ds].toFixed(3)])));
      const ys=pts.map(p=>p[1]).concat([E.ft.base[ds].ndcg10]);const y0=Math.floor(Math.min(...ys)*100-1)/100,y1=Math.ceil(Math.max(...ys)*100+1)/100;
      const yt=[];for(let v=y0;v<=y1+1e-9;v+=0.01)yt.push(+v.toFixed(2));
      EL.chart(d,[{name:'runs',color:'var(--acc)',pts,line:false}],{x0:-0.5,x1:arms.length-0.5,y0,y1,yticks:yt.filter((v,i)=>yt.length<9||i%2===0),yfmt:v=>v.toFixed(2),xticks:[],
        hlines:[[E.ft.base[ds].ndcg10,'starting model '+E.ft.base[ds].ndcg10.toFixed(3),'var(--bad)']],ylabel:EL.SET[ds]+' nDCG@10',h:240,
        post:(X,Y)=>arms.map((a,i)=>RD.t(X(i),Y(y0)+13,({inbatch:'in-batch',bm25:'+BM25',dense:'+dense',dense_f:'+dense filt.',inbatch8:'batch 8',inbatch128:'batch 128'})[a],{a:'middle',fs:W<480?9:10.5,fill:'var(--mute)'})).join('')})})});
  // ---------- prefixes
  reg(function(){const el=document.getElementById('emb-pf-svg');if(!el)return;el.innerHTML='';
    const V=E.pf.variants,P=E.pf.pairs;
    ['scifact','nfcorpus'].forEach(ds=>{const rows=[];Object.keys(V).filter(k=>V[k].set===ds).forEach(k=>{const v=V[k];const p=P[k];
        rows.push({name:({'bge-small':'bge','qwen3-emb-0.6b':'Qwen3','e5-small-v2':'e5'}[v.model]||v.model)+': '+v.variant.replace(' instruction',' instr.').replace('documented prefix','documented'),v:p?p.diff:0,lo:p?p.lo:0,hi:p?p.hi:0,color:p?(p.hi<0?'var(--bad)':p.lo>0?'var(--good)':'var(--acc)'):'var(--ink)',txt:v.ndcg10.toFixed(3),dim:!p})});
      const h=document.createElement('div');h.className='small';h.style.margin='8px 0 0';h.innerHTML='<b>'+EL.SET[ds]+'</b>: difference to the documented setting (dot) with its paired 95% interval; the number on the right is the nDCG@10';el.appendChild(h);
      const d=document.createElement('div');el.appendChild(d);EL.intervals(d,rows,{lo:-0.09,hi:0.03,ref:0,ticks:[-0.08,-0.06,-0.04,-0.02,0,0.02],tfmt:v=>(v>0?'+':'')+v.toFixed(2)})})});
  // ---------- lengths and evidence
  (function(){const el=document.getElementById('emb-ln-svg');if(!el)return;let set='scifact';
    function draw(){el.innerHTML='';const L=E.ln.lengths[set],names=Object.keys(L),cols=['var(--c1)','var(--c3)','var(--c4)'];
      const a=document.createElement('div'),b=document.createElement('div');el.appendChild(a);
      const pts=names.map((n,i)=>({name:n,color:cols[i],pts:[128,256,512,1024].map(t=>[t,L[n].over[String(t)],n+': '+(100*L[n].over[String(t)]).toFixed(1)+'% longer than '+t])}));
      EL.chart(a,pts,{x0:100,x1:1050,y0:0,y1:1,xticks:[128,256,512,1024],xfmt:v=>String(v),yticks:[0,0.25,0.5,0.75,1],yfmt:v=>(100*v)+'%',xlabel:'token limit',ylabel:'share of '+EL.SET[set]+' documents longer than the limit',h:220});
      const lg=document.createElement('div');lg.className='emb-leg';el.appendChild(lg);EL.legend(lg,names.map((n,i)=>[n,cols[i]]));
      el.appendChild(b);const ev=E.ln.evidence;
      EL.chart(b,[{name:'evidence sentences',color:'var(--bad)',pts:[64,128,256,512].map(t=>[t,ev.end_beyond[String(t)],(100*ev.end_beyond[String(t)]).toFixed(1)+'% of evidence sentences end after token '+t])},
        {name:'first evidence of a pair',color:'var(--c5)',dash:1,pts:[64,128,256,512].map(t=>[t,ev.pair_first_beyond[String(t)],(100*ev.pair_first_beyond[String(t)]).toFixed(1)+'% of pairs: first evidence ends after token '+t])}],
        {x0:40,x1:540,y0:0,y1:1,xticks:[64,128,256,512],xfmt:v=>String(v),yticks:[0,0.25,0.5,0.75,1],yfmt:v=>(100*v)+'%',xlabel:'BERT token limit',ylabel:'SciFact evidence cut off',h:220});
      const lg2=document.createElement('div');lg2.className='emb-leg';el.appendChild(lg2);EL.legend(lg2,[['every evidence sentence','var(--bad)'],['the first evidence sentence of each (claim, abstract) pair','var(--c5)']])}
    RD.seg(document.getElementById('emb-ln-set'),v=>{set=v;draw()});reg(draw)})();
  // ---------- domain shift: same models, three sets
  reg(function(){const el=document.getElementById('emb-ds-svg');if(!el)return;
    const sets=['scifact','nfcorpus','hotpotqa'],models=['bm25','minilm-l6','bge-small','gte-modernbert','qwen3-emb-0.6b','colbert-small'];
    const W=Math.max(280,Math.min(RD.width(el),760)),H=300,L=40,R=W<480?70:120,T=14,B=30;const panels=sets.map(s=>E.ds[s]);
    // each set on its own y range (min..max of its intervals), drawn as a column; lines join a model across columns
    const xs=sets.map((s,i)=>L+i*(W-L-R)/2);let s='';
    const rng=sets.map(st=>{const v=Object.values(E.ds[st].systems);return [Math.min(...v.map(x=>x.lo))-0.01,Math.max(...v.map(x=>x.hi))+0.01]});
    const Y=(i,v)=>T+(1-(v-rng[i][0])/(rng[i][1]-rng[i][0]))*(H-T-B);
    sets.forEach((st,i)=>{s+='<line x1="'+xs[i]+'" y1="'+T+'" x2="'+xs[i]+'" y2="'+(H-B)+'" stroke="var(--line)"/>'+RD.t(xs[i],H-B+16,EL.SET[st],{a:'middle',fs:11,w:600})+
      RD.t(xs[i]-4,T+4,rng[i][1].toFixed(2),{a:'end',fs:9.5,fill:'var(--mute)'})+RD.t(xs[i]-4,H-B,rng[i][0].toFixed(2),{a:'end',fs:9.5,fill:'var(--mute)'})});
    const labs=[];models.forEach(m=>{const pts=sets.map((st,i)=>E.ds[st].systems[m]?[xs[i],Y(i,E.ds[st].systems[m].ndcg10),E.ds[st].systems[m]]:null);
      const ok=pts.filter(Boolean);s+='<polyline fill="none" stroke="'+EL.C[m]+'" stroke-width="1.6" points="'+ok.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'"/>';
      pts.forEach((p,i)=>{if(!p)return;const v=p[2];s+='<line x1="'+(p[0]+3*models.indexOf(m)-7)+'" y1="'+Y(i,v.lo)+'" x2="'+(p[0]+3*models.indexOf(m)-7)+'" y2="'+Y(i,v.hi)+'" stroke="'+EL.C[m]+'" stroke-width="1.2" opacity=".6"/>'+
        '<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4" fill="'+EL.C[m]+'"><title>'+esc(EL.NM[m]+', '+EL.SET[sets[i]]+': '+v.ndcg10.toFixed(3)+' ('+v.lo.toFixed(3)+' to '+v.hi.toFixed(3)+')')+'</title></circle>'});
      const last=ok[ok.length-1];labs.push({x:last[0]+8,y:last[1]+4,t:{'bm25':'BM25','minilm-l6':'MiniLM','bge-small':'bge-small','gte-modernbert':'gte','qwen3-emb-0.6b':'Qwen3-Emb','colbert-small':'ColBERT'}[m],c:EL.C[m]})});
    const gx={};labs.forEach(l=>(gx[l.x]=gx[l.x]||[]).push(l));Object.values(gx).forEach(g=>{g.sort((a,b)=>a.y-b.y);for(let i=1;i<g.length;i++)if(g[i].y-g[i-1].y<12)g[i].y=g[i-1].y+12});
    labs.forEach(l=>{s+=RD.t(l.x,l.y,l.t,{fs:W<480?9.5:10.5,fill:l.c})});
    el.innerHTML=RD.svg(W,H,s,'models across three sets');
    EL.legend(document.getElementById('emb-ds-leg'),[['each column has its own scale; whiskers are 95% intervals; ColBERT has no multi-hop run','var(--line)']])});
  // ---------- MTEB scatter
  (function(){const el=document.getElementById('emb-mt-svg');if(!el)return;let set='sf';
    function draw(){const M=E.mt,yi=set==='sf'?3:4;const pts=M.points.map(p=>[p[1],p[yi],EL.short(p[0])+': mean '+p[1].toFixed(3)+', '+(set==='sf'?'SciFact ':'NFCorpus ')+p[yi].toFixed(3)]);
      const hl=M.points.filter(p=>M.setup.includes(p[0])).map(p=>[p[1],p[yi],EL.short(p[0])+': mean '+p[1].toFixed(3)+', '+p[yi].toFixed(3),'',5.5]);
      const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);const x0=Math.floor(Math.min(...xs)*50)/50,x1=Math.ceil(Math.max(...xs)*50)/50,y0=Math.floor(Math.min(...ys)*20)/20,y1=Math.ceil(Math.max(...ys)*20)/20;
      const xt=[];for(let v=x0;v<=x1+1e-9;v+=0.05)xt.push(+v.toFixed(2));const yt=[];for(let v=y0;v<=y1+1e-9;v+=0.05)yt.push(+v.toFixed(2));
      EL.chart(el,[{name:'all',color:'var(--mute)',pts,line:false,r:2.6,op:0.55},{name:'setup',color:'var(--acc)',pts:hl,line:false}],
        {x0,x1,y0,y1,xticks:xt,yticks:yt,xfmt:v=>v.toFixed(2),yfmt:v=>v.toFixed(2),xlabel:'MTEB(eng, v2) mean over 41 tasks',ylabel:(set==='sf'?'SciFact':'NFCorpus')+' nDCG@10 (results repository)',h:320,
         post:(X,Y)=>M.points.filter(p=>M.setup.includes(p[0])).map(p=>{const x=X(p[1]),r=x>X(x1)-110;return RD.t(r?x-7:x+7,Y(p[yi])+4,EL.short(p[0]).replace('-en-v1.5','').replace('Embedding-',''),{fs:10,fill:'var(--acc)',a:r?'end':undefined}).replace('<text ','<text style="paint-order:stroke;stroke:var(--bg);stroke-width:3px" ')}).join('')});
      document.getElementById('emb-mt-ctr').innerHTML='<span>models <b>'+M.points.length+'</b></span><span>Spearman with the mean <b>'+(set==='sf'?M.rho.mean_scifact:M.rho.mean_nfcorpus).toFixed(2)+'</b></span><span>shared top 10 <b>'+(set==='sf'?M.top10.mean_scifact:M.top10.mean_nfcorpus)+' of 10</b></span>'}
    RD.seg(document.getElementById('emb-mt-set'),v=>{set=v;draw()});reg(draw)})();
  // ---------- subsample stability
  reg(function(){const el=document.getElementById('emb-sub-svg');if(!el)return;const cols={scifact:'var(--c1)',nfcorpus:'var(--c2)',hotpotqa:'var(--c3)'};
    const ser=[];Object.keys(cols).forEach(s=>{const sub=E.ch[s].subsample;ser.push({name:s,color:cols[s],pts:sub.map(x=>[x.n,x.same_winner,EL.SET[s]+', '+x.n+' queries: same winner '+(100*x.same_winner).toFixed(1)+'%'])});
      ser.push({name:s+' order',color:cols[s],dash:1,hollow:1,pts:sub.map(x=>[x.n,x.same_order,EL.SET[s]+', '+x.n+' queries: same order of all four '+(100*x.same_order).toFixed(1)+'%'])})});
    EL.chart(el,ser,{x0:0,x1:210,y0:0,y1:1,xticks:[25,50,100,200],yticks:[0,0.25,0.5,0.75,1],yfmt:v=>(100*v)+'%',xlabel:'labelled queries in the subset',ylabel:'share of 2,000 subsets that agree with the full set',h:260});
    EL.legend(document.getElementById('emb-sub-leg'),[['SciFact','var(--c1)'],['NFCorpus','var(--c2)'],['Multi-hop','var(--c3)'],['solid: same winner; dashed: same order of all four models','var(--line)']])});
})();
