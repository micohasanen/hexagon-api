module.exports = {
  apps : [{
    name: 'api-js',
    script: 'app.js',
    watch: true,
    ignore_watch: ['node_modules'],
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production'
    },
    env_development: {
      NODE_ENV: 'localhost'
    }
  }],
};
