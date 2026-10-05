// ---- WebSocket bytes tab ----
(function(){
  const W=window.SDATA.wsb,esc=RD.esc,F=W.frames;
  const list=document.getElementById('wb-list');if(!list)return;
  const lbl=f=>f.opcode?(f.opcode+(f.fin===false?' (FIN=0)':'')+(f.payload_text!==undefined&&f.payload_text!==null?' "'+f.payload_text.slice(0,40)+'"':'')+(f.close_code?' '+f.close_code:'')):(f.note.indexOf('101')>=0?'101 Switching Protocols':'GET (upgrade request)');
  list.innerHTML=F.map((f,i)=>'<button data-i="'+i+'" class="'+(f.dir.startsWith('client')?'up':'dn')+'">'+(i+1)+'. '+esc(lbl(f))+' <span class="mute">'+f.len+' B</span></button>').join('');
  const NAMES=['FIN, RSV, opcode','MASK and length','extended length','masking key','payload','HTTP text'];
  let maskA=null,cur=0;
  function fields(f){const b=f.hex.match(/../g).map(h=>parseInt(h,16));
    if(!f.opcode)return {b,cls:b.map(()=>5),rows:[]};
    const fin=b[0]>>7,rsv=(b[0]>>4)&7,op=b[0]&15,m=b[1]>>7;let n=b[1]&127,p=2,ext=0;
    if(n===126){ext=2;n=b[2]*256+b[3]}else if(n===127){ext=8}
    p+=ext;const key=m?b.slice(p,p+4):null;const ps=p+(m?4:0);
    const cls=b.map((_,i)=>i===0?0:i===1?1:i<2+ext?2:(m&&i<ps)?3:4);
    const bin=v=>v.toString(2).padStart(8,'0');
    const rows=[['Byte 1',bin(b[0]),'FIN='+fin+' (last fragment: '+(fin?'yes':'no')+'), RSV='+rsv+', opcode='+op+' ('+f.opcode+')'],
      ['Byte 2',bin(b[1]),'MASK='+m+(m?' (client frames must be masked)':' (server frames are never masked)')+', length '+(b[1]&127)+(ext?' (see extended length)':' bytes')]];
    if(ext)rows.push(['Extended length',b.slice(2,2+ext).map(x=>x.toString(16).padStart(2,'0')).join(' '),n+' bytes']);
    if(m)rows.push(['Masking key',key.map(x=>x.toString(16).padStart(2,'0')).join(' '),'4 random bytes, new for every frame']);
    const pl=b.slice(ps);let txt;
    if(f.opcode==='close'&&pl.length>=2){const raw=m?pl.map((x,i)=>x^key[i%4]):pl;txt='code '+(raw[0]*256+raw[1])+', reason "'+String.fromCharCode(...raw.slice(2))+'"'}
    else txt=f.payload_text!==undefined&&f.payload_text!==null?'"'+f.payload_text+'"':'';
    rows.push(['Payload',pl.length+' bytes',(m?'masked; unmasked: ':'')+txt]);
    return {b,cls,rows,key,ps,m};
  }
  function render(i){cur=i;const f=F[i];list.querySelectorAll('button').forEach(x=>x.classList.toggle('on',+x.dataset.i===i));
    const x=fields(f);
    document.getElementById('wb-head').innerHTML='<div class="t" style="font-weight:600">'+(i+1)+'. '+esc(f.dir)+', '+f.len+' bytes, at '+(f.t*1000).toFixed(1)+' ms</div><p class="small">'+esc(f.note||'')+'</p>';
    const MAXB=64;
    document.getElementById('wb-bytes').innerHTML=x.b.slice(0,MAXB).map((v,k)=>'<span class="f'+x.cls[k]+'" title="'+NAMES[x.cls[k]]+'">'+v.toString(16).padStart(2,'0')+'</span>').join('')+(x.b.length>MAXB?'<span class="more">... '+(x.b.length-MAXB)+' more</span>':'');
    const used=[...new Set(x.cls)];
    document.getElementById('wb-leg').innerHTML=used.map(c=>'<span class="f'+c+'" style="color:#fff;border-radius:3px;padding:0 6px;margin-right:6px">'+NAMES[c]+'</span>').join('');
    document.getElementById('wb-fields').innerHTML=f.opcode?'<div class="tw"><table><thead><tr><th>Field</th><th>Bits or bytes</th><th>Meaning</th></tr></thead><tbody>'+x.rows.map(r=>'<tr><td>'+r[0]+'</td><td class="mono">'+esc(r[1])+'</td><td>'+esc(r[2])+'</td></tr>').join('')+'</tbody></table></div>':'<pre class="hs">'+esc((f.text||'').replace(/\r/g,'').replace(/^Date:.*\n/m,''))+'</pre>';
    const mk=document.getElementById('wb-mask');
    if(x.m&&x.b.length>x.ps){mk.hidden=false;const pl=x.b.slice(x.ps);maskA.reset(pl.length);maskA.go(0);if(!RD.RM)maskA.play()}else mk.hidden=true;
  }
  function drawMask(k){const f=F[cur],x=fields(f);if(!x.m)return;const pl=x.b.slice(x.ps);
    const h=v=>v.toString(16).padStart(2,'0'),ch=v=>v>=32&&v<127?String.fromCharCode(v):'·';
    document.getElementById('wb-xr').innerHTML=pl.map((v,j)=>{const o=v^x.key[j%4];return '<div class="'+(j===k?'on':'')+'">'+h(v)+' xor '+h(x.key[j%4])+'<br>= '+(j<=k?h(o)+' "'+esc(ch(o))+'"':'??')+'</div>'}).join('');
    const o=pl[k]^x.key[k%4];
    document.getElementById('wb-cap').innerHTML='<div class="t">Byte '+(k+1)+' of '+pl.length+'</div><p>Masked byte '+h(pl[k])+' XOR key byte '+(k%4+1)+' ('+h(x.key[k%4])+') = '+h(o)+', the character "'+esc(ch(o))+'".</p>'}
  maskA=RD.anim({card:'wb-card',ctl:'wb-ctl',n:4,draw:drawMask,ms:900,label:'Byte',tab:'t-ws'});
  list.addEventListener('click',e=>{const b=e.target.closest('button');if(b)render(+b.dataset.i)});
  render(3);
  // header size calculator
  const NS=[0,1,3,83,125,126,1000,65535,65536,1048576];
  const s=document.getElementById('wc-n'),d=document.getElementById('wc-d');
  function calc(){const n=NS[+s.value],c=d.value==='c';const len=n<126?0:n<65536?2:8;const hb=2+len+(c?4:0);
    document.getElementById('wc-nv').textContent=n.toLocaleString('en-US');
    document.getElementById('wc-out').innerHTML=RD.stat('Header bytes',String(hb),'2 fixed'+(len?' + '+len+' extended length':'')+(c?' + 4 masking key':''))+RD.stat('7-bit length field',String(n<126?n:n<65536?126:127),n<126?'the length itself':'a marker: read the next '+len+' bytes')+RD.stat('Overhead',n?(hb/(n+hb)*100).toPrecision(3)+'%':'100%','of the bytes on the wire')}
  s.addEventListener('input',calc);d.addEventListener('change',calc);calc();
})();
