// ---- Case files (t-cases): filters, timeline and cards. Data in 33_js_cases_0data.js (window.CF_DATA). ----
(function(){
  const D=window.CF_DATA,root=document.getElementById('t-cases');if(!D||!root)return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const BL={};D.blocks.forEach(b=>BL[b.k]=b);
  const st={block:'all',type:'all',year:'all',sort:'new',hl:null};
  $('cf-n-all').textContent=D.cases.length;

  // ---- filter controls ----
  const cnt=k=>D.cases.filter(c=>k==='all'||c.blocks.includes(k)).length;
  $('cf-blocks').innerHTML='<button data-k="all" class="on">All <span class="k">'+D.cases.length+'</span></button>'+
    D.blocks.map(b=>'<button data-k="'+b.k+'">'+esc(b.name)+' <span class="k">'+cnt(b.k)+'</span></button>').join('');
  const years=[...new Set(D.cases.map(c=>c.year))].sort((a,b)=>b-a);
  $('cf-year').innerHTML='<option value="all">All years</option>'+years.map(y=>'<option value="'+y+'">'+y+' ('+D.cases.filter(c=>c.year===y).length+')</option>').join('');
  function defText(){
    if(st.block==='all'){$('cf-def').innerHTML='<b>Building blocks</b> are the standard parts every large system is made of; the <a href="#" data-tab="t-read">Reading</a> tab introduces each one at the moment the growing system needs it. Pick one to see what it is and every case where it mattered.';return}
    const b=BL[st.block];$('cf-def').innerHTML='<b>'+esc(b.name)+':</b> '+esc(b.def_)+' <span class="mute">('+cnt(b.k)+' cases; explained from zero in the <a href="#" data-tab="t-read">Reading</a> tab.)</span>';
  }
  function setBlock(k){st.block=k;$('cf-blocks').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.k===k));defText();render()}
  $('cf-blocks').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setBlock(b.dataset.k)});
  $('cf-type').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.type=b.dataset.m;
    $('cf-type').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));render()});
  $('cf-year').addEventListener('change',e=>{st.year=e.target.value;render()});
  $('cf-sort').addEventListener('change',e=>{st.sort=e.target.value;render()});
  $('cf-reset').addEventListener('click',()=>{st.type='all';st.year='all';$('cf-year').value='all';
    $('cf-type').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.m==='all'));setBlock('all')});
  const match=c=>(st.block==='all'||c.blocks.includes(st.block))&&(st.type==='all'||c.type===st.type)&&(st.year==='all'||c.year===+st.year);

  // ---- one card ----
  function card(c){
    const used=new Set(c.numbers.filter(n=>n.q!=null).map(n=>n.q));
    const nums=c.numbers.length?'<table class="cf-nums"><tbody>'+c.numbers.map(n=>'<tr><td class="v">'+esc(n.v)+'</td><td>'+esc(n.t)+
      '<span class="how">'+(n.f!=null?'derived: '+esc(n.f):'quoted, see quote '+(n.q+1))+'</span></td></tr>').join('')+'</tbody></table>':'';
    const terms=c.terms.length?'<div class="cf-terms"><span class="mute small">Words on this card</span>'+c.terms.map(t=>'<div><b>'+esc(t[0])+'</b>: '+esc(t[1])+'</div>').join('')+'</div>':'';
    return '<article class="cf-card'+(c.flagship?' flag':'')+'" id="cf-c-'+c.id+'">'+
      '<div class="cf-meta"><span class="cf-badge '+c.type+'">'+(c.type==='outage'?'Outage':'Architecture')+'</span><span>'+esc(c.org)+'</span><span>&middot; '+esc(c.dateText)+'</span>'+
      (c.flagship?'<span>&middot; <a href="#cf-an" class="cf-jump">animated above</a></span>':'')+'</div>'+
      '<h3>'+esc(c.title)+'</h3>'+
      '<div class="cf-tags">'+c.blocks.map(k=>'<button data-k="'+k+'" title="Show every case about '+esc(BL[k].name)+'">'+esc(BL[k].name)+'</button>').join('')+'</div>'+
      terms+
      '<div class="cf-f"><span class="h">The system</span>'+esc(c.system)+'</div>'+
      '<div class="cf-f"><span class="h">'+(c.type==='outage'?'What happened':'The problem and the design')+'</span>'+esc(c.happened)+'</div>'+
      '<div class="cf-f"><span class="h">'+(c.type==='outage'?'What they changed':'Result')+'</span>'+esc(c.fix)+'</div>'+
      '<div class="cf-lesson"><b>Lesson:</b> '+esc(c.lesson)+'</div>'+
      (c.note?'<div class="cf-note">'+esc(c.note)+'</div>':'')+
      nums+
      '<div class="cf-src">Source: <a href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer">'+esc(c.source)+'</a>'+
      (c.url2?' (also <a href="'+esc(c.url2)+'" target="_blank" rel="noopener noreferrer">this page</a>)':'')+'. Published '+esc(c.publishedText)+'.</div>'+
      '<details class="cf-q"><summary>Quotes from the source ('+c.quotes.length+')</summary>'+
      c.quotes.map((q,i)=>'<blockquote'+(used.has(i)?' class="used"':'')+'><span class="mute">'+(i+1)+'.</span> '+esc(q)+'</blockquote>').join('')+'</details>'+
      '</article>';
  }

  // ---- timeline: one column per year, a dot per case, stacked ----
  function timeline(list){
    const el=$('cf-tl');const W=Math.max(280,Math.min(880,el.clientWidth||((document.documentElement.clientWidth||900)-40)));
    const y0=2011,y1=2026,ny=y1-y0+1,padL=6,padR=6,cw=(W-padL-padR)/ny;
    const r=Math.max(4,Math.min(7,cw/2-2)),gap=r*2+3;
    const byY={};D.cases.slice().sort((a,b)=>a.date<b.date?-1:1).forEach(c=>{(byY[c.year]=byY[c.year]||[]).push(c)});
    const maxN=Math.max(...Object.values(byY).map(a=>a.length));
    const H=maxN*gap+30,base=H-22;
    const show=new Set(list.map(c=>c.id));
    const step=cw<28?5:cw<44?2:1;
    let s='';
    for(let i=0;i<ny;i++){const y=y0+i,x=padL+cw*i+cw/2,sel=st.year===String(y);
      s+='<g class="yr" data-y="'+y+'" role="button" tabindex="0" aria-label="Filter to '+y+'"><rect x="'+(padL+cw*i+1)+'" y="0" width="'+(cw-2)+'" height="'+H+'" rx="4" fill="'+(sel?'var(--acc2)':'transparent')+'"></rect>'+
        ((i%step===0||(i===ny-1&&(ny-1)%step>=Math.ceil(step/2)))?'<text x="'+x+'" y="'+(H-6)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+(step>1&&y!==y0&&y!==y1&&W<520?"'"+String(y).slice(2):y)+'</text>':'')+'</g>';
    }
    s+='<line x1="'+padL+'" x2="'+(W-padR)+'" y1="'+(base+4)+'" y2="'+(base+4)+'" stroke="var(--line)"></line>';
    Object.keys(byY).forEach(y=>{const i=y-y0,x=padL+cw*i+cw/2;byY[y].forEach((c,j)=>{const cy=base-r-j*gap,on=show.has(c.id);
      s+='<circle class="dot" data-id="'+c.id+'" cx="'+x.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="'+r+'" fill="'+(c.type==='outage'?'var(--bad)':'var(--acc)')+'" opacity="'+(on?1:.18)+'"'+
        (st.hl===c.id?' stroke="var(--ink)" stroke-width="2"':'')+' tabindex="0" role="button" aria-label="'+esc(c.org+', '+c.dateText+': '+c.title)+'"><title>'+esc(c.org+', '+c.dateText+': '+c.title)+'</title></circle>'})});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Timeline of the cases by year, 2011 to 2026">'+s+'</svg>';
  }
  function tipFor(id){const c=D.cases.find(x=>x.id===id);if(c)$('cf-tip').innerHTML='<b>'+esc(c.org)+'</b>, '+esc(c.dateText)+': '+esc(c.title)}
  $('cf-tl').addEventListener('mouseover',e=>{const d=e.target.closest('.dot');if(d)tipFor(d.dataset.id)});
  function act(e){const d=e.target.closest('.dot');if(d){openCard(d.dataset.id);return}
    const g=e.target.closest('.yr');if(g){st.year=(st.year===g.dataset.y?'all':g.dataset.y);$('cf-year').value=st.year;render()}}
  $('cf-tl').addEventListener('click',act);
  $('cf-tl').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();act(e)}});

  function openCard(id){
    const c=D.cases.find(x=>x.id===id);if(!c)return;
    if(!match(c)){st.block='all';st.type='all';st.year='all';$('cf-year').value='all';
      $('cf-type').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.m==='all'));
      $('cf-blocks').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.k==='all'));defText()}
    st.hl=id;render();tipFor(id);
    const el=$('cf-c-'+id);if(el){el.scrollIntoView({block:'start',behavior:RD.RM?'auto':'smooth'});el.classList.add('hl');setTimeout(()=>el.classList.remove('hl'),1800)}
  }

  function render(){
    let list=D.cases.filter(match);
    list.sort((a,b)=>(a.date<b.date?-1:a.date>b.date?1:0)*(st.sort==='new'?-1:1));
    $('cf-count').textContent='Showing '+list.length+' of '+D.cases.length+' cases ('+list.filter(c=>c.type==='outage').length+' outages, '+list.filter(c=>c.type!=='outage').length+' architectures and practices).';
    $('cf-cards').innerHTML=list.length?list.map(card).join(''):'<p class="mute">No case matches these filters. <button id="cf-reset2">Clear filters</button></p>';
    const r2=$('cf-reset2');if(r2)r2.addEventListener('click',()=>$('cf-reset').click());
    timeline(list);
  }
  $('cf-cards').addEventListener('click',e=>{const t=e.target.closest('.cf-tags button');if(t){setBlock(t.dataset.k);$('cf-blocks').scrollIntoView({block:'start',behavior:'auto'})}});
  // links to the animation and to the flagship card
  root.addEventListener('click',e=>{const a=e.target.closest('a.cf-jump');if(!a)return;e.preventDefault();const h=a.getAttribute('href').slice(1);
    if(h.indexOf('cf-c-')===0)openCard(h.slice(5));else{const t=$(h);if(t)t.scrollIntoView({block:'start'})}});
  RD.tabLinks($('cf-def'));
  defText();render();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-cases']=window.TAB_RENDER['t-cases']||[]).push(()=>timeline(D.cases.filter(match)));
  let rt=0;addEventListener('resize',()=>{if(root.hidden)return;clearTimeout(rt);rt=setTimeout(()=>timeline(D.cases.filter(match)),80)});
})();
