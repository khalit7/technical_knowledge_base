// run: no
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };
function getUser(id: UserId) { return id; }
declare const order: OrderId;
getUser(order);
getUser("u1");
