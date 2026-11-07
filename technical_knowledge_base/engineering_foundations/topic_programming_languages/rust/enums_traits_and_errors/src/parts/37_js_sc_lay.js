// ---- Scene: what an enum costs in memory (section 2; renderer v2: a few large objects per step, camera in close, flowing dots on every pointer) ----
// Every size, offset and first word comes from out/l_layout.txt (layout.rs, recorded): RA_DATA.layout. One cube per byte, to scale.
// The heap boxes (what a reference or a String points at) are illustrative in size; the String's buffer shows its recorded capacity and length.
(function(){
  if(!document.getElementById('stg-lay')||!window.RA_DATA||!RA_DATA.layout)return;const {at,off,lerp,mix,cl}=S3;
  const T=RA_DATA.layout,SZ={},line=re=>(T.match(new RegExp(re.source,'m'))||[])[1];
  T.split('\n').forEach(l=>{const m=l.match(/^(\S+)\s+size\s+(\d+)\s+align\s+(\d+)/);if(m)SZ[m[1]]={s:+m[2],a:+m[3]}});
  const sz=n=>(SZ[n]||{s:0}).s;
  const O32=+line(/^Option<u32>: Some's u32 at offset (\d+)/),O64=+line(/^Option<u64>: Some's u64 at offset (\d+)/);
  const OCI=+line(/^Conn::Connecting: attempt \(u32\) at offset (\d+)/),OCC=+line(/^Conn::Connected: session_id \(u64\) at offset (\d+)/),OCF=+line(/^Conn::Failed: error \(String, \d+ bytes\) at offset (\d+)/);
  const WORDS=JSON.parse(line(/as three words: (\[.*\])/)||'["capacity","pointer","length"]');
  const CAP=+line(/\(capacity (\d+), length/),LEN=+line(/capacity \d+, length (\d+)\)/),TXT=line(/^String "([^"]*)"/)||'';
  const FW={};T.split('\n').forEach(l=>{const m=l.match(/^first word of (\S+?)(?: \{.*?\})?\s+(0x[0-9a-f]+)$/);if(m)FW[m[1]]=m[2]});
  const short=h=>{const v=BigInt(h);return v>=(1n<<63n)?'2⁶³+'+(v-(1n<<63n)).toString():v.toString()};
  const B=.2,X0=-2.4,bx=i=>X0+(i+.5)*B,H=.3;
  // a run of byte cubes: [first byte, count] on row z at height y
  function run(R,z,y,i0,n,fill,a,o){o=o||{};for(let i=i0;i<i0+n;i++)R.box([bx(i),y,z],[B*.9,o.h||H,.5],{fill,a,shadow:y<.05&&!o.ns,lw:.6,fa:o.fa})}
  function ghost(R,z,y,i0,n,a){run(R,z,y,i0,n,mix(R.P.paper,R.P.line,.5),a*.35,{fa:.25,ns:1})}
  const ZA=4.4,ZA2=3.7,ZB=2.6,ZB2=1.9,ZC=.9,ZC2=.2,ZS=-1.3,ZH=-2.7,LY=[0,.55,1.1,1.65,2.2];
  function rowLabel(R,z,y,t,a,c){if(a<.5)return;R.label([X0-.15,y+.12,z],t,{al:'right',dx:-6,mono:true,fs:12,c:c||R.P.mute,a,grp:'row'})}
  function draw(R,k,e){const P=R.P,TG=P.c2,DA=P.c1,PT=P.c6,CP=P.c5,LN=P.c3,PAD=mix(P.paper,P.line,.6);
    R.grid(-5,5,-3.6,5,.5);
    const rec=s=>k===s?1:k>s&&k<3?.18:k===3&&s<3?.18*(1-e):0; // a row is at full strength on its own step and recedes after it
    // step 1: u32 and Option<u32>
    {const a=k===0?1:k<3?.18:k===3?.18*(1-e):0;if(a>0){
      run(R,ZA,0,0,sz('u32'),mix(P.paper,DA,.45),a);rowLabel(R,ZA,0,'u32 · '+sz('u32')+' B',a);
      run(R,ZA2,0,0,O32,mix(P.paper,TG,.5),a);run(R,ZA2,0,O32,sz('u32'),mix(P.paper,DA,.45),a);rowLabel(R,ZA2,0,'Option<u32> · '+sz('Option<u32>')+' B',a,k===0?P.ink:null);
      if(k===0){R.label([bx(O32/2-.5),H,ZA2],'tag + padding',{fs:12,dy:-10,dx:-20,c:TG,b:1});R.label([bx(O32+1.5),H,ZA2],'u32 at offset '+O32,{fs:12,dy:-10,dx:24,c:DA,b:1})}}}
    // step 2: u64 and Option<u64>
    {const a=rec(1);if(a>0){const ai=k===1?e:a;
      run(R,ZB,0,0,sz('u64'),mix(P.paper,DA,.45),ai);rowLabel(R,ZB,0,'u64 · '+sz('u64')+' B',ai);
      run(R,ZB2,0,0,O64,mix(P.paper,TG,.5),ai);run(R,ZB2,0,O64,sz('u64'),mix(P.paper,DA,.45),ai);rowLabel(R,ZB2,0,'Option<u64> · '+sz('Option<u64>')+' B',ai,k===1?P.ink:null);
      if(k===1){R.label([bx(O64/2-.5),H,ZB2],'tag + 7 padding',{fs:12,dy:-10,dx:-10,c:TG,b:1,a:e});R.label([bx(O64+3.5),H,ZB2],'u64 at offset '+O64,{fs:12,dy:-10,c:DA,b:1,a:e})}}}
    // step 3: &u64 and Option<&u64>: one word, no tag; Some points at a u64, None is all zero
    {const a=rec(2);if(a>0){const ai=k===2?e:a,hp=[3.4,0,(ZC+ZC2)/2];
      run(R,ZC,0,0,sz('&u64'),mix(P.paper,PT,.5),ai);rowLabel(R,ZC,0,'&u64 · '+sz('&u64')+' B',ai);
      run(R,ZC2,0,0,sz('Option<&u64>'),mix(P.paper,PT,.5),ai);rowLabel(R,ZC2,0,'Option<&u64> · '+sz('Option<&u64>')+' B',ai,k===2?P.ink:null);
      R.box(hp,[1.6,.3,.55],{fill:mix(P.paper,DA,.45),a:ai});
      if(k===2){R.label([hp[0],.3,hp[2]],'a u64 somewhere',{fs:12,dy:-10,a:e});
        R.flowArc([bx(4),H,ZC],[hp[0]-.6,.3,hp[2]],.5,{c:PT,a:e,r:.06,n:6});R.flowArc([bx(4),H,ZC2],[hp[0]-.6,.3,hp[2]],.5,{c:PT,a:e*.8,r:.06,n:6});
        R.label([hp[0],0,hp[2]],'Some(&x): its address · None: all zero',{fs:12,dy:22,c:PT,b:1,a:e})}}}
    // steps 4 to 7: the String, then Conn's four variants stacked over the same 24 bytes
    const NS=sz('String'),wcol=w=>w==='capacity'?CP:w==='pointer'?PT:LN;
    if(k>=3){const aS=k===3?e:1,lay=k>=4?at(k,e,4):0,fb=k===4?e:k>4?1:0;
      // the Failed layer is the String itself
      WORDS.forEach((w,j)=>{run(R,ZS,LY[0],OCF+j*8,8,mix(P.paper,wcol(w),.45),aS);
        if(k===3||k===4)R.label([bx(OCF+j*8+3.5),H,ZS],w==='capacity'?'capacity '+CAP:w==='length'?'length '+LEN:'pointer',{fs:12,dy:-10,c:wcol(w),b:1,a:k===3?e:1-e})});
      rowLabel(R,ZS,0,k===3?'String · '+NS+' B':'Failed { error: String }',aS,P.ink);
      // the heap buffer: capacity cells, length of them holding the text
      const hb=k===3?1:k===4?1-.8*e:.2,cw=.26;
      for(let i=0;i<CAP;i++){const c=[-(CAP-1)*cw/2+i*cw,0,ZH];R.box(c,[cw*.88,.24,.36],{fill:i<LEN?mix(P.paper,LN,.35):P.paper,a:hb*aS,lw:.5,shadow:false});
        if(i<LEN&&k===3)R.label([c[0],.24,ZH],TXT[i],{mono:true,fs:12.5,dy:-8,a:e})}
      if(k===3)R.label([0,0,ZH],'the heap: capacity '+CAP+', length '+LEN,{fs:12,dy:18,a:e,wide:1});
      const pi=WORDS.indexOf('pointer');if(k<=4)R.flowArc([bx(OCF+pi*8+3.5),H,ZS],[-(CAP-1)*cw/2,.24,ZH],.6,{c:PT,a:(k===3?e:1-e)*.9,r:.06,n:7});
      if(lay>0){const P2=P;
        // Connected: session_id at its offset; Connecting: attempt; Idle: nothing; the rest of each layer is unused (ghost)
        const L=[[1,'Connected { session_id: u64 }',OCC,sz('u64'),'Connected'],[2,'Connecting { attempt: u32 }',OCI,sz('u32'),'Connecting'],[3,'Idle','',0,'Idle']];
        L.forEach(([li,name,o,n,key],idx)=>{const y=LY[li],a=cl(lay*3-idx,0,1);if(a<=0)return;
          const tagA=k>=5?1:0;
          if(n){ghost(R,ZS,y,0,NS,a);run(R,ZS,y,o,n,mix(P2.paper,DA,.45),a,{ns:1})}else ghost(R,ZS,y,0,NS,a);
          if(tagA)run(R,ZS,y,0,8,mix(P2.paper,TG,.55),a*(k===5?e:1),{ns:1});
          rowLabel(R,ZS,y,name,a,P2.ink);
          if(k===4&&n)R.label([bx(o+n/2-.5),y+H,ZS],(key==='Connected'?'session_id':'attempt')+' at '+o,{fs:12,dy:-8,c:DA,b:1,a});
          if(k>=5)R.label([bx(3.5),y+H,ZS],short(FW[key]),{mono:true,fs:12.5,dy:-8,c:TG,b:1,a:k===5?e:1})});
        if(k>=5)R.label([bx(3.5),H,ZS],String(+FW.Failed),{mono:true,fs:12.5,dy:-8,c:CP,b:1,a:k===5?e:1});
        // the same 24 bytes, as a glass wall behind the stack
        R.glass([X0,0,ZS-.32],[NS*B,0,0],[0,LY[k>=6?4:3]+H+.1,0],{c:TG,a:.55*lay,nu:3,nv:k>=6?5:4});
        if(k===4)R.label([0,LY[3]+H+.1,ZS-.32],'Conn · '+sz('Conn')+' B: the same bytes, four ways',{fs:13,b:1,dy:-10,a:lay});
        // match reads the first word to pick the arm
        if(k>=5){const mp=[bx(3.5),.3,ZS+2.6];R.box([mp[0],0,mp[2]],[1.2,.6,.6],{fill:mix(P.paper,TG,.3),a:k===5?e:1});R.label([mp[0],0,mp[2]],'match c reads the first word',{mono:true,fs:12.5,b:1,dy:18,a:k===5?e:1});
          [0,1,2,3].forEach(li=>R.flowArc([bx(1+li*2),LY[li]+H/2,ZS+.25],[mp[0]-.3+li*.2,.6,mp[2]],.3,{c:li?TG:CP,a:(k===5?e:1)*.85,r:.055,n:5,speed:1.2}))}
        // Option<Conn>: None is the next unused value
        if(k>=6){const y=LY[4],a=k===6?e:1;ghost(R,ZS,y,0,NS,a);run(R,ZS,y,0,8,mix(P.paper,TG,.75),a,{ns:1});rowLabel(R,ZS,y,'None::<Conn>',a,P.ink);
          R.label([bx(3.5),y+H,ZS],short(FW['None::<Conn>']),{mono:true,fs:12.5,dy:-8,c:TG,b:1,a});
          R.label([bx(NS)+.1,y+H/2,ZS],'Option<Conn> · '+sz('Option<Conn>')+' B',{fs:13,b:1,al:'left',dx:8,c:TG,a})}}}
  }
  const full={cam:[.25,.62],bounds:[[-4.6,0,-3],[4.4,1.2,4.6]]};
  S3.stage({id:'stg-lay',list:'sx-lay',fig:'An enum in memory, one cube per byte',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4600,draw,
    view:k=>k===0?{cam:[.2,.62],bounds:[[-2.6,0,3.4],[-.4,.4,4.7]]}:k===1?{cam:[.2,.62],bounds:[[-2.6,0,1.6],[1,.4,2.9]]}:k===2?{cam:[.2,.62],bounds:[[-2.6,0,-.1],[4.2,.4,1.2]]}:
      k===3?{cam:[.2,.68],bounds:[[-2.6,0,-3],[2.6,.5,-1]]}:{cam:[.3,.42],bounds:[[-2.6,0,-1.7],[3.4,2.5,k>=5?1.6:-.9]]},
    margin:w=>w<520?[28,10,14,10]:[30,14,16,190]});
})();
