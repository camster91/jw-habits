# Deployment Guide

This guide covers different deployment options for the JW News Parser Node.js application.

## Quick Start

1. **Install Dependencies**
```bash
npm install
```

If Puppeteer fails to download Chromium:
```bash
PUPPETEER_SKIP_DOWNLOAD=true npm install
```

Then install Chromium system-wide:
```bash
# Ubuntu/Debian
sudo apt-get install chromium-browser

# macOS
brew install chromium

# Alpine Linux (Docker)
apk add chromium
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your SMTP credentials
```

3. **Test Run**
```bash
npm start
```

## Deployment Options

### 1. PM2 (Recommended for VPS/Server)

PM2 is a production process manager that can schedule the scraper to run daily.

**Installation:**
```bash
npm install -g pm2
```

**Deploy:**
```bash
npm run deploy
```

**Useful Commands:**
```bash
# View logs
npm run deploy:logs

# Stop
npm run deploy:stop

# Restart
npm run deploy:restart

# Monitor
pm2 monit

# Save process list
pm2 save

# Setup auto-start on reboot
pm2 startup
```

**Change Schedule:**
Edit `ecosystem.config.cjs` and modify the `cron_restart` field:
```javascript
cron_restart: '0 8 * * *', // Daily at 8 AM
```

### 2. Docker

**Build and Run:**
```bash
# Using docker-compose (recommended)
npm run docker:run

# Or manually
npm run docker:build
docker run -d --env-file .env -v $(pwd)/history.json:/app/history.json jw-news-parser
```

