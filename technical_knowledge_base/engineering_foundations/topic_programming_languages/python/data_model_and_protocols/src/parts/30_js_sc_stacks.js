// ---- Scenes (renderer v2, 2026-11-07): Fig. 1 the hero (section 0) and Fig. 7 attribute lookup (section 5) ----
// One vocabulary for both: a piece of syntax is a stack of glass plates, one per place Python tries, the first at the bottom;
// a lookup is a ball that climbs the stack (dots flowing along its path) until a plate answers, where it glows. Every logged call and
// result printed on the stage is read from the page's recorded runs: window.PA.dm (d2_dispatch.py's traces) and PA.out (c4_descriptor.txt),
// both written by pa/gen.py. The explanation of each step is the ol.sx list on the left (check_stages.mjs checks one item per step and
// that the list quotes the same logged lines).
(function(){
  if(!window.S3||!window.PA||!PA.dm)return;const {at,lerp,lerp3,mix,cl}=S3,$=id=>document.getElementById(id),DM=PA.dm;
  const res=k=>DM[k][DM[k].length-1].replace(/^result: /,'');
  const L=(R,p,t,o)=>{if((o.a==null?1:o.a)>=.3)R.label(p,t,o)};   // a receding part (alpha under .3) loses its labels
  const plate=(R,x,y,w,d,c,a,o)=>R.glass([x-w/2,y,-d/2],[w,0,0],[0,0,d],Object.assign({c,a,nu:4,nv:3,th:.04},o||{}));
  // the climbing ball: from the floor to height yh at x; e is the step's progress; returns the height reached
  function climb(R,x,z,yh,e,c,a){const P=R.P,y=lerp(.02,yh,cl(e*1.25,0,1)),pts=[[x,.02,z],[x,Math.max(.06,y),z]];
    if(y>.1)R.flow(pts,{c,a:.85*a,r:.06,n:Math.max(3,Math.round(y*4)),speed:1.1});R.glow([x,y,z],.28,{c,a:.9*a,top:1});R.ball([x,y,z],.08,{c,a,top:1});return y}

  // ---------- Fig. 1: five pieces of syntax, five stacks ----------
  if($('stg-hero')){
    const DY=.5,Y0=.25,PW=1.5,PD=1.1,X=[-4.8,-2.4,0,2.4,4.8],PH=()=>innerWidth<560;
    const n0=DM.iter_getitem.filter(l=>/^call Old.__getitem__/.test(l)).length;
    // each stack: its plates (bottom first; 'err' plates are the error at the top), which plate answers, and what each plate said
    const T=[
      {syn:'v + 1',pl:['type(v).__add__','type(1).__radd__',['TypeError','err']],hit:1,
        note:['5 + A(2): int.__add__ -> NotImplemented (in C)',DM.add_reflected[0]],out:'= '+res('add_reflected')},
      {syn:'a == b',pl:['type(a).__eq__','type(b).__eq__','a is b'],hit:2,
        note:[DM.eq_fallback[0]+' '+DM.eq_fallback[1].trim(),"str.__eq__ declines (in C)",'identity: different objects'],out:'= '+res('eq_fallback')},
      {syn:'for x in xs',pl:['__iter__, then __next__','__getitem__(0), (1), ...'],hit:1,
        note:['Old has no __iter__',n0+' calls, (0) to ('+(n0-1)+'), then IndexError'],out:'= '+res('iter_getitem')},
      {syn:'obj.attr',pl:['data descriptor on type','obj.__dict__','class attribute or method','__getattr__',['AttributeError','err']],hit:3,
        note:['o.missing: no data descriptor','not in o.__dict__','not on the class',DM.attr_getattr[0].replace(/^normal lookup failed: /,'')],out:'= '+res('attr_getattr')},
      {syn:'with m as r',pl:['__enter__','body','__exit__, always'],hit:2,all:1,
        note:[DM.with_swallow[0]+" -> 'resource'","raise ValueError('boom')",'__exit__(ValueError, ...) -> True: swallowed'],out:'then '+res('with_swallow')}];
    const yP=i=>Y0+i*DY;
    function tower(R,j,a,focus,k,e){const P=R.P,t=T[j],x=X[j],n=t.pl.length,grow=k===0?e:1;
      t.pl.forEach((p,i)=>{const nm=Array.isArray(p)?p[0]:p,err=Array.isArray(p),ai=a*cl(grow*n*1.2-i,0,1);if(ai<=.01)return;
        const c=i===0?P.c1:err?P.bad:mix(P.mute,P.paper,.2);plate(R,x,yP(i),PW,PD,c,ai,{nu:3,nv:2});
        if(focus)L(R,[x-PW/2,yP(i),PD/2],nm,{al:'right',dx:-8,mono:true,fs:12.5,b:i===0,c:err?P.bad:i===0?P.c1:P.ink,a:ai,wide:1})});
      L(R,[x,yP(n-1)+.12,-PD/2],t.syn,{mono:true,fs:13.5,b:1,dy:-12,c:P.ink,a:k===0?cl(e*2-.6,0,1):a});
      if(!focus)return;
      // the climb: notes appear as the ball passes each plate; the answering plate glows and shows the result
      const yh=yP(t.hit)+.06,y=climb(R,x,0,yh,e,P.acc,1);
      t.note.forEach((s,i)=>{const yi=yP(i);if(y<yi-.02)return;const hit=i===t.hit||t.all;
        L(R,[x+PW/2,yi,0],s,{al:'left',dx:8,dy:-4,mono:true,fs:12,c:hit?P.good:P.mute,b:i===t.hit,wide:1})});
      if(e>.85){R.glow([x,yh,0],.42,{c:P.good,a:.7,top:1});L(R,[x+PW/2,yh,0],t.out,{al:'left',dx:8,dy:14,mono:true,fs:13,b:1,c:P.good})}}
    function draw(R,k,e){R.grid(-5.6,5.6,-1.6,1.6,.5);T.forEach((t,j)=>tower(R,j,k===0||k-1===j?1:.12,k-1===j,k,e))}
    const full={cam:[.32,.42],bounds:[[-5.6,0,-.6],[5.6,2.6,.6]]};
    S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · each piece of syntax climbs its stack until one place answers',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1700,hold:5200,draw,
      margin:w=>w<520?[16,8,12,8]:[18,16,14,16],
      // the camera moves in close on the stack a step is about, with room for the plate names on its left and the notes on its right
      // (on a phone, where the side labels hide, the stack alone fills the frame)
      view:k=>{if(k===0)return PH()?{cam:[.78,.42],bounds:[[-5.2,0,-.6],[5.2,2.6,.6]]}:full;const x=X[k-1],top=yP(T[k-1].pl.length-1)+.45;return PH()?{cam:[.3,.32],bounds:[[x-1.0,0,-.6],[x+2.5,Math.max(1.5,top),.6]]}:{cam:[.28,.3],bounds:[[x-2.5,0,-.6],[x+3.9,Math.max(1.6,top),.6]]}}});
  }

  // ---------- Fig. 7: the lookup for obj.x, plate by plate ----------
  if($('stg-look')){
    const DY=.8,Y0=.25,PW=4.2,PD=1.0,yP=i=>Y0+i*DY;
    const C4=(PA.out&&PA.out.c4_descriptor||'').split('\n');                 // c4_descriptor.txt, line by line
    const VARS=(C4[0].match(/\{.*\}/)||[''])[0],VE=C4[1]||'',AE=C4[2]||'',FM=C4[3]||'';
    const PL=[['1  data descriptor on type(o)',P=>P.c1],['2  o.__dict__',P=>P.c3],['3  class attribute or method',P=>P.c4],['4  __getattr__',P=>P.c5],['5  AttributeError',P=>P.bad]];
    // the two classes of the runs: columns are the names looked up, blocks are where each name lives
    const K={cols:{d:-1.5,nd:-.5,plain:.5,missing:1.5},blocks:[[0,'d'],[1,'d'],[1,'nd'],[2,'nd'],[2,'plain']],bar:'K.__getattr__'};
    const S={cols:{temperature:-1.7,max_tokens:-.85,budget:0,describe:.85,'_temperature, _max_tokens':1.7},blocks:[[0,'temperature'],[0,'max_tokens'],[0,'budget'],[1,'_temperature, _max_tokens'],[2,'describe']]};
    // per step: the class shown, the climbs (column, plate it stops at, colour key, the labels at the stop)
    const ST=[
      {cls:K,go:[]},
      {cls:K,go:[['d',0,'good',DM.attr_data[0],res('attr_data')]]},
      {cls:K,go:[['nd',1,'good','',res('attr_instance')]]},
      {cls:K,go:[['plain',2,'good','',res('attr_class')]]},
      {cls:K,go:[['missing',3,'good',DM.attr_getattr[0].replace(/^normal lookup failed: /,''),res('attr_getattr')]]},
      {cls:S,go:[['describe',2,'good','',FM.replace(' ',' -> ')]]},
      {cls:S,go:[['temperature',0,'bad','s.temperature = 0',VE],['budget',0,'bad','s.budget = 1',AE]]}];
    function blocks(R,cls,a,hot){const P=R.P;cls.blocks.forEach(([i,nm])=>{const x=cls.cols[nm],y=yP(i),h=hot&&hot.indexOf(i+':'+nm)>=0;
        R.box([x,y+.02,0],[nm.length>12?.9:.46,.17,.46],{fill:mix(P.paper,PL[i][1](P),h?.6:.28),a,shadow:false});
        L(R,[x,y+.19,0],nm,{mono:true,fs:12,dy:-7,b:h,c:h?P.ink:P.mute,a:a,grp:'b'+i})});
      if(cls.bar)R.box([0,yP(3)+.02,0],[PW-.5,.12,.3],{fill:mix(P.paper,P.c5,.35),a,shadow:false});
      if(cls.bar)L(R,[0,yP(3)+.14,0],cls.bar,{mono:true,fs:12,dy:-7,c:P.mute,a})}
    function draw(R,k,e){const P=R.P,s=ST[k];R.grid(-4,6,-1.8,1.8,.5);
      const swap=k===5&&e<1,aOld=swap?cl(1-e*2.5,0,1):0,aNew=swap?cl((e-.4)/.6,0,1):1;   // the class changes at step 6: the old one fades out first
      const grow=k===0?e:1;
      PL.forEach(([nm,c],i)=>{const ai=cl(grow*6-i,0,1);if(ai<=.01)return;plate(R,0,yP(i),PW,PD,c(P),ai*(i===4?.8:1),{nu:6,nv:2});
        L(R,[-PW/2,yP(i),PD/2],nm,{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:c(P),a:ai,wide:1});
        L(R,[-PW/2,yP(i),PD/2],String(i+1),{al:'right',dx:-8,mono:true,fs:13,b:1,c:c(P),a:R.W<520?ai:0})});
      const hot=s.go.map(g=>g[1]+':'+g[0]);
      if(swap)blocks(R,K,aOld,null);blocks(R,s.cls,(k===0?cl(e*1.6-.4,0,1):1)*aNew,e>.8?hot:null);
      // the climbs: each in its name's column, stopping at the plate that answers
      s.go.forEach(([nm,stop,ck,log,out],j)=>{const x=s.cls.cols[nm],yh=yP(stop)+.12,ee=k===5?cl((e-.4)/.6,0,1):cl(e*1.2-j*.2,0,1),c=P[ck];
        const y=climb(R,x,.35,yh,ee,c,1);
        if(ee>.85){R.glow([x,yh,.35],.38,{c,a:.7,top:1});
          const lp=[PW/2,yh,.35];if(log)L(R,lp,log,{al:'left',dx:10,dy:-8+j*34,mono:true,fs:12,c:P.mute,wide:log.length>30?1:0});
          L(R,lp,out,{al:'left',dx:10,dy:9+j*34,mono:true,fs:12.5,b:1,c,wide:out.length>30?1:0});
          R.line([[x,yh,.35],[PW/2,yh,.35]],{c,w:1.2,a:.5,dash:[3,4]})}});
      if(k===0&&e>.8)L(R,[0,yP(4)+.25,0],'a lookup climbs from plate 1 until one answers',{mono:true,fs:12,dy:-8,c:P.mute,wide:1});
      if(k===5&&aNew>.5)L(R,[0,yP(4)+.25,0],"Sampling's s: vars(s) = "+VARS,{mono:true,fs:12,dy:-8,c:P.mute,wide:1});
    }
    const full={cam:[.3,.3],bounds:[[-2.3,0,-.6],[6.6,3.7,.6]]};
    S3.stage({id:'stg-look',list:'sx-look',fig:'Fig. 7 · attribute lookup climbs four places, in a fixed order',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1800,hold:5600,draw,
      margin:w=>w<520?[14,8,12,8]:[16,14,14,230],
      view:k=>{const g=ST[k].go;if(!g.length||k>=5)return full;const top=yP(g[0][1])+.9;return {cam:[.3,.26],bounds:[[-2.3,0,-.6],[5.6,Math.max(1.9,top),.6]]}}});
  }
})();
