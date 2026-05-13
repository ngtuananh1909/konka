# Review Server Setup Guide

The review server now supports multiple LLM providers to analyze and validate game code during meetings. This guide explains how to configure and optimize for cost and performance.

## Providers Supported

### 1. **OpenRouter** (Recommended for cost optimization)
- **URL**: https://openrouter.ai
- **Pros**: 
  - Cheap models available (Mistral-1 ~1/100th of GPT-4 cost)
  - No quota limits
  - Pay-as-you-go
  - Supports 100+ models
- **Cons**: Requires API key signup and payment method
- **Best for**: Production, cost-sensitive applications

### 2. **Google Gemini** (Default, good for free tier)
- **URL**: https://aistudio.google.com
- **Pros**: 
  - Free tier available (rate-limited)
  - High quality responses
  - Native Node.js integration
- **Cons**: 
  - Free tier has strict quotas (as you discovered: 429 errors)
  - Requires GCP project setup for production
- **Best for**: Development with billing enabled

### 3. **Groq** (Optional: via OpenRouter)
- Access Groq models through OpenRouter
- Fast inference, competitive pricing
- Models: `groq/mixtral-8x7b-32768`, `groq/llama-2-70b-chat`

## Quick Start

### Two-process local startup

Run the app in two separate processes:

1. Frontend static files:
   ```bash
   python -m http.server 8080
   ```
   If your environment uses `python3`, this is equivalent:
   ```bash
   python3 -m http.server 8080
   ```
2. Review backend:
   ```bash
   npm run review-server
   ```

Or use the helper script:
```bash
./start.sh
```

Important:
- `python3 -m http.server` only serves the frontend.
- `/api/review-meeting`, `/health`, and `/health/provider` are provided by the Node review server.
- The frontend points to `http://localhost:8787` for review calls by default.

### Option A: Use OpenRouter (Recommended)

1. **Get an OpenRouter API key**:
   ```bash
   # Visit https://openrouter.ai/keys
   # Sign up → Create key → Copy to clipboard
   ```

2. **Update `.env` file**:
   ```env
   REVIEW_PROVIDER=openrouter
   REVIEW_PROVIDER_API_KEY=sk-or-v1-your_key_here
   REVIEW_PROVIDER_MODEL=mistral-1
   REVIEW_PROVIDER_MAX_TOKENS=512
   REVIEW_SERVER_PORT=8787
   REVIEW_SERVER_HOST=127.0.0.1
   ```

3. **Start server**:
   ```bash
   npm run review-server
   ```

4. **Test**:
   ```bash
   curl -X POST http://127.0.0.1:8787/api/review-meeting \
     -H "Content-Type: application/json" \
     -d '{
       "currentFile": "main.game.js",
       "results": { "main.game.js": { "devPassed": 1, "devTotal": 1 } }
     }' | jq .
   ```

### Option B: Use Google Gemini (with billing)

1. **Enable billing on Google Cloud**:
   - https://console.cloud.google.com → Billing → Enable
   
2. **Create API key**:
   - https://aistudio.google.com → Create API Key
   
3. **Update `.env`**:
   ```env
   REVIEW_PROVIDER=google
   REVIEW_PROVIDER_API_KEY=AIza...your_key
   REVIEW_PROVIDER_MODEL=gemini-2.5-pro
   REVIEW_SERVER_PORT=8787
   ```

4. **Start server**:
   ```bash
   npm run review-server
   ```

## Model Recommendations by Use Case

### Cost-Optimized (Recommended)
- **Model**: `mistral-1` (OpenRouter)
- **Cost**: ~$0.0002 per 1K input tokens
- **Speed**: Fast
- **Quality**: Good for structured tasks (JSON validation)
- **Max Tokens**: 512

### Balanced
- **Model**: `openai/gpt-3.5-turbo` (OpenRouter)
- **Cost**: ~$0.0005 per 1K input tokens
- **Speed**: Fast
- **Quality**: Very good
- **Max Tokens**: 512

### High Quality (If budget allows)
- **Model**: `openai/gpt-4-turbo` (OpenRouter)
- **Cost**: ~$0.01 per 1K input tokens
- **Speed**: Moderate
- **Quality**: Excellent
- **Max Tokens**: 512

### Groq (Via OpenRouter)
- **Model**: `groq/mixtral-8x7b-32768`
- **Cost**: ~$0.00024 per 1K input tokens
- **Speed**: Very fast (70-80 tokens/sec)
- **Quality**: Good
- **Max Tokens**: 512

