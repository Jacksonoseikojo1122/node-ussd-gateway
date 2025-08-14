# Node USSD Gateway
Express server with a simple USSD flow (CON/END). Replace in-memory map with Redis for production.

## Run
```bash
npm i
npm run dev
```
## Test
```
curl -X POST http://localhost:3002/ussd -d "sessionId=1&phoneNumber=+233201234567&text="
curl -X POST http://localhost:3002/ussd -d "sessionId=1&phoneNumber=+233201234567&text=1"
curl -X POST http://localhost:3002/ussd -d "sessionId=1&phoneNumber=+233201234567&text=1*5"
```