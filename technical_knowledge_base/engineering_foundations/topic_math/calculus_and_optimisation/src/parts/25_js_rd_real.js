// ---- Reading tab: the real runs (logistic-regression race, section 11; edge of stability, section 17) ----
(function(){
  const $=id=>document.getElementById(id),T=CO.T,D=CO.D;
  const reg=f=>{RD.onRender(f);RD.onResize(f);try{f()}catch(e){window.__jsErr&&__jsErr(e.message)}};
  const LR=[['gd','Gradient descent, η = 1/β','var(--mute)','one gradient'],['gd_armijo','Gradient descent, line search','var(--c5)','one gradient plus loss evaluations'],['nesterov','Nesterov','var(--c3)','one gradient'],['adam','Adam (lr 1.0)','var(--c4)','one gradient'],['lbfgs','L-BFGS (m = 10)','var(--c1)','one or two gradients, 4mn extra'],['newton','Newton','var(--c2)','one gradient, one Hessian, one 31x31 solve']];
  let xm='it';
  const firstBelow=(a,t)=>{for(let i=0;i<a.length;i++)if(a[i]<t)return i;return null};
  window.CO_LR={firstBelow};
  function lrc(){const el=$('rd-lrc-svg');if(!el)return;const W=Math.min(680,RD.width(el));
    const xmax=xm==='it'?300:300;
    const series=LR.map(q=>{const a=D.lr[q[0]];let xs=a.map((_,i)=>i);
      if(xm==='fe'){if(q[0]==='lbfgs')xs=D.lr.lbfgs_nfev;else if(q[0]==='gd_armijo')xs=D.lr.gd_armijo_nfev}
      return {pts:a.map((v,i)=>[xs[i],Math.max(v,1e-15)]).filter(p=>p[0]<=xmax),col:q[2],w:q[0]==='lbfgs'||q[0]==='newton'?2.4:1.8}});
    const c=CO.chart({id:'lrc',w:W,h:260,logy:true,x:[0,xmax],y:[1e-14,1],xt:[0,50,100,150,200,250,300],yt:[1e-14,1e-10,1e-6,1e-2,1],ytf:CO.pow10,ml:46,
      xl:xm==='it'?'iteration':'evaluations of the loss or its gradient (Newton: plus one Hessian each)',series,
      extra:(sx,sy)=>'<line x1="'+sx(0)+'" x2="'+sx(xmax)+'" y1="'+sy(1e-6)+'" y2="'+sy(1e-6)+'" style="stroke:var(--bad);stroke-dasharray:3 3"/>'+T(sx(xmax)-4,sy(1e-6)-4,'gap 10⁻⁶','end',10,'var(--bad)')});
    el.innerHTML=c.svg;$('rd-lrc-leg').innerHTML=LR.map(q=>'<span style="--sw:'+q[2]+'">'+q[1]+'</span>').join('');
    $('rd-lrc-tab').innerHTML=LR.map(q=>{const i=firstBelow(D.lr[q[0]],1e-6);let extra='';if(q[0]==='lbfgs'&&i!=null)extra=' ('+D.lr.lbfgs_nfev[i]+' evaluations)';
      return '<tr><td>'+q[1]+'</td><td class="num" data-k="'+q[0]+'">'+(i==null?'not within '+(D.lr[q[0]].length-1):i+extra)+'</td><td>'+q[3]+'</td></tr>'}).join('')}
  RD.seg($('rd-lrc-x'),m=>{xm=m;lrc()});reg(lrc);

  // edge of stability
  const ET=['0.02','0.05','0.1','0.2','0.3'],EC=['var(--c6)','var(--c3)','var(--c5)','var(--c2)','var(--c4)'];let sel='0.2';
  const seg=$('rd-eos-seg');seg.innerHTML=ET.map((e,k)=>'<button data-m="'+e+'"'+(e===sel?' class="on"':'')+' style="border-left:5px solid '+EC[k]+'">η = '+e+'</button>').join('');
  function eos(){const el=$('rd-eos-svg');if(!el)return;const W=Math.min(680,RD.width(el));const E=D.eos;
    const ser=(key,f)=>ET.map((e,k)=>({pts:E[e][key].map((v,i)=>[i*E[e].every,f?f(v):v]),col:EC[k],w:e===sel?2.6:1.1}));
    const c=CO.chart({id:'eos1',w:W,h:250,x:[0,6000],y:[0,24],xt:[0,2000,4000,6000],yt:[0,5,10,15,20],xl:'step',yl:'sharpness',ml:40,series:ser('sharp'),
      extra:(sx,sy)=>ET.map((e,k)=>{const v=2/ +e;if(v>24)return '';return '<line x1="'+sx(0)+'" x2="'+sx(6000)+'" y1="'+sy(v)+'" y2="'+sy(v)+'" style="stroke:'+EC[k]+';stroke-dasharray:5 4;stroke-width:'+(e===sel?1.6:1)+'"/>'+T(sx(6000)-4,sy(v)-4,'2/η = '+(+v.toFixed(2)),'end',10,EC[k])}).join('')+T(sx(6000)-4,sy(23),'2/η = 100 and 40: off the chart','end',10,'var(--mute)')});
    el.innerHTML=c.svg;
    const el2=$('rd-eos-svg2');const z=E.zoom;
    const c2=CO.chart({id:'eos2',w:W,h:200,logy:true,x:[0,6000],y:[0.004,2],xt:[0,2000,4000,6000],yt:[0.01,0.1,1],ytf:v=>v,xl:'step',yl:'loss',ml:40,series:ser('loss')});
    const zw=W,zl=z.loss,zmin=Math.min(...zl),zmax=Math.max(...zl);
    const c3=CO.chart({id:'eos3',w:zw,h:150,x:[z.from,z.from+100],y:[zmin-(zmax-zmin)*0.08,zmax+(zmax-zmin)*0.08],xt:[z.from,z.from+50,z.from+100],yt:[zmin,zmax],ytf:v=>v.toFixed(5),ml:52,xl:'η = 0.2, every step '+z.from+' to '+(z.from+100),
      series:[{pts:zl.map((v,i)=>[z.from+i,v]),col:'var(--c2)',w:1.4,dots:true,r:1.6}]});
    el2.innerHTML=c2.svg+c3.svg;
    const s=E[sel].sharp,half=s.slice(Math.floor(s.length/2)),mean=half.reduce((a,b)=>a+b,0)/half.length;const L=E[sel].loss;
    $('rd-eos-out').innerHTML=RD.stat('limit 2/η','<span id="rd-eos-lim">'+(+(2/ +sel).toFixed(3))+'</span>','')+RD.stat('sharpness, mean of the second half','<span id="rd-eos-mean">'+mean.toFixed(2)+'</span>','start '+s[0].toFixed(2)+', max '+Math.max(...s).toFixed(2))+RD.stat('final loss','<span id="rd-eos-loss">'+L[L.length-1]+'</span>','after 6,000 full-batch steps')}
  RD.seg(seg,m=>{sel=m;eos()});reg(eos);
})();
