// ---- Reading, added 2026-10-24 (hero and patch stepper became 3D stages on 2026-11-09): contrastive loss on the real matrix, softmax against chunked sigmoid, typographic before/after ----
(function(){
  const $=id=>document.getElementById(id),E=RD.esc,U=VEU,L=window.VEL;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.r==null?6:o.r)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+(o.op!=null?' fill-opacity="'+o.op+'"':'')+'/>'};
  const arr=(x1,y1,x2,y2,col)=>{const a=Math.atan2(y2-y1,x2-x1),h=6;col=col||'var(--mute)';
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="1.4"/><path d="M'+x2+' '+y2+' L'+(x2-h*Math.cos(a-0.45))+' '+(y2-h*Math.sin(a-0.45))+' L'+(x2-h*Math.cos(a+0.45))+' '+(y2-h*Math.sin(a+0.45))+'Z" fill="'+col+'"/>'};
  const T=(x,y,s,o)=>RD.t(x,y,s,o);

  // ---------------- contrastive loss on the real 16 x 16 matrix
  (function(){const card=$('ve-loss');if(!card)return;const st={w:'clip',l:'soft'};
    const nS=$('ve-loss-n'),tS=$('ve-loss-t');
    const sig=x=>1/(1+Math.exp(-x)),lse=v=>{const m=Math.max(...v);return m+Math.log(v.reduce((a,x)=>a+Math.exp(x-m),0))};
    const bias=()=>st.w==='siglip'?L.models.siglip.bias:-10;
    function soft(S,n,t){let r=0,c=0;for(let i=0;i<n;i++){const row=[],col=[];for(let j=0;j<n;j++){row.push(t*S[i][j]);col.push(t*S[j][i])}r+=lse(row)-t*S[i][i];c+=lse(col)-t*S[i][i]}return (r+c)/(2*n)}
    function sigl(S,n,t,b){let s=0;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const z=i===j?1:-1,x=z*(t*S[i][j]+b);s+=x<0?-(x-Math.log1p(Math.exp(x))):Math.log1p(Math.exp(-x))}return s/n}
    function draw(){const S=L.models[st.w].sim16,n=+nS.value,t=Math.pow(10,+tS.value),b=bias();
      $('ve-loss-nv').textContent=n;$('ve-loss-tv').textContent=t<10?t.toFixed(2):t.toFixed(1);
      const loss=st.l==='soft'?soft(S,n,t):sigl(S,n,t,b);let right=0,dg=0;
      for(let i=0;i<n;i++){let ok=true;for(let j=0;j<n;j++)if(S[i][j]>S[i][i])ok=false;if(ok)right++;dg+=S[i][i]}
      $('ve-loss-out').innerHTML=RD.stat('Loss at this t',loss.toFixed(3),st.l==='soft'?'mean of row and column cross-entropies':'summed over cells, divided by N')+
        RD.stat(st.l==='soft'?'Chance level ln N':'Bias b',st.l==='soft'?Math.log(n).toFixed(3):b.toFixed(2),st.l==='soft'?'every row uniform (t = 0)':(st.w==='siglip'?'learned':'illustrative'))+
        RD.stat('Rows with the true caption first',right+' of '+n,'argmax of the cosines')+RD.stat('Mean cosine, true pairs',(dg/n).toFixed(3),'the diagonal');
      // matrix
      const mx=$('ve-loss-mx'),W=RD.width(mx),c=Math.min(26,(W-24)/n),off=18;let s='';
      for(let i=0;i<n;i++){const lg=[];for(let j=0;j<n;j++)lg.push(t*S[i][j]);const z=lse(lg);
        s+=T(off-4,off+i*c+c/2+4,i+1,{a:'end',fs:10.5,fill:'var(--mute)'});
        for(let j=0;j<n;j++){const p=st.l==='soft'?Math.exp(lg[j]-z):sig(t*S[i][j]+b);
          s+='<rect x="'+(off+j*c)+'" y="'+(off+i*c)+'" width="'+(c-1)+'" height="'+(c-1)+'" fill="var(--acc)" fill-opacity="'+(0.05+0.95*p).toFixed(3)+'"'+(i===j?' stroke="var(--ink)" stroke-width="1.5"':'')+'><title>image '+(i+1)+' ('+E(L.keys[i])+'), caption '+(j+1)+': cosine '+S[i][j].toFixed(3)+', '+(st.l==='soft'?'softmax over the row ':'sigmoid ')+(p*100).toFixed(1)+'%</title></rect>'}}
      for(let j=0;j<n;j+=n>10?2:1)s+=T(off+j*c+c/2,off-5,j+1,{a:'middle',fs:10.5,fill:'var(--mute)'});
      mx.innerHTML=RD.svg(W,off+n*c+16,s+T(off,off+n*c+13,st.l==='soft'?'each row sums to 1':'each cell on its own',{fs:10.5,fill:'var(--mute)'}),'Probability matrix of the batch');
      // curve
      const cv=$('ve-loss-curve'),CW=RD.width(cv),CH=210,l=38,r=8,tp=10,bt=40;const pts=[];
      for(let k=0;k<=125;k++){const tt=Math.pow(10,k/50);pts.push([k/50,st.l==='soft'?soft(S,n,tt):sigl(S,n,tt,b)])}
      const hi=Math.max(...pts.map(p=>p[1]),st.l==='soft'?Math.log(n):0)*1.08,X=v=>l+v/2.5*(CW-l-r),Y=v=>tp+(1-v/hi)*(CH-tp-bt);let q='';
      [0,0.5,1].forEach(f=>{const v=hi*f;q+='<line x1="'+l+'" y1="'+Y(v)+'" x2="'+(CW-r)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+T(l-4,Y(v)+4,v.toFixed(v<10?1:0),{a:'end',fs:10.5,fill:'var(--mute)'})});
      [1,10,100].forEach((v,k)=>{q+=T(X(k),CH-bt+15,'t = '+v,{a:'middle',fs:10.5,fill:'var(--mute)'})});
      q+='<path d="'+pts.map((p,k)=>(k?'L':'M')+X(p[0]).toFixed(1)+' '+Y(p[1]).toFixed(1)).join('')+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
      if(st.l==='soft')q+='<line x1="'+l+'" y1="'+Y(Math.log(n))+'" x2="'+(CW-r)+'" y2="'+Y(Math.log(n))+'" stroke="var(--mute)" stroke-dasharray="4 3"/>'+T(CW-r,Y(Math.log(n))-4,'ln N',{a:'end',fs:10.5,fill:'var(--mute)'});
      q+='<circle cx="'+X(+tS.value)+'" cy="'+Y(loss)+'" r="5" fill="var(--bad)"/>'+T(l,CH-3,'loss against scale t (log axis)',{fs:10.5,fill:'var(--mute)'});
      cv.innerHTML=RD.svg(CW,CH,q,'Loss against scale');
      $('ve-loss-note').innerHTML=st.l==='sig'&&st.w==='clip'?'<b>Careful:</b> CLIP was trained with the softmax and has no bias; with b = &minus;10 a sigmoid of t &times; cosine is a rule it never learned, so read this view only as arithmetic.':
        st.l==='soft'?'Each row (and column) is a choice among the N candidates: the loss can only be small if the diagonal wins its row by a margin that t stretches.':'Each cell is judged alone: the bias pushes every pair towards "no match" unless its cosine is high; rows need not sum to 1, and no batch-wide sum is needed.'}
    RD.seg($('ve-loss-m'),m=>{st.w=m;tS.value=Math.log10(L.models[m].scale).toFixed(2);draw()});RD.seg($('ve-loss-l'),m=>{st.l=m;draw()});
    nS.addEventListener('input',draw);tS.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw()})();

  // ---------------- softmax all-gather against chunked sigmoid (static before/after)
  (function(){const el=$('ve-chunk');if(!el)return;const C=L.loss.chunk;
    const mb=x=>x>=1e9?(x/1e9).toFixed(1)+' GB':x>=1e6?(x/1e6).toFixed(1)+' MB':(x/1e3).toFixed(1)+' kB';
    function draw(){const W=RD.width(el),nar=W<560,pw=nar?W:(W-24)/2,sq=Math.min(pw-90,170),D=4,c=sq/D;let s='';
      const panel=(ox,oy,title,sub,soft)=>{let p=T(ox,oy+12,title,{fs:12,w:600})+T(ox,oy+27,sub,{fs:11,fill:'var(--mute)'});const y=oy+50,x=ox+16;
        for(let r=0;r<D;r++){p+=T(x-4,y+r*c+c/2+4,'d'+(r+1),{a:'end',fs:10.5,fill:'var(--mute)'});
          for(let k=0;k<D;k++){const on=soft?r===0:(r===0&&k===0),next=!soft&&r===0&&k===1;
            p+='<rect x="'+(x+k*c)+'" y="'+(y+r*c)+'" width="'+(c-2)+'" height="'+(c-2)+'" rx="2" fill="'+(on?'var(--acc)':'var(--soft)')+'" fill-opacity="'+(on?0.75:1)+'" stroke="'+(next?'var(--acc)':'var(--line)')+'"'+(next?' stroke-dasharray="4 3"':'')+'/>'}}
        p+=T(x,y-3,'texts &rarr;',{fs:10.5,fill:'var(--mute)'});
        const nx=x+sq+6;
        if(soft){p+=T(nx,y+c/2+4,'device 1 holds',{fs:11})+T(nx,y+c/2+18,'its b rows &times; all |B|',{fs:11})+T(nx,y+c/2+34,mb(C.rows_bytes),{fs:12,w:600,fill:'var(--acc)'});
          p+=T(ox,y+sq+18,'needs every embedding: an all-gather',{fs:11})}
        else{p+=T(nx,y+c/2+4,'device 1 holds',{fs:11})+T(nx,y+c/2+18,'one b &times; b block',{fs:11})+T(nx,y+c/2+34,mb(C.chunk_bytes),{fs:12,w:600,fill:'var(--acc)'});
          p+=T(ox,y+sq+18,'texts move round the ring, D steps (dashed: next)',{fs:11})}
        return p};
      s+=panel(0,0,'Before: softmax','row and column sums span the batch',true);
      const ox=nar?0:pw+24,oy=nar?sq+80:0;s+=panel(ox,oy,'After: chunked sigmoid','each cell scored on its own',false);
      el.innerHTML=RD.svg(W,(nar?2*(sq+80):sq+78),s,'Softmax against chunked sigmoid memory per device')}
    RD.onRender(draw);RD.onResize(draw);draw()})();

  // ---------------- typographic attack, before and after
  (function(){const card=$('ve-typo');if(!card)return;let k=2;const set=L.probe_sets.typo,TX=['cat','dog','bird','car'];
    const LBL=['no sticker','CAT sticker','DOG sticker','BIRD sticker','CAR sticker','small DOG sticker','large DOG sticker'];
    function draw(){$('ve-typo-img').innerHTML=[0,k].map(i=>'<figure><img src="img/'+set.images[i]+'.webp" alt="cat photo, '+LBL[i]+'" loading="lazy"><figcaption>'+(i?'after: ':'before: ')+LBL[i]+'</figcaption></figure>').join('');
      $('ve-typo-bars').innerHTML=['clip','siglip'].map(w=>{const P=L.probes[w].typo,a=P[0],b=P[k],mx=Math.max(...a,...b);
        const wa=a.indexOf(Math.max(...a)),wb=b.indexOf(Math.max(...b));
        return '<div><div class="small" style="font-weight:600;margin:4px 0">'+U.ENC[w]+'</div><div class="rd-bars">'+TX.map((t,j)=>
          '<div><span class="nm">"'+t+'" before</span><span class="tr"><span style="width:'+(100*Math.max(0,a[j])/mx).toFixed(1)+'%;background:var(--dim)"></span></span><span class="v"'+(j===wa?' style="font-weight:700"':'')+'>'+a[j].toFixed(4)+'</span></div>'+
          '<div><span class="nm">"'+t+'" after</span><span class="tr"><span style="width:'+(100*Math.max(0,b[j])/mx).toFixed(1)+'%;background:'+(j===wb&&wb!==0?'var(--bad)':'var(--acc)')+'"></span></span><span class="v"'+(j===wb?' style="font-weight:700"':'')+'>'+b[j].toFixed(4)+'</span></div>').join('')+
          '</div><div class="small">'+(wb===0?'still "cat"':'flips to "'+TX[wb]+'"')+'</div></div>'}).join('')}
    RD.seg($('ve-typo-s'),m=>{k=+m;draw()});draw()})();
})();
