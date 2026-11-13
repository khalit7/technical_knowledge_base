// ---- Scene: Stage 1, the same tasks under the base and the post-trained model (renderer v2, 2026-11-13) ----
// One bar per task of one cell, as tall as the share of the authors' 128 recorded attempts that succeeded (the released counts, window.CELLS through CX),
// sorted from the base model's hardest task (front) to its easiest (back). A glass level sits at the field's mean height: pass@1, or pass@k while every
// task gets k attempts (each bar then shows that task's unbiased pass@k). Dots stream from the field into the level while it is read.
(function(){
  if(!document.getElementById('stg-bm')||!window.CX)return;const {at,lerp,mix}=S3;
  const LISTS={'webshop|gemma-4-31B':'sx-bm-g31','webshop|gemma-4-E4B':'sx-bm-e4b','acebench|Qwen2.5-32B':'sx-bm-q32'};
  let mode='webshop|gemma-4-31B';
  // pass@k of one task with c successes of n = 128 recorded attempts, k = 1..128 (the unbiased estimator of §2, cumulative-product form)
  const PK=[];for(let c=0;c<=128;c++){const a=new Float64Array(130);let q=1;for(let j=0;j<128;j++){q*=Math.max(0,128-c-j)/(128-j);a[j+1]=1-q}a[129]=a[128];PK.push(a)}
  const pk=(c,kk)=>{const f=Math.floor(kk);return lerp(PK[c][f],PK[c][f+1],kk-f)};
  const prep={};
  function get(m){if(prep[m])return prep[m];const [bk,pair]=m.split('|'),cell=CX.get(bk,pair),T=cell.T,st=CX.stats(cell);
    const ord=[...Array(T).keys()].sort((i,j)=>cell.cb[i]-cell.cb[j]||cell.cp[i]-cell.cp[j]);
    const C=Math.ceil(Math.sqrt(T)),Rn=Math.ceil(T/C),sp=6/C,D=Rn*sp,pos=new Array(T);
    ord.forEach((i,r)=>{pos[i]=[-3+sp*(r%C+.5),D/2-sp*(Math.floor(r/C)+.5)]});
    let lost=0,gained=0;for(let i=0;i<T;i++){if(cell.cb[i]>0&&cell.cp[i]===0)lost++;if(cell.cb[i]===0&&cell.cp[i]>0)gained++}
    return prep[m]={cell,T,pos,sp,D,lost,gained,b1:st.b.cov[0],bK:st.b.cov[127],p1:st.p.cov[0],pK:st.p.cov[127],catB:CX.cats(cell.cb),catP:CX.cats(cell.cp)}}
  const H=2.6;
  const pc=v=>(100*v).toFixed(1)+'%';
  // colours: base teal and post-trained orange as in every chart on the page; never solved a dark floor tile, solved every time green,
  // lost (the base model solved it at least once, the post-trained model never) a purple ghost at full height, gained green
  function draw(R,k,e){const P=R.P,Dd=get(mode),{cell,T,pos,sp,D}=Dd,CB=P.c6,CP=P.c2,NV=mix(P.paper,P.ink,.62),AL=P.good,LO=P.c4;R.grid(-4.5,4.5,-D/2-1.2,D/2+1.2,.5);
    const bw=sp*.74,kk=k===1||k===3?Math.pow(2,7*e):1;
    // the morph of step 3: first back to one attempt (the bars fall to the base rates), then to the post-trained rates
    const u1=k===2?Math.min(1,e/.3):0,u2=k===2?Math.max(0,(e-.3)/.7):0;
    let sum=0;
    for(let i=0;i<T;i++){const b=cell.cb[i],p=cell.cp[i],[x,z]=pos[i];let v,fill,a=1;const post=k>=3||(k===2&&u2>0);
      if(k===0)v=b/128*e;else if(k===1)v=pk(b,kk);else if(k===2)v=u2>0?lerp(b/128,p/128,u2):lerp(PK[b][128],b/128,u1);else if(k===3)v=pk(p,kk);else v=PK[p][128];
      sum+=v;
      const c=post?p:b;
      fill=mix(P.paper,post?CP:CB,.6);
      if((k===0||k===2)&&c===128&&(k===0?e>.5:u2>.5))fill=mix(P.paper,AL,.9);
      if(k===4){const ls=b>0&&p===0,gn=b===0&&p>0;if(gn)fill=mix(P.paper,AL,.9);else a=.2;
        if(ls){R.box([x,0,z],[bw,H-.05,bw],{fill:LO,a:.55*e,fa:.22,ea:.25,shadow:false,lw:.4});R.box([x,H-.05,z],[bw,.05,bw],{fill:LO,a:e,shadow:false,lw:.4})}}
      if(v<.004){if(k===0&&e<.5)continue;R.box([x,0,z],[bw,.02,bw],{fill:NV,a:k===4?.35:1,shadow:false,lw:.4,ea:.4});continue}
      R.box([x,0,z],[bw,v*H,bw],{fill,a,shadow:false,lw:.5,ea:.55})}
    const lev=sum/T,post=k>=3||(k===2&&u2>0),col=post?CP:CB;
    // the glass level: the field's mean height, read off as pass@1 or pass@k; dots stream from the field into it while it is read
    const lvA=k===0?e:1;
    R.glass([-3,lev*H,D/2],[6,0,0],[0,0,-D],{c:col,a:.75*lvA,nu:6,nv:6,th:.01});
    const kl=k===1||k===3?Math.min(128,Math.round(kk)):k===4?128:1;
    R.label([3,lev*H,D/2],(post?'post-trained ':'base ')+'pass@'+kl+' '+pc(lev),{al:'left',dx:8,mono:true,fs:13,b:1,c:col,a:lvA});
    if(k<4)[-2,0,2].forEach(xx=>R.flow([[xx,.05,D/2-.3],[xx,lev*H*.5,D/2-.3],[3,lev*H,D/2]],{c:col,a:.7*lvA,r:.055,speed:1.2,n:5}));
    else{R.glass([-3,Dd.bK*H,D/2],[6,0,0],[0,0,-D],{c:CB,a:.55*e,nu:6,nv:6,th:.01});R.label([3,Dd.bK*H,D/2],'base pass@128 '+pc(Dd.bK),{al:'left',dx:8,mono:true,fs:13,b:1,c:CB,a:e});
      // the coverage given up: from the base model's level down to the post-trained one's
      R.flow([[3,Dd.bK*H,D/2-.2],[3,Dd.pK*H,D/2-.2]],{c:LO,a:e,r:.06,speed:.8,n:4})}
    R.label([-3,0,D/2],'base model\'s hardest',{al:'right',dx:-8,mono:true,fs:12,c:P.mute,grp:'ax'});R.label([-3,0,-D/2],'easiest',{al:'right',dx:-8,mono:true,fs:12,c:P.mute,grp:'ax'});
  }
  const cnt=k=>{const D=get(mode),post=k>=2,c=post?D.catP:D.catB,lab=post?'post-trained':'base';const el=$('bmCnt');if(!el)return;
    let h='<span>'+lab+': always pass <b>'+pc(c[0])+'</b></span> <span>pass given compute <b>'+pc(c[1])+'</b></span> <span>always fail <b>'+pc(c[2])+'</b></span>';
    if(k===4)h='<span><i class="kchip" style="background:var(--c4)"></i>lost <b>'+D.lost+'</b> ('+pc(D.lost/D.T)+')</span> <span><i class="kchip" style="background:var(--good)"></i>gained <b>'+D.gained+'</b> ('+pc(D.gained/D.T)+')</span> <span>'+D.T+' tasks</span>';
    el.innerHTML=h};
  const full=()=>{const D=get(mode).D;return [[-3.1,0,-D/2],[3.1,H,D/2]]};
  const st=S3.stage({id:'stg-bm',list:LISTS[mode],fig:'Stage 1 · every task of one cell, released counts',cam:[-.38,.6],bounds:()=>full(),aspect:.6,dur:2000,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[12,178,8,118],
    // step 3 turns the field as the tasks move; step 5 lowers the camera to the front, where the lost tasks stand as ghosts
    view:k=>k===2?{cam:[-.55,.62],bounds:full()}:k===4?{cam:[-.2,.45],bounds:full()}:null,
    onStep:k=>cnt(k)});
  const seg=$('bmM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    mode=b.dataset.m;Object.keys(LISTS).forEach(m=>{$(LISTS[m]).hidden=m!==mode});st&&st.list(LISTS[mode])}));
  window.SC_BM={st,get,mode:()=>mode};
})();
