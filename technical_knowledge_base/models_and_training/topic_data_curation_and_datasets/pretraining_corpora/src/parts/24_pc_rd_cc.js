// ---- Reading section 1: Common Crawl (files to scale, crawl sizes over time, robots.txt opt-outs, recorded record) ----
(function(){
  const P=window.PC,esc=RD.esc;
  // recorded output of the one-record script (long lines cut for the phone)
  const ro=document.getElementById('pc-rec-out');
  if(ro)ro.textContent=P.recout.split('\n').map(l=>l.length>110?l.slice(0,107)+'...':l).join('\n');

  // one crawl's files, to scale (compressed TiB)
  function files(){
    const el=document.getElementById('pc-files');if(!el)return;
    const rows=P.ccfiles.rows,mx=Math.max(...rows.map(r=>r[1]));
    el.innerHTML='<div class="bars">'+rows.map((r,i)=>'<div class="row"><span class="nm" title="'+esc(r[0])+'">'+esc(r[0])+'</span><span class="track"><span class="fill" style="width:'+Math.max(.4,100*r[1]/mx).toFixed(2)+'%;background:var(--c'+(i<3?i+1:6)+')"></span></span><span class="val">'+r[1].toFixed(2)+' TiB</span></div>').join('')+'</div>';
  }

  // crawl sizes over time
  let mode='page';
  function crawls(){
    const el=document.getElementById('pc-crawl');if(!el)return;
    const W=RD.width(el),H=230,L=40,R=8,T=10,B=34;
    const cs=P.crawls.slice().sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0); // oldest first
    const vals=cs.map(c=>c[mode]/1e9),mx=Math.ceil(Math.max(...vals));
    const bw=(W-L-R)/cs.length;
    let s='';
    for(let g=0;g<=mx;g++){const y=T+(H-T-B)*(1-g/mx);s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-5,y+3.5,g+'B',{a:'end',fs:10,fill:'var(--mute)'})}
    cs.forEach((c,i)=>{const v=vals[i],h=(H-T-B)*v/mx,x=L+i*bw;const yr=+c.id.slice(8,12);
      const col=yr>=2025&&c.id>='CC-MAIN-2025-21'?'var(--c2)':'var(--c1)';
      s+='<rect class="pc-cb" data-i="'+i+'" x="'+(x+bw*.12).toFixed(1)+'" y="'+(H-B-h).toFixed(1)+'" width="'+Math.max(1,bw*.76).toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+col+'"><title>'+c.id+': '+v.toFixed(2)+' billion</title></rect>'});
    const step=W<500?4:2;let last='';cs.forEach((c,i)=>{const yr=c.id.slice(8,12);if(yr!==last&&!isNaN(+yr)){last=yr;if(+yr%step===0)s+=RD.t(L+i*bw,H-B+14,yr,{fs:10,fill:'var(--mute)'})}});
    s+=RD.t(L,H-4,W<520?'crawls, oldest left':'crawls, oldest left (2008 to 2012: multi-month ARC-era collections)',{fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Common Crawl page captures per crawl');
    const cap=document.getElementById('pc-crawl-cap');
    const show=i=>{const c=cs[i];cap.innerHTML='<b>'+c.id+'</b>'+(c.from?' ('+c.from+' to '+c.to+')':'')+': '+(c.page/1e9).toFixed(2)+' billion page captures, '+(c.url/1e9).toFixed(2)+' billion unique URLs.'};
    el.querySelectorAll('.pc-cb').forEach(r=>{r.addEventListener('mouseenter',()=>show(+r.dataset.i));r.addEventListener('click',()=>show(+r.dataset.i))});
    show(cs.length-1);
  }
  RD.seg(document.getElementById('pc-crawl-seg'),m=>{mode=m;crawls()});

  // robots.txt opt-outs across crawls (measured)
  let agent='GPTBot';
  function robots(){
    const el=document.getElementById('pc-rb');if(!el)return;
    const R=P.robots;if(!R){el.innerHTML='<p class="pc-pendbox">Measurement not recorded yet.</p>';return}
    const chips=document.getElementById('pc-rb-chips');
    if(!chips.dataset.done){chips.dataset.done=1;
      const ags=['CCBot','GPTBot','ClaudeBot','anthropic-ai','Google-Extended','Applebot-Extended','PerplexityBot','Bytespider','meta-externalagent','Googlebot','* (all crawlers)'];
      chips.innerHTML=ags.map(a=>'<button data-a="'+esc(a)+'"'+(a===agent?' class="on"':'')+'>'+esc(a)+'</button>').join('');
      chips.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;agent=b.dataset.a;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));robots()})}
    const cs=Object.keys(R.crawls);
    const rows=cs.map(c=>{const v=R.crawls[c];return [c,v.full_block_share_of_parsed[agent],v.robots_200_parsed,(v.mention_share_of_parsed||{})[agent]]});
    const mx=Math.max(.05,...cs.map(c=>Math.max(R.crawls[c].full_block_share_of_parsed['GPTBot'],R.crawls[c].full_block_share_of_parsed[agent])));
    el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row"><span class="nm">'+r[0].replace('CC-MAIN-','')+'</span><span class="track"><span class="fill" style="width:'+(100*r[1]/mx).toFixed(1)+'%;background:var(--c2)"></span></span><span class="val">'+(100*r[1]).toFixed(1)+'%</span></div>').join('')+'</div>';
    const a=rows[0],z=rows[rows.length-1];
    document.getElementById('pc-rb-cap').innerHTML='Share of sites whose robots.txt blocks <b>'+esc(agent)+'</b> from the whole site: '+(100*a[1]).toFixed(1)+'% in '+a[0]+' ('+a[2].toLocaleString('en-US')+' files) and '+(100*z[1]).toFixed(1)+'% in '+z[0]+' ('+z[2].toLocaleString('en-US')+' files)'+(a[3]!=null?'; files that name it at all: '+(100*a[3]).toFixed(1)+'% then, '+(100*z[3]).toFixed(1)+'% now':'')+'.';
  }
  function all(){files();crawls();robots()}
  RD.onRender(all);RD.onResize(all);all();
})();
