// ---- Trace and context lab: shared helpers (prices, formatting, a step controller registered on t-trace) ----
window.TRC=(function(){
  const D=window.TRC_DATA||[];const by={};D.forEach(r=>by[r.id]=r);
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  // List prices per million tokens, Anthropic pricing page read 2026-10-05 (also in scratchpad FACTS.md):
  // in = base input, w5 = 5-minute cache write (1.25x), w1 = 1-hour cache write (2x), r = cache read, out = output.
  const PRICES={
    'claude-haiku-4-5-20251001':{name:'Haiku 4.5',in:1,w5:1.25,w1:2,r:0.10,out:5},
    'claude-sonnet-5-5':{name:'Sonnet 5.5',in:2,w5:2.5,w1:4,r:0.20,out:10}
  };
  const P=m=>PRICES[m]||PRICES['claude-haiku-4-5-20251001'];
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const n0=x=>x==null||isNaN(x)?'n/a':Math.round(x).toLocaleString('en-US');
  const k1=x=>x==null||isNaN(x)?'n/a':(Math.abs(x)>=1000?(x/1000).toFixed(x>=100000?0:1)+'K':String(Math.round(x)));
  const usd=x=>x==null||isNaN(x)?'n/a':'$'+(x<0.1?x.toFixed(4):x.toFixed(3));
  const sec=ms=>ms==null?'n/a':(ms/1000).toFixed(1)+' s';
  // a call row is [fresh input, cache write, cache read, output, thinking, stop reason, parent tool id, model that answered, written with the 5-minute TTL]
  // the price is the model that answered the call (plan mode answered with Sonnet although the run asked for Haiku)
  const callCost=(c,m)=>{const p=P(c[7]||m);return (c[0]*p.in+c[1]*(c[8]?p.w5:p.w1)+c[2]*p.r+c[3]*p.out)/1e6};
  const callCostNoCache=(c,m)=>{const p=P(c[7]||m);return ((c[0]+c[1]+c[2])*p.in+c[3]*p.out)/1e6};
  const ctxOf=c=>c[0]+c[1]+c[2];
  const main=r=>r.calls.filter(c=>!c[6]);
  const toolCalls=r=>r.ev.filter(e=>e.k==='tool');
  const derived=r=>({
    calls:main(r).length, allcalls:r.calls.length, tools:toolCalls(r).length,
    inTot:r.calls.reduce((s,c)=>s+ctxOf(c),0), out:r.u.out, cw:r.u.cw, cr:r.u.cr, fresh:r.u.in,
    first:r.calls.length?ctxOf(r.calls[0]):0, last:main(r).length?ctxOf(main(r)[main(r).length-1]):0,
    cost:r.cost, recost:r.calls.reduce((s,c)=>s+callCost(c,r.model),0), dur:r.dur, den:r.denials.length,
    crshare:r.calls.reduce((s,c)=>s+c[2],0)/Math.max(1,r.calls.reduce((s,c)=>s+ctxOf(c),0)),
    sub:r.sub, turns:r.turns, errs:r.ev.filter(e=>e.k==='res'&&e.e).length
  });
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-trace']=window.TAB_RENDER['t-trace']||[]).push(f)};
  const tabShown=()=>{const t=document.getElementById('t-trace');return t&&!t.hidden};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-40))};
  const onResize=f=>{let t=0;addEventListener('resize',()=>{if(!tabShown())return;clearTimeout(t);t=setTimeout(f,80)})};
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  // the step controller: LABANIM (24_js_labanim.js), RD.anim with the lab additions and the 2026-11-06 motion rules
  const anim=o=>window.LABANIM('t-trace',o);
  // fill <span data-trc="runId.field"> with numbers computed from the recordings, so prose and data cannot drift
  function fill(root){(root||document.getElementById('t-trace')).querySelectorAll('[data-trc]').forEach(el=>{
    const [id,f]=el.dataset.trc.split('.');const r=by[id];if(!r){el.textContent='n/a';return}const d=derived(r);
    const v={calls:d.calls,tools:d.tools,turns:d.turns,den:d.den,errs:d.errs,sub:d.sub,cost:usd(d.cost),dur:sec(d.dur),inTot:n0(d.inTot),out:n0(d.out),cw:n0(d.cw),cr:n0(d.cr),fresh:n0(d.fresh),first:n0(d.first),last:n0(d.last),crpct:Math.round(d.crshare*100)+'%',ctxwin:n0(r.ctxwin),model:(P(r.model).name)}[f];
    el.textContent=v==null?'n/a':v})}
  return {D,by,PRICES,P,esc,n0,k1,usd,sec,callCost,callCostNoCache,ctxOf,main,derived,onRender,width,onResize,T,svg,anim,fill,RM,tabShown};
})();
