import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { handle, MESSAGES, parseAmount } from '../src/menu.js'

describe('main menu', () => {
  it('shows the main menu on an empty history', () => {
    assert.equal(
      handle(''),
      'CON Welcome to Demo Wallet\n1. Buy airtime\n2. Register\n3. Check balance\n0. Exit',
    )
  })

  it('treats a missing text as the start of a session', () => {
    assert.equal(handle(), MESSAGES.MAIN_MENU)
  })

  for (const text of ['9', '4', 'abc', '*', '00']) {
    it(`rejects unknown option ${JSON.stringify(text)}`, () => {
      assert.equal(handle(text), 'END Invalid option.')
    })
  }
})

describe('1. Buy airtime', () => {
  it('asks for an amount', () => {
    assert.equal(handle('1'), 'CON Enter amount in GHS (1-500):')
  })

  it('asks for confirmation with the amount formatted to 2dp', () => {
    assert.equal(handle('1*20'), 'CON Buy GHS 20.00 airtime?\n1. Confirm\n2. Cancel')
    assert.equal(handle('1*7.5'), 'CON Buy GHS 7.50 airtime?\n1. Confirm\n2. Cancel')
  })

  it('confirms the purchase', () => {
    assert.equal(handle('1*20*1'), 'END Airtime purchase of GHS 20.00 successful.')
  })

  it('cancels the purchase', () => {
    assert.equal(handle('1*20*2'), 'END Purchase cancelled.')
  })

  it('rejects an unknown confirmation choice', () => {
    assert.equal(handle('1*20*3'), 'END Invalid option.')
  })

  it('rejects input after the confirmation step', () => {
    assert.equal(handle('1*20*1*1'), 'END Invalid option.')
  })

  for (const amount of ['1', '500', '1.5', '499.99', ' 20 ']) {
    it(`accepts amount ${JSON.stringify(amount)}`, () => {
      assert.match(handle(`1*${amount}`), /^CON Buy GHS \d+\.\d{2} airtime\?/)
    })
  }

  for (const amount of ['', 'abc', '0', '0.99', '500.01', '501', '-5', '10.123', '1e2', '10.', '.5', '١٠']) {
    it(`rejects amount ${JSON.stringify(amount)}`, () => {
      assert.equal(
        handle(`1*${amount}`),
        'END Invalid amount. Enter a number from 1 to 500 with at most 2 decimal places.',
      )
    })
  }
})

describe('parseAmount', () => {
  it('normalises valid amounts to 2dp', () => {
    assert.equal(parseAmount('1'), '1.00')
    assert.equal(parseAmount('12.3'), '12.30')
    assert.equal(parseAmount('500.00'), '500.00')
  })

  it('returns null for invalid amounts', () => {
    assert.equal(parseAmount('500.001'), null)
    assert.equal(parseAmount('GHS 5'), null)
  })
})

describe('2. Register', () => {
  it('asks for a full name', () => {
    assert.equal(handle('2'), 'CON Enter your full name:')
  })

  it('asks for a town after a valid name', () => {
    assert.equal(handle('2*Ama Mensah'), 'CON Enter your town:')
  })

  it('registers the subscriber', () => {
    assert.equal(handle('2*Ama Mensah*Kumasi'), 'END Registered Ama Mensah, Kumasi.')
  })

  it('trims surrounding whitespace', () => {
    assert.equal(handle('2*  Kofi Boateng *  Tamale '), 'END Registered Kofi Boateng, Tamale.')
  })

  it('accepts names of exactly 2 and 60 characters', () => {
    assert.equal(handle('2*Al'), MESSAGES.ENTER_TOWN)
    assert.equal(handle(`2*${'a'.repeat(60)}`), MESSAGES.ENTER_TOWN)
  })

  for (const name of ['', ' ', 'A', 'a'.repeat(61)]) {
    it(`rejects name ${JSON.stringify(name.length > 10 ? `<${name.length} chars>` : name)}`, () => {
      assert.equal(handle(`2*${name}`), 'END Invalid name. Use 2 to 60 characters.')
    })
  }

  for (const town of ['', '  ', 'X', 'x'.repeat(41)]) {
    it(`rejects town ${JSON.stringify(town.length > 10 ? `<${town.length} chars>` : town)}`, () => {
      assert.equal(handle(`2*Ama Mensah*${town}`), 'END Invalid town. Use 2 to 40 characters.')
    })
  }

  it('rejects input after the town step', () => {
    assert.equal(handle('2*Ama Mensah*Kumasi*1'), 'END Invalid option.')
  })
})

describe('3. Check balance', () => {
  it('shows the demo balance', () => {
    assert.equal(handle('3'), 'END Balance: GHS 42.50')
  })

  it('rejects extra input', () => {
    assert.equal(handle('3*1'), 'END Invalid option.')
  })
})

describe('0. Exit', () => {
  it('says goodbye', () => {
    assert.equal(handle('0'), 'END Goodbye.')
  })

  it('rejects extra input', () => {
    assert.equal(handle('0*1'), 'END Invalid option.')
  })
})
