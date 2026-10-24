// ---- Reading, section 10: the message handler of app.py, step by step, with the service figure highlighting the stage ----
(function(){
  const card=document.getElementById('rd-llm-card');if(!card)return;
  const D=window.API_DATA,svg=document.getElementById('rd-llm-svg'),cap=document.getElementById('rd-llm-cap'),code=document.getElementById('rd-llm-code');
  const from=D.src.split('\n').findIndex(l=>l.includes('async def send_message'))-1;
  const S=[
    ['val',['@app.post("/v1/chats/{chat_id}/messages"','idempotency_key: Annotated'],'1. The signature is the contract','The path parameter, the body as a <code>MessageIn</code> (content up to 32,000 characters, <code>model</code> small or large, <code>max_tokens</code> 1 to 4096, <code>stream</code>) and two headers. FastAPI validates all of it before line one of the body runs; a bad request is a 422 that cost nothing. The handler is <code>async def</code> because it awaits the model.'],
    ['dep',['owner = who(authorization)','return unauthorized()'],'2. Who is calling','The API key becomes a user or a 401. The demo calls a helper; a production version makes it a dependency (<code>Depends(current_user)</code>) shared by every route.'],
    ['mw',['ok, remaining, reset = take_token(owner)','return r'],'3. Rate limit before anything expensive','A token bucket per key (5 requests, refilling at 1 per second); over the limit is a 429 with Retry-After. It runs before the idempotency claim, so a limited request is not stored against the key (the contract is Service APIs\'s; a shared limiter in Redis or the gateway replaces this in-process dict once there are several workers).'],
    ['h',['if not idempotency_key:','return JSONResponse(json.loads(saved)'],'4. Claim the idempotency key','An <code>INSERT</code> that the primary key lets only one attempt win; a retry gets the stored answer, a concurrent one 409, a different body with the same key 422. This claim sits outside the transaction of step 8, which is the stuck-key bug of section 5.'],
    ['pool',['if not DB.execute("select 1 from chats','return problem(404'],'5. Authorise the object','The chat must exist <em>and</em> belong to the caller, in one query (section 4). Production: this is where the history is read, in one query, and the connection released before the model call.'],
    ['out',['if body.stream:','headers={"Cache-Control": "no-cache"}'],'6. Or stream the reply','The streaming branch returns a <code>StreamingResponse</code> of server-sent events; the status line is sent now, so any later failure must be an event. The demo frees the key and stores nothing here; production stores the finished message so a retry can fetch it, and stops when the client disconnects.'],
    ['model',['await asyncio.sleep(float(os.environ.get("SLOW_S"','reply = "Echo: "'],'7. Call the model','The demo sleeps and echoes. A real call is <code>await client.messages.create(...)</code> with an async client and a timeout, so the event loop serves other requests during the seconds it takes (section 6).'],
    ['pool',['DB.execute("begin")','DB.execute("commit")'],'8. One transaction for everything that must agree','The reply, the charge and the stored response commit together (section 5). Production charges by the provider\'s reported token usage rather than a flat 10 credits.'],
    ['out',['return JSONResponse(out, status_code=201','return JSONResponse(out, status_code=201'],'9. Answer','201 with the message and the rate limit headers. What does not change the answer (titles, metering, indexing) goes to a queue after this point (section 8).']];
  function draw(i){const s=S[i];SVCF.draw(svg,[s[0]],{res:true,life:false});
    cap.innerHTML='<div class="t">'+s[2]+' <span class="small mute">(step '+(i+1)+' of '+S.length+')</span></div><p>'+s[3]+'</p>';
    code.innerHTML=RAW.excerpt(D.src,s[1][0],s[1][1],0,from)||'(excerpt not found)'}
  const an=RD.anim({card:'rd-llm-card',ctl:'rd-llm-ctl',n:S.length,draw,ms:3000,label:'Handler step'});
  RD.onResize(()=>an.redraw());
})();
