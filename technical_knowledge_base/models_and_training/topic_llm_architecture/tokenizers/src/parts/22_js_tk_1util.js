// ---- Token pieces from the stored boundaries, and chips (shared by every tab) ----
window.TKV=(function(){
  const te=new TextEncoder(),td=new TextDecoder('utf-8',{fatal:true});
  const B36='0123456789abcdefghijklmnopqrstuvwxyz';
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  // spec: base-36 string of byte lengths ('+' prefix: the tokenizer added a leading space), '[' + comma list, or an array of piece strings
  function pieces(text,spec){
    if(Array.isArray(spec))return spec.map(p=>p.charCodeAt(0)===0?{hex:p.slice(1).match(/../g).join(' '),n:(p.length-1)/2}:{s:p,n:te.encode(p).length});
    let b=te.encode(text),sp=spec;
    if(sp[0]==='+'){const c=new Uint8Array(b.length+1);c[0]=32;c.set(b,1);b=c;sp=sp.slice(1)}
    const L=sp[0]==='['?sp.slice(1).split(',').map(Number):Array.from(sp,ch=>B36.indexOf(ch));
    const out=[];let o=0;
    for(const n of L){const sl=b.slice(o,o+n);o+=n;
      try{out.push({s:td.decode(sl),n})}catch(e){out.push({hex:Array.from(sl,x=>x.toString(16).padStart(2,'0')).join(' '),n})}}
    return out}
  const count=(text,spec)=>pieces(text,spec).length;
  function chipText(s){return esc(s).replace(/ /g,'<span class="ws">␣</span>').replace(/\n/g,'<span class="ws">↵</span>').replace(/\t/g,'<span class="ws">⇥</span>')}
  function chips(list,opt){opt=opt||{};let h='<div class="tks">';
    list.forEach((p,i)=>{const cls='tk '+(p.hex?'x':(i%2?'b':'a'))+(opt.mark&&opt.mark(p,i)?' new':'');
      const t=p.hex?'bytes '+p.hex+' (part of a character)':(p.s);
      h+='<span class="'+cls+'" title="'+esc(t)+'">'+(p.hex?'‹'+p.hex+'›':chipText(p.s))+'</span>'});
    return h+'</div>'}
  const strChips=(arr,mark)=>chips(arr.map(s=>({s})),{mark:mark?((p,i)=>mark(p.s,i)):null});
  const fmt=(x,d)=>x.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const TOKS=window.TD.tok, TK=TOKS.map(t=>t.k), LAB=Object.fromEntries(TOKS.map(t=>[t.k,t.label]));
  const SHORT={gpt2:'GPT-2',cl100k:'GPT-4',o200k:'GPT-4o',llama2:'Llama 2',llama3:'Llama 3',llama4:'Llama 4',qwen3:'Qwen3',qwen35:'Qwen3.5',gemma3:'Gemma 3',dsv3:'DeepSeek-V3'};
  return {pieces,count,chips,strChips,chipText,esc,fmt,TK,LAB,SHORT,TOKS,te};
})();
