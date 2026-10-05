import json, sys, traceback

class ConfigError(Exception):
    pass

def load(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ConfigError("config is not valid JSON") from e    # explicit cause

def load_sloppy(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        raise ConfigError("config is not valid JSON")           # implicit context

for fn in (load, load_sloppy):
    try:
        fn("{bad")
    except ConfigError as e:
        print(f"--- {fn.__name__}: __cause__={type(e.__cause__).__name__}, "
              f"__context__={type(e.__context__).__name__}, __suppress_context__={e.__suppress_context__}")
        traceback.print_exc(limit=0, file=sys.stdout)   # limit=0: messages only
