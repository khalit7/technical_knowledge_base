use std::sync::Arc;
use std::time::Duration;

#[tokio::main]
async fn main() {
    let h = tokio::spawn(async {
        let cache = Arc::new(vec![1, 2, 3]); // atomic reference count: Send
        tokio::time::sleep(Duration::from_millis(10)).await;
        println!("{}", cache.len());
    });
    h.await.unwrap();
}