## Token Optimization

### Current Configuration
```env
REVIEW_PROVIDER_MAX_TOKENS=512
```

### How It Works
1. **Input Tokens**: Prompt with game state and code (~300-400 tokens)
2. **Output Tokens**: JSON response (~100-200 tokens)
3. **Total per request**: ~400-600 tokens
4. **Cost example (Mistral-1 @ $0.0002/1K)**: ~$0.00012 per review

### Optimize Further
- Reduce `REVIEW_PROVIDER_MAX_TOKENS` to 256 for strict cost control
- Remove verbose field in response (currently includes `explanation`)
- Compress JSON structure if needed

### Example Cost Comparison
| Provider | Model | Cost/1K tokens | Per Review | 100 Reviews |
|----------|-------|----------------|-----------|-------------|
| OpenRouter | mistral-1 | $0.0002 | $0.00012 | $0.012 |
| OpenRouter | gpt-3.5-turbo | $0.0005 | $0.0003 | $0.03 |
| OpenRouter | groq/mixtral | $0.00024 | $0.00014 | $0.014 |
| Google | gemini-2.5-pro | $0.075/1M input | $0.03 | $3.00 |
| Google | gemini-1.5-flash | $0.0375/1M input | $0.015 | $1.50 |

## Environment Variables Reference

```env
# Provider selection
REVIEW_PROVIDER=openrouter                    # 'google' or 'openrouter'

# API Key (supports fallback to GEMINI_API_KEY for backward compatibility)
REVIEW_PROVIDER_API_KEY=sk-or-v1-...

# Model selection (provider-specific)
# OpenRouter: mistral-1, groq/mixtral-8x7b-32768, openai/gpt-3.5-turbo, etc.
# Google: gemini-2.5-pro, gemini-1.5-pro, gemini-1.5-flash
REVIEW_PROVIDER_MODEL=mistral-1

# Token limit (balance cost vs quality)
REVIEW_PROVIDER_MAX_TOKENS=512

# Server config
REVIEW_SERVER_HOST=127.0.0.1
REVIEW_SERVER_PORT=8787

# Custom OpenRouter endpoint (rarely needed)
# REVIEW_PROVIDER_URL=https://api.openrouter.ai/v1/chat/completions
```

## Testing & Monitoring

### Health Check
```bash
curl http://127.0.0.1:8787/health | jq .
# Response: { "ok": true, "provider": "openrouter", "configured": true }
```

### Sample Request
```bash
curl -X POST http://127.0.0.1:8787/api/review-meeting \
  -H "Content-Type: application/json" \
  -d '{
    "currentFile": "main.game.js",
    "results": {
      "main.game.js": { "devPassed": 2, "devTotal": 3 }
    },
    "developerTasks": { "main.game.js": [] },
    "injectorTasks": { "main.game.js": [] },
    "round": 1
  }' | jq .
```

### Expected Response
```json
{
  "fileId": "main.game.js",
  "done": false,
  "completedQuests": 2,
  "totalQuests": 3,
  "status": "ok",
  "explanation": "...",
  "source": "openrouter"
}
```

## Troubleshooting

### Error: `provider request failed: 401`
- **Cause**: Invalid API key
- **Fix**: Verify key in `.env` matches OpenRouter/Google keys

### Error: `provider request failed: 429`
- **Cause**: Rate limit or quota exceeded
- **Fix**: Reduce `REVIEW_PROVIDER_MAX_TOKENS`, or upgrade plan

### Response: `source: 'fallback'`
- **Cause**: Provider not configured or API call failed
- **Fix**: Check health endpoint, verify `.env`, check API key validity

### CORS errors in browser
- **Cause**: Frontend calling review server from different origin
- **Status**: Already handled (CORS middleware added)
- **If still issues**: Verify `start.sh` uses correct `REVIEW_SERVER_HOST=0.0.0.0`

## Advanced: Run Multiple Instances

For high-load scenarios, use `start.sh` to run servers on different ports:

```bash
chmod +x start.sh
REVIEW_PROVIDER=openrouter REVIEW_PROVIDER_API_KEY=your_key ./start.sh
# Starts on ports 8787 and 8788
```

## Next Steps

1. ✅ Choose provider (OpenRouter recommended)
2. ✅ Set up API key and `.env`
3. ✅ Test health endpoint
4. ✅ Run game and trigger meeting review
5. 📊 Monitor costs in provider dashboard

---
**Last Updated**: May 2026
**Status**: Production ready
