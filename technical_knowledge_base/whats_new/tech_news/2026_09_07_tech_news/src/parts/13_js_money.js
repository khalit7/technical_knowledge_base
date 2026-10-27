// ---- Money moving: values of whole companies on one $B axis; run rate and guarantee in rows of their own ----
(function(){
  const box=$('mnSvg');if(!box)return;
  // kind: val = valuation from a funding round, price = reported or rumoured price, offer = reported offers, deal = confirmed deal (follow-up)
  const CO=[
    {n:'Hugging Face',pts:[{v:4.5,k:'val',l:'2023 round, post-money'},{v:12.93,k:'deal',l:'Nvidia\'s price, confirmed Sep 3'}]},
    {n:'Cognition',pts:[{v:10.2,k:'val',l:'September 2025 round'},{v:26,k:'val',l:'May 2026 round'},{v:47,k:'talks',l:'round in talks, about $47B',lb:true}]},
    {n:'Thinking Machines',pts:[{v:12,k:'val',l:'July 2025 seed'},{v:50,k:'sought',l:'talks that collapsed in January'},{v:40,k:'talks',l:'round in talks, at least $40B',lb:true}]}
  ];
  const KC={val:'var(--c3)',deal:'var(--c4)',talks:'var(--c2)',sought:'var(--dim)'};
  const KL={val:'valuation (closed round)',deal:'acquisition price',talks:'round in talks (reported)',sought:'valuation sought, not reached'};
  function draw(){
    const fu=true,cw=box.clientWidth||380,narrow=cw<560;
    // measured layout: W is the container width in px (1 SVG unit = 1 px); narrow puts the row label above its row
    const W=Math.max(300,Math.round(cw)),lw=narrow?14:130,pr=narrow?14:24,rh=narrow?62:44,top=6,H=top+CO.length*rh+22;
    const max=55,X=v=>lw+(W-lw-pr)*v/max;
    let s='';
    for(let t=0;t<=50;t+=10)s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+top+'" y2="'+(top+CO.length*rh)+'" stroke="var(--line)"/><text x="'+X(t)+'" y="'+(top+CO.length*rh+15)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+t+'</text>';
    CO.forEach((c,r)=>{const y=top+rh*r+(narrow?38:rh/2),pts=c.pts.filter(p=>fu||!p.fu);
      s+=narrow?'<text x="'+lw+'" y="'+(top+rh*r+13)+'" font-size="12" font-weight="600">'+c.n+'</text>':'<text x="'+(lw-8)+'" y="'+(y+4)+'" font-size="12" text-anchor="end">'+c.n+'</text>';
      if(pts.length>1){const lo=Math.min(...pts.map(p=>p.v)),hi=Math.max(...pts.map(p=>p.v));s+='<line x1="'+X(lo)+'" x2="'+X(hi)+'" y1="'+y+'" y2="'+y+'" stroke="var(--dim)" stroke-width="3"/>'}
      // value labels: above by default; a label closer than 34 px to the previous one goes below instead
      const ord=pts.slice().sort((a,b)=>a.v-b.v);let lastX=-1e9,lastBelow=true;const pos=new Map();
      ord.forEach(p=>{const x=X(p.v);const below=(x-lastX<34)?!lastBelow:false;pos.set(p,below);lastX=x;lastBelow=below});
      pts.forEach(p=>{const cx=X(p.v);
        s+=p.lb?'<path d="M'+cx+' '+(y-7)+'l7 7l-7 7l-7-7z" fill="none" stroke="'+KC[p.k]+'" stroke-width="2"><title>'+p.l+': $'+p.v+'B</title></path>':'<circle cx="'+cx+'" cy="'+y+'" r="6" fill="'+KC[p.k]+'"'+(p.fu?' stroke="var(--ink)" stroke-dasharray="2 2" stroke-width="1.5"':'')+'><title>'+p.l+': $'+p.v+'B</title></circle>';
        const below=pos.get(p);s+='<text x="'+cx+'" y="'+(y+(below?21:-11))+'" font-size="11" text-anchor="'+(cx>W-pr-14?'end':'middle')+'" fill="var(--mute)">'+String(p.v)+'</text>'})});
    const kinds='<div class="mnk"><div class="small mute">A different kind: compute commitments over years, not a company value</div><div class="mnrow"><b>Anthropic, up to $517B</b> <span class="mute">over the next decade for at least 14.8 GW (The Information\'s estimate) · separately, <b>$35B</b> with Lambda, Sep 1</span></div>'+
      '<div class="small mute">A different kind: revenue (dollars a year), not a company value</div><div class="mnrow"><b>ChatGPT Ads $1B</b> <span class="mute">run rate, Aug 31</span> · <b>Cognition $0.9B+</b> · <b>Thinking Machines $0.1B+</b></div>'+
      '<div class="small mute">A different kind: a legal payout or claim</div><div class="mnrow"><b>$1.5B</b> <span class="mute">authors\' settlement with Anthropic, now paying out</span> · <b>$20B+</b> <span class="mute">alleged by the FTC against Amazon (a claim, not a payment)</span></div></div>';
    const ttl='<div class="small mute" style="margin:2px 0 4px">What a whole company is worth, $ billion. One axis, because prices and valuations measure the same thing.</div>';
    box.innerHTML=ttl+svgEl(W,H,s,'Company values reported this week')+kinds+'<div class="lgd">'+Object.keys(KC).filter(k=>fu||k!=='deal').map(k=>'<span><i style="background:'+KC[k]+';border-radius:50%"></i>'+KL[k]+'</span>').join('')+'<span><i style="border:2px solid var(--mute);background:none;transform:rotate(45deg);width:9px;height:9px"></i>figure as worded in the issue</span></div>';
    $('mnStats').innerHTML=stat('Cognition, in three months','1.8x','47 / 26; revenue 0.9 / 0.49 = 1.8x too')+stat('Thinking Machines','20% below','40 against the 50 it sought; 3.3x its seed')+stat('Hugging Face, against 2023','2.9x','12.93 / 4.5')+stat('Valuation over run rate','52x and 400x','Cognition 47 / 0.9; Thinking Machines 40 / 0.1');
  }
  let rw=box.clientWidth;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);draw();
})();
