// ---- Scene (sharing a scale, Fig. 2): four real rows x 64 input columns of Qwen2.5-0.5B layer 8 q_proj under five scopes (renderer v2) ----
// Data: QV.scope() (the shipped rows 223, 222, 448 and 0, quantised by QF.qgroup, the exact port of qformats.py; visuals_ref.py checks it).
// Each row is a white plinth with its 64 weights as signed bars (up positive, down negative), heights proportional to the square root of |w|
// so the ordinary weights stay visible beside the outlier. A step lays the scale groups under the bars as glass tiles, tinted by that group's error,
// streams the scale from each group's largest weight along the group, and lowers every bar to the value stored; an orange ball marks a weight stored as 0.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-sc')||!window.S3)return;const {at,lerp,mix}=S3;
  const Q=QV.scope(),C=Q.C,N=Q.rows.length,SC=Q.scopes,WM=Q.wmax;
  const DX=.15,xc=c=>(c-(C-1)/2)*DX,ZR=[1.8,.6,-.6,-1.8],Y0=1.9,HS=1.75,h=v=>HS*Math.sqrt(Math.abs(v)/WM);
  const pct=x=>(100*x).toFixed(1)+'%',f3=x=>(x<0?'−':'')+Math.abs(x).toFixed(3);
  // where each row's largest weight sits in the whole row (for the per-row step: it may lie outside the 64 columns shown)
  const R=QF.bf16(QD.rows_bf16),rowArg=Q.rows.map(r=>{const i=QD.rows.indexOf(r.r),w=R.slice(i*QD.K,(i+1)*QD.K);let m=0;w.forEach((x,j)=>{if(Math.abs(x)>Math.abs(w[m]))m=j});return m});
  const vals=k=>k<=0?Q.rows.map(r=>r.w):SC[k-1].rows.map(r=>r.q);
  // the numbers the step list quotes (static in the HTML; check_stages.mjs compares)
  function texts(){const set=(k,v)=>document.querySelectorAll('[data-sc="'+k+'"]').forEach(e=>e.textContent=v),S=k=>SC.find(m=>m.k===k),row=(m,r)=>S(m).rows[Q.rows.findIndex(x=>x.r===r)];
    const o=Q.rows[0].w[5],o2=Q.rows[1].w[5],m0=Math.max(...Q.rows[3].w.map(Math.abs)),m448=Math.max(...Q.rows[2].w.map(Math.abs));
    set('o',f3(o));set('o2',f3(o2));set('m0',m0.toFixed(3));set('m448',m448.toFixed(3));set('ratio',Math.round(Math.abs(o)/m0));
    set('tstep',S('tensor').rows[0].groups[0].scale.toFixed(3));set('t223',pct(row('tensor',223).err));set('t223z',row('tensor',223).zeros);
    set('r448',pct(row('row',448).err));set('r0',pct(row('row',0).err));set('r448z',row('row',448).zeros);set('r0z',row('row',0).zeros);set('r223',pct(row('row',223).err));
    const b=S('b32');set('b223a',pct(row('b32',223).groups[0].err));set('b222a',pct(row('b32',222).groups[0].err));set('b223b',pct(row('b32',223).groups[1].err));set('b222b',pct(row('b32',222).groups[1].err));
    set('b0',pct(row('b32',0).err));set('b448',pct(row('b32',448).err));set('b223',pct(row('b32',223).err));
    set('mx0',pct(row('mx',0).err));set('mx0c',row('mx',0).groups[0].clipped);set('mx223c',row('mx',223).groups[0].clipped);set('mx0s',row('mx',0).groups[0].scale.toFixed(4));set('mx223s',row('mx',223).groups[0].scale.toFixed(2));set('mx223v',f3(row('mx',223).q[5]));
    set('nv223',pct(row('nv',223).err));set('nv222',pct(row('nv',222).err));set('nv0',pct(row('nv',0).err));set('nv448',pct(row('nv',448).err));void b}
  function draw(R3,k,e,st){
    // labels wait for the camera: while it glides to another view they stay hidden, then fade in (so none points at a place it has left)
    const vk=k=>k===4?1:0,LA=st&&st.pk!==k&&vk(st.pk)!==vk(k)?Math.max(0,(e-.55)/.45):1,lab=(p,t,o)=>R3.label(p,t,{...o,a:(o&&o.a!=null?o.a:1)*LA});const P=R3.P;R3.grid(-5.6,5.6,-2.6,2.6,.5);
    const m=k>0?SC[k-1]:null,prev=vals(k-1),cur=vals(k),t=k===0?1:e,close=k===4;
    const green=mix(P.paper,P.c3,.6);
    Q.rows.forEach((row,ri)=>{const z=ZR[ri],ra=1;
      // the plinth, cut into one tile per scale group and tinted by that group's error (green low, orange high); one colour for all rows when one scale serves them
      [-1,1].forEach(sx=>R3.box([sx*(C*DX/2+.02),0,z],[.04,Y0-.06,.04],{a:ra*.9}));
      const gs=m&&m.k!=='tensor'&&m.k!=='row'?m.g:C,tiles=m?m.rows[ri].groups:[{c0:0,c1:C-1}];
      tiles.forEach((g,gi)=>{const ta=k>0?at(k,e,k):0,c0=xc(g.c0)-.07+(gs<C&&g.c0?.025:0),c1=xc(g.c1)+.07-(gs<C&&g.c1<C-1?.025:0);
        const tint=!m?P.paper:m.k==='tensor'?mix(P.paper,P.acc,.3):mix(P.paper,mix(P.c3,P.bad,Math.min(1,g.err/.3)),.42);
        R3.box([(c0+c1)/2,Y0-.05,z],[c1-c0,.05,.62],{fill:k>0?mix(P.paper,tint,ta):P.paper,a:ra,shadow:false})});
      // the bars: original values at step 1, then the values each scope stores (a ghost keeps the original while they differ)
      for(let c=0;c<C;c++){const w=row.w[c],v0=prev[ri][c],v1=cur[ri][c],v=lerp(v0,v1,t),hh=Math.max(.012,h(v)),x=xc(c),zero=k>0&&v1===0&&w!==0;
        const clip=m&&m.k==='mx'&&Math.abs(w)/m.rows[ri].groups[Math.floor(c/32)].scale>6*1.0000001;
        if(!zero||t<1)R3.box([x,v>=0?Y0:Y0-hh,z],[.11,hh,.44],{fill:clip?mix(P.paper,P.c4,.7):k>0?green:P.paper,a:ra*(zero?1-t:1),shadow:false,lw:.5});
        if(zero)R3.ball([x,Y0+.05,z+.05],.045,{c:P.bad,a:ra*t})}
      // the scale reaching every weight that shares it: dots stream from the group's largest weight to the middle of its group
      if(m){const fa=Math.min(1,e*1.6)*ra,zf=z+.3,o={c:P.acc,a:fa,r:.045,n:5,speed:.9};
        if(m.k==='tensor')R3.flowArc([xc(5),Y0+.06,ZR[0]+.3],[0,Y0+.06,zf],.55+.1*ri,o);
        else if(m.k==='row'){const a2=rowArg[ri];R3.flowArc(a2<C?[xc(a2),Y0+.06,zf]:[xc(C-1)+.8,Y0+.06,zf],[0,Y0+.06,zf],.45,o)}
        else m.rows[ri].groups.forEach(g=>{const mid=(g.c0+g.c1)/2;if(Math.abs(g.at-mid)>1.5)R3.flowArc([xc(g.at),Y0+.06,zf],[xc(mid),Y0+.06,zf],.22,{...o,n:3})})}
      // labels: the row on the left, what this scope does to it on the right (in the close-up, both on the left)
      const re=m?m.rows[ri]:null,la=1;
      let lt='row '+row.r;if(close&&re)lt+=' · '+pct(re.groups[0].err)+(re.groups[0].clipped?', '+re.groups[0].clipped+' clipped':'');
      lab([xc(0)-.15,Y0,z],lt,{al:'right',dx:-8,mono:true,fs:12,b:ri<2,c:ri<2?P.ink:P.mute,grp:'rl',a:la});
      if(!close){const rt=!re?'largest '+(k===0&&ri<2?f3(row.w[5]):Math.max(...row.w.map(Math.abs)).toFixed(3)):pct(re.err)+' · '+re.zeros+' zeros';
        lab([xc(C-1)+.15,Y0,z],rt,{al:'left',dx:8,mono:true,fs:12,c:re&&re.err>.5?P.bad:P.ink,grp:'rr'})}
    });
    const title=k===0?'bf16 weights · height ∝ √|w|':(close?m.n+', block 0':m.n)+' · '+(m.bpw%1?m.bpw.toFixed(m.k==='row'?2:2):m.bpw)+' bits per weight';
    lab(close?[xc(15),Y0+1.05,ZR[N-1]-.3]:[0,Y0+1.05,ZR[N-1]-.3],title,{mono:true,fs:12.5,b:1,c:k===0?P.ink:P.acc,dy:-6,wide:1})}
  const full={cam:[.1,.74],bounds:[[-4.9,0,-2.2],[4.9,2.6,2.2]]};
  const st=S3.stage({id:'stg-sc',list:'sx-sc',fig:'Fig. 2 · four real rows of one layer, five ways to share a scale',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,12,10]:[24,140,8,86],
    view:k=>k===4?{cam:[.18,.7],bounds:[[-7.4,0,-2.2],[-.1,2.6,2.3]]}:full});
  (window.QSTG=window.QSTG||{})['stg-sc']=st;texts();
})();
