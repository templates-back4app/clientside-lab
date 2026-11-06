// Can the person the flag describes write the flag? Asked on a user who already
// exists, signed in as herself, exactly as the app would.
//
// The sign-up deliberately does not send isPaid: an app whose client sets its
// own entitlement at sign-up has already lost, and the probe would be measuring
// the wrong thing.
import { anon, owner, waitUp } from './client.mjs';

await waitUp();
const name = `probe${Date.now()}`;
const made = await anon.post('/users', { username: name, password: 'correct-horse-9', email: `${name}@example.com` });
if (!made.ok || !made.json.sessionToken) {
  console.log(`    !! sign-up itself was refused — ${made.json?.error ?? made.status}`);
  console.log('       nothing below would mean anything, so the probe stops here.');
  process.exit(1);
}
const session = made.json.sessionToken;
const read = async () => {
  const r = await anon.get('/users/me', { session });
  return r.ok ? String(r.json.isPaid ?? 'not set') : `could not read — ${r.json?.error}`;
};
const line = (q, a) => console.log(`    ${q.padEnd(52)}${a}`);

line('she has paid, according to her own row:', await read());
const grant = await anon.put(`/users/${made.json.objectId}`, { isPaid: true }, { session });
line('she sets isPaid on herself:', grant.ok ? 'accepted' : `refused — ${grant.json.error}`);
line('she has paid, according to her own row:', await read());
const byServer = await owner.put(`/users/${made.json.objectId}`, { isPaid: true });
line('the server grants it:', byServer.ok ? 'accepted' : `refused — ${byServer.json.error}`);
line('she has paid, according to her own row:', await read());
console.log('');
