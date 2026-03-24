import Redis from 'ioredis'
import { env } from './env'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  lazyConnect: true,
})

export const redisSub = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
})

redis.on('error', (err) => console.error('[Redis] error:', err.message))
redisSub.on('error', (err) => console.error('[Redis Sub] error:', err.message))

export async function connectRedis() {
  await redis.connect()
}

export async function disconnectRedis() {
  await redis.quit()
  await redisSub.quit()
}
