import express from 'express'
import { handle } from './menu.js'

const REQUIRED_FIELDS = ['sessionId', 'phoneNumber']

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.urlencoded({ extended: false, limit: '10kb' }))

  app.get('/health', (_req, res) => {
    res.type('text/plain').send('ok')
  })

  app.post('/ussd', (req, res) => {
    const body = req.body ?? {}
    const missing = REQUIRED_FIELDS.filter(
      (field) => typeof body[field] !== 'string' || body[field].trim() === '',
    )
    if (missing.length > 0) {
      return res
        .status(400)
        .type('text/plain')
        .send(`Missing required field(s): ${missing.join(', ')}`)
    }

    const text = typeof body.text === 'string' ? body.text : ''
    res.type('text/plain').send(handle(text))
  })

  return app
}

export default createApp()
