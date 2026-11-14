// ---- Scene, Fig. 2 (2026-11-12, renderer v2): one storage of 12 floats and the headers that read it. Steps: #sx-ten.
// Every shape, stride, offset and address is torch 2.14.1's record for x = torch.arange(12.).view(3, 4) and its views
// (window.TDA.ten.bases.x.cases, src/exp/tensors.py): x, x[1:, 1:3], x.t(), x.t().contiguous(), x[0:1].expand(3, 4).
// The storage is the front row on the floor (one box per float, its index on it); a header's elements stand on a glass plate behind it,
// laid out like the printed matrix (row 0 on top); dots stream from the storage cell each element reads.
(function(){
  if(!document.getElementById('stg-ten')||!window.S3||!window.TDA)return;const {at,off,lerp,mix}=S3;
  const C=window.TDA.ten.bases.x.cases,cs=e=>C.find(c=>c.expr===e);
  const X=cs('x'),SL=cs('x[1:, 1:3]'),TT=cs('x.t()'),TC=cs('x.t().contiguous()'),EX=cs('x[0:1].expand(3, 4)');
  const N=12,SP=.66,ZS=1.2,ZN=2.5,ZW=-.9,YT=.75,CW=.95,RH=.62,xa=a=>(a-5.5)*SP;
  // element positions on the tray: rows go back in depth, columns along x
  const dims=sh=>sh.length>1?[sh[0],sh[1]]:[1,sh[0]];
  const pos=(sh,i)=>{const [rows,cols]=dims(sh),r=Math.floor(i/cols),c=i%cols;return [(c-(cols-1)/2)*CW,YT+(rows-1-r)*RH,ZW]};
  function tray(R,sh,a,c){if(a<=.01)return;const [rows,cols]=dims(sh),w=cols*CW+.1,h=rows*RH+.1;
    R.glass([-w/2,YT-.1,ZW-.08],[w,0,0],[0,h,0],{c,a:a*.7,nu:cols,nv:rows,th:.03})}
  // one header: its elements (value = address read), and dots from storage to each; hi(i) says how strongly element i is shown
  function header(R,t,a,col,hi,flow,labs){const P=R.P;if(a<=.01)return;tray(R,t.shape,a,col);
    t.values.forEach((v,i)=>{const p=pos(t.shape,i),h=hi?hi(i):1,aa=a*(.25+.75*h);
      R.box([p[0],p[1]-.04,p[2]+.05],[.78,.44,.1],{fill:mix(P.paper,col,.25+.35*h),a:aa,shadow:false});
      if(labs)R.label([p[0],p[1]+.18,p[2]+.1],String(Math.round(v)),{mono:true,fs:12.5,b:h>.5,c:P.ink,a:Math.max(.3,aa)});
      if(flow&&h>.5)R.flowArc([xa(Math.round(v)),.26,ZS],[p[0],p[1]+.1,p[2]+.1],.25,{c:col,r:.045,n:5,speed:1.1,a:flow*h})})}
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-4.6,4.6,-3.2,3.2,.5);
    // the storage: 12 floats, never moved
    const used=k===2?[5,6,9,10]:k===6?[0,1,2,3]:null;
    for(let a=0;a<N;a++){const on=!used||used.includes(a);
      R.box([xa(a),0,ZS],[.56,.24,.5],{fill:mix(P.paper,P.c2,on?.5:.15),a:k===5?.5:on?1:.45});
      R.label([xa(a),.24,ZS+.25],String(a),{mono:true,fs:12,b:on&&!!used,c:P.ink,dy:-2,a:on?1:.5})}
    R.label([xa(0)-.35,.1,ZS],'storage · 48 bytes',{al:'right',dx:-14,mono:true,fs:12,c:P.c2,b:k===0,wide:1});
    if(k===6)for(let a=0;a<4;a++)R.label([xa(a),.24,ZS],'×3',{mono:true,fs:12,b:1,c:P.acc,dy:-22,a:e});
    // headers
    const hx=k===1?e:k===2?1:k===3?off(k,Math.min(1,e*2.2),3):0;
    if(hx>0)header(R,X,hx,P.c4,k===2?(i=>[5,6,9,10].includes(i)?1:0):null,k===1?e:k===2?1:0,true);
    const tin=k===3?Math.max(0,e*1.8-.8):k===4?1:k===5?.35:0;
    if(tin>0){const row0=i=>Math.floor(i/3)===0?1:.15,rd=k===4?(i=>i<Math.ceil(e*12)?1:.2):null;
      header(R,TT,tin,P.c5,k===3?row0:rd,k===3?tin:k===4?1:0,true)}
    // step 3: the slice's offset, drawn as a bracket from storage 0 to storage 5
    if(k===2){const y=.55;R.line([[xa(0),y,ZS],[xa(5),y,ZS]],{c:P.acc,w:2,head:7,a:e});R.line([[xa(0),.3,ZS],[xa(0),y+.08,ZS]],{c:P.acc,w:1.5,a:e});
      R.label([(xa(0)+xa(5))/2,y,ZS],'offset 5',{mono:true,fs:12.5,b:1,c:P.acc,dy:-10,a:e})}
    // step 5: the reading order of x.t() as hops over the storage; a hop back is red
    if(k===4){const ad=TT.addr,m=Math.min(11,Math.floor(e*11.99));let back=0;
      for(let i=0;i<m;i++){const a0=ad[i],a1=ad[i+1],bk=a1<a0;if(bk)back++;
        R.arc([xa(a0),.3,ZS],[xa(a1),.3,ZS],bk?.75:.32,{c:bk?P.bad:P.c5,w:bk?2.2:1.6,top:1})}
      if(m>0){const pts=[];for(let i=0;i<=m;i++)pts.push([xa(ad[i]),.32,ZS]);R.flow(pts,{c:P.c5,r:.05,n:Math.max(3,m*2),speed:1.6,a:.8})}
      R.label([xa(10),1.0,ZS],'jumps back: '+back,{mono:true,fs:12.5,b:1,c:P.bad})}
    // step 6: .contiguous() writes a new storage, in reading order
    if(k===5){const ad=TT.addr;for(let i=0;i<N;i++){const a=Math.min(1,Math.max(0,e*1.6-i*.05));
        R.box([xa(i),0,ZN],[.56,.24,.5],{fill:mix(P.paper,P.c3,.5),a});R.label([xa(i),.24,ZN+.25],String(Math.round(TC.values[i])),{mono:true,fs:12,c:P.ink,dy:-2,a});
        R.flowArc([xa(ad[i]),.25,ZS],[xa(i),.25,ZN],.4,{c:P.c3,r:.045,n:4,speed:1,a:a*.8})}
      R.label([xa(0)-.35,.1,ZN],'x.t().contiguous()',{al:'right',dx:-8,dy:-9,mono:true,fs:12.5,b:1,c:P.c3,a:e});R.label([xa(0)-.35,.1,ZN],'new storage · strides (3, 1)',{al:'right',dx:-8,dy:8,mono:true,fs:12,c:P.c3,a:e,wide:1})}
    // step 7: expand, a stride of 0: three rows over one row of storage
    if(k===6)header(R,EX,e,P.acc,null,e,true);
    // which header is shown, by its numbers
    const H={1:['x',X],2:['x[1:, 1:3]',SL],3:['x.t()',TT],4:['x.t()',TT],6:['x[0:1].expand(3, 4)',EX]}[k];
    if(H){const [nm,t]=H,sh='('+t.shape.join(', ')+')',st='('+t.stride.join(', ')+')',c=k===5?P.c3:k===6?P.acc:k>=3?P.c5:P.c4,rows=X.shape[0];
      const [tr]=dims(t.shape),anchor=[-2*CW-.1,YT+(tr-.5)*RH,ZW];
      R.label(anchor,nm,{al:'right',dx:-10,dy:-10,mono:true,fs:13,b:1,c,a:k===3?Math.max(.4,tin):1});
      R.label(anchor,'shape '+sh+' · strides '+st+' · offset '+t.offset,{al:'right',dx:-10,dy:8,mono:true,fs:12,c:P.ink,wide:1,a:k===3?Math.max(.4,tin):1})}
    if(k===0)R.label([xa(2.5),.24,ZS-.25],narrow?'12 floats, value = index':'torch.arange(12.): 12 floats, value = index',{mono:true,fs:12.5,b:1,c:P.c2,al:'left',dx:12,dy:-24,a:e}) // above the far side of the row, which the step's camera turns into depth
  }
  const full={cam:[.12,.3],bounds:[[-4.1,0,-1.1],[4.1,2.95,1.5]]};
  S3.stage({id:'stg-ten',list:'sx-ten',fig:'Fig. 2 · one storage, many headers',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4400,draw,
    margin:w=>w<520?[14,10,14,10]:[16,20,14,230],
    // step 1 comes in close on the storage alone; the reading-order step comes down to the storage row; the copy step pulls back to show the new storage in front
    view:k=>k===0?{cam:[.62,.5],bounds:[[-4.1,0,.8],[4,.9,1.6]]}:k===4?{cam:[.1,.36],bounds:[[-4.3,0,-1],[4.6,2.95,1.6]]}:k===5?{cam:[.12,.42],bounds:[[-4.3,0,-1.1],[4.3,2.95,2.8]]}:full});
})();
