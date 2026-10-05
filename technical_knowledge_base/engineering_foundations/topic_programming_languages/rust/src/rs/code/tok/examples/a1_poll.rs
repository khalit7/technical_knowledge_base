// What .await does underneath: the runtime calls poll() until it returns Ready.
// A hand-written future that is not ready the first two times it is polled.
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

struct Countdown {
    left: u32,
}

impl Future for Countdown {
    type Output = &'static str;
    fn poll(mut self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        if self.left == 0 {
            println!("   poll: Ready");
            return Poll::Ready("done");
        }
        println!("   poll: Pending ({} left), asking to be woken", self.left);
        self.left -= 1;
        // A real future (a socket, a timer) hands the waker to the OS event source.
        // Here we wake ourselves at once, so the runtime polls again.
        cx.waker().wake_by_ref();
        Poll::Pending
    }
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    println!("awaiting Countdown {{ left: 2 }}");
    let r = Countdown { left: 2 }.await;
    println!("result: {r}");
}
