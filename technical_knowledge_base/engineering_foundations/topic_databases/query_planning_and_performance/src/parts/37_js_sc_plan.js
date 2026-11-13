// ---- Scene, Fig. 3 (section 6): a real plan as a tree, rows flowing up, estimated against actual rows at every node (renderer v2) ----
// The five London users with the most chats (QPD.lab.corr_before), then the same query after CREATE STATISTICS (corr_after).
// Each node: a white slab; beside it two bars on a log scale, glass for the rows it estimated, solid for the rows it produced
// (per loop for the inner Index Only Scan; per process after the fix, as EXPLAIN prints them). Every number is parsed from the recorded plans.
(function(){
  if(!document.getElementById('stg-plan')||!window.QPD)return;const {at,off,lerp,mix}=S3;
  const B=QPD.lab.corr_before.text.split('\n'),A=QPD.lab.corr_after.text.split('\n'),f=x=>Number(x).toLocaleString('en-GB');
  const node=(ls,re)=>{const l=ls.find(l=>re.test(l)&&/actual time/.test(l));const m=l.match(/rows=(\d+) width=\d+\) \(actual time=[^ ]+ rows=(\d+) loops=(\d+)/);return {est:+m[1],act:+m[2],loops:+m[3]}};
  const ex=ls=>+ls.find(l=>/Execution Time/.test(l)).match(/([\d.]+) ms/)[1];
  const nb={lim:node(B,/^Limit/),sort:node(B,/-> +Sort/),agg:node(B,/HashAggregate/),nl:node(B,/Nested Loop/),seq:node(B,/Seq Scan on lab_users/),ios:node(B,/Index Only Scan/),ms:ex(B)};
  const na={lim:node(A,/^Limit/),sort:node(A,/-> +Sort/),agg:node(A,/Finalize HashAggregate/),gat:node(A,/-> +Gather/),nl:node(A,/Nested Loop/),seq:node(A,/Parallel Seq Scan on lab_users/),ios:node(A,/Index Only Scan/),ms:ex(A)};
  window.CHK=Object.assign(window.CHK||{},{plan:{before:nb,after:na}});
  // layout: [key, label before, label after, x, y]
  const NODES=[['lim','Limit','Limit',0,4.75],['sort','Sort','Sort',0,3.75],['agg','HashAggregate','Finalize HashAggregate',0,2.75],['nl','Nested Loop','Nested Loop',0,1.6],
    ['seq','Seq Scan on lab_users','Parallel Seq Scan on lab_users',-1.9,.45],['ios','Index Only Scan on chats','Index Only Scan on chats',1.9,.45]];
  const at2=k=>NODES.find(n=>n[0]===k),NW=2.5,NH=.28,ND=.9;
  const hh=r=>.04+.2*Math.log10(Math.max(1,r)); // bar height: log scale, 10 times more rows = .2 taller
  // which node each step is about (0: the whole plan; 6: the fix, every node)
  const FOCUS=[null,['seq'],['ios'],['nl'],['agg'],['sort','lim'],null];
  function draw(R,k,e){const P=R.P;R.grid(-4,4.6,-1.8,1.8,.5);
    const fix=k===6,D=fix?na:nb,foc=FOCUS[k],ta=key=>!foc||foc.includes(key)?1:.25;
    // the flows: rows going up the tree, denser where more rows move
    const up=(a,b,rows,key)=>{const A0=at2(a),B0=at2(b),al=ta(key)*(k===0?Math.min(1,e*1.5):1);R.flow([[A0[3]-.5,A0[4]+NH,.25],[A0[3]-.5,(A0[4]+B0[4])/2+.1,.25],[B0[3]-.5,B0[4],.25]],{c:P.c1,a:al*.9,r:.05,n:Math.max(2,Math.round(2+Math.log10(Math.max(1,rows))*2.2)),speed:1.1})};
    up('seq','nl',D.seq.act*D.seq.loops,'seq');up('ios','nl',D.ios.act*D.ios.loops,'ios');up('nl','agg',D.nl.act*D.nl.loops,'nl');up('agg','sort',D.agg.act,'agg');up('sort','lim',D.sort.act,'sort');
    R.flow([[-.5,4.75+NH,.25],[-.5,5.4,.25]],{c:P.c1,a:ta('lim'),r:.05,n:3,speed:.9});
    // the nested loop runs its inner side once per outer row
    if(k===2||k===3){const a=k===2?Math.min(1,e*1.5):.6;R.flowArc([.9,1.6,-.25],[1.6,.45+NH,-.25],.3,{c:P.c2,a,r:.05,n:6,speed:1.6});
      R.label([1.9,0,ND/2],'loops='+f(D.ios.loops)+' (expected '+f(nb.seq.est)+')',{fs:12.5,mono:true,b:1,c:P.c2,dy:16,a:k===2?e:.8})}
    NODES.forEach(([key,l0,l1,x,y])=>{const a=ta(key),d=D[key];const bad=key!=='sort'&&key!=='lim'&&(d.act/d.est>10||d.est/d.act>10); // a Sort under a Limit stops early by design
      R.box([x,y,0],[NW,NH,ND],{a:Math.max(.35,a),fill:foc&&foc.includes(key)?mix(P.paper,bad?P.bad:P.good,.18):P.paper,shadow:y<.6});
      R.label([x,y+NH/2,ND/2],fix?l1:l0,{fs:12.5,b:1,mono:true,a:Math.max(.7,a)});
      // the two bars: estimated (glass) and actual (solid; red when off by more than 10 times)
      const ba=a*(k===0?Math.min(1,e*1.4):1),grow=foc&&foc.includes(key)&&k!==6?e:1,ek=fix?(lerp(hh(nb[key].est),hh(d.est),e)):hh(d.est),ak=fix?lerp(hh(nb[key].act),hh(d.act),e):hh(d.act);
      const bx=x+NW/2+.4;R.box([bx,y,0],[.5,.03,.55],{a:ba,shadow:false});
      R.box([bx-.12,y+.03,0],[.2,ek*grow,.36],{fill:P.c1,fa:.3,a:ba,shadow:false,lw:.7});R.box([bx+.12,y+.03,0],[.2,Math.max(.02,ak*grow),.36],{fill:bad?P.bad:P.good,a:ba,shadow:false,lw:.8});
      if(a>.5||k===0){const per=key==='ios'?' per loop':fix&&['seq','nl'].includes(key)?' per process':'';
        R.label([bx+.3,y+.12,0],'est '+f(d.est)+' · actual '+f(d.act)+per,{al:'left',dx:6,fs:12,mono:true,c:bad?P.bad:P.mute,b:bad&&a>.5,grp:'bars',a:k===0?.8*ba:ba})}});
    // the fix: a Gather node collects the two processes' rows
    if(fix){const g=at(k,e,6);R.box([0,2.15,0],[1.3,.18,.6],{fill:mix(P.paper,P.c4,.3),a:g,shadow:false});R.label([0,2.24,.3],'Gather · 1 worker',{fs:12,mono:true,b:1,c:P.c4,a:g,dx:-60,al:'right'})}
    // the answer and the bill
    if(k>=5){const g=k===5?e:1;R.label([0,5.4,0],'5 rows · '+(fix?na.ms:nb.ms)+' ms',{fs:13,mono:true,b:1,c:fix?P.good:P.ink,a:g,dy:-6})}
  }
  const full={cam:[.42,.42],bounds:[[-3.3,0,-.6],[4.8,5.5,.6]]};
  S3.stage({id:'stg-plan',list:'sx-plan',fig:'Fig. 3 · a real plan, estimated against actual',cam:full.cam,bounds:full.bounds,aspect:.92,dur:1400,hold:5200,draw,
    margin:w=>w<520?[16,8,12,8]:[18,190,14,14],
    // steps 2 and 3 move in close on the bottom of the tree, where the error starts
    view:k=>k===1||k===2?{cam:[.42,.4],bounds:[[-3.4,0,-.7],[4.8,2.4,.7]]}:full,
    onStep:k=>{try{window.QPWALK&&QPWALK(k)}catch(e){}}});
})();
