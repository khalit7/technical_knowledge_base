// One line of the chat log -> (user, text), or an error the caller must handle.
use serde::Deserialize;
#[derive(Deserialize)]
struct Message { user: String, text: String }

fn parse(line: &str) -> Result<Message, serde_json::Error> {
    let m: Message = serde_json::from_str(line)?;   // `?` returns the Err to our caller
    Ok(m)
}

fn main() {
    for line in [r#"{"user": "u0029", "text": "hello"}"#, r#"{"user": 17, "text": "hi"}"#, "not json at all"] {
        match parse(line) {
            Ok(m) => println!("ok   {} {:?}", m.user, m.text),
            Err(e) => println!("bad  {e}"),
        }
    }
}
