// The same checkout, written the two ways it actually gets written.

// What the browser's version becomes when you move it to the server verbatim:
// the price still arrives from the client, and nobody asks who is calling.
Parse.Cloud.define('checkoutAsWritten', async (req) => {
  const Order = Parse.Object.extend('Order');
  const o = new Order();
  o.set('item', req.params.item);
  o.set('cents', req.params.cents);          // whatever the caller said it costs
  o.set('paid', true);
  await o.save(null, { useMasterKey: true });
  return { id: o.id, charged: req.params.cents };
});

// The same function with the two questions the first one never asks: who is
// calling, and what does this item actually cost?
Parse.Cloud.define('checkoutChecked', async (req) => {
  if (!req.user) throw new Parse.Error(119, 'sign in first');
  const price = await new Parse.Query('Price').equalTo('item', req.params.item).first({ useMasterKey: true });
  if (!price) throw new Parse.Error(141, 'no such item');
  const Order = Parse.Object.extend('Order');
  const o = new Order();
  o.set('item', req.params.item);
  o.set('cents', price.get('cents'));        // the price the server knows
  o.set('paid', true);
  o.setACL(new Parse.ACL(req.user));
  await o.save(null, { useMasterKey: true });
  return { id: o.id, charged: price.get('cents') };
});

// The admin report, behind a button the browser only draws for admins.
Parse.Cloud.define('adminRevenueAsWritten', async () => {
  const rows = await new Parse.Query('Order').limit(1000).find({ useMasterKey: true });
  return { orders: rows.length, cents: rows.reduce((t, r) => t + (r.get('cents') ?? 0), 0) };
});

// The same report, asking on the server what the browser was deciding.
Parse.Cloud.define('adminRevenueChecked', async (req) => {
  if (!req.user) throw new Parse.Error(119, 'sign in first');
  const roles = await new Parse.Query(Parse.Role).equalTo('users', req.user).find({ useMasterKey: true });
  if (!roles.some((r) => r.getName() === 'Admin')) throw new Parse.Error(119, 'admins only');
  const rows = await new Parse.Query('Order').limit(1000).find({ useMasterKey: true });
  return { orders: rows.length, cents: rows.reduce((t, r) => t + (r.get('cents') ?? 0), 0) };
});

// The entitlement the browser reads to unlock the paid features. Without this
// guard the person it describes can write it, because it is a column on their
// own row. Switched by an environment variable so the lab can measure both.
if (process.env.GUARD_ENTITLEMENT === 'true') {
  Parse.Cloud.beforeSave(Parse.User, (req) => {
    if (req.master) return;                       // the server may grant it

    // Careful here. `dirty('isPaid')` is the obvious test and it is wrong: on an
    // object that has no id yet, the SDK reports every field as dirty, so the
    // obvious guard rejects sign-up itself. Compare with what was there instead.
    if (!req.original) {
      if (req.object.get('isPaid') !== undefined) {
        throw new Parse.Error(119, 'isPaid is decided by the server, not sent at sign-up');
      }
      return;
    }
    if (req.object.get('isPaid') !== req.original.get('isPaid')) {
      throw new Parse.Error(119, 'isPaid is decided by the server');
    }
  });
}
