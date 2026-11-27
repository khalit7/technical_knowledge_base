// The RAM toy (section 2): one Gated DeltaNet head, 8 x 8 state (rows = addresses, columns = bits), the program of src/recompute.py.
// Update (row convention): S <- alpha*S; S <- S + beta * k (v - S^T k)^T; read o = S^T q. check_page.mjs compares QP_TOY.run with inputs/recompute.json.
(function(){
  const D=8,OVERLAP=0.4;
  const PROG=[['w',3,0x2A],['w',4,0xC5],['w',3,0x71],['idle',40],['r']];
  const bits=b=>[...Array(8)].map((_,i)=>(b>>(7-i))&1);
  const hex=b=>'0x'+b.toString(16).toUpperCase().padStart(2,'0');
  function key(r,mode){const k=Array(D).fill(0);k[r]=1;if(mode==='overlap'){k[(r+1)%D]=OVERLAP;const n=Math.sqrt(1+OVERLAP*OVERLAP);for(let i=0;i<D;i++)k[i]/=n}return k}
  function step(S,a,b,k,v){
    for(let i=0;i<D;i++)for(let j=0;j<D;j++)S[i][j]*=a;
    if(b===0)return;
    const sk=[];for(let j=0;j<D;j++){let s=0;for(let i=0;i<D;i++)s+=S[i][j]*k[i];sk.push(s)}
    for(let i=0;i<D;i++)for(let j=0;j<D;j++)S[i][j]+=b*k[i]*(v[j]-sk[j]);
  }
  // state after the first n program steps (n = 0..4); same order of operations as recompute.py
  function stateAfter(n,a,b,mode){
    const S=[...Array(D)].map(()=>Array(D).fill(0));
    for(let p=0;p<n&&p<4;p++){const op=PROG[p];
      if(op[0]==='w')step(S,a,b,key(op[1],mode),bits(op[2]));
      else for(let t=0;t<op[1];t++)step(S,a,0,null,null)}
    return S;
  }
  function read(S,r,mode){const q=key(r,mode),o=[];for(let j=0;j<D;j++){let s=0;for(let i=0;i<D;i++)s+=S[i][j]*q[i];o.push(s)}return o}
  function run(a,b,mode){const S=stateAfter(4,a,b,mode),out={};
    [[3,0x71],[4,0xC5]].forEach(([r,want])=>{const o=read(S,r,mode);const dec=o.reduce((acc,x,j)=>acc|((x>=0.5?1:0)<<(7-j)),0);
      out[r]={raw:o,decoded:dec,want:want,exact:o.every((x,j)=>Math.abs(x-bits(want)[j])<1e-12)}});return out}
  window.QP_TOY={run:run};
  const el=document.getElementById('qp-toy-svg');if(!el)return;
  const cap=document.getElementById('qp-toy-cap'),outEl=document.getElementById('qp-toy-out');
  const P={a:1,b:1,mode:'onehot'};
  const f3=x=>(Math.abs(x)<5e-4?0:x).toFixed(3);
  const cellN=x=>Math.abs(x-Math.round(x))<5e-3?String(Math.round(x)):x.toFixed(2).replace(/^(-?)0\./,'$1.');
  function caps(i){const a=P.a,b=P.b,dk=P.mode==='overlap'?' Overlapping keys also touch the next row.':'';
    return ['Eight empty addresses. Watch row 3: it is written, then overwritten.',
      'Write 0x2A (00101010) at address 3: the key selects row 3 and the row takes the value'+(b<1?', but only a share β = '+b.toFixed(2)+' of it.':'.')+dk,
      'Write 0xC5 (11000101) at address 4; row 3 keeps its byte'+(a<1?', already scaled once by α = '+a.toFixed(3)+'.':'.'),
      'Overwrite address 3 with 0x71 (01110001): the rule reads the old row and writes the difference'+(b<1?'; a share 1 − β = '+(1-b).toFixed(2)+' of 0x2A stays in the row.':', so 0x2A is gone completely.'),
      '40 tokens with no write: the whole state is multiplied by α = '+a.toFixed(3)+' each time'+(a<1?', so every stored number shrinks to '+Math.pow(a,40).toFixed(3)+' of its size.':', so nothing changes.'),
      'Read addresses 3 and 4 with a one-hot query each: the readout below decodes the bits at 0.5.'][i]}
  function draw(i){
    const W=RD.width(el),c=Math.max(24,Math.min(32,Math.floor((W-74)/9))),showN=c>=32;
    const S=stateAfter(Math.min(i,4),P.a,P.b,P.mode);
    const op=i>=1&&i<=3?PROG[i-1]:null;
    const kv=op?key(op[1],P.mode):(i===5?null:null);
    const x0=50+Math.max(0,Math.floor((W-(64+9*c+14))/2)),gx=x0+c+14,y0=34,H=y0+8*c+14+c+24;
    let s='';
    s+=RD.t(x0+c/2,y0-10,'key',{a:'middle',fill:'var(--mute)'})+RD.t(gx+4*c,y0-10,'state S: bit 7 to bit 0',{a:'middle',fill:'var(--mute)'});
    const cell=(x,y,v,cls,stroke)=>{const a=Math.min(1,Math.abs(v));const col=v<0?'var(--bad)':'var(--acc)';
      return '<rect class="'+(cls||'')+'" x="'+(x+1)+'" y="'+(y+1)+'" width="'+(c-2)+'" height="'+(c-2)+'" rx="4" fill="var(--soft)" stroke="'+(stroke||'var(--line)')+'"/>'+
        (a>1e-9?'<rect class="'+(cls||'')+'" x="'+(x+1)+'" y="'+(y+1)+'" width="'+(c-2)+'" height="'+(c-2)+'" rx="4" fill="'+col+'" fill-opacity="'+(0.12+0.88*a).toFixed(3)+'"/>':'')+
        (showN&&a>1e-9?RD.t(x+c/2,y+c/2+4,cellN(v),{a:'middle',fs:11,fill:a>0.55?'var(--bg)':'var(--ink)'}):'')};
    for(let r=0;r<D;r++){const y=y0+r*c;const hot=(op&&op[1]===r)||(i===5&&(r===3||r===4));
      s+=RD.t(x0-8,y+c/2+4,'addr '+r,{a:'end',fs:12,fill:hot?'var(--ink)':'var(--mute)',w:hot?600:400});
      const kval=op?kv[r]:(i===5&&(r===3||r===4)?1:0);
      s+=cell(x0,y,kval,'',kval?'var(--acc)':null);
      for(let j=0;j<D;j++)s+=cell(gx+j*c,y,S[r][j],(op&&op[1]===r)?'rd-new':'');
      if(hot)s+='<rect x="'+(gx-1)+'" y="'+y+'" width="'+(8*c+2)+'" height="'+c+'" rx="6" fill="none" stroke="var(--ink)" stroke-width="2"/>';
    }
    const yv=y0+8*c+14;
    if(op){s+=RD.t(gx-8,yv+c/2+4,'value v',{a:'end',fs:12,fill:'var(--mute)'});bits(op[2]).forEach((b,j)=>{s+=cell(gx+j*c,yv,b,'rd-new')});
      s+=RD.t(gx+8*c,yv+c+16,hex(op[2])+' written to address '+op[1]+' (β = '+P.b.toFixed(2)+')',{a:'end',fs:12,fill:'var(--mute)'})}
    else if(i===4)s+=RD.t(gx+4*c,yv+c/2+4,'× α = '+P.a.toFixed(3)+' on each of 40 tokens',{a:'middle',fs:12,fill:'var(--mute)'});
    else if(i===5)s+=RD.t(gx+4*c,yv+c/2+4,'one-hot queries on rows 3 and 4: o = Sᵀq',{a:'middle',fs:12,fill:'var(--mute)'});
    else s+=RD.t(gx+4*c,yv+c/2+4,'every row starts at 0',{a:'middle',fs:12,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'An 8 by 8 Gated DeltaNet state used as memory, step '+(i+1)+' of 6');
    cap.textContent=caps(i);
    // readout
    let h='';
    if(i===5){const R=run(P.a,P.b,P.mode);
      [3,4].forEach(r=>{const o=R[r];h+=RD.stat('Address '+r+' (stored '+hex(o.want)+')',
        'reads '+hex(o.decoded)+' <span class="'+(o.exact?'qp-ok':'qp-no')+'">'+(o.exact?'exact':(o.decoded===o.want?'right, not exact':'wrong'))+'</span>',
        'raw: '+o.raw.map(f3).join(' '))})}
    else if(i>=1){const r=i===2?4:3;h+=RD.stat('Row '+r+' now holds','<code>'+S[r].map(f3).join(' ')+'</code>','')}
    else h+=RD.stat('Settings','α = '+P.a.toFixed(3)+', β = '+P.b.toFixed(2)+', '+(P.mode==='onehot'?'one-hot':'overlapping')+' keys','the readout appears at step 6');
    outEl.innerHTML=h;
  }
  const A=RD.anim({card:'qp-toy',ctl:'qp-toy-ctl',n:6,draw:draw,ms:4200,label:'Program step',list:'sx-toy'});
  const sa=document.getElementById('qp-a'),sb=document.getElementById('qp-b');
  const upd=()=>{P.a=+sa.value;P.b=+sb.value;document.getElementById('qp-a-v').textContent=P.a.toFixed(3);document.getElementById('qp-b-v').textContent=P.b.toFixed(2);A.redraw()};
  sa.addEventListener('input',upd);sb.addEventListener('input',upd);
  RD.seg(document.getElementById('qp-keys'),m=>{P.mode=m;A.redraw()});
  RD.onResize(()=>A.redraw());
})();
