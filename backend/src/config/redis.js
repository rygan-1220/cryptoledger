const Redis = require("ioredis");

let redisInstance = null;

function initRedis(redisUrl) {
  if (redisInstance) {
    redisInstance.disconnect();
  }
  redisInstance = new Redis(redisUrl);
  redisInstance.on('error', (err) => {
    console.error('Redis error', err);
  });
  return redisInstance;
}

if (process.env.REDIS_URL) {
  initRedis(process.env.REDIS_URL);
}

const proxy = new Proxy({}, {
  get: (target, prop) => {
    if (prop === 'initRedis') return initRedis;
    if (prop === 'getInstance') return () => redisInstance;
    if (!redisInstance) throw new Error('Redis not initialized');
    
    if (typeof redisInstance[prop] === 'function') {
      return redisInstance[prop].bind(redisInstance);
    }
    return redisInstance[prop];
  }
});

module.exports = proxy;
