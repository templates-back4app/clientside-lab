# clientside-lab

[![Deploy on Back4app](https://img.shields.io/badge/Deploy%20on-Back4app-1568B8?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2ZmZiIgZD0iTTEyIDJMMiA3djEwbDEwIDUgMTAtNVY3eiIvPjwvc3ZnPg==)](https://www.back4app.com/signup?utm_source=github&utm_medium=repo&utm_campaign=clientside-lab)

A small shop that makes three decisions in the browser: whether to draw the admin
button, what the item costs, and whether this person has paid. Each one is asked
of the server directly, by a caller that never ran the app's JavaScript.

**Measured on Parse Server 7.4.0 with MongoDB 7, Docker 29.4.3, 29 October 2026.
Identical across two consecutive clean runs.**

> **Read the article:** [Hiding the Admin Button Is Not Security: Three Decisions Your App Makes on the Wrong Machine](https://www.back4app.com/blog/hiding-the-admin-button-is-not-security?utm_source=github&utm_medium=repo&utm_campaign=clientside-lab)

## Run it

```
./run.sh
```

Needs Docker and Node 22. The backend is destroyed and rebuilt every run.

## What it found

| what the app decides | asked directly | once the server decides |
| --- | --- | --- |
| who may see the revenue report | **1 order, $99.00** — to nobody signed in | refused — admins only |
| what the licence costs | **accepted at $0.00** | charged $99.00 |
| whether this person paid | **she granted it to herself** | refused — the server decides |

The report was called with no account at all. The $99 licence was sold for one
cent, and then for nothing. The paid flag lives on the buyer's own row, so the
buyer can write it.

## The guard that blocks sign-up

Worth its own section, because it is the reason people delete the guard and
conclude it cannot be done. The obvious version of the entitlement check is:

```js
if (req.object.dirty('isPaid')) throw new Parse.Error(119, '...');
```

On an object that has no id yet, the SDK reports **every** field as dirty — so
that guard rejects sign-up itself, and the error names a field the sign-up never
sent. Compare against the previous value instead:

```js
if (!req.original) {
  if (req.object.get('isPaid') !== undefined) throw new Parse.Error(119, 'not at sign-up');
  return;
}
if (req.object.get('isPaid') !== req.original.get('isPaid')) throw new Parse.Error(119, 'server decides');
```

## The pieces

| file | what it does |
| --- | --- |
| `cloud/main.js` | each function written twice: as generated, and asking who is calling |
| `run.mjs` | the admin report and the price, probed both ways |
| `entitlement.mjs` | can the person the flag describes write the flag? |
| `client.mjs` | the two ways to call the backend: as a person, and as the owner |

`entitlement.mjs` stops with a loud message if the sign-up it depends on was
refused, rather than reporting `undefined` for everything after it.
