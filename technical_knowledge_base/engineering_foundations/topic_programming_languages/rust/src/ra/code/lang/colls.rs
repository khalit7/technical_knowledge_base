use std::collections::{BTreeMap, HashMap, HashSet, VecDeque};

fn main() {
    // Vec: a growable array. Capacity grows by doubling, so push is cheap on average.
    let mut v = Vec::new();
    let mut caps = vec![];
    for i in 0..20 { v.push(i); if caps.last() != Some(&v.capacity()) { caps.push(v.capacity()); } }
    println!("Vec capacities seen while pushing 20 items: {caps:?}");
    println!("v.get(99) = {:?}  (v[99] would panic)", v.get(99));

    // HashMap: the entry API does "get or insert" with one lookup
    let text = "the cat and the hat and the bat";
    let mut counts: HashMap<&str, u32> = HashMap::new();
    for w in text.split(' ') { *counts.entry(w).or_insert(0) += 1; }
    println!("HashMap iteration order: {:?}", counts.iter().collect::<Vec<_>>());
    let mut sorted: Vec<(&str, u32)> = counts.into_iter().collect();
    sorted.sort_by(|a, b| b.1.cmp(&a.1).then(a.0.cmp(b.0))); // count desc, then word asc
    println!("sorted: {sorted:?}");

    // BTreeMap: kept sorted by key, so iteration order is deterministic
    let bt: BTreeMap<&str, u32> = text.split(' ').map(|w| (w, w.len() as u32)).collect();
    println!("BTreeMap: {bt:?}");
    println!("range \"b\"..\"d\": {:?}", bt.range("b".."d").collect::<Vec<_>>());

    // HashSet: membership and set algebra
    let a: HashSet<u32> = [1, 2, 3, 4].into();
    let b: HashSet<u32> = [3, 4, 5].into();
    let mut inter: Vec<_> = a.intersection(&b).copied().collect();
    inter.sort();
    println!("intersection {inter:?}, contains 5? {}", a.contains(&5));

    // VecDeque: a ring buffer, O(1) at both ends (Python's collections.deque)
    let mut q: VecDeque<u32> = VecDeque::new();
    q.push_back(1); q.push_back(2); q.push_front(0);
    let front = q.pop_front();
    println!("deque after pop_front: {q:?}, popped {front:?}");
}
