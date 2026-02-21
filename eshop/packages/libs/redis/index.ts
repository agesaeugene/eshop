import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_DATABASE_URI!, {
  tls: {
    rejectUnauthorized: false
  },
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    console.error('Redis reconnect error:', err);
    return true;
  }
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('✓ Redis connected successfully');
});

export default redis;
