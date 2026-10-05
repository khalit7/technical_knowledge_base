def call(model, /, prompt, *, temperature=1.0, **extra):
    #     ^ positional-only  ^ keyword-only after *
    return f"{model} {prompt!r} t={temperature} extra={extra}"

print(call("m1", "hi", temperature=0.2, top_p=0.9))
print(call("m1", prompt="hi"))
for bad in ('call(model="m1", prompt="hi")', 'call("m1", "hi", 0.2)'):
    try:
        eval(bad)
    except TypeError as e:
        print("TypeError:", e)

def forward(*args, **kwargs):            # collect anything...
    return call(*args, **kwargs)         # ...and spread it back out
print(forward("m2", "yo", temperature=0))
