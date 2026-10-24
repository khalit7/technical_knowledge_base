// ---- Reading, added 2026-10-24: hero, patch stepper, contrastive loss on the real matrix, softmax against chunked sigmoid, typographic before/after ----
(function(){
  const $=id=>document.getElementById(id),E=RD.esc,U=VEU,L=window.VEL;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(o.r==null?6:o.r)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+(o.op!=null?' fill-opacity="'+o.op+'"':'')+'/>'};
  const arr=(x1,y1,x2,y2,col)=>{const a=Math.atan2(y2-y1,x2-x1),h=6;col=col||'var(--mute)';
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+col+'" stroke-width="1.4"/><path d="M'+x2+' '+y2+' L'+(x2-h*Math.cos(a-0.45))+' '+(y2-h*Math.sin(a-0.45))+' L'+(x2-h*Math.cos(a+0.45))+' '+(y2-h*Math.sin(a+0.45))+'Z" fill="'+col+'"/>'};
  const T=(x,y,s,o)=>RD.t(x,y,s,o);

  // ---------------- hero: one backbone, three signals, two outputs (static)
  (function(){const el=$('ve-hero');if(!el)return;const PR=VE.probes.encoders;
    function draw(){const W=RD.width(el),nar=W<600,fs=nar?11:12;let s='';
      // pipeline band
      const y0=8,ih=nar?62:84,img=ih;const g=7,cs=img/g;
      s+='<image href="'+VE.thumbs.p01_cat+'" x="0" y="'+y0+'" width="'+img+'" height="'+img+'" preserveAspectRatio="none"/>';
      for(let k=1;k<g;k++)s+='<line x1="'+(k*cs)+'" y1="'+y0+'" x2="'+(k*cs)+'" y2="'+(y0+img)+'" stroke="#fff" stroke-opacity=".8"/><line x1="0" y1="'+(y0+k*cs)+'" x2="'+img+'" y2="'+(y0+k*cs)+'" stroke="#fff" stroke-opacity=".8"/>';
      s+=T(0,y0+img+14,'image, cut into patches',{fs:fs-1,fill:'var(--mute)'});
      const rest=W-img-8,ax=img+6;const tw=rest*0.27,vw=rest*0.27,ow=rest-tw-vw-36;
      const tx=ax+12,vx=tx+tw+12,ox=vx+vw+12;const nt=nar?5:7,tq=Math.min(16,(tw-4)/nt-2);
      s+=arr(img+2,y0+img/2,tx-2,y0+img/2);
      for(let k=0;k<nt;k++)s+=box(tx+k*(tq+2),y0+img/2-tq/2,tq,tq,{r:2,fill:'var(--acc)',stroke:'none',op:0.35+0.08*k});
      s+=T(tx,y0+img/2-tq/2-6,'(R/P)&sup2; tokens',{fs:fs-1});
      s+=T(tx,y0+img/2+tq/2+14,nar?'width 768':'one vector each, width 768',{fs:fs-1,fill:'var(--mute)'});
      s+=arr(tx+tw-6,y0+img/2,vx-2,y0+img/2);
      s+=box(vx,y0+4,vw,img-8,{fill:'var(--acc2)',stroke:'var(--acc)'});
      s+=T(vx+vw/2,y0+img/2-4,'ViT',{a:'middle',fs:fs+2,w:600});s+=T(vx+vw/2,y0+img/2+12,'12 blocks',{a:'middle',fs:fs-1});
      const oy1=y0+6,oy2=y0+img/2+6;
      s+=arr(vx+vw+2,y0+img/2,ox-2,oy1+10);s+=arr(vx+vw+2,y0+img/2,ox-2,oy2+10);
      s+=box(ox,oy1,ow,20,{fill:'var(--bg)',stroke:'var(--c2)'})+T(ox+5,oy1+14,nar?'1 vector':'1 pooled vector: search, classify',{fs:fs-1});
      s+=box(ox,oy2,ow,20,{fill:'var(--bg)',stroke:'var(--c3)'})+T(ox+5,oy2+14,nar?'all tokens':'every patch token: dense, VLMs',{fs:fs-1});
      // lanes
      const ly=y0+img+28,lanes=[
        ['Captions','match each image to its caption','CLIP, SigLIP 2','text tower; probe '+U.pct(PR.siglip.linear_probe['16'].mean)+' (SigLIP 2)','var(--c1)'],
        ['Other views','match a teacher on another crop,','DINOv2 (+ masked patches)','probe '+U.pct(PR.dino_mean.linear_probe['16'].mean)+'; ADE20K 47.3 mIoU','var(--c3)'],
        ['Missing pixels','redraw 75% hidden patches','MAE','probe '+U.pct(PR.mae_mean.linear_probe['16'].mean)+'; best to fine-tune','var(--c4)']];
      lanes[1][1]='match a teacher on another view';
      const cols=nar?1:3,gap=10,lw=(W-gap*(cols-1))/cols,lh=70;
      lanes.forEach((l,i)=>{const cx=nar?0:i*(lw+gap),cy=nar?ly+i*(lh+8):ly;
        s+=box(cx,cy,lw,lh,{fill:'var(--bg)',stroke:l[4],sw:1.5});
        s+=T(cx+8,cy+16,l[0],{fs:fs+0.5,w:600,fill:l[4]})+T(cx+8,cy+31,l[1],{fs:fs-1})+T(cx+8,cy+46,l[2],{fs:fs-1,fill:'var(--mute)'})+T(cx+8,cy+61,l[3],{fs:fs-1});
        if(!nar)s+='<line x1="'+(cx+lw/2)+'" y1="'+cy+'" x2="'+(vx+vw*(0.25+0.25*i))+'" y2="'+(y0+img-4)+'" stroke="'+l[4]+'" stroke-dasharray="3 3"/>'});
      if(nar)s+='<line x1="'+(vx+vw/2)+'" y1="'+(y0+img-4)+'" x2="'+(vx+vw/2)+'" y2="'+ly+'" stroke="var(--mute)" stroke-dasharray="3 3"/>'+T(vx+vw/2+4,ly-6,'trained by one of',{fs:fs-1,fill:'var(--mute)'});
      else s+=T(W/2,ly-8,'the training signal decides what the tokens hold',{a:'middle',fs:fs-1,fill:'var(--mute)'});
      const H=nar?ly+3*(lh+8):ly+lh+4;
      el.innerHTML=RD.svg(W,H,s,'A ViT turns an image into patch tokens; three training signals; pooled vector and patch-token outputs')}
    RD.onRender(draw);RD.onResize(draw);draw()})();

  // ---------------- patch stepper
  (function(){const card=$('ve-pt');if(!card)return;let P=32;const sv=$('ve-pt-svg'),cap=$('ve-pt-cap'),cnt=$('ve-pt-cnt');
    const MODEL={32:{name:'CLIP B/32',cls:1,reg:0,pool:'[CLS]'},16:{name:'SigLIP 2 B/16',cls:0,reg:0,pool:'MAP'},14:{name:'DINOv2 B/14',cls:1,reg:0,pool:'[CLS]'}};
    const CAP=[
      ['The image','224 &times; 224 pixels &times; 3 colours = 150,528 numbers. As one token per pixel that would be 50,176 tokens.'],
      ['Cut into patches',p=>'Cut into a '+(224/p|0)+' &times; '+(224/p|0)+' grid of '+p+' &times; '+p+'-pixel patches: N = (224 / '+p+')&sup2; = '+((224/p|0)**2)+' patches. Halve the patch and the token count quadruples.'],
      ['Flatten each patch',p=>'Each patch is unrolled into one vector of 3 &times; '+p+' &times; '+p+' = '+U.fmt(3*p*p)+' numbers (the highlighted one becomes the long strip).'],
      ['One shared matrix',p=>'Every patch vector is multiplied by the same learned matrix of '+U.fmt(3*p*p)+' &times; 768: the <b>patch embedding</b>. Each patch is now a token of width 768. Libraries write it as a convolution with stride '+p+'; it is the same arithmetic.'],
      ['Add a position vector','Each grid slot has its own learned vector (a row of the position table), added to the token so the model knows where the patch was. MAE uses a fixed sine-cosine table instead.'],
      ['Extra tokens',p=>MODEL[p].cls?'A learned [CLS] token joins the front of the sequence; its final state will be the summary. (DINOv2 with registers adds 4 more tokens that carry no image content, section 3.)':'SigLIP 2 adds no [CLS]: its summary comes from an attention-pooling head at the end (last step).'],
      ['Twelve transformer blocks',p=>{const n=(224/p|0)**2+MODEL[p].cls;return 'Every token attends to every other in every block: '+U.fmt(n)+'&sup2; = '+U.fmt(n*n)+' attention scores per head per layer. Locality is not built in; it is learned.'}],
      ['Read out',p=>'For search and classification, pool to one vector: '+MODEL[p].name+' uses '+(MODEL[p].pool==='MAP'?'a learned query that attends over all tokens (MAP)':'the [CLS] token')+'; MAE averages the patch tokens. A VLM pools nothing and takes every patch token.']];
    function draw(i){const W=RD.width(sv),nar=W<560,g=224/P|0,N=g*g,M=MODEL[P],ext=M.cls;
      const S=nar?Math.min(W-16,220):Math.min(230,W*0.38),x0=4,y0=18;let s='';
      s+='<image href="'+VE.thumbs.p01_cat+'" x="'+x0+'" y="'+y0+'" width="'+S+'" height="'+S+'" preserveAspectRatio="none"/>';
      const cs=S/g;const hr=Math.floor(g*0.35),hc=Math.floor(g*0.4);
      if(i>=1){for(let k=1;k<g;k++)s+='<line x1="'+(x0+k*cs)+'" y1="'+y0+'" x2="'+(x0+k*cs)+'" y2="'+(y0+S)+'" stroke="#fff" stroke-opacity=".75"/><line x1="'+x0+'" y1="'+(y0+k*cs)+'" x2="'+(x0+S)+'" y2="'+(y0+k*cs)+'" stroke="#fff" stroke-opacity=".75"/>';
        s+='<rect x="'+(x0+hc*cs)+'" y="'+(y0+hr*cs)+'" width="'+cs+'" height="'+cs+'" fill="none" stroke="#ffd400" stroke-width="2.5"/>'}
      s+=T(x0,12,i>=1?g+' &times; '+g+' patches of '+P+' px':'224 &times; 224 &times; 3',{fs:11});
      // sequence panel
      const px=nar?x0:x0+S+24,py=nar?y0+S+30:y0,pw=nar?W-8:W-px-4;const tot=N+(i>=5?ext:0);
      const cols=Math.min(tot,Math.max(8,Math.floor(pw/13))),q=Math.min(18,Math.max(5,pw/cols-2)),rows=Math.ceil(tot/cols);
      const hiIdx=hr*g+hc+(i>=5?ext:0);let yEnd=py+20;
      if(i===0){s+=T(px,py+12,'pixels as tokens: 50,176 tokens',{fs:11,fill:'var(--mute)'});yEnd=py+20}
      else{
        s+=T(px,py+11,i>=5?'sequence of '+U.fmt(tot)+' tokens':'sequence of '+N+' patches',{fs:11});
        for(let k=0;k<tot;k++){const r=Math.floor(k/cols),c=k%cols,x=px+c*(q+2),y=py+18+r*(q+2);
          const isX=i>=5&&k<ext,hi=k===hiIdx;
          let fill=i>=3?'var(--acc)':'var(--soft)',op=i>=3?0.25+0.5*((k*37)%11)/11:1;
          if(isX){fill='var(--c2)';op=0.9}
          s+='<rect x="'+x+'" y="'+y+'" width="'+q+'" height="'+q+'" rx="2" fill="'+fill+'" fill-opacity="'+op.toFixed(2)+'" stroke="'+(hi?'#ffd400':'var(--line)')+'" stroke-width="'+(hi?2:0.6)+'"/>';
          if(i===4&&q>=8)s+='<circle cx="'+(x+q-3)+'" cy="'+(y+3)+'" r="2" fill="var(--c5)"/>'}
        const sy=py+18+rows*(q+2)+6;let yy=sy;
        if(i===2||i===3){const sw=Math.min(pw,3*P*P/12);s+=box(px,yy,sw,10,{r:2,fill:'#ffd400',stroke:'none',op:i===3?0.45:0.85})+T(px,yy+24,U.fmt(3*P*P)+' numbers'+(i===3?' &times; matrix '+U.fmt(3*P*P)+' &times; 768 = one token of 768':''),{fs:11});yy+=30}
        if(i===4)s+=T(px,yy+12,'+ position vector per slot (dot)',{fs:11,fill:'var(--c5)'});
        if(i===5)s+=T(px,yy+12,ext?'+ [CLS] at the front (orange)':'no [CLS]',{fs:11,fill:'var(--c2)'});
        if(i===6){const hx=px+(hiIdx%cols)*(q+2)+q/2,hy=py+18+Math.floor(hiIdx/cols)*(q+2)+q/2;
          for(let k=0;k<tot;k+=Math.max(1,Math.floor(tot/14))){const x=px+(k%cols)*(q+2)+q/2,y=py+18+Math.floor(k/cols)*(q+2)+q/2;s+='<line x1="'+hx+'" y1="'+hy+'" x2="'+x+'" y2="'+y+'" stroke="#ffd400" stroke-opacity=".7"/>'}
          s+=T(px,yy+12,'every token attends to every token',{fs:11})}
        if(i===7){const bw=Math.min(pw/3-6,120);[['[CLS]','take token 0','var(--c2)'],['MAP','learned query','var(--c1)'],['mean','average all','var(--c4)']].forEach((r,k)=>{
          const bx=px+k*(bw+8);s+=box(bx,yy,bw,36,{fill:'var(--bg)',stroke:r[2],sw:1.5})+T(bx+5,yy+14,r[0],{fs:11.5,w:600,fill:r[2]})+T(bx+5,yy+29,r[1],{fs:10.5})});
          s+=T(px,yy+52,'&rarr; one vector of 768 per image; or keep all tokens (VLM)',{fs:11});yy+=56}
        yEnd=yy+18}
      const H=Math.max(y0+S+8,yEnd);
      sv.innerHTML=RD.svg(W,H,s,'An image cut into patches and turned into a sequence of tokens');
      const c=CAP[i];cap.innerHTML='<div class="t">'+(i+1)+'/8 '+c[0]+'</div><p>'+(typeof c[1]==='function'?c[1](P):c[1])+'</p>';
      cnt.innerHTML=RD.stat('Tokens',i===0?'50,176 (pixels)':U.fmt(N)+(i>=5&&ext?' + [CLS]':''),M.name)+RD.stat('Numbers per patch',U.fmt(3*P*P),'3 &times; P&sup2;')+RD.stat('Patch-embedding matrix',U.fmt(3*P*P)+' &times; 768','shared by every patch')+RD.stat('Scores per head per layer',i===0?'2.5 billion':U.fmt((N+(i>=5?ext:0))**2),i===0?'50,176&sup2;':'(N + extra)&sup2;')}
    const A=RD.anim({card:'ve-pt',ctl:'ve-pt-ctl',n:8,draw,ms:2200,label:'Patch step'});
    RD.seg($('ve-pt-p'),m=>{P=+m;A.redraw()});RD.onResize(()=>A.redraw())})();

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
