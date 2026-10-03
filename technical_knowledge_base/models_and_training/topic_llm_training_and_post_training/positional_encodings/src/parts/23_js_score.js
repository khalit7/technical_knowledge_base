// ---- Reading: six schemes, one query (exact logits for one illustrative head; T5 biases are the real T5-base decoder's) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('sc'))return;
  const D=window.PE_DATA,d=64,L=512,sq=Math.sqrt(d);
  // illustrative content vector: seeded Gaussian (mulberry32 + Box-Muller), the same for query and key (a repeated token)
  function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function gauss(r){const u=Math.max(1e-12,r()),v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  const R1=rng(7),x=[];for(let i=0;i<d;i++)x.push(gauss(R1));
  // learned absolute table: L rows, untrained random (illustrative), scaled like the sinusoid (entries of variance 1/2)
  const R2=rng(11),E=[];for(let p=0;p<L;p++){const row=[];for(let i=0;i<d;i++)row.push(gauss(R2)*Math.SQRT1_2);E.push(row)}
  const sinP=pos=>{const v=new Array(d);for(let i=0;i<d/2;i++){const w=pos/Math.pow(10000,2*i/d);v[2*i]=Math.sin(w);v[2*i+1]=Math.cos(w)}return v};
  const dot=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s};
  const xx=dot(x,x);
  const pairE=[];for(let i=0;i<d/2;i++)pairE.push(x[2*i]*x[2*i]+x[2*i+1]*x[2*i+1]);
  const S={view:'logit',R:1024,off:0,head:1,base:10000,on:{sin:1,learned:1,t5:1,alibi:1,rope:1,nope:1}};
  const SCH=[['sin','Sinusoidal (absolute)','--c2'],['learned','Learned (absolute)','--c4'],['t5','T5 bias (real T5-base)','--c5'],['alibi','ALiBi','--c3'],['rope','RoPE','--c1'],['nope','NoPE','--mute']];
  // positional part of the logit between a query at mq and a key at mk = mq - k (k >= 0); null where undefined
  function contrib(s,mq,k){const mk=mq-k;
    if(s==='nope')return 0;
    if(s==='alibi')return -Math.pow(2,-S.head)*k;
    if(s==='t5')return D.t5dec[window.T5B(-k,false)][S.head-1];
    if(s==='rope'){let t=0;for(let i=0;i<d/2;i++)t+=pairE[i]*Math.cos(k/Math.pow(S.base,2*i/d));return (t-xx)/sq}
    if(s==='sin'){const pq=sinP(mq),pk=sinP(mk);return (dot(x,pk)+dot(pq,x)+dot(pq,pk))/sq}
    if(s==='learned'){if(mq>=L||mk>=L)return null;const pq=E[mq],pk=E[mk];return (dot(x,pk)+dot(pq,x)+dot(pq,pk))/sq}
    return 0}
  // logit view: the key sits at position off and the query k tokens later (so a learned table runs out at k = 512 - off);
  // weights view: the query sits at R + off and attends to every earlier key 0..R+off
  function series(s,off){const n=S.R,pts=[];
    if(S.view==='logit'){for(let k=0;k<=n;k++)pts.push([k,contrib(s,off+k,k)]);return pts}
    const mq=S.R+off,lg=[];let mx=-Infinity;for(let k=0;k<=mq;k++){const c=contrib(s,mq,k);if(c===null)return [];lg.push(c);if(c>mx)mx=c}
    let z=0;for(const v of lg)z+=Math.exp(v-mx);
    for(let k=0;k<=n;k++)pts.push([k,Math.exp(lg[k]-mx)/z]);return pts}
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
  function draw(){const el=$('scSvg'),W=window.RD.width(el),Hh=W<520?250:300,ml=44,mr=10,mt=10,mb=34,pw=W-ml-mr,ph=Hh-mt-mb;
    const X=k=>ml+k/S.R*pw;
    let Y,yt=[],ylab;
    if(S.view==='logit'){const lo=-12,hi=8;Y=v=>mt+(hi-Math.max(lo,Math.min(hi,v)))/(hi-lo)*ph;for(let v=lo;v<=hi;v+=4)yt.push([v,v>0?'+'+v:''+v]);ylab='added to the logit'}
    else{const lo=-6,hi=0;Y=v=>mt+(hi-Math.max(lo,Math.min(hi,Math.log10(Math.max(v,1e-12)))))/(hi-lo)*ph;for(let e=lo;e<=hi;e+=2)yt.push([e,e===0?'1':'1e'+e]);ylab='attention weight (log)'}
    let g='<svg viewBox="0 0 '+W+' '+Hh+'" width="'+W+'" height="'+Hh+'" role="img" aria-label="Positional effect on attention against distance">';
    yt.forEach(([v,t])=>{const y=S.view==='logit'?Y(v):mt+(0-v)/6*ph;g+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(ml-5)+'" y="'+(y+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+t+'</text>'});
    const xt=S.R<=128?[0,32,64,96,128]:S.R<=1024?[0,256,512,768,1024]:[0,512,1024,1536,2048];
    xt.forEach((k,j)=>{g+='<text x="'+X(k)+'" y="'+(Hh-mb+15)+'" font-size="11" text-anchor="'+(j===xt.length-1?'end':j===0?'start':'middle')+'" fill="var(--mute)">'+k.toLocaleString('en-US')+'</text>'});
    g+='<text x="'+(ml+pw/2)+'" y="'+(Hh-3)+'" font-size="11.5" text-anchor="middle" fill="var(--mute)">distance from the query, in tokens</text>';
    g+='<text x="12" y="'+(mt+ph/2)+'" font-size="11.5" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+(mt+ph/2)+')">'+ylab+'</text>';
    // trained length (illustrative 512) and T5's last bucket
    if(L<=S.R){g+='<line x1="'+X(L)+'" x2="'+X(L)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="'+(X(L)+4)+'" y="'+(mt+12)+'" font-size="11" fill="var(--bad)">trained length 512</text>'}
    const b31=D.R.t5_last_bucket_starts;if(S.on.t5&&b31<=S.R)g+='<line x1="'+X(b31)+'" x2="'+X(b31)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="'+css('--c5')+'" stroke-dasharray="2 3" opacity=".7"/>';
    SCH.forEach(([k,,c])=>{if(!S.on[k])return;const col=css(c);
      const draws=(S.off>0&&(k==='sin'||k==='learned'))?[[0,.35,'4 3'],[S.off,1,'']]:[[S.off,1,'']];
      draws.forEach(([o,op,da])=>{const pts=series(k,o);let path='',pen=false;
        pts.forEach(([kk,v])=>{if(v===null){pen=false;return}path+=(pen?'L':'M')+X(kk).toFixed(1)+' '+Y(v).toFixed(1);pen=true});
        if(path)g+='<path d="'+path+'" fill="none" stroke="'+col+'" stroke-width="'+(k==='nope'?2.2:1.6)+'" opacity="'+op+'"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'})});
    g+='</svg>';el.innerHTML=g;
    // notes computed from the same functions
    const lv=S.view==='logit',b=window.T5B(-S.R,false),slope=Math.pow(2,-S.head),k64=Math.min(64,S.R);
    const sinShift=Math.abs(contrib('sin',S.off+k64,k64)-contrib('sin',k64,k64));
    const lastL=L-1-S.off;
    $('scOut').innerHTML=[
      lv?window.RD.stat('Positions','key at '+S.off.toLocaleString('en-US'),'query at '+S.off.toLocaleString('en-US')+' + distance'):window.RD.stat('Query position',(S.R+S.off).toLocaleString('en-US'),'attends to keys 0 to '+(S.R+S.off).toLocaleString('en-US')),
      window.RD.stat('ALiBi head '+S.head,'slope 1/'+Math.pow(2,S.head),'penalty at '+S.R.toLocaleString('en-US')+': '+(-slope*S.R).toFixed(S.R*slope<10?2:0)),
      window.RD.stat('T5 bucket at '+S.R.toLocaleString('en-US'),String(b),'decoder head '+S.head+' bias '+D.t5dec[b][S.head-1].toFixed(2)),
      window.RD.stat('Sinusoidal at distance '+k64,S.off?(sinShift.toFixed(2)+' moved'):'shift the pair','change after a shift of '+S.off.toLocaleString('en-US')),
      window.RD.stat('Learned table',lv?(lastL>=0?'to distance '+lastL.toLocaleString('en-US'):'no row'):((S.R+S.off)>=L?'no row':'rows 0 to 511'),lv?'rows 0 to 511 only':(S.R+S.off>=L?'position '+(S.R+S.off).toLocaleString('en-US')+' has no embedding':'every key has a row'))].join('');
    $('scLeg').innerHTML=SCH.map(([k,n,c])=>'<label class="chk"><input type="checkbox" data-k="'+k+'"'+(S.on[k]?' checked':'')+'> <i style="background:'+css(c)+'"></i>'+n+'</label>').join('');
  }
  $('scLeg').addEventListener('change',e=>{const k=e.target.dataset.k;if(k){S.on[k]=e.target.checked?1:0;draw()}});
  $('scView').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.view=b.dataset.v;[...$('scView').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});draw()});
  $('scRange').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;S.R=+b.dataset.r;[...$('scRange').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});draw()});
  $('scOff').addEventListener('input',e=>{S.off=+e.target.value;$('scOffV').textContent=S.off.toLocaleString('en-US');draw()});
  $('scHead').addEventListener('input',e=>{S.head=+e.target.value;$('scHeadV').textContent=S.head;draw()});
  $('scBase').addEventListener('change',e=>{S.base=+e.target.value;draw()});
  window.RD.onRender(draw);addEventListener('resize',()=>{if($('sc').offsetParent)draw()});draw();
})();
