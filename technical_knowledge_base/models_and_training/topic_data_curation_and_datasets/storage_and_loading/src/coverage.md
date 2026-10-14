# Coverage and corrections

New page: the old Notion root and its four old children contain no storage or loading content (checked against the root's `src/read/old/`), so there is no old text to carry.

Corrections and additions relative to the parent root (suggested to the root's owners, not edited here):
- Root Tool map, storage reading: "Parquet with zstd is 10% larger than JSONL with zstd on this small file (not investigated further)". Cause found: pyarrow 26 writes zstd at level 1 when no level is given (file byte-identical to `compression_level=1`), against level 3 for the JSONL. At level 3 Parquet is 2,688,552 bytes, 2% smaller than zstd JSONL (2,742,399); at 50,000 documents 70.38 MB against 71.87 MB.
- Root Tool map, loader text: "draws window start positions with a seeded shuffle" is right for Megatron/datatrove but nanoGPT draws random offsets with replacement (no epochs; about e^-1 of tokens unseen per epoch's worth of samples).
- Root section 10: "Shuffling is approximate at this scale: shuffle the order of shards, then shuffle inside a buffer." True for streaming loaders; index-based loaders (Megatron) do an exact global permutation of samples, and datatrove pre-shuffles offline. Worth one clause.
- All seven root storage sizes and the root's packing numbers (2,143 windows, 67.6% padding, 696 windows, 99.95% fill) reproduced exactly.
