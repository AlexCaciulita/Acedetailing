// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'nova-detailing',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    max_memory_restart: '256M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/access.log',
    merge_logs: true
  }]
};
