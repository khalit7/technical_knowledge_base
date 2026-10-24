// ---- Reading, section 2: one recorded request, stage by stage (data: API_DATA.runs.trace, from run_experiments.py) ----
(function(){
  const card=document.getElementById('rd-life-card');if(!card)return;
  const D=window.API_DATA,T=D.runs.trace,esc=RD.esc,svg=document.getElementById('rd-life-svg'),cap=document.getElementById('rd-life-cap'),art=document.getElementById('rd-life-art');
  const order=T.order;
  const ord=hl=>'<div class="raw" style="white-space:pre-wrap">'+order.map((o,i)=>'<span class="ln'+(hl.includes(i)?' on':'')+'">'+(i+1)+'. '+esc(o)+'</span>').join('')+'</div>';
  const code=(a,b,x)=>'<div class="code">'+RAW.excerpt(D.src2,a,b,x||0)+'</div>';
  const scope=JSON.stringify(T.scope,null,1).replace(/\[\s*([^\[\]{}]*?)\s*\]/g,(m,a)=>'['+a.replace(/\s*\n\s*/g,' ')+']');
  const steps=[
    {hi:['srv'],t:'1. uvicorn turns bytes into a scope',p:'The server read the request line and headers off the socket and built the ASGI scope below: method, path, query string, headers as byte pairs (lower-cased names), and who is on each end. The body is not in it; the app pulls it with <code>receive()</code> only if a route needs it.',a:()=>'<div class="raw codebox">'+esc(scope)+'</div>'},
    {hi:['mw'],t:'2. Middleware runs, outermost first',p:'The two middlewares log their entry. The one registered <b>second</b> entered first: Starlette builds the stack so that the last middleware added wraps the others. Middleware sees every request, before any routing.',a:()=>ord([0,1])},
    {hi:['route'],t:'3. The router picks the function',p:'Starlette matches the method and path against the routes in order; <code>GET /trace</code> matches this one. No match gives 404; a path that exists with another method gives 405.',a:()=>code('@app.get("/trace")','async def trace')},
    {hi:['dep'],t:'4. Dependencies run, for this route only',p:'The handler asked for <code>Depends(current_user)</code>, so FastAPI ran it first and passed its result in. This is where authentication, a per-request database session and permission checks live; raising here answers 401 or 403 before the handler runs.',a:()=>ord([2])+code('def current_user','return "alice"')},
    {hi:['val'],t:'5. Inputs are parsed and validated',p:'Path and query parameters, headers and the JSON body are converted to the declared types; a failure answers 422 without running the handler (section 3). <code>/trace</code> has no body, so only the header was read.',a:()=>'<p class="small mute">The 422 answers of the chat API are shown in section 3.</p>'},
    {hi:['h'],t:'6. The handler runs',p:'Only now does your code run, with typed arguments and a known user. It returned a dict; FastAPI serialises it to JSON.',a:()=>ord([3])},
    {hi:['out','mw'],t:'7. The response goes back out, innermost first',p:'The middlewares leave in reverse order (added first leaves first, added second last), so the outermost one can time the whole request and add headers to every response. Then uvicorn writes the bytes.',a:()=>ord([4,5])}];
  function draw(i){const s=steps[i];SVCF.draw(svg,s.hi,{res:false,life:false});cap.innerHTML='<div class="t">'+s.t+' <span class="small mute">(step '+(i+1)+' of '+steps.length+')</span></div><p>'+s.p+'</p>';art.innerHTML=s.a()}
  const an=RD.anim({card:'rd-life-card',ctl:'rd-life-ctl',n:steps.length,draw,ms:2600,label:'Stage'});
  RD.onResize(()=>an.redraw());
})();
