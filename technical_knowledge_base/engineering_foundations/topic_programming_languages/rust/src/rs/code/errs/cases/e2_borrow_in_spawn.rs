// A spawned task may outlive the function that spawned it, so it cannot borrow its locals.
#[tokio::main]
async fn main() {
    let prompts = vec!["hi".to_string(), "bye".to_string()];
    let h = tokio::spawn(async {
        println!("{} prompts", prompts.len());
    });
    h.await.unwrap();
}
