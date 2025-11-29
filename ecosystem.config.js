module.exports = {
  apps: [
    {
      name: 'synqall',
      script: '.next/standalone/server.js',
      cwd: '/var/www/synqall',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      autorestart: true,
    },
    {
      name: 'retention-cleanup',
      script: './cron-retention.sh',
      cwd: '/var/www/synqall',
      interpreter: '/bin/bash',
      cron_restart: '0 2 * * *', // Daily at 2:00 AM
      autorestart: false,
      watch: false,
    },
  ],
};
