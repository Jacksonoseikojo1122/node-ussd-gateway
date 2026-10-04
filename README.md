# node-ussd-gateway

[![CI](https://github.com/Jacksonoseikojo1122/node-ussd-gateway/actions/workflows/ci.yml/badge.svg)](https://github.com/Jacksonoseikojo1122/node-ussd-gateway/actions/workflows/ci.yml)

A small, stateless USSD gateway built with Node.js and Express. It answers the
callback that Africa's Talking and similar aggregators send for every step in a
USSD session and drives a demo mobile-wallet menu.

This is the Node.js twin of
[fastapi-ussd-gateway](https://github.com/Jacksonoseikojo1122/fastapi-ussd-gateway).
Both repos serve the same menu, return the same strings byte for byte, and
share equivalent test suites, so you can compare the two stacks side by side.

## Why USSD

USSD is the session-based menu you reach by dialling a short code such as
`*384*123#`. In Ghana it is still the most reliable way to reach every mobile
subscriber:

- **It works on any phone.** A basic feature phone handles it as well as a
  smartphone. No app to install.
- **It needs no mobile data or internet.** It runs on the GSM signalling
  channel, so it works where data is expensive or coverage is weak.
- **People already use it.** Mobile money, airtime top-up, bank balance checks
  and registration flows in Ghana all commonly run over USSD.

Your service never talks to the handset directly. The mobile network passes
the session to an aggregator, and the aggregator calls your HTTP endpoint once
for every screen.

## The protocol

On every step the aggregator sends a form-encoded `POST`:

| Field         | Example           | Notes                                          |
| ------------- | ----------------- | ---------------------------------------------- |
| `sessionId`   | `ATUid_1a2b3c`    | Required. Same value for the whole session.    |
| `phoneNumber` | `+233241234567`   | Required. The subscriber's MSISDN.             |
| `serviceCode` | `*384*123#`       | The short code that was dialled.               |
| `text`        | `1*20`            | Everything typed so far, joined with `*`.      |

The reply is plain text. If it starts with `CON` the session stays open and
the subscriber sees an input box. If it starts with `END` the session closes.

## The menu

```
Welcome to Demo Wallet
├── 1. Buy airtime
│   └── Enter amount in GHS (1-500, up to 2 decimal places)
│       └── Buy GHS 20.00 airtime?
│           ├── 1. Confirm  -> END Airtime purchase of GHS 20.00 successful.
│           └── 2. Cancel   -> END Purchase cancelled.
├── 2. Register
│   └── Enter your full name (2-60 characters)
│       └── Enter your town (2-40 characters)
│           └── END Registered <name>, <town>.
├── 3. Check balance        -> END Balance: GHS 42.50   (fixed demo value)
└── 0. Exit                 -> END Goodbye.
```

Any other choice returns `END Invalid option.` An invalid amount, name or
town ends the session with a message that says what was expected, for example
`END Invalid amount. Enter a number from 1 to 500 with at most 2 decimal places.`

The airtime purchase is simulated. No payment provider or wallet is called,
and registrations are not stored.

## Quickstart

Requires Node.js 20 or later.

```bash
git clone https://github.com/Jacksonoseikojo1122/node-ussd-gateway.git
cd node-ussd-gateway
npm install
npm start                  # listens on PORT, default 3000
```

`npm run dev` runs the same server with `node --watch`. Set `PORT` to change
the port, for example `PORT=8080 npm start`.

Endpoints:

- `POST /ussd`: the aggregator callback
- `GET /health`: returns `ok` (for load balancer health checks)

## Walkthrough with curl

Each request below is one screen in the same session. `text` grows with every
step, exactly as the aggregator would send it. `--data-urlencode` is used so
that `+`, `*` and `#` arrive intact.

```bash
ussd() {
  curl -s -X POST http://localhost:3000/ussd \
    -d sessionId=ATUid_demo \
    --data-urlencode phoneNumber=+233241234567 \
    --data-urlencode 'serviceCode=*384*123#' \
    --data-urlencode "text=$1"
  echo
}

ussd ''
# CON Welcome to Demo Wallet
# 1. Buy airtime
# 2. Register
# 3. Check balance
# 0. Exit

ussd '1'
# CON Enter amount in GHS (1-500):

ussd '1*20'
# CON Buy GHS 20.00 airtime?
# 1. Confirm
# 2. Cancel

ussd '1*20*1'
# END Airtime purchase of GHS 20.00 successful.
```

Registration and the error paths:

```bash
ussd '2*Ama Mensah*Kumasi'
# END Registered Ama Mensah, Kumasi.

ussd '1*750'
# END Invalid amount. Enter a number from 1 to 500 with at most 2 decimal places.

ussd '7'
# END Invalid option.
```

A request without `sessionId` or `phoneNumber` is rejected:

```bash
curl -i -X POST http://localhost:3000/ussd -d text=1
# HTTP/1.1 400 Bad Request
# Content-Type: text/plain; charset=utf-8
# ...
# Missing required field(s): sessionId, phoneNumber
```

## Testing

```bash
npm test
```

The suite uses the built-in `node:test` runner and has no test dependencies.

- `test/menu.test.js` covers every menu path, every validation rule and its
  boundaries (1 and 500, 0.99 and 500.01, 2 and 60 characters, and so on),
  and input that arrives after a step that should have ended the session.
- `test/app.test.js` starts the Express app on an ephemeral port and walks a
  full purchase over real HTTP. It also checks the `text/plain` content type,
  the 400 responses and the health check.

CI runs the suite on Node.js 20 and 22 on every push and pull request.

## Project layout

```
src/menu.js     pure menu logic: handle(text) -> "CON ..." | "END ..."
src/app.js      Express app: parsing, validation, routing (no listen)
server.js       entry point: reads PORT and starts listening
test/           node:test suites
```

`src/app.js` exports the app without calling `listen()`, so tests and other
hosts (a serverless adapter, for example) can mount it.

## Design notes

**The handler is stateless.** The aggregator resends the whole input history
in `text` on every request, so `handle(text)` can rebuild where the subscriber
is from that one string. `"1*20*1"` always means "Buy airtime, GHS 20, confirm".
There is no in-memory session map, which means:

- any instance behind a load balancer can answer any step, so the service
  scales horizontally without sticky sessions or a shared cache;
- a restart or deploy in the middle of a session loses nothing;
- there is no session store to expire, so no memory leak;
- the menu is a pure function and is tested without HTTP.

You still need storage for business data, such as registrations or payments.
That belongs in a database, keyed by `phoneNumber` or `sessionId`, and is
separate from navigating the menu.

**Invalid input ends the session.** A wrong entry stays in `text` for the rest
of the session, so re-prompting would mean every later step has to know which
earlier entries to skip. Ending with a message that says what was expected
keeps every path predictable and easy to test. The subscriber redials.

**Validation happens at the edge.** `sessionId` and `phoneNumber` must be
present and non-blank, or the request gets a plain-text `400`. Amounts must
match `^\d+(\.\d{1,2})?$` and be from 1 to 500. Names and towns are trimmed
and length-checked. Every reply is `text/plain`, which is what the
aggregator relays to the handset.

## Production next steps

This repo shows the shape of the service. Before real traffic, I would add:

- **Aggregator IP allowlisting.** The callback URL is public. Accept requests
  only from the aggregator's published IP ranges, at the load balancer or in
  middleware, and add a shared secret in the URL or a header if the
  aggregator supports one.
- **Respect session timeouts.** Networks drop USSD sessions after a short
  window, often around 180 seconds in total, and each reply has to come back
  within a few seconds. Keep the handler fast. Do slow work such as payment
  calls asynchronously and confirm by SMS.
- **Idempotent payment calls.** Aggregators can retry a callback. Use an
  idempotency key derived from `sessionId` and the confirmed step when calling
  the payment provider, so a retried "1. Confirm" never charges twice.
- **Persistence.** Store registrations and transactions in a database rather
  than echoing them back.
- **Observability.** Structured logs with masked phone numbers, request
  latency metrics, and alerts on error rate.
- **Rate limiting** per `phoneNumber` to limit abuse.

## Related

- [fastapi-ussd-gateway](https://github.com/Jacksonoseikojo1122/fastapi-ussd-gateway):
  the same gateway and menu in Python and FastAPI.
- [nextjs-ussd-flow-studio](https://github.com/Jacksonoseikojo1122/nextjs-ussd-flow-studio):
  design a USSD menu visually, simulate it, and export it as an Express or FastAPI server.

---

Built by Jackson Kojo Osei — [LinkedIn](https://www.linkedin.com/in/jackson-kojo-osei-740846189)
