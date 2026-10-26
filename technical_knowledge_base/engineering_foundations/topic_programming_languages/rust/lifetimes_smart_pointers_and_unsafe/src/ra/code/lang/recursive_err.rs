enum Expr {
    Num(f64),
    Add(Expr, Expr),
}

fn main() {
    let _e = Expr::Num(1.0);
}
