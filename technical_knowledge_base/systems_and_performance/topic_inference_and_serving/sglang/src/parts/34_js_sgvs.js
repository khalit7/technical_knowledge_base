// ---- SGLang vs vLLM (t-sgvs): InferenceX DeepSeek-V4-Pro runs (SGD.ix from inputs/inferencex_dsv4pro_vllm_sglang.json) ----
(function(){
  const root=document.getElementById('t-sgvs');if(!root||!window.SGD||!SGD.ix)return;
  const C=SGD.ix.cols,R=SGD.ix.rows.map(r=>{const o={};C.forEach((c,i)=>o[c]=r[i]);return o}).filter(r=>r.tput_gpu>0&&r.intvty>0);
  const $=id=>document.getElementById(id),fmt=(n,d)=>n.toLocaleString('en-US',{maximumFractionDigits:d||0,minimumFractionDigits:d||0});
  const groups={};for(const r of R){const k=r.hw+'|'+r.prec+'|'+r.isl;(groups[k]=groups[k]||{vllm:[],sglang:[]})[r.fw].push(r)}
  // a setting is shown when both engines have at least three runs in it
  const valid=Object.keys(groups).filter(k=>groups[k].vllm.length>=3&&groups[k].sglang.length>=3);
  let sel=valid.find(k=>k==='b200|fp4|1024')||valid[0];
  const HW={b200:'B200',b300:'B300',h200:'H200',mi355x:'MI355X'};
  function frontier(rows){const pts=rows.map(r=>[r.intvty,r.tput_gpu]).sort((a,b)=>b[0]-a[0]);const out=[];let best=-1;for(const p of pts)if(p[1]>best){out.push(p);best=p[1]}return out.sort((a,b)=>a[0]-b[0])}
  function segs(){const [hw,prec,isl]=sel.split('|');const opt=(id,vals,cur,lab,pick)=>{$(id).innerHTML=vals.map(v=>'<button data-m="'+v+'"'+(v===cur?' class="on"':'')+(pick(v)?'':' disabled')+'>'+lab(v)+'</button>').join('')};
    const hws=[...new Set(valid.map(k=>k.split('|')[0]))],precs=[...new Set(valid.map(k=>k.split('|')[1]))],isls=[...new Set(valid.map(k=>k.split('|')[2]))];
    opt('sgv-hw',hws,hw,v=>HW[v]||v,v=>valid.some(k=>k.startsWith(v+'|')));
    opt('sgv-prec',precs,prec,v=>v.toUpperCase(),v=>valid.includes(hw+'|'+v+'|'+isl)||valid.some(k=>k.startsWith(hw+'|'+v+'|')));
    opt('sgv-isl',isls,isl,v=>fmt(+v)+' in / 1,024 out',v=>valid.includes(hw+'|'+prec+'|'+v))}
  function pick(part,v){const p=sel.split('|');p[part]=v;let k=p.join('|');if(!valid.includes(k)){k=valid.find(x=>{const q=x.split('|');return q[part]===v&&(part!==0||true)&&(part===0||q[0]===p[0])})||sel}sel=k;draw()}
  function draw(){if(root.hidden)return;segs();const g=groups[sel],el=$('sgv-chart'),w=RD.width(el),h=Math.min(360,Math.max(260,w*0.5)),x0=52,y0=12,pw=w-x0-14,ph=h-y0-40;
    const all=g.vllm.concat(g.sglang),xs=all.map(r=>r.intvty).filter(v=>v>0),ys=all.map(r=>r.tput_gpu).filter(v=>v>0);
    const lx0=Math.log10(Math.min(...xs)*0.8),lx1=Math.log10(Math.max(...xs)*1.2),ly0=Math.log10(Math.min(...ys)*0.7),ly1=Math.log10(Math.max(...ys)*1.4);
    const X=v=>x0+pw*(Math.log10(v)-lx0)/(lx1-lx0),Y=v=>y0+ph*(1-(Math.log10(v)-ly0)/(ly1-ly0));let b='';
    for(let e=Math.floor(ly0);e<=Math.ceil(ly1);e++)for(const m of [1,2,5]){const v=m*10**e;if(v<10**ly0||v>10**ly1)continue;b+='<line x1="'+x0+'" x2="'+(x0+pw)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+RD.t(x0-4,Y(v)+4,fmt(v),{a:'end',fs:10,fill:'var(--mute)'})}
    for(let e=Math.floor(lx0);e<=Math.ceil(lx1);e++)for(const m of [1,2,5]){const v=m*10**e;if(v<10**lx0||v>10**lx1)continue;b+=RD.t(X(v),h-22,fmt(v),{a:'middle',fs:10,fill:'var(--mute)'})}
    b+=RD.t(x0+pw/2,h-6,'tokens per second per user (median interactivity), log',{a:'middle',fs:10,fill:'var(--mute)'});
    b+='<text x="12" y="'+(y0+ph/2)+'" font-size="10" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+(y0+ph/2)+')">output tokens/s per GPU, log</text>';
    for(const [fw,col] of [['vllm','var(--acc)'],['sglang','var(--good)']]){const f=frontier(g[fw]);
      b+='<polyline fill="none" stroke="'+col+'" stroke-width="2" points="'+f.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
      for(const r of g[fw])b+='<circle cx="'+X(r.intvty).toFixed(1)+'" cy="'+Y(r.tput_gpu).toFixed(1)+'" r="3.2" fill="'+col+'" fill-opacity="0.55" stroke="'+col+'"><title>'+(fw==='vllm'?'vLLM':'SGLang')+', concurrency '+r.conc+', TP'+r.tp+' EP'+r.ep+(r.dpa?' DP-attention':'')+': '+fmt(r.tput_gpu,1)+' tok/s/GPU at '+fmt(r.intvty,1)+' tok/s/user; '+r.image+', '+r.date+'</title></circle>'}
    el.innerHTML=RD.svg(w,h,b,'Throughput per GPU against per-user speed, vLLM and SGLang');
    const fv=frontier(g.vllm),fs=frontier(g.sglang),best=f=>Math.max(...f.map(p=>p[1])),fast=f=>Math.max(...f.map(p=>p[0]));
    const [hw,prec,isl]=sel.split('|');
    $('sgv-out').innerHTML=RD.stat('Highest throughput per GPU','vLLM '+fmt(best(fv))+' / SGLang '+fmt(best(fs)),'tokens/s per GPU, any concurrency')+RD.stat('Fastest per user','vLLM '+fmt(fast(fv),1)+' / SGLang '+fmt(fast(fs),1),'tokens/s per user, concurrency 1')+RD.stat('Runs','vLLM '+g.vllm.length+' / SGLang '+g.sglang.length,'DeepSeek-V4-Pro, '+(HW[hw]||hw)+', '+prec.toUpperCase()+', '+fmt(+isl)+' in');
    const by={};for(const fw of ['vllm','sglang'])for(const r of g[fw]){(by[r.conc]=by[r.conc]||{})[fw]=(by[r.conc][fw]||[]).concat([r])}
    let t='<table><thead><tr><th class="num">Concurrency</th><th class="num">vLLM tok/s/GPU</th><th>vLLM config</th><th class="num">SGLang tok/s/GPU</th><th>SGLang config</th><th class="num">SGLang / vLLM</th></tr></thead><tbody>';
    Object.keys(by).map(Number).sort((a,b)=>a-b).forEach(c=>{const v=by[c].vllm,s=by[c].sglang;if(!v||!s)return;const bv=v.reduce((a,b)=>b.tput_gpu>a.tput_gpu?b:a),bs=s.reduce((a,b)=>b.tput_gpu>a.tput_gpu?b:a);
      t+='<tr><td class="num">'+c+'</td><td class="num">'+fmt(bv.tput_gpu,1)+'</td><td class="small">TP'+bv.tp+' EP'+bv.ep+(bv.dpa?' DPA':'')+'<br>'+RD.esc(bv.image.slice(0,34))+', '+bv.date+'</td><td class="num">'+fmt(bs.tput_gpu,1)+'</td><td class="small">TP'+bs.tp+' EP'+bs.ep+(bs.dpa?' DPA':'')+'<br>'+RD.esc(bs.image.slice(0,34))+', '+bs.date+'</td><td class="num">'+(bs.tput_gpu/bv.tput_gpu).toFixed(2)+'</td></tr>'});
    $('sgv-table').innerHTML=t+'</tbody></table>';
    $('sgv-src').textContent='Source: '+SGD.ix.source+', fetched '+SGD.ix.fetched+'. Filter: '+SGD.ix.filter+'. '+R.length+' rows kept; the best configuration per concurrency is shown in the table.'}
  // one-line summary for the Reading (section 10) and the one-screen tile
  (function(){const parts=[];let lo=9,hi=0;
    for(const k of valid){const [hw,prec,isl]=k.split('|');if(isl!=='1024')continue;const g=groups[k],by={};
      for(const fw of ['vllm','sglang'])for(const r of g[fw]){const c=(by[r.conc]=by[r.conc]||{});c[fw]=Math.max(c[fw]||0,r.tput_gpu)}
      const rs=Object.keys(by).map(Number).sort((a,b)=>a-b).filter(c=>by[c].vllm&&by[c].sglang).map(c=>[c,by[c].sglang/by[c].vllm]);if(!rs.length)continue;
      const mn=rs.reduce((a,b)=>b[1]<a[1]?b:a),mx=rs.reduce((a,b)=>b[1]>a[1]?b:a);lo=Math.min(lo,mn[1]);hi=Math.max(hi,mx[1]);
      parts.push('on '+(HW[hw]||hw)+' '+prec.toUpperCase()+' SGLang\'s throughput per GPU ran from '+mn[1].toFixed(2)+' times vLLM\'s (concurrency '+mn[0]+') to '+mx[1].toFixed(2)+' times (concurrency '+mx[0]+')')}
    const el=document.getElementById('sg-vs-line');if(el)el.textContent='at matched concurrency with 1,024-token prompts, '+parts.join('; ')+' (best configuration of each engine at each concurrency). The ratio swings with concurrency and recipe; only on MI355X did one engine lead at every matched concurrency (SGLang, against a vLLM ROCm nightly build).';
    const t=document.getElementById('sg-k-vs');if(t)t.textContent='SGLang at '+lo.toFixed(2)+' to '+hi.toFixed(2)+' times vLLM'})();
  ['sgv-hw','sgv-prec','sgv-isl'].forEach((id,i)=>$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;pick(i,b.dataset.m)}));
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-sgvs']=[draw];
  addEventListener('resize',()=>{if(!root.hidden){clearTimeout(root._t);root._t=setTimeout(draw,80)}});
})();
