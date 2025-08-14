/**
 * Node USSD Gateway — by Jackson Kojo Osei
 * Simple express server with a USSD flow and naive in-memory session storage.
 */
import express from 'express'
import bodyParser from 'body-parser'
const app = express()
app.use(bodyParser.urlencoded({ extended: false }))

const SESSIONS = new Map()

app.post('/ussd', (req, res) => {
  const { sessionId, phoneNumber, text = '' } = req.body || {}
  const input = text ? String(text).split('*') : []
  const step = input.length
  if(!SESSIONS.has(sessionId)) SESSIONS.set(sessionId, { msisdn: phoneNumber })

  if(step === 0){
    return res.send('CON Welcome Jackson!\n1. Buy Bundle\n2. My Number\n3. Exit')
  }
  const choice = input[0]
  if(choice === '1'){
    if(step === 1) return res.send('CON Enter amount (GHS):')
    if(step === 2){ return res.send(`END Bundle purchase of GHS ${input[1]} received`) }
  }
  if(choice === '2'){ return res.send(`END ${phoneNumber}`) }
  return res.send('END Bye')
})

app.listen(3002, ()=> console.log('USSD server at http://localhost:3002'))