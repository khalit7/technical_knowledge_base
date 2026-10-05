// A future is a value: calling an async fn runs nothing until something awaits (polls) it.
async fn hello(tag: &str) -> u32 {
    println!("   {tag}: body runs");
    42
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    println!("1. calling hello(\"a\")");
    let fut = hello("a"); // nothing printed: we only built a state machine
    println!("2. holding a future of {} bytes; its body has not run", std::mem::size_of_val(&fut));
    let v = fut.await; // now the runtime polls it to completion
    println!("3. awaited it: {v}");
    hello("b"); // never awaited: the compiler warns and the body never runs
    println!("4. end of main");
}
