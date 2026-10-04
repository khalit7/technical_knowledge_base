import pandas as pd
import pandera.pandas as pa

# Schema for one day of chat logs before they feed a fine-tuning or analytics job
schema = pa.DataFrameSchema({
    "chat_id": pa.Column(str, unique=True),
    "lang": pa.Column(str, pa.Check.isin(["en", "fr", "de", "es"])),
    "input_tokens": pa.Column(int, pa.Check.in_range(1, 128_000)),
    "latency_ms": pa.Column(float, pa.Check.ge(0), nullable=False),
}, strict=True)

good = pd.DataFrame({"chat_id": ["a1", "a2"], "lang": ["en", "fr"],
                     "input_tokens": [812, 95], "latency_ms": [640.0, 211.5]})
schema.validate(good)
print("good frame: valid")

bad = pd.DataFrame({"chat_id": ["a1", "a1", "a3"], "lang": ["en", "pt", "de"],
                    "input_tokens": [812, 0, 400], "latency_ms": [640.0, None, 90.0]})
try:
    schema.validate(bad, lazy=True)            # lazy: collect every failure, not just the first
except pa.errors.SchemaErrors as e:
    print(e.failure_cases[["column", "check", "failure_case", "index"]].to_string(index=False))
