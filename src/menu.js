/**
 * Demo Wallet USSD menu.
 *
 * `handle(text)` is a pure function: the reply depends only on `text`, the
 * '*'-joined history of everything the subscriber has typed this session
 * (e.g. "" -> "1" -> "1*20" -> "1*20*1"). The aggregator resends the full
 * history on every hop, so no server-side session state is needed.
 *
 * Replies start with "CON " (keep the session open) or "END " (close it).
 * Invalid input ends the session with a message explaining what was expected.
 */

export const MESSAGES = Object.freeze({
  MAIN_MENU:
    'CON Welcome to Demo Wallet\n1. Buy airtime\n2. Register\n3. Check balance\n0. Exit',
  ENTER_AMOUNT: 'CON Enter amount in GHS (1-500):',
  INVALID_AMOUNT:
    'END Invalid amount. Enter a number from 1 to 500 with at most 2 decimal places.',
  PURCHASE_CANCELLED: 'END Purchase cancelled.',
  ENTER_NAME: 'CON Enter your full name:',
  INVALID_NAME: 'END Invalid name. Use 2 to 60 characters.',
  ENTER_TOWN: 'CON Enter your town:',
  INVALID_TOWN: 'END Invalid town. Use 2 to 40 characters.',
  GOODBYE: 'END Goodbye.',
  INVALID_OPTION: 'END Invalid option.',
})

// Demo value only: a real deployment would query the wallet/ledger service.
export const DEMO_BALANCE_GHS = '42.50'

export const AMOUNT_MIN = 1
export const AMOUNT_MAX = 500
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/

/** Returns the amount formatted to 2dp (e.g. "20.00"), or null if invalid. */
export function parseAmount(raw) {
  const value = raw.trim()
  if (!AMOUNT_PATTERN.test(value)) return null
  const amount = Number(value)
  if (amount < AMOUNT_MIN || amount > AMOUNT_MAX) return null
  return amount.toFixed(2)
}

function isValidLength(value, min, max) {
  return value.length >= min && value.length <= max
}

function buyAirtime(steps) {
  const [amountInput, confirmation] = steps
  if (amountInput === undefined) return MESSAGES.ENTER_AMOUNT

  const amount = parseAmount(amountInput)
  if (amount === null) return MESSAGES.INVALID_AMOUNT

  if (confirmation === undefined) {
    return `CON Buy GHS ${amount} airtime?\n1. Confirm\n2. Cancel`
  }
  if (steps.length > 2) return MESSAGES.INVALID_OPTION
  // Simulated purchase: no payment provider is called in this demo.
  if (confirmation === '1') return `END Airtime purchase of GHS ${amount} successful.`
  if (confirmation === '2') return MESSAGES.PURCHASE_CANCELLED
  return MESSAGES.INVALID_OPTION
}

function register(steps) {
  const [nameInput, townInput] = steps
  if (nameInput === undefined) return MESSAGES.ENTER_NAME

  const name = nameInput.trim()
  if (!isValidLength(name, 2, 60)) return MESSAGES.INVALID_NAME

  if (townInput === undefined) return MESSAGES.ENTER_TOWN
  if (steps.length > 2) return MESSAGES.INVALID_OPTION

  const town = townInput.trim()
  if (!isValidLength(town, 2, 40)) return MESSAGES.INVALID_TOWN

  return `END Registered ${name}, ${town}.`
}

/**
 * @param {string} [text] '*'-joined input history ("" on the first request)
 * @returns {string} reply beginning with "CON " or "END "
 */
export function handle(text = '') {
  if (text === '') return MESSAGES.MAIN_MENU

  const [choice, ...steps] = text.split('*')
  switch (choice.trim()) {
    case '1':
      return buyAirtime(steps)
    case '2':
      return register(steps)
    case '3':
      return steps.length === 0 ? `END Balance: GHS ${DEMO_BALANCE_GHS}` : MESSAGES.INVALID_OPTION
    case '0':
      return steps.length === 0 ? MESSAGES.GOODBYE : MESSAGES.INVALID_OPTION
    default:
      return MESSAGES.INVALID_OPTION
  }
}
