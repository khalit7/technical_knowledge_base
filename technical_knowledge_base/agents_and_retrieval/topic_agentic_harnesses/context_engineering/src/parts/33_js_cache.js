// ---- Cache lab: a block-level simulator of Anthropic's documented prompt-caching rules ----
(function(){
const root=document.getElementById('t-cache');if(!root)return;
const H=window.HCTX,E=RD.esc,$=id=>document.getElementById(id);
const fmt=n=>Math.round(n).toLocaleString('en-US');
const MODELS={haiku:{name:'Haiku 4.5',min:4096,inp:1,out:5,read:0.1},sonnet:{name:'Sonnet 5.5',min:512,inp:2,out:10,read:0.1}};
// block sizes from the static recorded run: 8,344 tokens shared with other sessions (tools + fixed system),
// 3,855 more of system prompt, 1,111 of first user message; the split of the 8,344 between tools and system is not observable
const BASE={tools:6300,sysS:2044,sysD:3855,u0:1111,asst:150,pre:true};
function simulate(o){
  const M=MODELS[o.model],ttl=o.ttl,wMult=ttl===300?1.25:2,cache=new Map(),calls=[];
  const key=(ids,k)=>ids.slice(0,k+1).join('|');
  let t=0;
  for(let i=0;i<o.n;i++){
    const B=[];
    const tv=(o.vol==='tools6'&&i>=5)?'b':'a';
    B.push({id:'tools'+tv,tok:o.tools+(tv==='b'?300:0),nm:'tools'});
    B.push({id:'sysS',tok:o.sysS,nm:'system'});
    B.push({id:'sysD'+(o.vol==='sys'?'@'+i:''),tok:o.sysD+(o.vol==='sys'?13:0),nm:'system',v:o.vol==='sys'});
    if(o.loop){ // the whole transcript as one block that changes every call
      let tok=o.u0;for(let j=1;j<=i;j++)tok+=o.asst+o.rs+20*o.xb;
      B.push({id:'H@'+i,tok,nm:'history',v:false});
    }else{
      B.push({id:'u0',tok:o.u0+((o.vol==='last'&&i===0)?13:0),nm:'task',v:o.vol==='last'&&i===0});
      for(let j=1;j<=i;j++){
        B.push({id:'a'+j,tok:o.asst,nm:'reply '+j});
        for(let x=0;x<o.xb;x++)B.push({id:'x'+j+'_'+x,tok:20,nm:'extra'});
        B.push({id:'r'+j,tok:o.rs+((o.vol==='last')?13:0),nm:'result '+j,v:o.vol==='last'&&j===i});
      }
    }
    const ids=B.map(b=>b.id),pre=[];let acc=0;B.forEach(b=>{acc+=b.tok;pre.push(acc)});const total=acc;
    if(i===0&&o.pre){cache.set(key(['toolsa','sysS'],1),ttl)}
    const bps=o.bp==='none'?[]:o.bp==='two'?[2,B.length-1]:[B.length-1];
    let best=-1;
    bps.forEach(b=>{for(let p=b;p>=Math.max(0,b-19);p--){const e=cache.get(key(ids,p));if(e!==undefined&&e>=t){best=Math.max(best,p);break}}});
    if(best>=0)cache.set(key(ids,best),t+ttl);
    const read=best>=0?pre[best]:0;let wEnd=read;
    bps.forEach(b=>{if(b>best&&pre[b]>=M.min){cache.set(key(ids,b),t+ttl);wEnd=Math.max(wEnd,pre[b])}});
    const write=wEnd-read,lastBp=bps.length?pre[bps[bps.length-1]]:0,fresh=total-Math.max(wEnd,read);
    const usd=(read*M.inp*M.read+write*M.inp*wMult+fresh*M.inp+o.asst*M.out)/1e6,base=(total*M.inp+o.asst*M.out)/1e6;
    calls.push({B,pre,read,write,fresh,total,usd,base,bps,best,wEnd,t});
    t+=o.gap;
  }
  return calls;
}
const st={o:null,calls:[]};
function opts(){return Object.assign({},BASE,st.extra||{},{vol:$('hcc-vol').value,bp:$('hcc-bp').value,model:$('hcc-model').value,ttl:+$('hcc-ttl').value,gap:+$('hcc-gap').value,xb:+$('hcc-xb').value,rs:+$('hcc-rs').value,n:+$('hcc-n').value})}
function labels(){$('hcc-gapv').textContent=$('hcc-gap').value+' s';$('hcc-xbv').textContent=$('hcc-xb').value;$('hcc-rsv').textContent=fmt(+$('hcc-rs').value);$('hcc-nv').textContent=$('hcc-n').value}
function drawReq(c){
  const el=$('hcc-req');let h='';
  c.B.forEach((b,k)=>{const end=c.pre[k],start=end-b.tok;
    const cls=end<=c.read?'r':start<c.wEnd?'w':'f';
    const w=Math.round(6+12*Math.log10(Math.max(10,b.tok)));
    h+='<span class="'+cls+(b.v?' v':'')+(c.bps.includes(k)?' bp':'')+'" style="width:'+w+'px" title="'+E(b.nm)+': '+fmt(b.tok)+' tokens'+(c.bps.includes(k)?', breakpoint':'')+'">'+(w>40?E(b.nm):'')+'</span>';});
  el.innerHTML=h;
}
function drawChart(upto){
  const el=$('hcc-chart'),W=RD.width(el),h=200,pl=48,pr=48,pt=12,pb=22,iw=W-pl-pr,ih=h-pt-pb,C=st.calls,n=C.length;
  const max=Math.max(...C.map(c=>c.total))*1.05,bw=Math.max(3,Math.min(26,iw/n*0.7)),x=i=>pl+iw*(i+0.5)/n,y=v=>pt+ih*(1-v/max);
  let cum=0,cb=0;const cums=C.map(c=>{cum+=c.usd;cb+=c.base;return [cum,cb]});const cmax=cums[n-1][1]*1.05||1,yc=v=>pt+ih*(1-v/cmax);
  let g='';
  [0,0.5,1].forEach(f=>{g+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(max/1.05*f)+'" y2="'+y(max/1.05*f)+'" stroke="var(--line)"/>'+RD.t(pl-4,y(max/1.05*f)+4,Math.round(max/1.05*f/1000)+'k',{a:'end',fs:10,fill:'var(--mute)'})+RD.t(W-pr+4,yc(cmax/1.05*f)+4,'$'+(cmax/1.05*f).toFixed(3),{fs:10,fill:'var(--mute)'})});
  C.forEach((c,i)=>{if(i>upto)return;let y0=y(0);[['read','var(--c1)'],['write','var(--c5)'],['fresh','var(--c2)']].forEach(([k2,col])=>{const v=c[k2];if(!v)return;const hh=ih*v/max;g+='<rect x="'+(x(i)-bw/2)+'" y="'+(y0-hh)+'" width="'+bw+'" height="'+hh+'" fill="'+col+'"/>';y0-=hh})});
  const pts=k2=>cums.slice(0,upto+1).map((v,i)=>x(i)+','+yc(v[k2])).join(' ');
  g+='<polyline points="'+pts(1)+'" fill="none" stroke="var(--mute)" stroke-dasharray="4 3" stroke-width="1.5"/><polyline points="'+pts(0)+'" fill="none" stroke="var(--ink)" stroke-width="1.8"/>';
  g+=RD.t(pl,h-5,'calls →',{fs:10,fill:'var(--mute)'});
  el.innerHTML=RD.svg(W,h,g,'Tokens per call and cumulative cost');
}
function draw(i){
  const c=st.calls[i];if(!c)return;drawReq(c);drawChart(i);
  const M=MODELS[st.o.model];
  $('hcc-cap').innerHTML='<div class="t">Call '+(i+1)+' of '+st.calls.length+' (t = '+fmt(c.t)+' s): '+fmt(c.total)+' tokens</div><p>Read '+fmt(c.read)+', wrote '+fmt(c.write)+', fresh '+fmt(c.fresh)+'. '+
   (c.best<0?(c.total<M.min&&st.o.bp!=='none'?'Nothing cached: the prompt is below the '+fmt(M.min)+'-token minimum.':'No earlier entry within reach: everything up to the breakpoint is written again.'):'The longest matching entry ends at block '+(c.best+1)+' of '+c.B.length+'.')+
   ' This call: $'+c.usd.toFixed(5)+' against $'+c.base.toFixed(5)+' uncached.</p>';
  let cum=0,cb=0,rd=0,inp=0;st.calls.slice(0,i+1).forEach(x=>{cum+=x.usd;cb+=x.base;rd+=x.read;inp+=x.total});
  $('hcc-out').innerHTML=RD.stat('Cost so far','$'+cum.toFixed(4),'API-price equivalent, '+M.name)+RD.stat('Without caching','$'+cb.toFixed(4),'every input token at the base price')+RD.stat('Read from cache',(inp?Math.round(100*rd/inp):0)+'%','of input tokens so far');
}
let A=null;
function run(){labels();st.o=opts();st.calls=simulate(st.o);if(A){A.reset(st.calls.length);A.go(RD.RM?st.calls.length-1:0);if(!RD.RM)A.play()}}
['hcc-vol','hcc-bp','hcc-model','hcc-ttl'].forEach(id=>$(id).addEventListener('change',()=>{st.extra=null;run()}));
['hcc-gap','hcc-xb','hcc-rs','hcc-n'].forEach(id=>$(id).addEventListener('input',()=>{run()}));
const PRE={
  cc:{vol:'none',bp:'auto',model:'haiku',ttl:3600,gap:8,xb:0,rs:600,n:12,extra:null},
  loop:{vol:'none',bp:'auto',model:'haiku',ttl:3600,gap:8,xb:0,rs:600,n:12,extra:{loop:true,pre:false}},
  lookback:{vol:'none',bp:'auto',model:'haiku',ttl:3600,gap:8,xb:25,rs:600,n:12,extra:null},
  pause:{vol:'none',bp:'auto',model:'haiku',ttl:300,gap:360,xb:0,rs:600,n:12,extra:null}};
$('hcc-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=PRE[b.dataset.p];
  $('hcc-vol').value=p.vol;$('hcc-bp').value=p.bp;$('hcc-model').value=p.model;$('hcc-ttl').value=p.ttl;$('hcc-gap').value=p.gap;$('hcc-xb').value=p.xb;$('hcc-rs').value=p.rs;$('hcc-n').value=p.n;st.extra=p.extra;run()});
labels();st.o=opts();st.calls=simulate(st.o);
A=RD.anim({tab:'t-cache',card:'hcc-card',ctl:'hcc-ctl',n:st.calls.length,start:RD.RM?st.calls.length-1:0,ms:1100,label:'Call',draw});
RD.onResize(()=>A.redraw(),'t-cache');
// check table: where the cached read stops, predicted by the rules against the recordings (first two calls of each variant)
(function(){
  const el=$('hcc-check');if(!el)return;
  const meas=v=>H.cache.filter(c=>c.variant===v).sort((a,b)=>a.i-b.i);
  // independent prediction of the read boundary for a first call and a repeat call
  const shared=BASE.tools+BASE.sysS,all=BASE.tools+BASE.sysS+BASE.sysD+BASE.u0;
  const R=[['static','Static',[shared,all],'by construction'],['tssys','Time in system prompt',[shared,shared],'independent'],['tsuser','Time in user message',[shared+BASE.sysD,shared+BASE.sysD],'independent (the static runs had already cached this system prompt)'],['tools5','One tool fewer',[0,null],'independent']];
  el.innerHTML='<thead><tr><th>Variant</th><th class="num">Read, call 1: rules</th><th class="num">recorded</th><th class="num">Read, call 2: rules</th><th class="num">recorded</th><th>How</th></tr></thead><tbody>'+
   R.map(([v,n,p,how])=>{const m=meas(v);const pr2=v==='tools5'?'all of call 1':fmt(p[1]);
     const ok1=p[0]===m[0].cr,ok2=v==='tools5'?m[1].cr===m[0].cw:p[1]===m[1].cr;
     return '<tr><td>'+n+'</td><td class="num">'+fmt(p[0])+'</td><td class="num">'+fmt(m[0].cr)+(ok1?' &#10003;':' &#10007;')+'</td><td class="num">'+pr2+'</td><td class="num">'+fmt(m[1].cr)+(ok2?' &#10003;':' &#10007;')+'</td><td>'+how+'</td></tr>'}).join('')+'</tbody>';
})();
})();
