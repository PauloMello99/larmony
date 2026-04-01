import * as dotenv from 'dotenv'
import * as path from 'path'

// Load root .env.local (monorepo root is two levels up from apps/backend)
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') })

import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter())

  const rawOrigins = process.env.WEB_ORIGIN ?? 'http://localhost:5173'
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes(origin)) return callback(null, true)
      callback(new Error(`CORS: origin "${origin}" not allowed`), false)
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  })

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port, '0.0.0.0')
  console.log(`[Backend] Listening on http://0.0.0.0:${port}`)
}

bootstrap()
