# 🗑️ Retention Cleanup System - Setup Guide

This document explains the **tiered retention cleanup system** that automatically deletes old data to optimize storage costs.

## 📊 Retention Policy (Cost-Optimized)

The system implements a tiered approach based on storage cost:

| Resource | Retention Period | Why? |
|----------|-----------------|------|
| **Audio Files** | 7 days | Largest cost driver - deleted after transcription |
| **Transcripts** | 30 days | Deleted after CRM data is extracted |
| **Call Metadata** | Indefinite | Timestamp, caller, duration - tiny storage |
| **Extracted CRM Fields** | Indefinite | Core business data - minimal cost |
| **Audit Logs** | 90 days (anonymized) | Compliance requirement |

### What Gets Deleted?

**After 7 days:**
- Audio files are removed from Supabase Storage
- Call record is updated to indicate audio deleted
- Metadata and CRM data remain intact

**After 30 days:**
- Full transcripts and utterances are deleted
- Extracted CRM fields (summary, sentiment, next steps) are kept

**After 90 days:**
- Audit logs are anonymized (user_id, IP, user agent removed)
- Event records remain for system debugging

## 🔧 Setup Instructions

### Step 1: Add Environment Variable

Add the cron secret to your `.env.local` (development) and `.env.production` (VPS):

```bash
# Cron job authentication
CRON_SECRET=your-secure-random-secret-here
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

### Step 2: Choose Cron Method

You have three options for running the daily cleanup:

#### **Option A: External Cron Service (Recommended for Vercel/Serverless)**

Use a free service like [cron-job.org](https://cron-job.org):

1. Sign up at https://cron-job.org
2. Create a new cron job:
   - **URL**: `https://synqall.com/api/cron/retention-cleanup`
   - **Method**: POST
   - **Schedule**: Daily at 2:00 AM UTC
   - **Headers**:
     ```
     Authorization: Bearer your-secure-random-secret-here
     ```

#### **Option B: PM2 Cron (For VPS Deployment)**

If running on a VPS with PM2, create a separate cron process:

1. Create `cron-retention.js`:

```javascript
// cron-retention.js
const https = require('https');

const CRON_URL = process.env.NEXT_PUBLIC_APP_URL + '/api/cron/retention-cleanup';
const CRON_SECRET = process.env.CRON_SECRET;

console.log('[Cron] Running retention cleanup:', new Date().toISOString());

const options = {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(CRON_URL, options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('[Cron] Response:', data);
    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('[Cron] Error:', error);
  process.exit(1);
});

req.end();
```

2. Add to PM2 ecosystem:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'synqall',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      // ... your existing config
    },
    {
      name: 'retention-cleanup',
      script: './cron-retention.js',
      cron_restart: '0 2 * * *', // Daily at 2 AM
      autorestart: false,
      watch: false,
    }
  ]
};
```

3. Start the cron job:

```bash
pm2 start ecosystem.config.js
pm2 save
```

#### **Option C: Vercel Cron (If Deployed on Vercel)**

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/retention-cleanup",
    "schedule": "0 2 * * *"
  }]
}
```

Update the API route to check for Vercel's cron header:

```typescript
// In app/api/cron/retention-cleanup/route.ts
const isVercelCron = req.headers.get('x-vercel-cron-key');
const authHeader = req.headers.get('authorization');
const cronSecret = process.env.CRON_SECRET;

if (!isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Step 3: Test the Endpoint

Test that the cron endpoint is working:

```bash
# Test GET (view policies)
curl https://synqall.com/api/cron/retention-cleanup

# Test POST (run cleanup)
curl -X POST https://synqall.com/api/cron/retention-cleanup \
  -H "Authorization: Bearer your-secret-here"
```

### Step 4: Monitor Logs

The cleanup job logs detailed information:

```
[Cron] Starting retention cleanup job
[Retention] Deleting audio files older than 2024-11-22T00:00:00.000Z
[Retention] Deleted audio file: user-123/file-abc.m4a
[Retention] Deleted 15 transcripts
[Retention] Anonymized 42 audit log entries
[Cron] Retention cleanup completed
```

## 📈 Expected Storage Savings

Example for 100 calls/month:

| Without Cleanup | With Tiered Cleanup | Savings |
|----------------|---------------------|---------|
| Audio: 50 GB/month | Audio: ~1.2 GB | **97% reduction** |
| Transcripts: 500 MB | Transcripts: ~15 MB | **97% reduction** |
| **Total: ~$10-15/month** | **Total: ~$0.50/month** | **~$10/month saved** |

## 🔒 Security Notes

- **CRON_SECRET** must be kept secure (don't commit to git)
- The endpoint rejects requests without valid authentication
- Audit logs are anonymized, not deleted, for compliance
- Failed uploads are automatically cleaned up

## 🛠️ Customizing Retention Periods

To adjust retention periods, edit `lib/gdpr/data-retention.ts`:

```typescript
const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    resource: 'audio_files',
    retentionDays: 14, // Change from 7 to 14 days
    enabled: true,
    description: 'Audio files - keep for 2 weeks'
  },
  // ... other policies
];
```

## 📞 Support

If you have questions about the retention system:
- Check logs for detailed cleanup information
- Test manually via the API endpoint
- Adjust policies based on your business needs
