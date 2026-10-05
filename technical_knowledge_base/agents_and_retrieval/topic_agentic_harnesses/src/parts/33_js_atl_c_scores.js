// ---- Harness atlas: same model, different harness (dumbbell chart), studies, numbers quoted in the prose ----
(function(){
  const {A,$,esc,link,onRender,tabShown,n0}=window.ATLX;
  const S=A.sets||{};if(!S.tb20)return;
  const KC={own:'var(--c1)',third:'var(--c2)',neutral:'var(--c3)',mini:'var(--c4)',vendor:'var(--c5)'};
  const KN={own:"model provider's own harness",third:'third-party harness',neutral:'Terminus 2 (the benchmark\'s neutral agent)',mini:'mini-SWE-agent, bash only',vendor:"vendor's launch figure"};
  const ORDER=['tb20','tb21','swev','htswe','httb'];
  $('atl-sset').innerHTML=ORDER.map(k=>'<option value="'+k+'">'+esc(S[k].title)+'</option>').join('');
  let cur='tb20',met='v';
  function rowsOf(){const r=S[cur].rows;const by={};r.forEach(x=>{(by[x.m]=by[x.m]||[]).push(x)});
    const val=x=>met==='c'&&x.c!=null?x.c:x.v;
    return Object.entries(by).map(([m,xs])=>({m,xs,max:Math.max(...xs.map(val)),min:Math.min(...xs.map(val))})).sort((a,b)=>b.max-a.max)}
  function draw(){
    const ht=cur.startsWith('ht');$('atl-smetl').style.display=ht?'':'none';if(!ht)met='v';
    const el=$('atl-schart');const W=Math.max(300,el.clientWidth||600);
    const rows=rowsOf();const narrow=W<520;const LW=narrow?Math.min(118,W*0.36):190;const RW=narrow?34:44;const rh=narrow?24:22;const top=24;
    const H=top+rows.length*rh+8;
    const cost=met==='c';
    let lo,hi,sx;
    if(cost){const all=S[cur].rows.map(x=>x.c).filter(x=>x>0);lo=Math.log10(Math.min(...all)*0.8);hi=Math.log10(Math.max(...all)*1.2);sx=v=>LW+(Math.log10(v)-lo)/(hi-lo)*(W-LW-RW)}
    else{const all=S[cur].rows.map(x=>x.v);lo=Math.max(0,Math.floor(Math.min(...all)/10)*10);hi=100;sx=v=>LW+(v-lo)/(hi-lo)*(W-LW-RW)}
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Scores of the same model in different harnesses">';
    const ticks=cost?[0.03,0.1,0.3,1].filter(t=>Math.log10(t)>=lo&&Math.log10(t)<=hi):[lo,lo+(hi-lo)/4,lo+(hi-lo)/2,lo+3*(hi-lo)/4,hi].map(Math.round);
    ticks.forEach(t=>{const x=sx(t);s+='<line x1="'+x+'" x2="'+x+'" y1="'+(top-6)+'" y2="'+(H-6)+'" stroke="var(--line)"/><text x="'+x+'" y="'+(top-10)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+(cost?'$'+t:t+'%')+'</text>'});
    rows.forEach((r,i)=>{const y=top+i*rh+rh/2;
      const nm=narrow&&r.m.length>17?r.m.slice(0,16)+'.':r.m;
      s+='<text x="'+(LW-6)+'" y="'+(y+4)+'" font-size="'+(narrow?10.5:12)+'" text-anchor="end">'+esc(nm)+'</text>';
      s+='<line x1="'+sx(r.min)+'" x2="'+sx(r.max)+'" y1="'+y+'" y2="'+y+'" stroke="var(--dim)" stroke-width="3" stroke-linecap="round"/>';
      const spread=r.max-r.min;
      s+='<text x="'+(W-2)+'" y="'+(y+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+(cost?(r.max/r.min).toFixed(1)+'x':'+'+spread.toFixed(1))+'</text>';
      r.xs.forEach(x=>{const v=cost?x.c:x.v;if(v==null)return;const id=S[cur].rows.indexOf(x);
        s+='<circle cx="'+sx(v)+'" cy="'+y+'" r="5" fill="'+(x.unv?'var(--bg)':KC[x.k])+'" stroke="'+KC[x.k]+'" stroke-width="2"/><circle class="atl-hit" data-r="'+id+'" cx="'+sx(v)+'" cy="'+y+'" r="9" fill="transparent" style="cursor:pointer"/>'})});
    el.innerHTML=s+'</svg>';
    const kinds=[...new Set(S[cur].rows.map(x=>x.k))];
    $('atl-sleg').innerHTML=kinds.map(k=>'<span><i style="background:'+KC[k]+'"></i>'+KN[k]+'</span>').join('')+(S[cur].rows.some(x=>x.unv)?'<span><i style="background:var(--bg);border:2px solid var(--mute);width:6px;height:6px"></i>hollow: not verified by the maintainers</span>':'');
    const big=rows.slice().sort((a,b)=>(b.max-b.min)-(a.max-a.min))[0];
    $('atl-scap').innerHTML=esc(S[cur].title)+'. '+rows.length+' models; the right-hand column is each model\'s spread across harnesses ('+(cost?'most expensive over cheapest':'percentage points')+'). Largest: '+esc(big.m)+', '+(cost?(big.max/big.min).toFixed(1)+'x':(big.max-big.min).toFixed(1)+' points')+'. '+(S[cur].note?esc(S[cur].note)+' ':'')+'Source: '+link(S[cur].src)+'.';
  }
  function point(i){const x=S[cur].rows[i];if(!x)return;
    $('atl-spt').innerHTML='<b>'+esc(x.m)+'</b> in <b>'+esc(x.h)+'</b>'+(x.org?' <span class="mute">('+esc(x.org)+')</span>':'')+': '+x.v+'%'+(x.lo!=null?' (95% interval '+x.lo+' to '+x.hi+')':'')+(x.c!=null?', $'+x.c.toFixed(3)+' per attempt':'')+(x.turns?', '+x.turns+' turns per attempt':'')+'. '+KN[x.k]+(x.unv?', not verified by the maintainers':'')+'. Date '+esc(x.date||'n/a')+'. '+(x.note?esc(x.note)+' ':'')+'Source: '+link(x.src||S[cur].src)+'.'}
  $('atl-schart').addEventListener('click',e=>{const c=e.target.closest('.atl-hit');if(c)point(+c.dataset.r)});
  $('atl-sset').addEventListener('change',()=>{cur=$('atl-sset').value;draw()});
  $('atl-smet').addEventListener('change',()=>{met=$('atl-smet').value;draw()});
  onRender(draw);let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(tabShown())draw()},120)});

  // studies
  $('atl-studies').innerHTML=(A.studies||[]).map(s=>'<div class="sp" style="margin:6px 0"><div class="n" style="text-transform:none;font-size:13px">'+esc(s.name)+' <span class="mute">('+esc(s.date)+')</span></div><p>'+esc(s.claim)+'</p><p class="atl-src">'+esc(s.numbers)+' '+String(s.src).split(/\s*;\s*/).map(u=>link(u)).join(', ')+'</p></div>').join('');

  // numbers quoted in the prose come from the data, never typed by hand
  const f=(set,m,h)=>{const r=(S[set].rows||[]).filter(x=>x.m===m&&(h==null||x.h===h));return r.length?r[0].v:null};
  const tbOpus=(S.tb20.rows||[]).filter(x=>x.m==='Claude Opus 4.6').map(x=>x.v);
  const htm=A.htm||{};const ctx=htm.first_call_context_tokens_swe||{};
  const X=A.x&&A.x.totals||{};const xc=(A.x&&A.x.calls)||[];
  const lego=A.lego||[];const lg=(pre,h)=>{const r=lego.find(p=>p.model.indexOf(pre)>=0&&p.harness===h);return r?r.value:null};
  const K={tb_opus46_min:Math.min(...tbOpus),tb_opus46_max:Math.max(...tbOpus),tb_gpt5_codex:f('tb20','GPT-5','Codex CLI'),tb_gpt5_t2:f('tb20','GPT-5','Terminus 2'),
    ht_ctx_cc:n0(ctx['Claude Code']),ht_ctx_codex:n0(ctx.Codex),ht_ctx_pi:n0(ctx.Pi),
    sw_c37_mini:f('swev','Claude 3.7 Sonnet','mini-SWE-agent (bash only)'),sw_c37_tools:f('swev','Claude 3.7 Sonnet','Tools'),sw_o4_mini:f('swev','o4-mini','mini-SWE-agent (bash only)'),sw_o4_pp:f('swev','o4-mini','PatchPilot-v1.1'),
    x_calls:X.calls,x_fmt:X.format_errors,x_fake:X.replies_with_invented_output,x_maxs:xc.length?Math.round(Math.max(...xc.map(c=>c.wall_s))):null,x_maxo:xc.length?n0(Math.max(...xc.map(c=>c.out))):null,
    lego_b_oh:lg('base','OpenHands SDK'),lego_b_cc:lg('base','Claude Code'),lego_b_oc:lg('base','OpenCode'),lego_a_oh:lg('after','OpenHands SDK'),lego_a_cc:lg('after','Claude Code'),lego_a_oc:lg('after','OpenCode')};
  document.querySelectorAll('#t-atlas [data-atl]').forEach(s=>{const v=K[s.dataset.atl];s.textContent=v==null||v!==v?'n/a':String(v)});

  // HarnessTax startup context bars
  const hb=$('atl-htbars');if(hb&&ctx.Pi){const mx=Math.max(...Object.values(ctx));const tc=htm.tool_count||{};
    hb.innerHTML=['Pi','Codex','Claude Code'].map((k,i)=>'<div class="row"><span class="nm">'+k+' ('+tc[k]+' tools)</span><span class="track"><span class="fill" style="width:'+(ctx[k]/mx*100).toFixed(1)+'%;background:var(--c'+(i+1)+')"></span></span><span class="val">'+n0(ctx[k])+'</span></div>').join('')}
})();
