// ---- Reading, section 10: the message handler of app.py, step by step (RD.anim, step list sx-llm on the left; the code that ran on the right) ----
(function(){
  const card=document.getElementById('rd-llm-card');if(!card)return;
  const D=window.API_DATA,stg=document.getElementById('rd-llm-stage'),code=document.getElementById('rd-llm-code');
  const STAGE={val:'validation (section 3)',dep:'dependencies: who is calling (section 4)',mw:'a cross-cutting check before the work (section 4)',h:'handler logic (this section)',pool:'the data layer (sections 4 and 5)',out:'the response (section 2)',model:'the model call (sections 6 and 10)'};
  const from=D.src.split('\n').findIndex(l=>l.includes('async def send_message'))-1;
  const S=[
    ['val',['@app.post("/v1/chats/{chat_id}/messages"','idempotency_key: Annotated']],
    ['dep',['owner = who(authorization)','return unauthorized()']],
    ['mw',['ok, remaining, reset = take_token(owner)','return r']],
    ['h',['if not idempotency_key:','return JSONResponse(json.loads(saved)']],
    ['pool',['if not DB.execute("select 1 from chats','return problem(404']],
    ['out',['if body.stream:','headers={"Cache-Control": "no-cache"}']],
    ['model',['await asyncio.sleep(float(os.environ.get("SLOW_S"','reply = "Echo: "']],
    ['pool',['DB.execute("begin")','DB.execute("commit")']],
    ['out',['return JSONResponse(out, status_code=201','return JSONResponse(out, status_code=201']]];
  // the step titles and explanations are the step list on the left (sx-llm); here only the stage and the code
  function draw(i){const s=S[i];stg.textContent='Step '+(i+1)+' of '+S.length+' · '+STAGE[s[0]];
    code.innerHTML=RAW.excerpt(D.src,s[1][0],s[1][1],0,from)||'(excerpt not found)'}
  const an=RD.anim({card:'rd-llm-card',ctl:'rd-llm-ctl',n:S.length,draw,ms:4600,label:'Handler step',list:'sx-llm'});
  RD.onResize(()=>an.redraw());
})();
