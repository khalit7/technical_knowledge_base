"""Print the parquet schema, row count and row-group count of remote HF dataset files (metadata reads only)."""
import sys
import pyarrow.parquet as pq
from huggingface_hub import HfFileSystem

fs = HfFileSystem()
for spec in sys.argv[1:]:
    repo, rev, path = spec.split("@")
    p = f"datasets/{repo}@{rev}/{path}" if rev else f"datasets/{repo}/{path}"
    with fs.open(p, "rb", block_size=1 << 20) as f:
        m = pq.ParquetFile(f).metadata
        print(f"## {repo} {path}: rows={m.num_rows} row_groups={m.num_row_groups}")
        print("  ", ", ".join(f"{m.schema.column(i).path}" for i in range(m.num_columns))[:900])
