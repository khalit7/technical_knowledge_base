// What an enum costs in memory: sizes, alignments and where each variant's data sits.
// Offsets are measured with plain references (field address minus value address): no unsafe.
use std::mem::{align_of, size_of};

#[allow(dead_code)]
#[derive(Debug)]
enum Conn {
    Idle,
    Connecting { attempt: u32 },
    Connected { session_id: u64 },
    Failed { error: String },
}

fn off<T, F>(base: &T, field: &F) -> usize {
    field as *const F as usize - base as *const T as usize
}

fn main() {
    // the tag: Option<u8> adds one byte; a wider payload pads the tag up to its alignment
    for (name, s, a) in [
        ("u8", size_of::<u8>(), align_of::<u8>()),
        ("Option<u8>", size_of::<Option<u8>>(), align_of::<Option<u8>>()),
        ("u32", size_of::<u32>(), align_of::<u32>()),
        ("Option<u32>", size_of::<Option<u32>>(), align_of::<Option<u32>>()),
        ("u64", size_of::<u64>(), align_of::<u64>()),
        ("Option<u64>", size_of::<Option<u64>>(), align_of::<Option<u64>>()),
        ("&u64", size_of::<&u64>(), align_of::<&u64>()),
        ("Option<&u64>", size_of::<Option<&u64>>(), align_of::<Option<&u64>>()),
        ("Box<u64>", size_of::<Box<u64>>(), align_of::<Box<u64>>()),
        ("Option<Box<u64>>", size_of::<Option<Box<u64>>>(), align_of::<Option<Box<u64>>>()),
        ("String", size_of::<String>(), align_of::<String>()),
        ("Option<String>", size_of::<Option<String>>(), align_of::<Option<String>>()),
        ("Conn", size_of::<Conn>(), align_of::<Conn>()),
        ("Option<Conn>", size_of::<Option<Conn>>(), align_of::<Option<Conn>>()),
    ] {
        println!("{name:<18} size {s:>2}  align {a}");
    }
    let x = Some(7u64);
    if let Some(v) = &x { println!("Option<u64>: Some's u64 at offset {}", off(&x, v)); }
    let x = Some(7u32);
    if let Some(v) = &x { println!("Option<u32>: Some's u32 at offset {}", off(&x, v)); }
    let c = Conn::Connecting { attempt: 1 };
    if let Conn::Connecting { attempt } = &c { println!("Conn::Connecting: attempt (u32) at offset {}", off(&c, attempt)); }
    let c = Conn::Connected { session_id: 42 };
    if let Conn::Connected { session_id } = &c { println!("Conn::Connected: session_id (u64) at offset {}", off(&c, session_id)); }
    let c = Conn::Failed { error: "timeout".into() };
    if let Conn::Failed { error } = &c { println!("Conn::Failed: error (String, {} bytes) at offset {}", size_of::<String>(), off(&c, error)); }
    // Where is the tag? Read the String's three words, then the first word of each Conn value.
    // A probe, not production code: it reads only words every variant has initialised.
    let mut s = String::with_capacity(16);
    s.push_str("timeout");
    let (cap, len) = (s.capacity(), s.len());
    let w: [usize; 3] = unsafe { std::mem::transmute(s) };
    let names: Vec<&str> = w.iter().map(|&x| if x == cap && x == len { "cap=len" } else if x == cap { "capacity" } else if x == len { "length" } else { "pointer" }).collect();
    println!("String \"timeout\" (capacity {cap}, length {len}) as three words: {:?}", names);
    let _ = unsafe { std::mem::transmute::<[usize; 3], String>(w) };
    let mut e = String::with_capacity(16);
    e.push_str("timeout");
    let first = |c: &Conn| unsafe { *(c as *const Conn as *const usize) };
    for c in [Conn::Idle, Conn::Connecting { attempt: 1 }, Conn::Connected { session_id: 42 }, Conn::Failed { error: e }] {
        println!("first word of {:<40} {:#018x}", format!("{c:?}"), first(&c));
    }
    let none: Option<Conn> = None;
    println!("first word of {:<40} {:#018x}", "None::<Conn>", unsafe { *(&none as *const Option<Conn> as *const usize) });
}
