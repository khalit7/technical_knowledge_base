// Where do the records of a Vec live in memory?
struct Record { user: u32, tokens: u64 }
fn main() {
    let records: Vec<Record> = (0..4u32).map(|i| Record { user: 1000 + i, tokens: 1_000_000 + 7 * i as u64 }).collect();
    println!("size_of::<Record>() = {}, align = {}", std::mem::size_of::<Record>(), std::mem::align_of::<Record>());
    println!("Vec object (pointer, capacity, length) at {:p}, {} bytes, on the stack", &records, std::mem::size_of_val(&records));
    for (i, r) in records.iter().enumerate() {
        println!("records[{i}] at {:p}  user={} tokens={}", r, r.user, r.tokens);
    }
}
