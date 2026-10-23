// ---- section 2: the pickle machine, step by step, on the real disassemblies (pickletools output in MF.pk) ----
(function(){
  const card=document.getElementById('mf-pk-card');if(!card)return;
  const E=RD.esc,opsEl=document.getElementById('mf-pk-ops'),stEl=document.getElementById('mf-pk-stack'),cap=document.getElementById('mf-pk-cap'),cnt=document.getElementById('mf-pk-cnt');
  document.getElementById('mf-pk-wo').textContent=MF.pk.wo;
  function parse(txt){return txt.split('\n').map(l=>l.match(/^\s*(\d+):\s+(\S+)\s+([A-Z_0-9]+)\s*(.*)$/)).filter(Boolean).map(m=>({pos:+m[1],op:m[3],arg:m[4].replace(/\s*\(MARK at \d+\)/,'').trim(),line:m[0].replace(/^\s+/,'')}))}
  // run the pickle machine symbolically (nothing is imported or called); record the state after every opcode
  function run(ops){let st=[],memo={},calls=0,imps=0,stor=0,states=[];const MARK={m:1};
    const show=v=>v===MARK?'MARK':typeof v==='string'?v:JSON.stringify(v);
    const popMark=()=>{const i=st.lastIndexOf(MARK);const it=st.slice(i+1);st=st.slice(0,i);return it};
    ops.forEach(o=>{let note='',danger=false;const a=o.arg.replace(/^'|'$/g,'');
      switch(o.op){
        case 'PROTO':note='protocol '+a;break;
        case 'EMPTY_DICT':st.push('{}');note='push an empty dict (the state dict to fill)';break;
        case 'EMPTY_TUPLE':st.push('()');break;
        case 'BINPUT':memo[a]=st[st.length-1];break;
        case 'BINGET':st.push(memo[a]);note='reuse an object seen before';break;
        case 'MARK':st.push(MARK);break;
        case 'BINUNICODE':st.push("'"+a+"'");break;
        case 'BININT1':st.push(a);break;
        case 'NEWFALSE':st.push('False');break;
        case 'GLOBAL':{const [m,n]=a.split(' ');st.push('<'+m+'.'+n+'>');imps++;danger=true;note='GLOBAL imports '+m+'.'+n+' and pushes it: any module, any name';break}
        case 'TUPLE':{const it=popMark();st.push('('+it.map(show).join(', ')+')');break}
        case 'TUPLE1':{const x=st.pop();st.push('('+show(x)+',)');break}
        case 'TUPLE2':{const y=st.pop(),x=st.pop();st.push('('+show(x)+', '+show(y)+')');break}
        case 'BINPERSID':{const x=st.pop();const id=(x.match(/'(\d+)'/)||[])[1];stor++;st.push('storage data/'+id);note='persistent id: the loader fetches raw bytes from the zip member data/'+id;break}
        case 'REDUCE':{const args=st.pop(),fn=st.pop();calls++;danger=true;const f=String(fn).replace(/[<>]/g,'');
          st.push('result of '+f+'(...)');note='REDUCE calls '+f+' with '+show(args).slice(0,90)+(show(args).length>90?'...':'');break}
        case 'SETITEMS':{const it=popMark();st[st.length-1]='{'+Array.from({length:it.length/2},(_,i)=>show(it[2*i])).join(', ')+'}';note='store '+it.length/2+' entries in the dict';break}
        case 'SETITEM':{st.pop();const k=st.pop();st[st.length-1]='{'+show(k)+': result}';note='store one entry in the dict';break}
        case 'STOP':note='STOP: the top of the stack is what the loader returns';break;
      }
      states.push({st:st.map(show),calls,imps,stor,note,danger});
    });return states}
  const MODES={};
  [['tiny',MF.pk.dis],['evil',MF.pk.evilDis]].forEach(([k,t])=>{const ops=parse(t),states=run(ops);
    const key=new Set(['GLOBAL','REDUCE','BINPERSID','SETITEMS','SETITEM','STOP']);const steps=[0];
    ops.forEach((o,i)=>{if(i&&key.has(o.op))steps.push(i)});MODES[k]={ops,states,steps}});
  // safetensors: the same two tensors
  const T=MF.tinySt,hx=T.hex,n=T.header_len;
  const stSteps=[
    {a:0,b:8,t:'Read 8 bytes',p:'a8 00 00 00 00 00 00 00 read little-endian is '+n+': the JSON header is '+n+' bytes. No code, just a number.'},
    {a:8,b:8+n,t:'Parse the JSON header',p:'A JSON parser reads '+n+' bytes. JSON has strings, numbers, lists and maps; it cannot name a function.'},
    {a:8+T.header.indexOf('"layer.bias"'),b:8+T.header.indexOf('},"layer.weight"')+1,t:'Entry: layer.bias',p:'F32, shape [2], bytes [0, 8) of the buffer.'},
    {a:8+T.header.indexOf('"layer.weight"'),b:8+T.header.trimEnd().length-1,t:'Entry: layer.weight',p:'BF16, shape [2, 3], bytes [8, 20) of the buffer.'},
    {a:8+T.header.trimEnd().length,b:8+n,t:'Padding',p:(n-T.header.trimEnd().length)+' spaces so the buffer starts at a multiple of 8.'},
    {a:8+n,b:8+n+8,t:'Slice layer.bias',p:'8 bytes at offset '+(8+n)+': two F32 zeros. A view, no copy needed.'},
    {a:8+n+8,b:8+n+20,t:'Slice layer.weight',p:'12 bytes: six BF16 values '+T.weight_values.flat().join(', ')+'. Done: two tensors, nothing imported, nothing called.'}];
  let mode='tiny';
  function hexLines(a,b){let s='';for(let i=0;i<hx.length/2;i+=16){let l=('000'+i.toString(16)).slice(-4)+'  ';
    for(let j=i;j<Math.min(i+16,hx.length/2);j++){const by=hx.substr(2*j,2);l+=(j>=a&&j<b?'<b>'+by+'</b>':by)+' '}s+='<div>'+l+'</div>'}return s}
  const A=RD.anim({card:'mf-pk-card',ctl:'mf-pk-ctl',n:MODES.tiny.steps.length,ms:1500,label:'Pickle step',draw:i=>{
    if(mode==='st'){const s=stSteps[i];opsEl.innerHTML=hexLines(s.a,s.b);
      stEl.innerHTML='<div class="small mute">Result so far</div>'+(i>=5?'<div class="it">layer.bias: F32 [2] = [0, 0]</div>':'')+(i>=6?'<div class="it">layer.weight: BF16 [2, 3]</div>':'')+(i<5?'<div class="it">'+(i<1?'header length known':i<2?'header parsed':i<3?'header: bias entry':'header: bias and weight entries')+'</div>':'');
      cap.innerHTML='<div class="t">'+(i+1)+'/'+stSteps.length+'. '+s.t+'</div><p>'+s.p+'</p>';
      cnt.innerHTML=RD.stat('bytes read',MFU.c(Math.min(s.b,hx.length/2)),'of '+hx.length/2+' in the file')+RD.stat('functions imported','0')+RD.stat('functions called','0');return}
    const M=MODES[mode],k=M.steps[i],S=M.states[k],o=M.ops[k];
    opsEl.innerHTML=M.ops.map((x,j)=>'<div class="'+(j===k?'cur':j<k?'done':'')+((x.op==='GLOBAL'||x.op==='REDUCE')?' danger':'')+'">'+E(x.line)+'</div>').join('');
    const cur=opsEl.children[k];if(cur)opsEl.scrollTop=Math.max(0,cur.offsetTop-opsEl.offsetTop-90);
    stEl.innerHTML='<div class="small mute">Stack (top last)</div>'+S.st.slice(-7).map(v=>'<div class="it'+(/^result of|^<builtins|^<__builtin__/.test(v)?' call':'')+'">'+E(v.length>110?v.slice(0,110)+'...':v)+'</div>').join('');
    const evilCall=mode==='evil'&&o.op==='REDUCE';
    cap.innerHTML='<div class="t">'+(i+1)+'/'+M.steps.length+'. Opcode '+(k+1)+' of '+M.ops.length+': '+o.op+'</div><p>'+E(S.note||'push values for the next call')+'</p>'+
      (evilCall?'<p><b>This is the attack.</b> Loading with plain pickle printed our message; swap print for os.system and it runs a shell command with your permissions.</p>':'')+
      (mode==='tiny'&&o.op==='STOP'?'<p>To rebuild 2 small tensors the loader imported '+S.imps+' names and made '+S.calls+' calls. weights_only=True allows exactly these names and refuses all others.</p>':'');
    cnt.innerHTML=RD.stat('opcodes run',(k+1)+' of '+M.ops.length)+RD.stat('functions imported',S.imps)+RD.stat('functions called',S.calls,mode==='tiny'?'storages fetched: '+S.stor:'')}});
  RD.seg(document.getElementById('mf-pk-mode'),m=>{mode=m;A.reset(m==='st'?stSteps.length:MODES[m].steps.length)});
})();
