# Self-Hosting StarAIGateway

Deploy StarAIGateway on your own infrastructure with Docker Compose. Your data stays on your servers.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.0+)
- At least one LLM provider API key (OpenAI, Anthropic, Google, etc.)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/staraigateway.git
cd staraigateway

# 2. Copy the example environment file
cp .env.example .env

# 3. Edit .env with your configuration
#    At minimum, set ENCRYPTION_KEY (see Environment Variables below)

# 4. Start all services
docker compose up -d
```

The app will be available at `http://localhost:3000`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@postgres:5432/staraigateway` | PostgreSQL connection string. Set automatically in Docker Compose. |
| `REDIS_URL` | No | `redis://redis:6379` | Redis connection string for response caching. Set automatically in Docker Compose. |
| `ENCRYPTION_KEY` | Yes | — | 32-byte hex string (64 characters) for AES-256-GCM encryption of provider API keys. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `BASE_URL` | No | `http://localhost:3000` | Public URL of your StarAIGateway instance. Used for OAuth callbacks and email links. |
| `LITELLM_API_URL` | No | `http://litellm:4000` | LiteLLM proxy URL. Set automatically in Docker Compose. |
| `LITELLM_MASTER_KEY` | No | `sk-litellm-master-key` | Master API key for LiteLLM admin operations. Change in production. |
| `CRON_SECRET` | No | — | Secret token for authenticating cron job requests (e.g., `/api/cron/digest`). Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SMTP_HOST` | No | — | SMTP server hostname for sending emails (invitations, budget alerts). |
| `SMTP_PORT` | No | `587` | SMTP server port. |
| `SMTP_USER` | No | — | SMTP authentication username. |
| `SMTP_PASS` | No | — | SMTP authentication password. |
| `SMTP_FROM` | No | `noreply@staraigateway.com` | Sender address for outgoing emails. |
| `GOOGLE_CLIENT_ID` | No | — | Google OAuth client ID for "Sign in with Google". |
| `GOOGLE_CLIENT_SECRET` | No | — | Google OAuth client secret. |
| `GITHUB_CLIENT_ID` | No | — | GitHub OAuth client ID for "Sign in with GitHub". |
| `GITHUB_CLIENT_SECRET` | No | — | GitHub OAuth client secret. |

## Verification

After starting the services, verify everything is working:

```bash
# 1. Check all 4 containers are running (app, postgres, redis, litellm)
docker compose ps

# 2. Test the app is responding
curl http://localhost:3000

# 3. Create your account
#    Visit http://localhost:3000/auth/signup in your browser

# 4. Add a provider API key
#    Go to Provider Keys in your org dashboard and add an OpenAI, Anthropic, or other key

# 5. Create an API key
#    Go to API Keys and create a personal key

# 6. Test the API
curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer sk-lth-your-key-here" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o-mini", "messages": [{"role": "user", "content": "Hello"}]}'
```

## Updating

```bash
# Pull the latest changes
git pull origin main

# Rebuild and restart
docker compose up -d --build
```

## Backup

Back up your PostgreSQL database regularly:

```bash
# Create a backup
docker compose exec postgres pg_dump -U postgres staraigateway > backup_$(date +%Y%m%d).sql

# Restore from backup
cat backup_20260316.sql | docker compose exec -T postgres psql -U postgres staraigateway
```

## Troubleshooting

### App won't start

Check container logs:

```bash
docker compose logs app
```

Common causes:
- Missing `ENCRYPTION_KEY` in `.env`
- PostgreSQL not ready yet (the app waits for healthy check, but on first start migrations may take a moment)

### Database connection errors

Verify PostgreSQL is healthy:

```bash
docker compose exec postgres pg_isready -U postgres
```

If using an external database, make sure `DATABASE_URL` in `.env` points to the correct host (not `postgres` which is the Docker service name).

### Redis connection errors

Redis is optional. If Redis is not available, the app works normally without response caching. Check Redis health:

```bash
docker compose exec redis redis-cli ping
```

### OAuth not working

For Google or GitHub OAuth, you need to:

1. Set `BASE_URL` to your public URL (e.g., `https://staraigateway.yourcompany.com`)
2. Configure OAuth callback URLs in your provider's developer console:
   - Google: `{BASE_URL}/auth/callback/google`
   - GitHub: `{BASE_URL}/auth/callback/github`
3. Set the corresponding client ID and secret in `.env`

### Emails not sending

SMTP is optional. Without it, invitation emails and budget alerts won't be sent, but the app works normally. To enable:

1. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `.env`
2. Restart the app: `docker compose restart app`
