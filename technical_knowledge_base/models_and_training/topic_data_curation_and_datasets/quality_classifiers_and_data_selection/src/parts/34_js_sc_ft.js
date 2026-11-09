// ---- Scene (Reading 1, Fig. 1): one real run0 page scored by fastText, step by step (renderer v2) ----
// The page's first tokens as tiles: on the glass page as text, then in reading order on a white plinth; each token's word push stands up
// (toward high quality) or hangs down (toward crawl), the bigram push stacks on it, everything flows into one averaged logit, and a glass
// plane at the cut decides. Every number is window.QC.a1 (the hand rebuild of fastText from the model files, src/scripts/qc_ftexplain.py).
(function(){
  if(!document.getElementById('stg-ft')||!window.S3||!window.QC||!QC.a1)return;const {at,lerp,mix,cl}=S3;
  const A=QC.a1,esc=RD.esc,f2=x=>(Math.abs(x)>=100?x.toFixed(0):Math.abs(x)>=10?x.toFixed(1):x.toFixed(2));
  const nf=x=>Math.round(x).toLocaleString('en-GB'),sg=x=>(x<0?'−':'')+f2(Math.abs(x)).replace(/^(\d{4,})/,m=>(+m).toLocaleString('en-GB'));
  const st={doc:A.docs[0].key,mod:A.models[0].key};window.QCFT=st;
  const cur=()=>A.ex[st.doc][st.mod],model=()=>A.models.find(m=>m.key===st.mod);
  const lg=p=>Math.log(p/(1-p));
  // one logit scale for every page and classifier, so switching the page shows a real change in the verdict
  let LM=0;Object.values(A.ex).forEach(d=>Object.values(d).forEach(e=>{LM=Math.max(LM,Math.abs(e.logit))}));A.models.forEach(m=>{LM=Math.max(LM,Math.abs(lg(m.cut)))});
  const NC=14,PX=.42,X0=-4.1,Z0=-1.1,YP=1.15,HM=1.0,XL=3.3,ZPG=-2.75,HL=2.4,LO=-Math.ceil(LM+1),HI=2;
  // where each tile sits: on the upright page (wrapped like text, as wide as its characters) and in the reading-order grid
  function layout(e){const n=e.toks.length,cw=.052,lw=6.1,lh=.2,pos=[];let x=0,y=0;
    e.toks.forEach(t=>{const w=Math.max(.06,Math.min(1.2,t.length*cw));if(x+w>lw){x=0;y++}pos.push({px:X0-.2+x+w/2,py:2.55-y*lh,pw:w,gx:X0+(pos.length%NC)*PX+PX/2,gz:Z0+Math.floor(pos.length/NC)*PX+PX/2});x+=w+cw});
    let VM=0;e.toks.forEach((_,i)=>{VM=Math.max(VM,Math.abs(e.uni[i]||0)+Math.abs(e.big[i]))});return {pos,VM:VM||1,rows:Math.ceil(n/NC)}}
  let L=null,Lkey='';
  const lay=()=>{const k=st.doc+'|'+st.mod;if(k!==Lkey){L=layout(cur());Lkey=k}return L};
  function draw(R,k,e){const P=R.P,E=cur(),M=model(),Y=lay(),n=E.toks.length,nw=R.W<520;R.grid(-5,5,-3.4,3.2,.5);
    const fieldA=k>=5?.12:k>=4?.3:1,mv=k===1?e:k>=1?1:0; // tiles leave the page at step 2
    // the glass page (step 1), then the two lookup tables
    R.glass([X0-.35,.15,ZPG],[6.4,0,0],[0,2.6,0],{c:P.c1,a:k===0?.9:k===1?.9*(1-e):0,nu:8,nv:6});
    if(k===0)R.label([X0+2.9,2.75,ZPG],'the extracted page',{fs:12.5,b:1,c:P.c1,dy:-8});
    const pl=(x,c,a,t1,t2)=>{if(a<=.01)return;R.glass([x-.75,.1,ZPG],[1.5,0,0],[0,1.9,0],{c,a,nu:4,nv:10});R.label([x,2.0,ZPG],t1,{fs:12.5,b:1,c,dy:-8,a});if(t2)R.label([x,2.0,ZPG],t2,{fs:12,c:P.mute,dy:-24,a,wide:1})};
    const ta=k===2?at(k,e,2):k===3?.35:0,ba=k===3?at(k,e,3):0;
    pl(-2.3,P.c3,ta,'word rows',M.key==='dclm'?'3,777,339 words × 100':'vocabulary × 100');
    pl(.3,P.c5,ba,'bigram buckets',M.key==='dclm'?'2,000,000 × 100':'500,000 × 100');
    // the plinth under the reading-order grid
    const gw=NC*PX,gd=Y.rows*PX;if(mv>0)R.glass([X0-.06,YP-.03,Z0-.06],[gw+.12,0,0],[0,0,gd+.12],{c:P.mute,a:mv*fieldA*.8,nu:NC,nv:Y.rows}); // a see-through plinth, so the bars hanging toward crawl stay visible
    // strongest pushes, named
    const tot=i=>(k>=3?(E.uni[i]||0)+E.big[i]:(E.uni[i]||0));
    const named=k>=2&&k<=3?[...E.toks.keys()].filter(i=>E.uni[i]!==null||k>=3).sort((a,b)=>tot(b)-tot(a)):[];
    const uniq=a=>{const seen=new Set();return a.filter(i=>{const t=E.toks[i];if(seen.has(t))return false;seen.add(t);return true})};
    const top=new Set(uniq(named).slice(0,3).concat(uniq(named.slice().reverse()).slice(0,3)));
    E.toks.forEach((t,i)=>{const p=Y.pos[i],u=E.uni[i],b=E.big[i],oov=u===null;
      const x=lerp(p.px,p.gx,mv),y=lerp(p.py,YP,mv),z=lerp(ZPG+.06,p.gz,mv),w=lerp(p.pw,PX*.74,mv),d=lerp(.04,PX*.74,mv),h0=lerp(.13,.05,mv);
      if(k<2){R.box([x,y-(k===0?.065:0)*(1-mv),z],[w,h0,d],{fill:mix(P.paper,P.ink,.08),a:1,shadow:false,lw:.5});return}
      // word push (step 3), then the bigram share stacked on it (step 4)
      const g=k===2?e:1,s=HM/Y.VM;let hw=(oov?0:Math.abs(u))*s*g;const up=oov||u>=0;
      if(oov)R.box([x,YP,z],[w,.03,d],{fill:mix(P.paper,P.mute,.35),a:.55*fieldA,shadow:false,lw:.4});
      else if(hw>.004)R.box([x,up?YP:YP-.05-hw,z],[w,hw,d],{fill:mix(P.paper,up?P.good:P.bad,.72),a:fieldA,shadow:false,lw:.5});
      if(k>=3){const gb=k===3?e:1,hb=Math.abs(b)*s*gb,same=oov||(b>=0)===up;if(hb>.004){
        if(same||hb<=hw){const base=same?(up?YP+hw:YP-.05-hw-hb):(up?YP+hw-hb:YP-.05-hw);const yb=oov?(b>=0?YP:YP-.05-hb):base;R.box([x,yb,z],[w*.9,hb,d*.9],{fill:mix(P.paper,P.c5,.8),a:fieldA*(same?1:.45),shadow:false,lw:.4})}}}
      if(top.has(i)&&!nw){const v=tot(i),hh=Math.abs(v)*s;R.label([x,v>=0?YP+hh:YP-.05-hh,z],t.length>14?t.slice(0,13)+'…':t,{mono:true,fs:12,dy:v>=0?-10:14,c:v>=0?P.good:P.bad,grp:'tok',a:k===2?e:1})}
      // features streaming in from their table
      if(k===2&&!oov&&top.has(i))R.flowArc([-2.3,1.3,ZPG+.1],[x,YP+.05,z],.6,{c:P.c3,a:.8,r:.05,n:6,speed:1.3});
      if(k===3&&top.has(i))R.flowArc([.3,1.3,ZPG+.1],[x,YP+.05,z],.6,{c:P.c5,a:.8,r:.05,n:6,speed:1.3});
    });
    if(k===1)R.label([X0+gw/2,YP,Z0+gd+.1],nf(E.ntok)+' tokens · the first '+n+' drawn',{fs:12.5,b:1,dy:18,c:P.ink,a:e});
    if(k>=2&&k<=3){const tw=E.nU+(k>=3?E.nB:0),tv=E.sumU+(k>=3?E.sumB:0);R.label([X0+gw/2,YP,Z0+gd+.1],(k===2?nf(E.nU)+' word features · push '+sg(E.sumU):nf(E.nB)+' bigrams · push '+sg(E.sumB)),{fs:12.5,b:1,dy:18,c:P.ink,a:k===2?e:1})}
    // the averaged logit as a column on a logit axis (its top is the logit), and the cut as a glass plane at the cut's logit
    if(k>=4){const a=k===4?e:1,yl=l=>(l-LO)/(HI-LO)*HL,h=yl(E.logit)*a,kept=E.p>=M.cut,col=k>=5?(kept?P.good:P.bad):P.c1;
      R.box([XL-.5,0,0],[.04,HL,.04],{a:a*.9,shadow:false});
      [LO+1,-10,-5,0].forEach(t=>{if(t<LO||t>HI)return;R.box([XL-.5,yl(t),0],[.14,.02,.04],{a,shadow:false});R.label([XL-.58,yl(t),0],String(t).replace('-','\u2212'),{al:'right',dx:-4,mono:true,fs:12,c:P.mute,a,grp:'ax'})});
      R.box([XL,0,0],[.7,Math.max(.01,h),.7],{fill:mix(P.paper,col,.75),a});
      if(k===4)R.flow([[X0+gw,YP+.3,Z0+gd/2],[XL-1.2,YP+.9,0],[XL,h+.1,0]],{c:P.c1,a:.85,r:.07,n:10,speed:1.2});
      R.label([XL+.36,h,0],'logit '+sg(E.logit),{al:'left',dx:6,mono:true,fs:13,b:1,c:k>=5?col:P.ink,a,grp:'col'});
      if(k===4)R.label([XL,0,.4],'(push '+sg(E.sumU+E.sumB)+') / '+nf(E.nU+E.nB),{mono:true,fs:12,dy:18,c:P.mute,a,wide:1});
      if(k>=5){const yc=yl(lg(M.cut));R.glass([XL-.75,yc,-.75],[1.5,0,0],[0,0,1.5],{c:P.c2,a:.75*e+.1,nu:4,nv:4});
        R.label([XL+.76,yc,0],'cut '+M.cut.toPrecision(3),{al:'left',dx:6,mono:true,fs:12,c:P.c2,a:e,grp:'col'});
        R.label([XL,0,.4],(kept?'kept':'dropped')+' · P = '+(E.p<.001?E.p.toExponential(1):E.p.toFixed(3)),{fs:13,b:1,dy:18,c:col,a:e})}}
  }
  // the live readout beside the steps: the page's text (step 1) or its tokens coloured by push, and the counters
  const view=document.getElementById('qc-a1-view'),cnt=document.getElementById('qc-a1-cnt');
  function col(v,on){if(!on)return 'transparent';const a=Math.min(1,Math.abs(v)/A.scale);return v>=0?'rgba(63,160,90,'+(0.12+0.6*a).toFixed(2)+')':'rgba(214,100,60,'+(0.12+0.6*a).toFixed(2)+')'}
  function readout(i){const e=cur(),m=model();if(!view)return;
    if(i===0){view.innerHTML='<div class="rd-doc">'+esc(A.docs.find(d=>d.key===st.doc).text)+'</div>'}
    else{let h='<div class="rd-doc" style="line-height:1.9">';
      e.toks.forEach((t,k)=>{const u=e.uni[k],b=e.big[k],v=i<2?0:(i===2?(u===null?0:u):((u===null?0:u)+b)),oov=i>=2&&u===null;
        h+='<span title="'+(u===null?'not in vocabulary':'word push '+f2(u))+(i>=3?', bigram share '+f2(b):'')+'" style="display:inline-block;max-width:100%;overflow-wrap:anywhere;padding:0 2px;border-radius:3px;margin:0 3px 2px 0;background:'+col(v,i>=2)+(oov?';color:var(--mute);text-decoration:line-through':'')+'">'+esc(t)+'</span>'});
      if(e.more)h+='<span class="mute"> ... '+e.more+' more tokens</span>';view.innerHTML=h+'</div>'}
    let c=RD.stat('Tokens',e.ntok,'incl. &lt;/s&gt;');
    if(i>=2)c+=RD.stat('Word features',e.nU,'push total '+f2(e.sumU));
    if(i>=3)c+=RD.stat('Bigram features',e.nB,'push total '+f2(e.sumB));
    if(i>=4)c+=RD.stat('Logit',f2(e.logit),'('+f2(e.sumU)+' + '+f2(e.sumB)+') / '+(e.nU+e.nB));
    if(i>=5)c+=RD.stat('P(high quality)',e.p<0.001?e.p.toExponential(1):e.p.toFixed(3),'cut '+m.cut.toPrecision(3)+': <b style="color:'+(e.p>=m.cut?'var(--good)">kept':'var(--bad)">dropped')+'</b>');
    cnt.innerHTML=c}
  // the step list's numbers for the chosen page and classifier
  function fill(){const e=cur(),m=model(),kept=e.p>=m.cut,V={ntok:nf(e.ntok),shown:String(e.toks.length),nU:nf(e.nU),sumU:sg(e.sumU),nB:nf(e.nB),sumB:sg(e.sumB),
      avg:'('+sg(e.sumU)+' + '+sg(e.sumB)+') / '+nf(e.nU+e.nB)+' = '+sg(e.logit),
      verdict:'Here P = '+(e.p<.001?e.p.toExponential(1):e.p.toFixed(3))+' against the cut '+m.cut.toPrecision(3)+': '+(kept?'kept':'dropped')+' by '+m.label+'.'};
    document.querySelectorAll('#sx-ft .ft-v').forEach(s=>{s.textContent=V[s.dataset.k]})}
  const segD=document.getElementById('qc-a1-doc'),segM=document.getElementById('qc-a1-mod');
  segD.innerHTML=A.docs.map((d,i)=>'<button data-m="'+d.key+'"'+(i?'':' class="on"')+'>'+esc(d.label)+'</button>').join('');
  segM.innerHTML=A.models.map((m,i)=>'<button data-m="'+m.key+'"'+(i?'':' class="on"')+'>'+esc(m.label)+'</button>').join('');
  window.QCFTS={layout,LM,lg}; // for src/check_stages.mjs
  const sg2=S3.stage({id:'stg-ft',list:'sx-ft',fig:'Fig. 1 · one real page through fastText',cam:[.32,.62],bounds:[[-4.4,0,-3.0],[4.7,2.9,3.0]],aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[22,16,22,16],onStep:k=>{try{readout(k)}catch(err){}},
    view:k=>k===0?{cam:[.2,.28],bounds:[[-4.6,.1,-2.9],[2.4,2.9,-2.5]]}:k===1?{cam:[.15,.6],bounds:[[-4.3,0,-1.3],[1.9,1.6,3.3]]}:k===2||k===3?{cam:[.3,.38],bounds:[[-4.4,0,-3.0],[1.8,2.6,3.0]]}:k===4?{cam:[.35,.45],bounds:[[-4.4,0,-2.0],[4.4,2.6,3.2]]}:{cam:[.4,.16],bounds:[[1.9,0,-.9],[5.0,2.6,.9]]}});
  RD.seg(segD,v=>{st.doc=v;fill();readout(sg2.st.k);sg2.draw()});RD.seg(segM,v=>{st.mod=v;fill();readout(sg2.st.k);sg2.draw()});
  fill();readout(0);
})();