**With Cron Schedule:**
Use a container scheduler like:
- [Ofelia](https://github.com/mcuadros/ofelia) for Docker Swarm
- Kubernetes CronJob
- Cloud provider schedulers (AWS ECS Scheduled Tasks, etc.)

### 3. Systemd Service (Linux)

Create `/etc/systemd/system/jw-news-parser.service`:
```ini
[Unit]
Description=JW News Parser
After=network.target

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/JW-News
ExecStart=/usr/bin/node /path/to/JW-News/index.js
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Create timer `/etc/systemd/system/jw-news-parser.timer`:
```ini
[Unit]
Description=Run JW News Parser Daily

[Timer]
OnCalendar=daily
OnCalendar=08:00
Persistent=true

[Install]
WantedBy=timers.target
```

**Enable and start:**
```bash
sudo systemctl enable jw-news-parser.timer
sudo systemctl start jw-news-parser.timer
sudo systemctl status jw-news-parser.timer
```

### 4. Traditional Cron

```bash
crontab -e
```

Add:
```cron
0 8 * * * cd /path/to/JW-News && /usr/bin/node index.js >> /var/log/jw-news.log 2>&1
```

### 5. Cloud Platforms

#### AWS Lambda

1. Package the application:
```bash
npm ci --production
zip -r function.zip .
```

2. Create Lambda function with Node.js 18 runtime
3. Upload the zip file
4. Set environment variables
5. Configure EventBridge (CloudWatch Events) trigger with cron expression:
   - `cron(0 8 * * ? *)` for daily at 8 AM UTC

#### Google Cloud Functions

1. Deploy:
```bash
gcloud functions deploy jw-news-parser \
  --runtime nodejs18 \
  --trigger-http \
  --entry-point main \
  --set-env-vars $(cat .env | xargs)
```

2. Schedule with Cloud Scheduler:
```bash
gcloud scheduler jobs create http jw-news-daily \
  --schedule="0 8 * * *" \
  --uri="https://REGION-PROJECT_ID.cloudfunctions.net/jw-news-parser" \
  --http-method=GET
```

#### Azure Functions

1. Install Azure Functions Core Tools
2. Initialize:
```bash
func init --javascript
func new --template "Timer Trigger" --name jw-news-parser
```

3. Set schedule in `function.json`:
```json
{
  "schedule": "0 0 8 * * *"
}
```

4. Deploy:
```bash
func azure functionapp publish YOUR_FUNCTION_APP
```

#### Heroku

1. Create `Procfile`:
```
worker: node index.js
```

2. Deploy:
```bash
heroku create jw-news-parser
heroku config:set $(cat .env | xargs)
git push heroku main
```

3. Add Heroku Scheduler add-on:
```bash
heroku addons:create scheduler:standard
heroku addons:open scheduler
```

Configure to run `node index.js` daily.

#### Railway / Render / Fly.io

Similar to Heroku:
1. Connect your Git repository
2. Set environment variables in dashboard
3. Configure build command: `npm install`
4. Configure start command: `node index.js`
5. Set up cron job via their scheduler or use external service

### 6. External Cron Services

If your hosting doesn't support cron:

**EasyCron:**
- URL: https://www.easycron.com
- Create HTTP GET job to trigger your app
- Free tier available

**cron-job.org:**
- URL: https://cron-job.org
- Schedule HTTP requests
- Free service

**GitHub Actions:**
```yaml
# .github/workflows/daily-run.yml
name: Daily JW News Parser

on:
  schedule:
    - cron: '0 8 * * *'
  workflow_dispatch:

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: node index.js
        env:
          SMTP_HOST: ${{ secrets.SMTP_HOST }}
          SMTP_PORT: ${{ secrets.SMTP_PORT }}
          SMTP_USER: ${{ secrets.SMTP_USER }}
          SMTP_PASS: ${{ secrets.SMTP_PASS }}
```

## Environment Variables

Always set these in your deployment platform:

```env
SMTP_HOST=smtp-relay.sendinblue.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=JW Newsfeed <jworgnewsfeed@gmail.com>
TO_EMAIL=jworgnewsfeed@gmail.com
NODE_ENV=production
HEADLESS=true
```

## Monitoring

### Logs

**PM2:**
```bash
pm2 logs jw-news-parser
pm2 logs jw-news-parser --lines 100
```

**Docker:**
```bash
docker logs jw-news-parser
docker logs -f jw-news-parser  # follow
```

**Systemd:**
```bash
journalctl -u jw-news-parser -f
```

### Health Checks

Add application monitoring:
- [UptimeRobot](https://uptimerobot.com) - Free website monitoring
- [Healthchecks.io](https://healthchecks.io) - Cron job monitoring
- Sentry - Error tracking
- LogDNA / DataDog - Log aggregation

## Troubleshooting

### Puppeteer Won't Launch

**Error:** Browser not found

**Solution:** Install Chromium system-wide or set executable path:

Add to `.env`:
```env
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

Or in index.js:
```javascript
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
```

### Email Not Sending

- Verify SMTP credentials
- Check network/firewall allows port 587
- Use app-specific passwords for Gmail
- Check email service quotas

### Memory Issues

Set PM2 memory limit:
```javascript
// ecosystem.config.cjs
max_memory_restart: '500M'
```

Or limit Node.js heap:
```bash
node --max-old-space-size=512 index.js
```

## Production Checklist

- [ ] Environment variables configured
- [ ] SMTP credentials tested
- [ ] Email list populated
- [ ] Test run successful
- [ ] Logs directory writable
- [ ] Schedule configured correctly
- [ ] Monitoring/alerts set up
- [ ] Backup strategy for history.json
- [ ] Security: No credentials in code
- [ ] Error handling tested

## Security Best Practices

1. **Never commit `.env`** - It's in `.gitignore`
2. **Use secrets managers** - AWS Secrets Manager, Azure Key Vault, etc.
3. **Rotate credentials** - Change passwords periodically
4. **Limit permissions** - Run as non-root user
5. **Update dependencies** - `npm audit fix` regularly
6. **Enable 2FA** - On email accounts
7. **Monitor logs** - Watch for unauthorized access
8. **HTTPS only** - For webhooks/triggers

## Scaling

For multiple instances or high volume:

1. **Distributed Scheduling:**
   - Use Redis with Bull Queue
   - Cloud-native schedulers (AWS Step Functions)

2. **Database:**
   - Replace `history.json` with PostgreSQL/MongoDB
   - Add connection pooling

3. **Queue System:**
   - SQS, RabbitMQ, or Kafka for email queue
   - Batch email sending

4. **Caching:**
   - Redis for scraped content
   - Reduce redundant requests

## Cost Optimization

**Free/Low-Cost Options:**
- GitHub Actions (2,000 min/month free)
- Google Cloud Functions (2M invocations/month free)
- AWS Lambda (1M requests/month free)
- Oracle Cloud Always Free tier
- Railway ($5/month)
- Render (free tier)

**VPS Options:**
- DigitalOcean ($5/month)
- Linode ($5/month)
- Vultr ($3.50/month)
- Hetzner (€4/month)

## Support

Questions? Check:
- Main README.md
- GitHub Issues
- Email: jworgnewsfeed@gmail.com
