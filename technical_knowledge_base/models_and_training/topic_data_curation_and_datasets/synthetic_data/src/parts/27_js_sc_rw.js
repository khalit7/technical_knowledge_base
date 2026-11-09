// ---- Scene (Reading 3, Fig. 2): one real page through WRAP's four rephrasing prompts, from the page's recorded run (window.SY.rephrase_smoke: Qwen3-4B
// outputs for two running-example pages; SY.rephrase_stats: all 200 pages). Every word is a cube, laid 12 by 8 a layer, so a block's height is its length;
// a word inside a four-word sequence copied from the page is teal, a reworded or new word white, a name of the page (a capitalised word after a lower-case one, SYRE.stats' proxy) gold. ----
(function(){
  if(!document.getElementById('stg-rw')||!window.SY||!SY.rephrase_smoke||!window.SYT||!window.SYRE)return;const {at,lerp,mix,cl}=S3;
  const R0=SY.rephrase_smoke,STY=['easy','medium','hard','qa'],SN={easy:'Easy',medium:'Medium',hard:'Hard',qa:'Q/A'},ST=SY.rephrase_stats.styles;
  const docs=[...new Set(R0.map(r=>r.id))];let di=0;
  const WRE=/[A-Za-z0-9]+(?:'[a-z]+)?/g,CAP=/(?<=[a-z,;] )[A-Z][a-z]+/g;
  const toks=t=>(String(t).match(WRE)||[]);
  // per word: copied (inside a 4-gram of the source) and name (one of the source's names)
  function words(src,out){const sw=toks(src).map(w=>w.toLowerCase()),set=new Set();for(let i=0;i+4<=sw.length;i++)set.add(sw.slice(i,i+4).join(' '));
    const names=new Set(src.match(CAP)||[]);
    if(out==null)return toks(src).map(w=>({cp:0,nm:names.has(w)}));
    const oo=toks(out),ow=oo.map(w=>w.toLowerCase()),cov=new Array(ow.length).fill(false);
    for(let i=0;i+4<=ow.length;i++)if(set.has(ow.slice(i,i+4).join(' ')))for(let k=i;k<i+4;k++)cov[k]=true;
    return oo.map((w,i)=>({cp:cov[i],nm:names.has(w)}))}
  let D=null;
  function prep(){const id=docs[di],src=R0.find(x=>x.id===id).source,url=R0.find(x=>x.id===id).url;
    D={host:(()=>{try{return new URL(url).hostname}catch(e){return ''}})(),src:words(src),st:STY.map(s=>{const r=R0.find(x=>x.id===id&&x.style===s);return {w:words(src,r.output),s:SYRE.stats(src,r.output)}}),ss:SYRE.stats(src,src)}}
  prep();
  const PT=.15,CS=.12,COLS=12,ROWS=8,PER=COLS*ROWS,XS=[-3.3,-1.1,1.1,3.3],ZS=2.1,ZP=.55,ZO=-1.05;
  const slot=(i,x,z)=>{const l=Math.floor(i/PER),m=i%PER;return [x+(m%COLS-(COLS-1)/2)*PT,l*PT,z+(Math.floor(m/COLS)-(ROWS-1)/2)*PT]};
  const hOf=n=>Math.ceil(n/PER)*PT;
  const stag=(e,i,n)=>cl(e*1.8-(i/n)*.8,0,1);
  function block(R,W,x,z,a,grow){const P=R.P,cpc=mix(P.paper,P.c6,.75),nmc=mix(P.paper,P.c5,.95);
    W.forEach((w,i)=>{const t=grow==null?1:stag(grow,i,W.length);if(t<=0)return;R.box(slot(i,x,z),[CS,CS*t,CS],{fill:w.nm?nmc:w.cp?cpc:P.paper,a:a*Math.min(1,t*1.5),shadow:false,lw:.45})})}
  const pc=x=>x==null?'n/a':Math.round(100*x)+'%';
  function draw(R,k,e){const P=R.P;R.grid(-4.8,4.8,-2.6,3.4,.5);
    const fade=k===4?.08:1;
    // the page
    block(R,D.src,0,ZS,k===0?1:k===4?.1:.8,k===0?e:null);
    if(k<4){R.label([0,0,ZS+.65],D.host+' · '+D.src.length+' words',{mono:true,fs:12.5,b:1,dy:16,a:k===0?cl(e*2-.6,0,1):1});
      R.label([0,0,ZS+.65],D.ss.nc+' names in gold',{mono:true,fs:12,dy:32,c:P.c5,a:k===0?cl(e*2-.6,0,1):1})}
    // the four prompts
    const pa=k===0?0:k===1?Math.min(1,e*1.6):k===4?.1:.75;
    XS.forEach((x,i)=>{R.glass([x-.85,.05,ZP],[1.7,0,0],[0,.95,0],{c:P.c1,a:pa,nu:6,nv:3});
      if(k>=1&&k<4)R.label([x,0,ZP+.05],SN[STY[i]],{mono:true,fs:13,b:1,dy:15,c:P.c1,a:k===1?pa:(k===2&&i<2)||(k===3)?1:.55});
      if(k===1)R.flowArc([x*.25,.35,ZS-.65],[x,.45,ZP+.05],.55,{c:P.c6,a:.85*pa,r:.06,speed:1.3,n:8})});
    // the rewrites: Easy and Medium at step 3, Hard and Q/A at step 4
    XS.forEach((x,i)=>{const on=k>=2&&i<2||k>=3;if(!on)return;const grow=(k===2&&i<2)||(k===3&&i>=2)?e:null,O=D.st[i];
      block(R,O.w,x,ZO,fade,grow);if(grow!=null)R.flowArc([x,.5,ZP],[x,.3,ZO+.5],.35,{c:P.c6,a:.8,r:.055,speed:1.2,n:6});
      if(k<4){const la=grow!=null?cl((e-.85)/.15,0,1):1,top=hOf(O.w.length);
        R.label([x,top,ZO-.55],O.w.length+(R.W<520?'':' words'),{mono:true,fs:12.5,b:1,dy:-46,a:la});
        R.label([x,top,ZO-.55],pc(O.s.copied)+' copied',{wide:1,mono:true,fs:12,dy:-30,c:P.c6,a:la});
        R.label([x,top,ZO-.55],Math.round(O.s.names*O.s.nc)+' of '+O.s.nc+' names',{wide:1,mono:true,fs:12,dy:-14,c:P.c5,a:la})}});
    // all 200 pages: numbers kept, names kept and new four-word phrases per style
    if(k===4){XS.forEach((x,i)=>{const s=ST[STY[i]],V=[[s.num_kept,mix(P.paper,P.c5,.9),P.c5],[s.names_kept,mix(P.paper,P.c4,.55),P.c4],[s.novel4,P.paper,P.ink]],la=cl((e-.85)/.15,0,1);
        V.forEach(([v,f,c],j)=>{const bx=x+(j-1)*.55,h=v*1.6*e;R.box([bx,0,.1],[.46,.04,.46],{a:1,shadow:false});R.box([bx,.04,.1],[.32,Math.max(.01,h),.32],{fill:f});
          R.label([bx,h+.04,.1],(100*v).toFixed(0)+'%',{mono:true,fs:12.5,b:1,dy:-11,c,a:la,wide:j>0})});
        R.label([x,0,.5],SN[STY[i]],{mono:true,fs:13,b:1,dy:16,c:P.c1})});
      R.label([0,2.1,.1],'all 200 pages: numbers kept · names kept · new 4-word phrases',{wide:1,mono:true,fs:12.5,b:1,dy:-6,c:P.ink,a:e})}
  }
  const full={cam:[.05,.68],bounds:[[-4.3,0,-1.7],[4.3,.7,2.8]]};
  const api=S3.stage({id:'stg-rw',list:'sx-rw',fig:'Fig. 2 · one page, four rephrasing prompts',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1700,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[30,16,18,16],
    view:k=>k===0?{cam:[.08,.62],bounds:[[-1.8,0,1.2],[1.8,.6,3.0]]}:k===4?{cam:[.05,.45],bounds:[[-4.3,0,-.5],[4.3,2.2,1.0]]}:k===1?{cam:[.05,.66],bounds:[[-4.3,0,.1],[4.3,1.0,2.9]]}:full});
  const ch=document.getElementById('sy-rw-doc');
  if(ch&&api){ch.innerHTML=docs.map((d,i)=>{const r=R0.find(x=>x.id===d);let h='';try{h=new URL(r.url).hostname}catch(e){}return '<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+RD.esc(h)+'</button>'}).join('');
    RD.seg(ch,m=>{di=+m;prep();api.list('sx-rw')})}
})();
