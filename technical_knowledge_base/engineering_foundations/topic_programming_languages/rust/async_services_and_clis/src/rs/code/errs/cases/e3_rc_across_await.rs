// tokio::spawn may move a task between worker threads at any .await, so everything the
// task holds across an .await must be Send. Rc is not (its counter is not atomic).
use std::rc::Rc;
use std::time::Duration;

#[tokio::main]
async fn main() {
    let h = tokio::spawn(async {
        let cache = Rc::new(vec![1, 2, 3]);
        tokio::time::sleep(Duration::from_millis(10)).await;
        println!("{}", cache.len());
    });
    h.await.unwrap();
}
