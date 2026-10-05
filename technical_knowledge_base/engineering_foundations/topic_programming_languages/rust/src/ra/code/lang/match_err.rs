enum Role { User, Assistant, Tool }

fn label(r: Role) -> &'static str {
    match r {
        Role::User => "user",
        Role::Assistant => "assistant",
    }
}

fn main() {
    println!("{}", label(Role::Tool));
}
