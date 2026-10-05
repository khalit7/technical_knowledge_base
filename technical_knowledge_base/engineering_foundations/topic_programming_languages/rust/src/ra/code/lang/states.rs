// Python habit: one class with optional fields and a status string.
// Here every state carries exactly the data that state has, so
// "connected but no socket" or "failed but no error" cannot be written.
#[derive(Debug)]
enum Conn {
    Idle,
    Connecting { attempt: u32 },
    Connected { session_id: u64 },
    Failed { error: String },
}

fn step(c: Conn) -> Conn {
    match c {
        Conn::Idle => Conn::Connecting { attempt: 1 },
        Conn::Connecting { attempt } if attempt < 3 => Conn::Connecting { attempt: attempt + 1 },
        Conn::Connecting { .. } => Conn::Connected { session_id: 42 },
        Conn::Connected { session_id } => Conn::Connected { session_id },
        Conn::Failed { error } => Conn::Failed { error },
    }
}

fn main() {
    let mut c = Conn::Idle;
    for _ in 0..5 {
        println!("{c:?}");
        c = step(c);
    }
    let f = Conn::Failed { error: "timeout".into() };
    println!("{f:?}");
    println!("size_of Option<u64> = {}", std::mem::size_of::<Option<u64>>());
    println!("size_of Option<&u64> = {}", std::mem::size_of::<Option<&u64>>());
    println!("size_of Option<Box<u64>> = {}", std::mem::size_of::<Option<Box<u64>>>());
}
