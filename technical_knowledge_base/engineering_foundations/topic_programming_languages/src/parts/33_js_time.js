// ---- Toolchain atlas: standards and releases timeline, and the corrections list ----
(function(){
  const T=window.TA,D=T.D,$=T.$,esc=T.esc,md=T.md;
  const TL=D.timeline;
  const laneCol={py:'c1',cpp:'c2',rs:'c3',es:'c5',ts:'c4'};
  const st={lanes:new Set(TL.map(l=>l.lane)),from:2023,sel:null};
  const ms=d=>Date.parse(d+'T00:00:00Z');
  const CHECK=ms(D.checked);
  $('ta-tlanes').innerHTML=TL.map(l=>'<button class="ta-chip on" data-l="'+l.lane+'" aria-pressed="true"><span class="ta-dot" style="background:var(--'+laneCol[l.lane]+')"></span>'+esc(l.name)+'</button>').join(' ');
  $('ta-tlanes').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.l;
    if(st.lanes.has(id)){if(st.lanes.size===1)return;st.lanes.delete(id)}else st.lanes.add(id);
    b.classList.toggle('on',st.lanes.has(id));b.setAttribute('aria-pressed',st.lanes.has(id));draw()});
  $('ta-tfrom').addEventListener('change',e=>{st.from=+e.target.value;draw()});
  const items=()=>{const out=[];TL.forEach(l=>{if(!st.lanes.has(l.lane))return;l.items.forEach((it,k)=>{if(ms(it.d)>=Date.UTC(st.from,0,1))out.push({l,it,id:l.lane+'-'+k})})});return out};
  function draw(){
    const box=$('ta-tl');
    const W=Math.max(300,Math.min(900,box.clientWidth||Math.min(860,(document.documentElement.clientWidth||900)-40)));
    const lanes=TL.filter(l=>st.lanes.has(l.lane));
    const narrow=W<560,lw=narrow?62:118,pad=14,top=22,lh=narrow?50:46;
    const H=top+lanes.length*lh+26;
    const x0=Date.UTC(st.from,0,1),x1=Date.UTC(2028,0,1);
    const X=t=>lw+(W-lw-pad)*(t-x0)/(x1-x0);
    let s='';
    // year grid
    for(let y=st.from;y<=2028;y++){const x=X(Date.UTC(y,0,1));
      s+='<line x1="'+x+'" x2="'+x+'" y1="'+(top-6)+'" y2="'+(H-22)+'" stroke="var(--line)"/>';
      if(y<2028&&(!narrow||st.from>=2020||y%2===1))s+='<text x="'+(x+3)+'" y="'+(H-8)+'" fill="var(--mute)">'+(narrow&&st.from<2020?"'"+String(y).slice(2):y)+'</text>'}
    // the date of the check
    const xc=X(CHECK);
    s+='<line x1="'+xc+'" x2="'+xc+'" y1="'+(top-10)+'" y2="'+(H-22)+'" stroke="var(--bad)" stroke-dasharray="3 3"/>'+
       '<text x="'+(xc-3)+'" y="'+(top-11)+'" text-anchor="end" fill="var(--bad)">checked '+D.checked+'</text>';
    const all=items();
    lanes.forEach((l,li)=>{
      const y=top+li*lh+lh/2,col='var(--'+laneCol[l.lane]+')';
      s+='<text x="4" y="'+(y+4)+'" font-weight="600">'+esc(narrow?l.name.replace(' and Node','').replace('ECMAScript','ES').replace('TypeScript','TS'):l.name)+'</text>';
      s+='<line x1="'+lw+'" x2="'+(W-pad)+'" y1="'+y+'" y2="'+y+'" stroke="var(--dim)"/>';
      let lastLabel=-1e9,row=0;
      all.filter(o=>o.l===l).forEach(o=>{
        const it=o.it,x=X(ms(it.d)),plan=it.k==='plan',sel=st.sel===o.id;
        const fill=plan?'var(--bg)':col;
        const mk=it.k==='std'?'<rect x="'+(x-5.5)+'" y="'+(y-5.5)+'" width="11" height="11" transform="rotate(45 '+x+' '+y+')" fill="'+fill+'" stroke="'+col+'" stroke-width="1.6"/>'
          :'<circle cx="'+x+'" cy="'+y+'" r="'+(it.k==='event'?4.5:6)+'" fill="'+fill+'" stroke="'+col+'" stroke-width="1.6"/>';
        // short labels alternate above and below when there is room
        let lab='';
        if(x-lastLabel>(narrow?54:70)||sel){row=1-row;const ly=row?y-10:y+18;
          const short=it.t.replace('Edition ','').replace(' technically complete','').replace(/ defaults to C\+\+\d+/,'').replace('First C++29 meeting','C++29 starts');
          if(!narrow||sel||short.length<9){lab='<text x="'+x+'" y="'+ly+'" text-anchor="middle" font-size="10.5"'+(sel?' font-weight="600"':' fill="var(--mute)"')+'>'+esc(short)+'</text>';lastLabel=x}}
        s+='<g class="dot'+(sel?' sel':'')+'" data-id="'+o.id+'" tabindex="0" role="button" aria-label="'+esc(l.name+': '+it.t+', '+(it.dp||it.d))+'">'+mk+'<circle cx="'+x+'" cy="'+y+'" r="11" fill="transparent"/>'+lab+'</g>';
      });
    });
    box.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Timeline of language standards and releases">'+s+'</svg>';
    if(!st.sel||!all.find(o=>o.id===st.sel)){const last=all.filter(o=>o.it.k!=='plan').pop();st.sel=last?last.id:null;if(st.sel)return draw()}
    info();list(all);
  }
  function find(id){for(const l of TL){const k=id.slice(l.lane.length+1);if(id.indexOf(l.lane+'-')===0&&l.items[+k])return {l,it:l.items[+k]}}return null}
  function info(){const o=st.sel&&find(st.sel);if(!o){$('ta-tli').innerHTML='';return}
    const it=o.it;
    $('ta-tli').innerHTML='<div class="small mute">'+esc(o.l.name)+' · '+esc(it.dp||it.d)+(it.k==='plan'?' · scheduled':'')+'</div><b>'+esc(it.t)+'</b><p style="margin:4px 0">'+md(it.n)+'</p><a href="'+esc(it.u)+'" target="_blank" rel="noopener noreferrer">Source</a>';
  }
  function list(all){
    let h='';
    TL.filter(l=>st.lanes.has(l.lane)).forEach(l=>{
      const its=all.filter(o=>o.l===l);if(!its.length)return;
      h+='<details class="mist"><summary>'+esc(l.name)+' ('+its.length+')</summary><div class="b"><ul class="ta-list">'+
        its.map(o=>'<li><b>'+esc(o.it.dp||o.it.d)+'</b> '+esc(o.it.t)+(o.it.k==='plan'?' (scheduled)':'')+': '+md(o.it.n)+' <a href="'+esc(o.it.u)+'" target="_blank" rel="noopener noreferrer">source</a></li>').join('')+
        '</ul><p class="small mute">Lane source: <a href="'+esc(l.src)+'" target="_blank" rel="noopener noreferrer">'+esc(l.src.replace(/^https?:\/\//,''))+'</a></p></div></details>';
    });
    $('ta-tlist').innerHTML=h;
  }
  function pick(g){st.sel=g.dataset.id;draw()}
  $('ta-tl').addEventListener('click',e=>{const g=e.target.closest('g.dot');if(g)pick(g)});
  $('ta-tl').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const g=e.target.closest('g.dot');if(g){e.preventDefault();const id=g.dataset.id;pick(g);const n=$('ta-tl').querySelector('g.dot[data-id="'+id+'"]');if(n)n.focus()}});
  T.viewHooks.time=draw;
  T.onRender(()=>{if(!$('ta-v-time').hidden)draw()});
  let rt=0;addEventListener('resize',()=>{const t=$('t-tools');if(!t||t.hidden||$('ta-v-time').hidden)return;clearTimeout(rt);rt=setTimeout(draw,80)});

  // ---------- corrections ----------
  const C=D.corrections;
  const vkey=v=>(v.match(/^(wrong|outdated|imprecise|incomplete|unconfirmed|confirmed)/)||['','other'])[1];
  const kinds=['all','wrong','outdated','imprecise','incomplete','unconfirmed','confirmed'].filter(k=>k==='all'||C.some(c=>vkey(c.verdict)===k));
  let cf='all';
  $('ta-cf').innerHTML=kinds.map(k=>'<button class="ta-chip'+(k===cf?' on':'')+'" data-k="'+k+'">'+k+(k==='all'?'':' ('+C.filter(c=>vkey(c.verdict)===k).length+')')+'</button>').join(' ');
  $('ta-cf').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cf=b.dataset.k;
    $('ta-cf').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));drawCorr()});
  function drawCorr(){
    $('ta-corr').innerHTML=C.filter(c=>cf==='all'||vkey(c.verdict)===cf).map(c=>
      '<div class="ta-corr"><div class="h">'+esc(c.page)+'</div><div class="ta-cv"><span class="ta-v '+vkey(c.verdict)+'">'+esc(c.verdict)+'</span>Old: '+md(c.old)+'</div>'+
      '<div style="margin-top:4px">Now: '+md(c.now)+'</div><div class="small mute" style="margin-top:3px">Source: '+md(c.src)+'</div></div>').join('');
  }
  drawCorr();
})();
