// ---- Lineage tab: every corpus as a row (oldest first), lanes by kind, edges to parents, replay animation ----
(function(){
  const C=(window.PC&&PC.corpora)||[],esc=RD.esc;if(!C.length)return;
  const LANES=[['raw','Raw crawl'],['web','English web'],['mix','Mixtures, pools'],['code','Code'],['math','Math'],['papers','Papers, books, PDFs'],['multi','Multilingual'],['open','Openly licensed']];
  const laneOf=k=>{const m={pool:'mix',books:'papers',pdf:'papers'};k=m[k]||k;const i=LANES.findIndex(l=>l[0]===k);return i<0?2:i};
  const rows=C.slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.name<b.name?-1:1);
  const idx={};rows.forEach((c,i)=>idx[c.id]=i);
  const LIC={open:'var(--open)',mid:'var(--c5)',res:'var(--bad)'};
  const fmtTok=b=>b==null?'no token count':b>=1000?(b/1000).toFixed(b>=10000?0:1).replace(/\.0$/,'')+'T':Math.round(b)+'B';
  let kind='all',sel='fineweb_edu',step=rows.length-1;
  const kinds=document.getElementById('pl-kinds');
  kinds.innerHTML='<button data-k="all" class="on">All</button>'+LANES.map(l=>'<button data-k="'+l[0]+'">'+l[1]+'</button>').join('');
  kinds.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;kind=b.dataset.k;kinds.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  function anc(id,acc){acc=acc||new Set();const c=C.find(x=>x.id===id);if(!c)return acc;Object.keys(c.parents||{}).forEach(p=>{if(!acc.has(p)){acc.add(p);anc(p,acc)}});return acc}
  function draw(){
    const el=document.getElementById('pl-svg');if(!el)return;
    const W=RD.width(el),narrow=W<560;
    const lw=narrow?Math.min(22,(W*.42)/LANES.length):Math.min(36,(W*.4)/LANES.length);
    const x0=8,lx=x0+lw*LANES.length+8,RH=narrow?30:26,T=62,H=T+rows.length*RH+8;
    const fs=narrow?11:12;
    const line=new Set([sel,...anc(sel)]);
    let s='';
    LANES.forEach((l,i)=>{const x=x0+lw*(i+.5);s+='<line x1="'+x+'" x2="'+x+'" y1="'+(T-6)+'" y2="'+(H-4)+'" stroke="var(--line)"/>';
      s+='<text x="'+x+'" y="'+(T-10)+'" font-size="9.5" fill="var(--mute)" text-anchor="start" transform="rotate('+(narrow?-60:-35)+' '+x+' '+(T-10)+')">'+(narrow?l[1].split(/[ ,]/)[0]:l[1].split(',')[0])+'</text>'});
    const Y=i=>T+i*RH+RH/2,X=c=>x0+lw*(laneOf(c.kind)+.5);
    let yr='';
    rows.forEach((c,i)=>{const y=c.date.slice(0,4);if(y!==yr){yr=y;s+='<line x1="'+lx+'" x2="'+(W-4)+'" y1="'+(T+i*RH)+'" y2="'+(T+i*RH)+'" stroke="var(--line)" stroke-dasharray="2 3"/>'+RD.t(W-6,T+i*RH+11,y,{a:'end',fs:10,fill:'var(--mute)'})}});
    // edges
    rows.forEach((c,i)=>{Object.entries(c.parents||{}).forEach(([p,rel])=>{const j=idx[p];if(j==null)return;
      const vis=i<=step&&j<=step,hot=line.has(c.id)&&line.has(p);
      const x1=X(rows[j]),y1=Y(j),x2=X(c),y2=Y(i),my=(y1+y2)/2;
      const da=rel==='filtered from'?'':rel==='recipe of'?' stroke-dasharray="5 3"':' stroke-dasharray="1.5 3"';
      s+='<path d="M'+x1+' '+y1+' C'+x1+' '+my+' '+x2+' '+my+' '+x2+' '+y2+'" fill="none" stroke="'+(hot?'var(--acc)':'var(--dim)')+'" stroke-width="'+(hot?2:1.2)+'"'+da+(vis?'':' opacity=".08"')+'/>'})});
    // nodes and labels
    rows.forEach((c,i)=>{const vis=i<=step,match=kind==='all'||LANES[laneOf(c.kind)][0]===kind;
      const r=c.tokens_b?Math.max(3,Math.min(lw*.45,2.2*Math.log10(c.tokens_b*10))):4;
      const op=!vis?' opacity=".08"':!match?' class="pl-dim"':'';
      const lab=esc(c.name.replace(/ \(.*\)$/,''));
      s+='<g class="pl-node'+(c.id===sel?' sel':'')+'" data-id="'+c.id+'" tabindex="0" role="button" aria-label="'+lab+'"'+op+'>'+
        '<rect x="0" y="'+(Y(i)-RH/2)+'" width="'+W+'" height="'+RH+'" fill="transparent"/>'+
        '<circle cx="'+X(c)+'" cy="'+Y(i)+'" r="'+r.toFixed(1)+'" fill="'+(c.tokens_b?'var(--acc2)':'var(--bg)')+'" stroke="'+(LIC[c.lic_cls]||'var(--mute)')+'" stroke-width="2"/>'+
        '<text x="'+lx+'" y="'+(Y(i)+4)+'" font-size="'+fs+'"'+(c.id===sel?' font-weight="600"':'')+'>'+lab+'</text>'+
        (narrow?'':'<text x="'+(W-44)+'" y="'+(Y(i)+4)+'" font-size="11" fill="var(--mute)" text-anchor="end">'+fmtTok(c.tokens_b)+'</text>')+'</g>'});
    el.innerHTML=RD.svg(W,H,s,'Corpus lineage');
    el.querySelectorAll('.pl-node').forEach(g=>{const f=()=>{sel=g.dataset.id;draw();det()};g.addEventListener('click',f);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();f()}})});
    document.getElementById('pl-leg').innerHTML='<span><i style="background:none;border:2px solid var(--open)"></i>open compilation licence (ODC-By, CC-BY, CC0)</span><span><i style="background:none;border:2px solid var(--c5)"></i>per-component, research-use wording or terms only</span><span><i style="background:none;border:2px solid var(--bad)"></i>training-only agreement or no licence</span>';
  }
  function det(){
    const c=C.find(x=>x.id===sel),d=document.getElementById('pl-det');if(!c||!d)return;
    const par=Object.entries(c.parents||{}).map(([p,r])=>{const q=C.find(x=>x.id===p);return esc(r)+' '+(q?esc(q.name):esc(p))}).join('; ');
    const kids=C.filter(x=>x.parents&&x.parents[c.id]).map(x=>esc(x.name)).join(', ');
    const row=(k,v)=>v?'<dt>'+k+'</dt><dd>'+v+'</dd>':'';
    d.innerHTML='<h3>'+esc(c.name)+' <span class="mute small">'+esc(c.org)+', '+esc(c.date)+'</span></h3>'+(c.idea?'<p>'+esc(c.idea)+'</p>':'')+'<dl>'+
      row('Built from',par)+row('Used by later corpora',kids)+row('Source',esc(c.source))+
      row('Size',(c.tokens_b?'<b>'+fmtTok(c.tokens_b)+' tokens</b> ('+esc(c.tok)+'). ':'')+esc(c.size))+row('Recipe',esc(c.recipe))+
      row('Licence','<span class="pc-lic '+(c.lic_cls==='open'?'open':c.lic_cls==='res'?'res':'mid')+'">'+esc(c.lic)+'</span> '+esc(c.terms))+row('Access',esc(c.gated==='no'?'Not gated: direct download':c.gated.replace(/^no\b/,'not gated')))+
      row('Trained on it',esc(c.users))+row('Published evidence',esc(c.evidence))+row('Status, Oct 2026',esc(c.status))+row('Hugging Face',c.hf?'<code>'+esc(c.hf)+'</code>':'')+
      row('Sources',(c.srcs||[]).map(s=>'<a href="'+esc(s[1])+'" target="_blank" rel="noopener noreferrer">'+esc(s[0])+'</a>').join(' · '))+'</dl>';
  }
  // replay: one step per corpus in date order
  function counters(){
    const shown=rows.slice(0,step+1);
    const web=shown.filter(c=>c.kind==='web'&&c.tokens_b),big=web.reduce((m,c)=>c.tokens_b>(m?m.tokens_b:0)?c:m,null);
    const open=shown.filter(c=>c.lic_cls==='open').length;
    document.getElementById('pl-ctr').innerHTML='<span>corpora so far <b>'+shown.length+'</b></span><span>largest English web corpus <b>'+(big?esc(big.name.replace(/ \(.*\)$/,''))+', '+fmtTok(big.tokens_b):'none')+'</b></span><span>with an open compilation licence <b>'+open+' of '+shown.length+'</b></span>';
    const c=rows[step];document.getElementById('pl-cap').innerHTML='<b>'+esc(c.date)+': '+esc(c.name)+'.</b> '+esc(c.idea||'');
  }
  const an=RD.anim({card:'pl-card',ctl:'pl-ctl',n:rows.length,ms:1300,label:'Corpus',start:rows.length-1,noAuto:true,draw(i){step=i;draw();counters()}});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-pclin']=window.TAB_RENDER['t-pclin']||[]).push(()=>{an.redraw();det()});
  addEventListener('resize',()=>{const t=document.getElementById('t-pclin');if(t&&!t.hidden)draw()});
  window.PC_SELECT=id=>{if(!C.find(x=>x.id===id))return;sel=id;const b=document.querySelector('#tabs button[data-t="t-pclin"]');if(b)b.click();draw();det();const d=document.getElementById('pl-det');if(d)d.scrollIntoView({block:'start'})};
  det();
})();
