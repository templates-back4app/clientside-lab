// Three things this app decides in the browser, asked of the server directly.
//
// Nothing here is clever. Every probe is the same HTTP request the app itself
// makes, sent by someone who did not run the app's JavaScript.
import { anon, owner, waitUp } from './client.mjs';

await waitUp();

// ── the world ───────────────────────────────────────────────────────────────
await owner.post('/classes/Price', { item: 'pro-licence', cents: 9900 });
const ana = await anon.post('/users', { username: 'ana', password: 'correct-horse-1', email: 'ana@example.com', isPaid: false });
const session = ana.json.sessionToken;
await owner.post('/classes/Order', { item: 'pro-licence', cents: 9900, paid: true });

const call = (fn, params = {}, opts = {}) => anon.post(`/functions/${fn}`, params, opts);
const money = (c) => `$${(c / 100).toFixed(2)}`;
const line = (q, a) => console.log(`    ${q.padEnd(52)}${a}`);

console.log('');
console.log('  [1/3] THE ADMIN SCREEN THE BROWSER NEVER DRAWS FOR YOU');
console.log('');
const asWritten = await call('adminRevenueAsWritten');
line('nobody signed in, calling the admin report:', asWritten.ok
  ? `${asWritten.json.result.orders} order(s), ${money(asWritten.json.result.cents)}`
  : `refused — ${asWritten.json.error}`);
const checked = await call('adminRevenueChecked');
line('the same report, asking who is calling:', checked.ok ? 'returned data' : `refused — ${checked.json.error}`);
const anaChecked = await call('adminRevenueChecked', {}, { session });
line('Ana, signed in but not an admin:', anaChecked.ok ? 'returned data' : `refused — ${anaChecked.json.error}`);

console.log('');
console.log('  [2/3] THE PRICE THE BROWSER PUTS IN THE REQUEST');
console.log('');
const cheap = await call('checkoutAsWritten', { item: 'pro-licence', cents: 1 });
line('a stranger buys the $99 licence for $0.01:', cheap.ok ? `accepted — charged ${money(cheap.json.result.charged)}` : `refused — ${cheap.json.error}`);
const free = await call('checkoutAsWritten', { item: 'pro-licence', cents: 0 });
line('...and then for nothing at all:', free.ok ? `accepted — charged ${money(free.json.result.charged)}` : `refused — ${free.json.error}`);
const cheapChecked = await call('checkoutChecked', { item: 'pro-licence', cents: 1 }, { session });
line('the same purchase, price looked up on the server:', cheapChecked.ok ? `accepted — charged ${money(cheapChecked.json.result.charged)}` : `refused — ${cheapChecked.json.error}`);
const anonChecked = await call('checkoutChecked', { item: 'pro-licence', cents: 1 });
line('...called by someone with no account:', anonChecked.ok ? 'accepted' : `refused — ${anonChecked.json.error}`);

console.log('');
