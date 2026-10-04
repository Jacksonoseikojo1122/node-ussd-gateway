import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'

let server
let baseUrl

before(async () => {
  server = createApp().listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(() => new Promise((resolve) => server.close(resolve)))

function postUssd(fields) {
  return fetch(`${baseUrl}/ussd`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  })
}

const session = { sessionId: 'ATUid_123', phoneNumber: '+233241234567', serviceCode: '*384*123#' }

describe('POST /ussd', () => {
  it('walks a full airtime purchase over HTTP', async () => {
    const hops = [
      ['', 'CON Welcome to Demo Wallet\n1. Buy airtime\n2. Register\n3. Check balance\n0. Exit'],
      ['1', 'CON Enter amount in GHS (1-500):'],
      ['1*20', 'CON Buy GHS 20.00 airtime?\n1. Confirm\n2. Cancel'],
      ['1*20*1', 'END Airtime purchase of GHS 20.00 successful.'],
    ]
    for (const [text, expected] of hops) {
      const res = await postUssd({ ...session, text })
      assert.equal(res.status, 200)
      assert.match(res.headers.get('content-type'), /^text\/plain/)
      assert.equal(await res.text(), expected)
    }
  })

  it('treats a missing text field as the first hop', async () => {
    const res = await postUssd({ sessionId: 'abc', phoneNumber: '+233201234567' })
    assert.equal(res.status, 200)
    assert.match(await res.text(), /^CON Welcome to Demo Wallet/)
  })

  it('returns 400 when sessionId is missing', async () => {
    const res = await postUssd({ phoneNumber: '+233241234567', text: '' })
    assert.equal(res.status, 400)
    assert.match(res.headers.get('content-type'), /^text\/plain/)
    assert.equal(await res.text(), 'Missing required field(s): sessionId')
  })

  it('returns 400 when phoneNumber is blank', async () => {
    const res = await postUssd({ sessionId: 'abc', phoneNumber: '  ', text: '' })
    assert.equal(res.status, 400)
    assert.equal(await res.text(), 'Missing required field(s): phoneNumber')
  })

  it('returns 400 for an empty body', async () => {
    const res = await fetch(`${baseUrl}/ussd`, { method: 'POST' })
    assert.equal(res.status, 400)
    assert.equal(await res.text(), 'Missing required field(s): sessionId, phoneNumber')
  })
})

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await fetch(`${baseUrl}/health`)
    assert.equal(res.status, 200)
    assert.equal(await res.text(), 'ok')
  })
})
