// ---- State vs KV cache tab: race animation, calculator, all-model chart, tiny GPT table ----
(function(){
  const $=id=>document.getElementById(id);
  if(!window.BA||!window.MM||!window.CC||!window.BAD||!$('mm-race'))return;
  const M=BAD.mem.models,TAB='t-mem';
  const col={'attention':'var(--c1)','recurrent only':'var(--c2)','hybrid':'var(--c4)'};
  const opt=(sel,list,def)=>{sel.innerHTML=list.map(m=>'<option value="'+m.key+'"'+(m.key===def?' selected':'')+'>'+RD.esc(m.label)+'</option>').join('')};
  const get=k=>M.find(m=>m.key===k);
  opt($('mm-a'),M.filter(m=>m.group==='attention'),'llama-3.1-8b');
  opt($('mm-b'),M.filter(m=>m.group!=='attention'),'nemotron-h-8b');
  opt($('mm-m'),M,'nemotron-h-8b');
  // race
  const CT=[];for(let c=256;c<=1048576;c*=2)CT.push(c);
  function drawRace(i){const a=get($('mm-a').value),b=get($('mm-b').value),ctx=CT[i];
    const ra=MM.cache(a.cfg,ctx),rb=MM.cache(b.cfg,ctx),mx=Math.max(ra.total,rb.total);
    const bar=(m,r)=>'<div class="mm-row"><div class="nm">'+RD.esc(m.label)+'</div><div class="mm-bar">'+
      '<span style="width:'+(100*r.state/mx).toFixed(2)+'%;background:var(--c2)" title="state"></span><span style="width:'+(100*r.kv/mx).toFixed(2)+'%;background:var(--c1)" title="KV cache"></span></div><div class="v">'+BA.fmtB(r.total)+'</div></div>';
    $('mm-race-bars').innerHTML='<p class="small"><b>'+ctx.toLocaleString('en-GB')+' tokens</b> in context</p>'+bar(a,ra)+bar(b,rb)+'<div class="leg"><span style="--sw:var(--c2)">recurrent state (fixed)</span><span style="--sw:var(--c1)">KV cache (grows)</span></div>';
    const x=MM.cross(b.cfg),xa=(()=>{let lo=1,hi=1<<24;if(MM.cache(a.cfg,hi).total<MM.cache(b.cfg,hi).total)return null;while(lo<hi){const m=Math.floor((lo+hi)/2);if(MM.cache(a.cfg,m).total>=MM.cache(b.cfg,m).total)hi=m;else lo=m+1}return lo})();
    $('mm-race-cap').innerHTML=(ra.total<rb.total?'<b>'+RD.esc(a.label)+' uses less memory</b> at this length: '+RD.esc(b.label)+' has reserved '+BA.fmtB(rb.state)+' of state from the first token.':'<b>'+RD.esc(b.label)+' uses less memory</b>: '+(ra.total/rb.total).toFixed(1)+' times less than '+RD.esc(a.label)+'.')+
      (xa?' The two totals cross at '+xa.toLocaleString('en-GB')+' tokens.':'')+(x?' Inside '+RD.esc(b.label)+', its own attention cache passes its state at '+x.toLocaleString('en-GB')+' tokens.':'')+' Scale: the longer bar fills the width at each step.'}
  const race=BA.anim({tab:TAB,card:'mm-race',ctl:'mm-race-ctl',n:CT.length,draw:drawRace,ms:900,label:'Context'});
  ['mm-a','mm-b'].forEach(id=>$(id).addEventListener('change',()=>race.reset(CT.length)));
  // calculator
  const CTX=[];for(let c=256;c<=16777216;c*=2)CTX.push(c);   // 256 .. 16M (17 stops)
  const BS=[1,2,4,8,16,32,64,128,256];
  function calc(){const m=get($('mm-m').value),ctx=CTX[+$('mm-ctx').value],bs=BS[+$('mm-bs').value],kvb=+$('mm-kvd').value,sb=+$('mm-sd').value;
    $('mm-ctx-v').textContent=ctx.toLocaleString('en-GB')+' tokens';$('mm-bs-v').textContent=String(bs);
    const r=MM.cache(m.cfg,ctx,kvb,sb),r1=MM.cache(m.cfg,1,kvb,sb),x=MM.cross(m.cfg,kvb,sb);
    $('mm-out').innerHTML=RD.stat('KV per token',BA.fmtB(r1.kv),'all attention layers')+RD.stat('State per sequence',BA.fmtB(r.state),'fixed')+
      RD.stat('One sequence at this context',BA.fmtB(r.total),BA.fmtB(r.kv)+' KV + '+BA.fmtB(r.state)+' state')+RD.stat('Batch of '+bs,BA.fmtB(r.total*bs),'cache and state only, no weights')+
      RD.stat('KV = state at',x?x.toLocaleString('en-GB')+' tokens':'n/a',x?'below it the state is the larger part':'no state or no attention');
    const mx=r.total||1;
    $('mm-split').innerHTML='<div class="mm-row"><div class="nm">one sequence</div><div class="mm-bar"><span style="width:'+(100*r.state/mx).toFixed(2)+'%;background:var(--c2)"></span><span style="width:'+(100*r.kv/mx).toFixed(2)+'%;background:var(--c1)"></span></div><div class="v">'+(100*r.state/mx).toFixed(0)+'% state</div></div>';
    const mx2=m.mixers,parts=Object.keys(mx2).map(k=>mx2[k]+' '+({attn:'attention',attn_win:'sliding-window attention',mla:'MLA',mamba1:'Mamba',mamba2:'Mamba-2',gdn:'Gated DeltaNet',kda:'KDA'}[k]||k)).join(', ');
    $('mm-note').innerHTML=RD.esc(m.label)+': '+parts+' layers (from its config). Context beyond a model\'s trained length is arithmetic only.'}
  ['mm-m','mm-ctx','mm-bs','mm-kvd','mm-sd'].forEach(id=>$(id).addEventListener(id==='mm-ctx'||id==='mm-bs'?'input':'change',calc));
  calc();
  // chart
  let grp='hybrid';const PAL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--acc)','var(--bad)','var(--good)'];
  function chart(){const el=$('mm-chart');const L=M.filter(m=>grp==='all'||m.group===grp);
    const xs=[1024,2048,4096,8192,16384,32768,65536,131072,262144,524288,1048576];
    const series=L.map((m,i)=>({name:m.label,color:grp==='all'?col[m.group]:PAL[i%PAL.length],dash:grp==='all'?(i%3===1?'5 3':i%3===2?'2 2':''):(i>=PAL.length?'5 3':''),pts:xs.map(c=>[c,Math.log10(MM.cache(m.cfg,c).total)])}));
    const ys=series.flatMap(s=>s.pts.map(p=>p[1]));
    const TK=[20,24,28,32,36,40].map(e=>Math.log10(Math.pow(2,e)));const lo=Math.min(...ys),hi=Math.max(...ys);
    const yt=TK.filter(v=>v>=lo-0.3&&v<=hi+0.3);
    BA.line(el,series,{logx:true,ymin:Math.min(lo,yt[0]),ymax:Math.max(hi,yt[yt.length-1]),yticks:yt,yfmt:v=>BA.fmtB(Math.pow(10,v)),xticks:[1024,8192,65536,524288],xfmt:BA.fmtT,xlab:'context (tokens)',label:'memory per sequence against context'})}
  RD.seg($('mm-grp'),m=>{grp=m;chart()});
  BA.onTab(TAB,()=>{chart();race.redraw()});BA.onResize(TAB,()=>{chart();race.redraw()});
  // tiny table
  const tt=document.querySelector('#mm-tiny tbody');
  if(tt)tt.innerHTML=BAD.mem.tiny.map(t=>'<tr><td>'+t.preset+'</td><td><code>'+t.layer_types+'</code></td><td class="num">'+Math.round(t.kv_per_token_bf16).toLocaleString('en-GB')+' B</td><td class="num">'+t.state_fp32.toLocaleString('en-GB')+' B</td><td class="num">'+
    (t.kv_per_token_bf16&&t.state_fp32?Math.round(t.state_fp32/t.kv_per_token_bf16).toLocaleString('en-GB')+' tokens':t.state_fp32?(t.state_fp32/BAD.mem.tiny[0].kv_per_token_bf16).toFixed(0)+' tokens of the baseline\'s cache':'')+'</td></tr>').join('');
})();
