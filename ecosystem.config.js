module.exports = {
  apps: [
    {
      name: 'loadvoice',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/loadvoice',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      autorestart: true,
      watch: false,
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,

      // Auto-restart configuration
      min_uptime: '10s',
      max_restarts: 10,
    },
    {
      name: 'retention-cleanup',
      script: './cron-retention.sh',
      cwd: '/var/www/loadvoice',
      interpreter: '/bin/bash',
      cron_restart: '0 2 * * *', // Daily at 2:00 AM
      autorestart: false,
      watch: false,
    },
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'root',
      host: 'YOUR_VPS_IP',
      ref: 'origin/main',
      repo: 'YOUR_GIT_REPO_URL',
      path: '/var/www/loadvoice',
      'pre-deploy-local': '',
      'post-deploy': 'npm install --production && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
