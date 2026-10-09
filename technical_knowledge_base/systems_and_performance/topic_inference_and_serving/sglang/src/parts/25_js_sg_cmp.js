// ---- Reading section 3: radix tree against hash blocks on four traces (data: SGD.cache from src/iso/gen_iso.py) ----
(function(){
  if(!window.SGD)return;const D=SGD.cache,pct=(a,b)=>(100*a/b).toFixed(1)+'%',fmt=n=>n.toLocaleString('en-US');
  const row=(t,c)=>D.find(r=>r.trace===t&&r.cap===c);
  const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
  const ci=row('chat',1000000),ai=row('agent',1000000),r6=row('rag',6000);
  set('sg-n-chat-inf',pct(ci.rh,ci.prompt));set('sg-n-chat-inf-b',pct(ci.bh,ci.prompt));
  set('sg-n-agent-inf',pct(ai.rh,ai.prompt));set('sg-n-agent-inf-b',pct(ai.bh,ai.prompt));
  set('sg-n-rag-6k',pct(r6.rh,r6.prompt));set('sg-n-rag-6k-b',pct(r6.bh,r6.prompt));
  set('sg-n-chat-nodes',fmt(ci.nodes));set('sg-n-chat-blocks',fmt(ci.blocks));
  if(SGD.real)set('sg-real-n',fmt(SGD.real.requests/3)+' requests ('+SGD.real.runs+' replays: '+SGD.real.identical+' identical)');
  const k=document.getElementById('sg-k-tree');if(k)k.textContent='within '+Math.max(...D.filter(r=>r.cap===1000000&&r.prompt).map(r=>Math.abs(r.rh-r.bh)/r.prompt*100)).toFixed(1)+' points';
  const caps=[6000,12000,24000,48000,1000000],names={chat:'Chat assistant',agent:'Coding agent',unique:'Unrelated prompts',rag:'Questions on 8 documents'};
  const segEl=document.getElementById('sg-cmp-cap'),bars=document.getElementById('sg-cmp-bars');if(!segEl)return;
  segEl.innerHTML=caps.map((c,i)=>'<button data-m="'+c+'"'+(c===1000000?' class="on"':'')+'>'+(c===1000000?'room for all':fmt(c)+' slots')+'</button>').join('');
  function draw(cap){let h='';for(const t of ['chat','agent','unique','rag']){const r=row(t,cap);
      const a=100*r.rh/r.prompt,b=100*r.bh/r.prompt;
      h+='<div class="row"><div class="nm">'+names[t]+'<span class="ml">radix tree</span></div><div class="track"><div class="fill" style="width:'+a.toFixed(2)+'%;background:var(--good)"></div></div><div class="val">'+a.toFixed(1)+'%</div></div>';
      h+='<div class="row"><div class="nm"><span class="ml">hash blocks</span></div><div class="track"><div class="fill" style="width:'+b.toFixed(2)+'%;background:var(--acc)"></div></div><div class="val">'+b.toFixed(1)+'%</div></div>'}
    bars.innerHTML=h}
  RD.seg(segEl,m=>draw(+m));draw(1000000);
})();
