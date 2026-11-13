// ---- Scene (Fig. 1): a decoder-only checkpoint copied into an encoder-decoder (first paper §3, Figure 1, Table 1; T5Gemma 2 §2), renderer v2 ----
// Every stack is a real configuration from recompute.py (PAPER.rc.parts): one slab per layer (26 for Gemma 2 2B, 42 for 9B, 18 for Gemma 3 270M),
// each slab split into self-attention, cross-attention and feed-forward with widths to scale by that layer's parameters (one scale per mode).
// The embedding tables and the vision encoder are drawn at a fixed size and labelled with their counts. Mask plates: lower triangle causal, full square bidirectional.
(function(){
  if(!document.getElementById('stg-ad')||!window.PAPER)return;const {at,off,mix}=S3;
  const RCP=PAPER.rc.parts,g2=RCP['gemma-2-2b'],g9=RCP['gemma-2-9b'],g3=RCP['gemma-3-270m'],Mi=1e6;
  const F=v=>v>=1e9?(v/1e9).toFixed(2)+'B':(v/Mi).toFixed(v<1e8?1:0)+'M';
  const lay=p=>({L:p.L,d:p.d,a:(p.attn+p.norm)/p.L,f:p.ffn/p.L,emb:p.emb,tot:p.emb+p.attn+p.norm+p.ffn});
  const MODES={
    bal:{src:[{p:g2,n:'Gemma 2 2B'}],sx:[-4.4],enc:0,dec:0,ex:0,dx:4.3,cross:g2.cross_self,ci:'copy',W:2.3,H:2.5,n:5},
    unb:{src:[{p:g9,n:'Gemma 2 9B'},{p:g2,n:'Gemma 2 2B'}],sx:[-6.7,-3.2],enc:0,dec:1,ex:.8,dx:4.7,cross:RCP.cross_9b_into_2b,ci:'rnd',W:2.9,H:2.6,n:6},
    t2:{src:[{p:g3,n:'Gemma 3 270M'}],sx:[-4.4],enc:0,dec:0,ex:0,dx:4.3,cross:g3.cross_self,ci:'ghost',W:2.2,H:2.3,n:6}};
  Object.values(MODES).forEach(D=>{const ls=D.src.map(s=>lay(s.p)),dec=ls[D.dec],cl=D.cross/dec.L;D.ls=ls;D.cl=cl;
    D.ws=D.W/Math.max(...ls.map(l=>l.a+l.f),dec.a+dec.f+cl);D.lh=D.H/Math.max(...ls.map(l=>l.L))});
  let MODE='bal';
  const DZ=1.1,EH=.2,VIS=[-2.15,0,1.75];
  const rnd=i=>{const s=Math.sin(i*12.9898+4.1)*43758.5453;return s-Math.floor(s)};
  // one stack: embedding plate, then a slab per layer; o: a (alpha), cross {w,kind,a}, mask {kind,open}, embA, tag
  function stack(R,x,l,D,o){const P=R.P,a=o.a;if(a<=.01)return {top:0};
    const wa=l.a*D.ws,wf=l.f*D.ws,c=o.cross,wc=c&&c.a>.01?D.cl*D.ws:0,wt=wa+wf+(c&&c.kind==='ghost'?D.cl*D.ws:wc),x0=x-wt/2,top=EH+.06+l.L*D.lh;
    const ea=o.embA==null?a:o.embA;
    R.box([x,0,0],[wa+wf+.12,EH,DZ+.12],{fill:mix(P.paper,P.c5,.5),a:ea});
    for(let i=0;i<l.L;i++){const y=EH+.06+i*D.lh,h=D.lh*.7,sh=false;let cx=x0;
      R.box([cx+wa/2,y,0],[wa,h,DZ],{fill:mix(P.paper,P.c1,.55),a,shadow:sh,lw:.6});cx+=wa;
      if(c&&c.kind==='ghost'&&c.a>.01){R.box([cx+D.cl*D.ws/2,y,0],[D.cl*D.ws,h,DZ],{fill:mix(P.paper,P.c4,.3),a:c.a,fa:.25,shadow:sh,lw:.6});cx+=D.cl*D.ws}
      else if(wc){const fill=c.kind==='rnd'?mix(P.paper,P.c2,.25+.55*rnd(i)):mix(P.paper,P.c4,.6);R.box([cx+wc/2,y,0],[wc,h,DZ],{fill,a:Math.min(a,1)*c.a,shadow:sh,lw:.6});cx+=wc}
      R.box([cx+wf/2,y,0],[wf,h,DZ],{fill:mix(P.paper,P.c3,.45),a:a*(o.ffnA==null?1:o.ffnA),shadow:sh,lw:.6})}
    // the attention mask as an upright glass plate on top: rows are queries, columns keys
    const m=o.mask;if(m){const n=5,cs=.17,mw=(m.kind==='merged'?2*n:n)*cs,mx=x-mw/2,my=top+.2,ma=m.a==null?a:m.a;
      R.glass([mx,my,0],[mw,0,0],[0,n*cs,0],{c:P.ink,a:ma*.5,nu:m.kind==='merged'?2*n:n,nv:n,th:.03});
      for(let i=0;i<n;i++)for(let j=0;j<(m.kind==='merged'?2*n:n);j++){const enc=m.kind==='merged'&&j>=n,jj=enc?j-n:j;let v;
        if(enc)v=m.open;else if(jj<=i)v=1;else v=m.kind==='full'?m.open:0;if(v<=.01)continue;
        const cx=mx+j*cs,cy=my+(n-1-i)*cs;R.quad([[cx+.02,cy+.02,.07],[cx+cs-.02,cy+.02,.07],[cx+cs-.02,cy+cs-.02,.07],[cx+.02,cy+cs-.02,.07]],{fill:enc?P.c4:P.acc,a:ma*v,edge:false})}
      return {top:my+n*cs,wt}}
    return {top,wt}}
  function draw(R,k,e){const P=R.P,D=MODES[MODE],L=D.ls,last=D.n-1,t2=MODE==='t2',unb=MODE==='unb';
    // a label whose anchor is outside the frame (a close view) is dropped rather than clamped onto the edge
    const lab=(p,t,o)=>{const q=R.p(p);if(q[0]<-4||q[0]>R.W+4||q[1]<-4||q[1]>R.H+4)return;R.label(p,t,o)};
    R.grid(-8.6,6.6,-2.2,2.6,.5);
    // the source checkpoints: each recedes once it has been copied
    const srcA=i=>k===0?1:unb?(k===i+1?.95:.28):(k<=2?.85:.28);
    const S=D.src.map((s,i)=>{const l=L[i],x=D.sx[i],r=stack(R,x,l,D,{a:srcA(i),mask:{kind:'causal'}});
      lab([x,r.top,0],s.n,{fs:13,b:1,dy:-30,a:Math.max(.55,srcA(i))});
      lab([x,r.top,0],l.L+' layers · d '+l.d.toLocaleString('en-GB'),{fs:12,mono:true,c:P.mute,dy:-13,a:Math.max(.5,srcA(i)),wide:1});
      lab([x,0,DZ/2+.06],'embedding '+F(l.emb),{fs:12,c:P.c5,dy:13,a:srcA(i)*.9,wide:1});
      return {x,top:r.top,l}});
    const le=L[D.enc],ld=L[D.dec],ES=S[D.enc],DS=S[D.dec];
    // the encoder: a copy whose mask opens from causal to bidirectional
    const focusCross=k===3&&!t2,warm=unb&&k===4,tied=t2&&k===4;
    const encA=at(k,e,1)*(focusCross||warm?.3:tied?.5:1),decA=at(k,e,2)*(warm?.3:tied?.5:1);
    const open=k===1?e:k>1?1:0;
    const er=stack(R,D.ex,le,D,{a:encA,mask:{kind:'full',open,a:at(k,e,1)},embA:at(k,e,1)*(tied?1:encA>0?Math.max(encA,.3):0)});
    // the decoder: a copy, then cross-attention (copied, random or, in T5Gemma 2, none: merged into self-attention)
    const crA=k<3?0:k===3?e:1,ck=D.ci;
    const cross={kind:ck,a:ck==='ghost'?(k===3?.9*(1-e):0):crA};
    const dm=t2&&k>=3?{kind:'merged',open:k===3?e:1,a:at(k,e,2)}:{kind:'causal',a:at(k,e,2)};
    const decEmb=t2&&k>=4?(k===4?.9*(1-e)+.08:.08):at(k,e,2)*(warm?.3:1);
    const dr=stack(R,D.dx,ld,D,{a:decA,cross,mask:dm,embA:decEmb});
    if(k>=1){lab([D.ex,er.top,0],'Encoder',{fs:13,b:1,dy:-30,a:at(k,e,1)});lab([D.ex,er.top,0],'bidirectional',{fs:12,mono:true,c:P.acc,dy:-13,a:at(k,e,1),wide:1})}
    if(k>=2){lab([D.dx,dr.top,0],'Decoder',{fs:13,b:1,dy:-30,a:at(k,e,2)});lab([D.dx,dr.top,0],t2&&k>=3?'causal + encoder':'causal',{fs:12,mono:true,c:t2&&k>=3?P.c4:P.acc,dy:-13,a:at(k,e,2),wide:1})}
    const topOf=(x,tp)=>[x,tp+.05,0];
    // copy flows: attention weights (blue) and feed-forward weights (green) stream from the checkpoint into the new stack
    const copy=(from,to,a)=>{R.flowArc([from.x-.25,from.top-.3,.3],[to[0]-.25,to[1]-.3,.3],1.1,{c:P.c1,a,r:.07,speed:1.5});R.flowArc([from.x+.35,from.top-.5,-.2],[to[0]+.35,to[1]-.5,-.2],1.2,{c:P.c3,a,r:.07,speed:1.3})};
    if(k===1)copy(ES,[D.ex,EH+le.L*D.lh],e);
    if(k===2)copy(DS,[D.dx,EH+ld.L*D.lh],e);
    const dTop=EH+ld.L*D.lh,eTop=EH+le.L*D.lh,wa=ld.a*D.ws,dx0=D.dx-(ld.a+ld.f)*D.ws/2-(ck==='ghost'?0:D.cl*D.ws)/2;
    // step 4: where cross-attention comes from
    if(k===3&&ck==='copy')[.2,.5,.8].forEach(f=>{const y=EH+f*ld.L*D.lh;R.flowArc([dx0+wa*.5,y,DZ/2+.05],[dx0+wa+D.cl*D.ws*.5,y,DZ/2+.05],.35,{c:P.c4,a:e,r:.06,speed:.9,n:5})});
    if(k===3&&ck==='copy')lab([dx0+wa,dTop+.05,DZ/2],'cross-attention = a copy of self-attention',{fs:12,c:P.c4,dy:-4,al:'right',dx:-14,a:e,wide:1});
    if(k===3&&ck==='rnd'){lab([dx0+wa+D.cl*D.ws/2,EH+ld.L*D.lh*.5,DZ/2],'random: 2,304 ≠ 3,584 wide',{fs:12.5,b:1,c:P.c2,al:'right',dx:-24,a:e,wide:1});R.glow([dx0+wa+D.cl*D.ws/2,dTop*.5,DZ/2],.9,{c:P.c2,a:e*.4})}
    if(k===3&&ck==='ghost')lab([D.dx,0,DZ/2+.1],'no cross-attention weights: '+F(D.cross)+' saved',{fs:12.5,b:1,c:P.c4,dy:22,a:e,wide:1});
    // the encoder output read by the decoder (cross-attention or merged attention), from the moment the decoder can read it
    const rd=(a)=>{[.25,.55,.85].forEach((f,i)=>R.flowArc([D.ex+(le.a+le.f)*D.ws/2*.6,eTop+.02,0],[dx0+wa+(ck==='ghost'?-wa*.4:D.cl*D.ws*.5),EH+f*ld.L*D.lh,DZ/2+.05],.6+.2*i,{c:P.c4,a,r:.065,speed:1.4,n:7}))};
    if(warm){rd(e);lab([D.dx,dTop+.05,DZ/2],'warmup: cross-attention only',{fs:12.5,b:1,c:P.c4,dy:-46,a:e});lab([D.ex,eTop*.5,DZ/2],'frozen',{fs:12.5,c:P.mute,a:e});lab([D.dx+.9,dTop*.4,DZ/2],'frozen',{fs:12.5,c:P.mute,dx:30,a:e,wide:1})}
    if(t2&&k===3)rd(e*.9);
    // T5Gemma 2: tied embeddings, one table for encoder input, decoder input and decoder softmax
    if(tied){R.flowArc([D.ex+.4,EH,DZ/2],[D.dx-.4,EH,DZ/2],.8,{c:P.c5,a:e,r:.07,speed:1.2});
      lab([(D.ex+D.dx)/2,.9,DZ/2],'one table, tied: '+F(ld.emb)+' saved',{fs:12.5,b:1,c:P.c5,a:e})}
    // T5Gemma 2: the frozen SigLIP vision encoder in front of the encoder, 256 tokens per image
    if(t2&&k>=1){const va=at(k,e,1)*(k===1||k===last?1:.4);R.box(VIS,[1.25,.85,.9],{fill:mix(P.paper,P.c6,.45),a:va});
      lab([VIS[0],.85,VIS[2]],'SigLIP '+F(RCP.vision)+' · frozen',{fs:12,b:1,c:P.c6,dy:-10,a:va});
      if(k===1||k===last)R.flowArc([VIS[0]+.4,.7,VIS[2]-.2],[D.ex-.3,EH+.2,.5],.5,{c:P.c6,a:va,r:.06,speed:1.1,n:6});
      if(k===1)lab([VIS[0],0,VIS[2]+.45],'256 tokens per image',{fs:12,c:P.c6,dy:12,a:e,wide:1})}
    // last step: everything trains; the encoder output flows into the decoder
    if(k===last){rd(1);[[D.ex,eTop],[D.dx,dTop]].forEach(([x,y])=>R.glow([x,y*.5,0],1.6,{c:P.acc,a:e*.25}));
      lab([(D.ex+D.dx)/2,Math.max(eTop,dTop)+1.1,0],t2?'adapt with UL2: about 2T tokens, up to 16K long':'adapt: up to 2T tokens',{fs:12.5,b:1,c:P.acc,a:e})}
  }
  // the counters under the step list (parameters so far, copied, random, being trained), as the old 2D animation counted them
  function counts(m,k){const D=MODES[m],L=D.ls,le=L[D.enc],ld=L[D.dec],last=D.n-1;let tot=0,rndP=0,frozen=0;
    if(k>=1){tot+=le.tot;if(m==='t2'){tot+=RCP.vision;frozen+=RCP.vision}}
    if(k>=2)tot+=ld.tot;
    if(k>=3&&D.ci!=='ghost'){tot+=D.cross;if(D.ci==='rnd')rndP+=D.cross}
    if(m==='t2'&&k>=4)tot-=ld.emb;
    const copied=tot-rndP-frozen,training=k===last?'all except frozen':(m==='unb'&&k===4?'cross-attention only':'none yet');
    return stat('Encoder-decoder so far',tot?F(tot):'0','parameters, embeddings included')+stat('Copied from the checkpoint',F(copied),'no new knowledge needed')+
      stat('Starting random',F(rndP),rndP?'needs the warmup':'')+stat('Being trained',training,k===last?(m==='t2'?'UL2, about 2T tokens':'up to 2T tokens'):'')}
  window.ADS={MODES,counts,F}; // read by check_stages.mjs against the step lists
  const full=m=>m==='unb'?{cam:[.32,.36],bounds:[[-8.6,0,-.7],[6.2,4.5,.9]]}:m==='t2'?{cam:[.32,.36],bounds:[[-6.1,0,-.7],[6,4.3,2.2]]}:{cam:[.32,.36],bounds:[[-6.1,0,-.7],[6,4.3,.9]]};
  const st=S3.stage({id:'stg-ad',list:'sx-ad-bal',fig:'Fig. 1 · adapting a decoder-only checkpoint',cam:full('bal').cam,bounds:()=>full(MODE).bounds,aspect:.5,dur:1500,hold:4800,draw,
    view:k=>{const D=MODES[MODE];
      if(k===0)return MODE==='unb'?{cam:[.3,.36],bounds:[[-8.6,0,-.7],[-1.6,4.6,.9]]}:{cam:[.3,.36],bounds:[[-6,0,-.7],[-2.6,4.3,.9]]};
      if(k===3)return {cam:[.42,.34],bounds:[[D.dx-2.5,0,-.7],[D.dx+2.5,4.3,.9]]};
      return full(MODE)},
    onStep:k=>{const c=document.getElementById('adCnt');if(c)c.innerHTML=counts(MODE,k)}});
  const seg=document.getElementById('adM');
  if(seg&&st)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    MODE=b.dataset.m;['bal','unb','t2'].forEach(m=>{const L=document.getElementById('sx-ad-'+m);if(L)L.hidden=m!==MODE});st.list('sx-ad-'+MODE)}));
})();
