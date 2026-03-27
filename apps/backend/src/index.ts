import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth.js'
import bills from './routes/bills.js'
import transactions from './routes/transactions.js'
import categories from './routes/categories.js'
import goals from './routes/goals.js'
import budgets from './routes/budgets.js'
import members from './routes/members.js'
import profiles from './routes/profiles.js'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
)

app.use('/api/*', authMiddleware)

app.route('/api/bills', bills)
app.route('/api/transactions', transactions)
app.route('/api/categories', categories)
app.route('/api/goals', goals)
app.route('/api/budgets', budgets)
app.route('/api/members', members)
app.route('/api/profiles', profiles)

app.get('/health', (c) => c.json({ ok: true }))

const port = Number(process.env.PORT ?? 3000)
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, () => {
  console.log(`[backend] listening on http://0.0.0.0:${port}`)
})
