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
    },
    {
      name: 'inngest',
      script: 'npx',
      args: 'inngest-cli@latest dev -u http://localhost:3000/api/inngest',
      cwd: '/var/www/synqall',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
    },
  ],
};
