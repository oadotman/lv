# 🚀 LoadVoice VPS Deployment Checklist

## ✅ Pre-Deployment (Local Machine)

### 1. Code Preparation
- [ ] All mock data removed
- [ ] Feature flags configured in `lib/config/feature-flags.ts`
- [ ] Build runs successfully: `npm run build`
- [ ] No TypeScript errors
- [ ] Environment template created: `.env.production.template`

### 2. Required Credentials (Have Ready)
- [ ] Supabase URL
- [ ] Supabase Anon Key
- [ ] Supabase Service Role Key
- [ ] AssemblyAI API Key
- [ ] OpenAI API Key
- [ ] Domain name configured (DNS pointing to VPS)

---

## 🖥️ VPS Setup

### 3. Server Requirements
- [ ] Ubuntu 20.04 or 22.04 LTS
- [ ] Minimum 2GB RAM (4GB recommended)
- [ ] 20GB+ storage
- [ ] Root or sudo access
- [ ] Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)

### 4. Quick Setup Option
```bash
# Download and run the quick setup script on your VPS
wget https://raw.githubusercontent.com/yourusername/loadvoice/main/vps-quick-setup.sh
chmod +x vps-quick-setup.sh
sudo ./vps-quick-setup.sh
```

### 5. Manual Setup Steps
If not using the quick setup script:

- [ ] Update system: `apt update && apt upgrade`
- [ ] Install Node.js 18: `curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && apt install nodejs`
- [ ] Install PM2: `npm install -g pm2`
- [ ] Install Nginx: `apt install nginx`
- [ ] Install Git: `apt install git`
- [ ] Clone repository to `/var/www/loadvoice`
- [ ] Create `.env.production` file
- [ ] Run `npm install --production`
- [ ] Run `npm run build`
- [ ] Start with PM2: `pm2 start npm --name loadvoice -- start`

---

## 🔧 Configuration

### 6. Environment Variables
Edit `/var/www/loadvoice/.env.production`:

**Required Now:**
- [ ] `NEXT_PUBLIC_APP_URL=https://yourdomain.com`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ASSEMBLYAI_API_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] Generate new `PARTNER_JWT_SECRET`
- [ ] Generate new `NEXTAUTH_SECRET`

**Can Configure Later:**
- [ ] Twilio credentials (after account approval)
- [ ] Paddle credentials (after account approval)
- [ ] Resend credentials (when ready)
- [ ] Redis URL (optional)
- [ ] Sentry DSN (optional)

### 7. Nginx Configuration
- [ ] Create site config: `/etc/nginx/sites-available/yourdomain.com`
- [ ] Enable site: `ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/`
- [ ] Test config: `nginx -t`
- [ ] Restart Nginx: `systemctl restart nginx`

### 8. SSL Certificate
- [ ] Install Certbot: `apt install certbot python3-certbot-nginx`
- [ ] Get certificate: `certbot --nginx -d yourdomain.com -d www.yourdomain.com`
- [ ] Test auto-renewal: `certbot renew --dry-run`

---

## 🔍 Verification

### 9. Test Deployment
- [ ] Site loads at `https://yourdomain.com`
- [ ] Health check works: `https://yourdomain.com/api/health`
- [ ] Can create account
- [ ] Can log in
- [ ] Dashboard loads (even with limited data)
- [ ] No console errors

### 10. PM2 Checks
- [ ] App is running: `pm2 status`
- [ ] No errors in logs: `pm2 logs loadvoice`
- [ ] Auto-restart configured: `pm2 save && pm2 startup`

---

## 📱 Apply for Services

### 11. Twilio (After Site is Live)
- [ ] Go to [twilio.com](https://twilio.com)
- [ ] Sign up for account
- [ ] Provide your live URL in verification
- [ ] Get phone number
- [ ] Update `.env.production` with credentials
- [ ] Restart app: `pm2 restart loadvoice`

### 12. Paddle (Payment Processing)
- [ ] Apply at [paddle.com](https://paddle.com)
- [ ] Provide business details
- [ ] Wait for approval (1-3 days)
- [ ] Configure products and pricing
- [ ] Update `.env.production` with credentials
- [ ] Restart app

### 13. Resend (Email Service)
- [ ] Sign up at [resend.com](https://resend.com)
- [ ] Verify domain
- [ ] Get API key
- [ ] Update `.env.production`
- [ ] Restart app

---

## 🛠️ Maintenance Commands

### Useful Commands
```bash
# View logs
pm2 logs loadvoice

# Restart app
pm2 restart loadvoice

# Update from git
cd /var/www/loadvoice
git pull
npm install
npm run build
pm2 restart loadvoice

# Check status
pm2 status
pm2 monit

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

---

## 🚨 Troubleshooting

### Common Issues

**Build Fails:**
- Check Node.js version: `node -v` (should be 18+)
- Clear cache: `rm -rf .next node_modules`
- Reinstall: `npm install`

**502 Bad Gateway:**
- Check PM2: `pm2 status`
- Check logs: `pm2 logs loadvoice`
- Restart: `pm2 restart loadvoice`

**SSL Issues:**
- Renew cert: `certbot renew`
- Check Nginx: `nginx -t`

**Permission Errors:**
- Fix ownership: `chown -R www-data:www-data /var/www/loadvoice`
- Fix permissions: `chmod -R 755 /var/www/loadvoice`

---

## 📊 Monitoring

### 14. Set Up Monitoring (Optional)
- [ ] UptimeRobot: Monitor `https://yourdomain.com/api/health`
- [ ] New Relic or Datadog for APM
- [ ] Set up log rotation
- [ ] Configure backup strategy

---

## ✅ Final Checklist

- [ ] Site is live and accessible
- [ ] SSL certificate working (padlock icon)
- [ ] Health endpoint responding
- [ ] Users can sign up and log in
- [ ] Database connected (Supabase)
- [ ] AI services working (if configured)
- [ ] PM2 keeping app running
- [ ] Nginx properly configured
- [ ] Firewall rules set
- [ ] Backups configured
- [ ] Monitoring in place
- [ ] Documentation updated

---

## 🎉 Success!

Your LoadVoice application is now deployed! The site will work with limited functionality until you configure:
- Twilio (for call recording)
- Paddle (for payments)
- Resend (for emails)

These can be added gradually as you get approved for each service.

---

## 📞 Support

If you encounter issues:
1. Check the logs: `pm2 logs loadvoice`
2. Review this checklist
3. Check the health endpoint: `/api/health`
4. Verify environment variables are set correctly

Remember: The app is designed to work without external services initially, showing "coming soon" messages where features are not yet available.