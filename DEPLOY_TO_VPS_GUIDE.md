# Deploy LoadVoice to VPS - Quick Start Guide

## 🚀 Strategy: Deploy First, Add Services Later

This guide helps you deploy LoadVoice to your VPS so Twilio (and other services) can verify your live website before approving your account.

---

## 📋 Pre-Deployment Checklist

### Required on VPS:
- [ ] Node.js 18+ installed
- [ ] PM2 for process management
- [ ] Nginx for reverse proxy
- [ ] Git installed
- [ ] Domain pointed to VPS IP

### Services to Configure LATER:
- ⏸️ Twilio (after deployment)
- ⏸️ Paddle (can wait)
- ⏸️ Resend (can use console.log for now)

---

## 🔧 Step 1: Prepare for Deployment

### 1.1 Create Production Environment File
Create `.env.production` with minimal working configuration:

```env
# REQUIRED - Must Configure Now
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # Your actual domain
NEXT_PUBLIC_APP_VERSION=1.0.0

# Supabase (Already configured - just copy from .env.local)
NEXT_PUBLIC_SUPABASE_URL=https://wiacusdxiyxjybckappw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Services (Already configured - copy from .env.local)
ASSEMBLYAI_API_KEY=32321473047f4e8faf07e492357a9128
OPENAI_API_KEY=sk-proj-...

# TEMPORARY - Services to add later
TWILIO_ACCOUNT_SID=temp_not_configured
TWILIO_AUTH_TOKEN=temp_not_configured
TWILIO_PHONE_NUMBER=+1234567890
RESEND_API_KEY=re_temp_not_configured
PADDLE_API_KEY=temp_not_configured

# Security (Generate new ones for production!)
PARTNER_JWT_SECRET=generate_new_secure_secret_here
```

### 1.2 Modify Code to Handle Missing Services Gracefully

Create a file `lib/config/feature-flags.ts`:

```typescript
// Feature flags to disable services until configured
export const features = {
  twilio: process.env.TWILIO_ACCOUNT_SID !== 'temp_not_configured',
  paddle: process.env.PADDLE_API_KEY !== 'temp_not_configured',
  resend: process.env.RESEND_API_KEY !== 're_temp_not_configured',
  redis: !!process.env.REDIS_URL,
};

export const isProduction = process.env.NODE_ENV === 'production';
```

---

## 🖥️ Step 2: Deploy to VPS

### 2.1 On Your Local Machine

```bash
# Build the production bundle
npm run build

# Test locally first
npm start

# Commit all changes
git add .
git commit -m "Prepare for VPS deployment"
git push origin main
```

### 2.2 On Your VPS

```bash
# 1. Clone the repository
cd /var/www
git clone https://github.com/yourusername/loadvoice.git
cd loadvoice

# 2. Install dependencies
npm install --production

# 3. Copy environment file
nano .env.production  # paste your production env vars

# 4. Build the application
npm run build

# 5. Test it works
npm start  # Should see "Ready on http://localhost:3000"
# Press Ctrl+C to stop

# 6. Set up PM2
pm2 start npm --name "loadvoice" -- start
pm2 save
pm2 startup  # Follow the instructions
```

---

## 🌐 Step 3: Configure Nginx

Create `/etc/nginx/sites-available/loadvoice`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/loadvoice /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔒 Step 4: Add SSL (Required for Twilio)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## ✅ Step 5: Verify Deployment

1. Visit `https://yourdomain.com`
2. You should see the LoadVoice landing page
3. Try signing up (will work with Supabase)
4. Dashboard will load (with limited features)

---

## 🔌 Step 6: Apply for Services

Now that your site is live, apply for:

### Twilio
1. Go to [Twilio.com](https://www.twilio.com)
2. Sign up for account
3. In verification, provide your live URL: `https://yourdomain.com`
4. Once approved, update `.env.production`:
   ```env
   TWILIO_ACCOUNT_SID=your_real_sid
   TWILIO_AUTH_TOKEN=your_real_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   ```
5. Restart app: `pm2 restart loadvoice`

### Paddle (Payment Processing)
1. Apply at [Paddle.com](https://www.paddle.com)
2. Provide your live URL
3. Once approved, update credentials

### Resend (Email)
1. Sign up at [Resend.com](https://resend.com)
2. Verify domain
3. Update API key

---

## 🛠️ Quick Commands for VPS

```bash
# View logs
pm2 logs loadvoice

# Restart after config changes
pm2 restart loadvoice

# Update code
cd /var/www/loadvoice
git pull
npm install
npm run build
pm2 restart loadvoice

# Check status
pm2 status
pm2 monit
```

---

## 🎯 What Works Without External Services

✅ **Working Features:**
- Landing page
- User registration/login (Supabase)
- Dashboard (limited data)
- Load management (CRUD)
- Carrier management
- Settings pages
- FMCSA verification (uses free API)

⚠️ **Limited Features:**
- No call recording (needs Twilio)
- No payment processing (needs Paddle)
- No email notifications (needs Resend)
- Basic rate limiting (better with Redis)

---

## 📝 Sample "Coming Soon" Messages

Add these to your UI while services are pending:

```typescript
// In components that need Twilio
import { features } from '@/lib/config/feature-flags';

if (!features.twilio) {
  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Call recording feature coming soon! We're setting up our phone system.
      </AlertDescription>
    </Alert>
  );
}
```

---

## 🚨 Important Security Notes

1. **Generate New Secrets** for production:
   ```bash
   # Generate secure secret
   openssl rand -hex 32
   ```

2. **Firewall Rules**:
   ```bash
   sudo ufw allow 22/tcp  # SSH
   sudo ufw allow 80/tcp  # HTTP
   sudo ufw allow 443/tcp # HTTPS
   sudo ufw enable
   ```

3. **Hide Sensitive Files**:
   ```bash
   # Never commit .env files
   echo ".env.production" >> .gitignore
   ```

---

## 📱 After Twilio Approval

Once Twilio approves your account:

1. Update `.env.production` with real credentials
2. Configure webhook URL in Twilio console:
   ```
   https://yourdomain.com/api/twilio/voice
   ```
3. Restart app: `pm2 restart loadvoice`
4. Test call recording feature

---

## 🎉 Success Checklist

- [ ] Site accessible at https://yourdomain.com
- [ ] SSL certificate working (padlock icon)
- [ ] Users can sign up and log in
- [ ] Dashboard loads (even if limited)
- [ ] PM2 keeping app running
- [ ] Nginx properly configured
- [ ] Ready to apply for Twilio

---

## 💡 Pro Tips

1. **Start Simple**: Get basic deployment working first
2. **Add Services Gradually**: Don't try to configure everything at once
3. **Monitor Logs**: `pm2 logs` is your friend
4. **Keep Building**: You can build locally and deploy updates
5. **Document Everything**: Keep track of what you configure

This approach lets you have a professional-looking site live for Twilio to verify, while you continue development!