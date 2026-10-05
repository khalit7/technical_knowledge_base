#[tokio::main]
async fn main() {
    let prompts = vec!["hi".to_string(), "bye".to_string()];
    let h = tokio::spawn(async move {
        // `async move`: the task now owns `prompts`
        println!("{} prompts", prompts.len());
    });
    h.await.unwrap();
}
