// ---- Loop lab: one loop iteration animated, two recorded runs side by side, context drawn as a stack of blocks to scale
(function(){
  const {D,esc,fmt,$,ctx,fit,actStr,blocks}=LP;const svgEl=$('loop-stack');if(!svgEl)return;
  const STAGES=['Assemble prompt','Model call','Model output','Parse','Permission check','Execute tool','Append result'];
  const PRESETS=[['s4_off_noisy','s4_smart_mask','Noisy tool: unmanaged vs managed'],['s1_haiku','s1b_haiku','Step 1 vs 1b: invented results'],['s0_haiku','s2_haiku_r1','No loop vs loop with edit'],['s2_haiku_r1','s5_haiku','Step 2 vs step 5 (subagent)']];
  const usable=D.runs.filter(r=>!r.lite&&r.turns.length);
  const selA=$('loop-aa'),selB=$('loop-ab'),pre=$('loop-apre');
  const opts=usable.map(r=>'<option value="'+r.id+'">Step '+esc(r.step)+': '+esc(r.name)+'</option>').join('');
  selA.innerHTML=opts;selB.innerHTML='<option value="">(none)</option>'+opts;
  pre.innerHTML=PRESETS.filter(p=>LP.run(p[0])&&LP.run(p[1])).map((p,i)=>'<button data-m="'+i+'"'+(i===0?' class="on"':'')+'>'+esc(p[2])+'</button>').join('');
  let A,B,FA,FB,an;
  const mains=r=>r?r.turns.filter(t=>t.w!=='helper'):[];
  const kind=l=>l.indexOf('(masked)')>=0?'masked':l==='task'?'task':l==='reply'?'reply':l==='error'?'error':l.indexOf('result:delegate')===0?'helper':'result';
  const COL={fixed:'var(--dim)',task:'var(--c1)',reply:'var(--c4)',result:'var(--c3)',error:'var(--c2)',masked:'var(--hl)',helper:'var(--c6)'};
  function stackAt(r,F,k,stage){
    // blocks of the prompt sent on main call k; at the append stage, the prompt of call k+1 (or k plus its reply)
    const ts=mains(r);if(!ts.length)return null;const kk=Math.min(k,ts.length-1);let b=blocks(ts[kk]),isNew=new Set();
    if(stage===6&&k<ts.length){
      if(kk+1<ts.length){const nb=blocks(ts[kk+1]);nb.forEach((x,i)=>{if(i>=b.length||x[0]!==b[i][0])isNew.add(i)});b=nb}
      else{b=b.concat([['reply',ts[kk].txt.length+24]]);isNew.add(b.length-1)}}
    const stack=[['fixed',F.fixed,'system prompt + CLI context (fitted)']].concat(b.map(x=>[kind(x[0]),x[1]*F.rate,x[0]]));
    return {blocks:stack,isNew,done:k>=ts.length,measured:k<ts.length?ts[kk].pctx:null,cont:k<ts.length&&ts[kk].pctx!==ctx(ts[kk].u)};
  }
  function caption(r,k,s){
    const ts=mains(r);if(k>=ts.length)return '<b>'+esc(r.name)+'</b> had already stopped ('+esc(r.stop)+') after '+ts.length+' calls.';
    const t=ts[k],u=t.u;
    switch(s){
      case 0:{const bl=blocks(t),nr=bl.filter(x=>x[0]==='reply').length,no=bl.filter(x=>x[0].indexOf('result')===0).length;
        return 'The harness joins the task, '+nr+' earlier replies and '+no+' tool results into one text of '+fmt(t.pc)+' characters.'+(t.mk?' Before that it <b>masked '+t.mk+' old tool results</b> to stay under its '+fmt(r.limit)+'-token limit.':'')}
      case 1:return (t.pctx!==ctx(u)?'<b>Runaway reply:</b> the reply hit the 32,000-token output cap and the CLI continued it in a second API call that re-read the first reply, so this call reads '+fmt(t.pctx)+' prompt tokens plus '+fmt(ctx(u)-t.pctx)+' for the continuation (* in the chart: only the prompt is drawn). ':'')+'One call to <code>claude -p</code> with every tool switched off: it read <b>'+fmt(ctx(u))+'</b> tokens'+(u[1]?' (of which '+fmt(u[1])+' were written to the prompt cache and never read back)':'')+' and wrote '+fmt(u[3])+(u[4]?' ('+fmt(u[4])+' of them thinking)':'')+' in '+t.s+' s.';
      case 2:return 'The reply is plain text: <q>'+esc(t.txt.replace(/\s+/g,' ').slice(0,190))+(t.txt.length>190?' ...':'')+'</q>';
      case 3:return t.act?'The parser finds <code>'+esc(actStr(t.act).slice(0,150))+'</code>.'+(t.discN?(r.step==='1'?' The model kept writing after it ('+fmt(t.discN)+' characters, including an invented result) and this harness <b>kept all of it and ran the last ACTION</b>.':' The '+fmt(t.discN)+' characters after the first ACTION line are thrown away.'):''):'No ACTION line: '+(r.step==='1'||r.step==='1b'?'the loop takes that as the model being done.':'an error goes back to the model.');
      case 4:return t.dec?('Gate: <b class="'+(t.dec==='deny'?'loop-bad':'loop-ok')+'">'+esc(t.dec)+'</b> by '+esc(t.why)+'.'):(t.act&&t.act.tool==='finish'?'finish needs no permission: the loop stops here.':'This step has no permission gate yet: every parsed action runs.');
      case 5:return t.obs==null?'Nothing to execute.':(t.act?esc(t.act.tool):'harness')+' returned '+fmt(t.raw)+' characters'+(t.raw>t.obsN?'; the harness clipped them to <b>'+fmt(t.obsN)+'</b>.':'.');
      case 6:{const nx=ts[k+1];return nx?'Reply and result are appended. The next call reads <b>'+fmt(ctx(nx.u))+'</b> tokens ('+(ctx(nx.u)>=ctx(u)?'+':'')+fmt(ctx(nx.u)-ctx(u))+').':'Last call. Run total: '+fmt(r.tot.ctx)+' tokens read over '+r.tot.calls+' calls; tests '+(r.passed?'pass':'fail')+'.'}
    }
  }
  function draw(i){
    const k=Math.floor(i/7),s=i%7;
    $('loop-stages').innerHTML=STAGES.map((n,j)=>'<span class="'+(j===s?'on':'')+'">'+(j+1)+'. '+n+'</span>').join('');
    const W=LP.width(svgEl),both=!!B,colW=both?W/2:W,H=260,top=22;
    const maxT=Math.max(...[A,B].filter(Boolean).map(r=>Math.max(...mains(r).map(t=>t.pctx),1)))*1.08;
    const sc=H/maxT;let g='';
    [[A,FA,0],[B,FB,colW]].forEach(([r,F,x0])=>{if(!r)return;const st=stackAt(r,F,k,s);if(!st)return;
      const bw=Math.min(110,colW*0.36),bx=x0+8;let y=top+H;
      g+='<text x="'+bx+'" y="14" font-size="12" font-weight="600">'+esc(r.name.slice(0,Math.floor(colW/6.6)))+'</text>';
      st.blocks.forEach((b,j)=>{const h=Math.max(1,b[1]*sc);y-=h;const nw=st.isNew.has(j-1);
        g+='<rect x="'+bx+'" y="'+y.toFixed(1)+'" width="'+bw+'" height="'+h.toFixed(1)+'" fill="'+COL[b[0]]+'" stroke="var(--bg)" stroke-width="0.6"'+(nw?' class="loop-new"':'')+'><title>'+esc(b[2])+': about '+fmt(b[1])+' tokens</title></rect>';
        if(h>=13)g+='<text x="'+(bx+bw+6)+'" y="'+(y+h/2+4).toFixed(1)+'" font-size="10.5" fill="var(--mute)">'+esc(b[2].replace('result:','').slice(0,Math.max(6,Math.floor((colW-bw-20)/6.2))))+'</text>'});
      if(st.measured!=null){const my=top+H-st.measured*sc;g+='<line x1="'+(bx-4)+'" x2="'+(bx+bw+4)+'" y1="'+my.toFixed(1)+'" y2="'+my.toFixed(1)+'" stroke="var(--ink)" stroke-dasharray="3 2"/>'}
      const tot=st.blocks.reduce((a,b)=>a+b[1],0);
      g+='<text x="'+bx+'" y="'+(top+H+16)+'" font-size="11.5">'+(st.done?'stopped':'call '+(Math.min(k,mains(r).length-1)+1)+': '+fmt(st.measured)+' tokens'+(st.cont?' *':''))+'</text>'});
    svgEl.innerHTML='<svg viewBox="0 0 '+W+' '+(top+H+24)+'" width="'+W+'" height="'+(top+H+24)+'" role="img" aria-label="Context window as a stack of blocks">'+g+'</svg>';
    const tA=mains(A),cnt=r=>{if(!r)return '';const ts=mains(r),kk=Math.min(k,ts.length);let rd=0,o=0;for(let j=0;j<kk+(s>=1&&k<ts.length?1:0);j++){rd+=ctx(ts[j].u);o+=ts[j].u[3]}
      return '<div class="stat"><div class="k">'+esc('Step '+r.step+': '+r.name)+'</div><div class="v">'+fmt(rd)+'</div><div class="d">tokens read so far; '+fmt(o)+' written; call '+Math.min(k+1,ts.length)+' of '+ts.length+'</div></div>'};
    $('loop-acount').innerHTML=cnt(A)+cnt(B);
    $('loop-acap').innerHTML='<b>Call '+(Math.min(k,tA.length-1)+1)+', '+STAGES[s].toLowerCase()+'.</b> '+caption(A,k,s)+(B&&s===6?'<br><span class="loop-mute">Right: '+caption(B,k,6)+'</span>':'');
  }
  function load(a,b){A=LP.run(a);B=b?LP.run(b):null;FA=fit(A);FB=B?fit(B):null;selA.value=a;selB.value=b||'';
    const n=7*Math.max(mains(A).length,B?mains(B).length:0);if(an)an.reset(n);return n}
  const n0=load(PRESETS[0][0],PRESETS[0][1]);
  an=LP.anim({card:'loop-acard',ctl:'loop-actl',n:n0,draw:draw,ms:900,label:'Animation step'});
  LP.seg(pre,m=>load(PRESETS[+m][0],PRESETS[+m][1]));
  selA.addEventListener('change',()=>load(selA.value,selB.value));selB.addEventListener('change',()=>load(selA.value,selB.value));
  LP.onRender(()=>an.redraw());
})();
