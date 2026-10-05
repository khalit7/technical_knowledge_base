use std::sync::{Arc, Mutex};
use std::time::Duration;

#[tokio::main]
async fn main() {
    let hits = Arc::new(Mutex::new(0u64));
    let h = {
        let hits = hits.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(10)).await;
            *hits.lock().unwrap() += 1; // lock, update, unlock: no .await while held
        })
    };
    h.await.unwrap();
    println!("{}", hits.lock().unwrap());
}
