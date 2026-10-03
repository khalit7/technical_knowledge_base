// ---- Reading: one sentence, six ways to cut it (BLT Figure 3), stepped from bytes to entropy patches ----
(function(){
  const {pieces,esc,te}=TKV,stat=RD.stat;
  const S='Daenerys Targaryen is in Game of Thrones, a fantasy epic by George R.R. Martin.';
  // Transcribed from the BLT paper's Figure 3 (patch text only; the figure does not show spaces): spaces are attached to the following patch.
  const FIG={
    space:'Daenerys|Targaryen|is|in|Game|of|Thrones,|a|fantasy|epic|by|George|R.|R.|Martin.',
    ent:'D|a|e|nerys Targaryen|is|in|G|ame|of Thrones,|a|fa|ntasy|epic|by|G|eorge R.R. Martin.',
    mono:'D|aenerys Targar|yen|is|in|Game|of Thrones|,|a|fantasy|epic|by|George R.R. Martin|.'
  };
  function align(fig){const out=[];let pos=0;
    for(const p of fig.split('|')){let st=pos;while(S[pos]===' ')pos++;if(S.slice(pos,pos+p.length)!==p)throw new Error('patch transcription does not align at "'+p+'"');pos+=p.length;out.push(S.slice(st,pos))}
    if(pos!==S.length)throw new Error('patches do not cover the sentence');return out}
  const bytes=Array.from(te.encode(S),b=>String.fromCharCode(b));
  const strided=[];for(let i=0;i<S.length;i+=4)strided.push(S.slice(i,i+4));
  const bpe=pieces(TD.fail.blt.text,TD.fail.blt.t.llama3).map(p=>p.s);
  const ROWS=[
    ['Bytes (ByT5)',bytes,'one step per UTF-8 byte; computed'],
    ['4-byte strides (MegaByte-style)',strided,'fixed patches; computed (the figure\'s row agrees)'],
    ['BPE (Llama 3)',bpe,'the real tokenizer, run offline'],
    ['Space patching',align(FIG.space),'new patch after a space-like byte; transcribed'],
    ['Entropy, global threshold',align(FIG.ent),'new patch where the small model\'s next-byte entropy is high; transcribed'],
    ['Entropy + monotonicity',align(FIG.mono),'new patch where entropy rises relative to the previous byte; transcribed']];
  const box=document.getElementById('patchRows'),mb=document.getElementById('patchMode');
  mb.innerHTML='<span class="an-ctl" id="patchCtl" style="width:100%"></span>';
  const show=s=>esc(s).replace(/ /g,'<span class="ws">␣</span>');
  function draw(i){let h='';
    ROWS.forEach(([n,p,s],k)=>{if(k>i)return;const cur=k===i;
      h+='<div class="trow"'+(cur?' style="background:var(--soft)"':'')+'><div class="nm">'+n+'<small>'+s+'</small></div><div><div class="strip">'+p.map(x=>'<span style="flex:'+te.encode(x).length+' 0 0" title="'+esc(x)+'"></span>').join('')+'</div>'+
        (cur&&k>0?'<div class="tks">'+p.map((x,j)=>'<span class="tk '+(j%2?'b':'a')+'">'+show(x)+'</span>').join('')+'</div>':'')+'</div><div class="n">'+p.length+'</div></div>'});
    const p=ROWS[i][1];
    box.innerHTML='<div class="an-cnt">'+stat('Steps for the large model',p.length,ROWS[i][0])+stat('Mean bytes per step',(te.encode(S).length/p.length).toFixed(2),te.encode(S).length+' bytes in all')+stat('Saving against bytes',(100*(1-p.length/bytes.length)).toFixed(0)+'%')+'</div>'+h}
  RD.anim({card:'patch',ctl:'patchCtl',n:ROWS.length,draw,ms:1800,label:'Patching scheme'});
})();
