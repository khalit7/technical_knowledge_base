# Multi-stage build: compile in a full Rust image, ship only the binary.
# Stage 1: the builder (about 1.5 GB of compilers and headers; thrown away).
FROM rust:1.99-slim-bookworm AS build
WORKDIR /src
# Cache dependencies: build once with a dummy main so code edits do not refetch crates.
COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src/bin && echo 'fn main(){}' > src/bin/tokserve.rs && echo '' > src/lib.rs \
 && cargo build --release --bin tokserve && rm -rf src
COPY src ./src
RUN touch src/lib.rs src/bin/tokserve.rs && cargo build --release --bin tokserve

# Stage 2: distroless "cc" = glibc + libgcc + CA certs, no shell, no package manager, non-root user.
FROM gcr.io/distroless/cc-debian12:nonroot
COPY --from=build /src/target/release/tokserve /tokserve
ENV TOK_ADDR=0.0.0.0:3000
EXPOSE 3000
ENTRYPOINT ["/tokserve"]
