import json,sys,urllib.request
def q(query):
    r=urllib.request.Request('https://api.wandb.ai/graphql',data=json.dumps({'query':query}).encode(),headers={'Content-Type':'application/json'})
    return json.load(urllib.request.urlopen(r,timeout=120))
def hist(project,run,keys,samples=400):
    spec=json.dumps({'keys':keys,'samples':samples})
    query='{ project(name:%s, entityName:"ai2-llm"){ run(name:%s){ displayName sampledHistory(specs:[%s]) } } }'%(json.dumps(project),json.dumps(run),json.dumps(spec))
    d=q(query)
    return d['data']['project']['run']['sampledHistory'][0]
if __name__=='__main__':
    h=hist('Olmo-3-1125-32B','9o6ojvac',['_step','_timestamp','train/CE loss','throughput/total tokens'],50)
    print(len(h),h[:3],h[-1])
