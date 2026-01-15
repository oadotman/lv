// =====================================================
// PM2 CONFIGURATION FOR LOADVOICE PRODUCTION
// =====================================================
//
// Usage:
// 1. Copy this file to the server: /var/www/loadvoice/
// 2. Start: pm2 start loadvoice-pm2.config.js
// 3. Save: pm2 save
// 4. Startup: pm2 startup
// =====================================================

module.exports = {
  apps: [{
    name: 'loadvoice',
    script: '.next/standalone/server.js',
    cwd: '/var/www/loadvoice',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0'
    },
    error_file: '/var/log/pm2/loadvoice-error.log',
    out_file: '/var/log/pm2/loadvoice-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
