#[derive(Debug, Clone, PartialEq)]
struct Usage {
    user: String,
    tokens: u64,
}

// An enum's variants can carry different data: a "tagged union".
#[derive(Debug)]
enum Message {
    Text { user: String, text: String },
    ToolCall { name: String, args: Vec<String> },
    Image { width: u32, height: u32 },
    Ping,
}

impl Message {
    fn describe(&self) -> String {
        match self {
            Message::Text { user, text } if text.is_empty() => format!("{user} sent nothing"),
            Message::Text { user, text } => format!("{user}: {} chars", text.len()),
            Message::ToolCall { name, args } => format!("call {name} with {} args", args.len()),
            Message::Image { width, height } => format!("image {width}x{height}"),
            Message::Ping => "ping".to_string(),
        }
    }
}

fn main() {
    let u = Usage { user: "u0029".into(), tokens: 9491 };
    let v = Usage { tokens: 10, ..u.clone() }; // struct update syntax
    println!("{u:?}\n{v:?} equal? {}", u == v);
    let msgs = vec![
        Message::Text { user: "ada".into(), text: "hi there".into() },
        Message::Text { user: "bob".into(), text: String::new() },
        Message::ToolCall { name: "search".into(), args: vec!["rust".into()] },
        Message::Image { width: 640, height: 480 },
        Message::Ping,
    ];
    for m in &msgs {
        println!("{}", m.describe());
    }
    println!("{:#?}", msgs[2]);
    let n = 7;
    let kind = match n {
        0 => "zero",
        1..=9 => "one digit",
        _ => "more", // `_` matches anything else
    };
    println!("{n} is {kind}");
    if let Message::Image { width, .. } = &msgs[3] {
        println!("if let: width {width}");
    }
}
