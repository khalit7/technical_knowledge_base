// ---- Reading tab: the hero (four scorers by where the query meets the document) and section 10's sparse document vector ----
(function(){
  const R=window.RR;if(!R||!document.getElementById('rr-hero'))return;const $=id=>document.getElementById(id),esc=RRL.esc;
  // glyphs: grey = stored before the query, orange (--c2) = where query and document meet, blue = the query
  function glyph(el){const k=el.dataset.g,W=Math.max(140,RD.width(el)),H=62;let s='';
    const q=(x,y,w)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="8" rx="2" fill="var(--c1)"/>';
    if(k==='bi'){s+=RD.t(2,10,'doc',{fs:10.5,fill:'var(--mute)'})+'<rect x="30" y="3" width="'+(W-40)+'" height="8" rx="2" fill="var(--dim)"/>'+
      RD.t(2,52,'query',{fs:10.5,fill:'var(--mute)'})+q(30,45,W-40)+'<line x1="'+(W/2+10)+'" y1="13" x2="'+(W/2+10)+'" y2="43" stroke="var(--c2)" stroke-width="2.5"/>'+RD.t(W/2+16,32,'1 dot',{fs:10.5,fill:'var(--c2)'})}
    else if(k==='sp'){const n=Math.floor((W-36)/5);let r=7;const on=[];for(let i=0;i<n;i++){r=(r*1103515245+12345)%2147483648;if(r%6===0)on.push([i,(r>>9)%3+1])}
      s+=RD.t(2,12,'doc',{fs:10.5,fill:'var(--mute)'})+'<line x1="30" y1="14" x2="'+(W-6)+'" y2="14" stroke="var(--line)"/>'+
        RD.t(2,52,'query',{fs:10.5,fill:'var(--mute)'})+'<line x1="30" y1="54" x2="'+(W-6)+'" y2="54" stroke="var(--line)"/>';
      on.forEach(([i,h],k)=>{const x=30+i*5,sh=k%3===1;s+='<rect x="'+x+'" y="'+(13-3*h)+'" width="3" height="'+(3*h+1)+'" fill="'+(sh?'var(--c2)':'var(--dim)')+'"/>';
        if(sh)s+='<rect x="'+x+'" y="46" width="3" height="8" fill="var(--c1)"/><line x1="'+(x+1.5)+'" y1="16" x2="'+(x+1.5)+'" y2="45" stroke="var(--c2)" stroke-dasharray="2 2"/>'});
      s+=RD.t(W-6,30,'30,522 terms, most zero',{a:'end',fs:10.5,fill:'var(--mute)'})+RD.t(W-6,42,'shared terms add up',{a:'end',fs:10.5,fill:'var(--c2)'})}
    else if(k==='li'){const n=Math.min(14,Math.floor((W-36)/9));for(let i=0;i<n;i++)s+='<rect x="'+(30+i*9)+'" y="2" width="6" height="14" rx="1" fill="var(--dim)"/>';
      for(let i=0;i<Math.min(6,n);i++){s+='<rect x="'+(30+i*14)+'" y="44" width="6" height="14" rx="1" fill="var(--c1)"/>';const j=(i*5+2)%n;
        s+='<line x1="'+(33+i*14)+'" y1="43" x2="'+(33+j*9)+'" y2="17" stroke="var(--c2)" stroke-width="1.4"/>'}
      s+=RD.t(2,12,'doc',{fs:10.5,fill:'var(--mute)'})+RD.t(2,54,'query',{fs:10.5,fill:'var(--mute)'})}
    else{const n=Math.min(16,Math.floor((W-36)/8));s+='<rect x="28" y="20" width="'+(n*8+4)+'" height="20" rx="4" fill="none" stroke="var(--c2)" stroke-width="1.6"/>';
      for(let i=0;i<n;i++)s+='<rect x="'+(31+i*8)+'" y="24" width="5" height="12" rx="1" fill="'+(i<5?'var(--c1)':'var(--dim)')+'"/>';
      for(let i=0;i<4;i++)s+='<path d="M'+(33+i*8)+' 20 Q '+(60+i*14)+' '+(2+i*2)+' '+(33+(6+i*3)*8)+' 20" fill="none" stroke="var(--c2)" stroke-width="1.2"/>';
      s+=RD.t(2,34,'pair',{fs:10.5,fill:'var(--mute)'})+RD.t(30,55,'query and doc in one pass',{fs:10.5,fill:'var(--c2)'})}
    el.innerHTML=RD.svg(W,H,s,el.dataset.g)}
  const hero=()=>document.querySelectorAll('#rr-hero .g').forEach(glyph);
  RD.onRender(hero);RD.onResize(hero);
  // ---------- section 10: the heaviest terms of one real sparse document vector
  function sparse(){const el=$('rr-sp-svg');if(!el||!R.sparse)return;const T=R.sparse.ex.top_terms,W=Math.max(270,Math.min(RD.width(el),760));
    const rh=17,top=6,lab=W<480?84:110,H=top+T.length*rh+18,mx=Math.max(...T.map(t=>t[1]));let s='';
    T.forEach((t,i)=>{const y=top+i*rh,exp=!t[2],w=(W-lab-50)*t[1]/mx;
      s+=RD.t(lab-6,y+12,esc(t[0]),{a:'end',fs:11,fill:exp?'var(--c2)':'var(--ink)',w:exp?600:400})+
        '<rect x="'+lab+'" y="'+(y+3)+'" width="'+w.toFixed(1)+'" height="11" rx="2" fill="'+(exp?'var(--c2)':'var(--dim)')+'"/>'+
        RD.t(lab+w+4,y+12,t[1].toFixed(2),{fs:10.5,fill:'var(--mute)'})});
    s+=RD.t(lab,H-4,'term weight w_j (orange: not in the text)',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'sparse document vector')}
  RD.onRender(sparse);RD.onResize(sparse);
})();
