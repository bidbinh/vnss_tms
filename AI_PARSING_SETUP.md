# AI-Enhanced Order Parsing - Setup Guide

## ✅ Implementation Status

### Completed
- ✅ Backend: `order_ai_parser.py` service created
- ✅ Backend: Enhanced AI prompts in `ai_assistant.py`
- ✅ Frontend: AI toggle UI added to Orders page
- ✅ Frontend: `parseOrderTextWithAI()` function implemented
- ✅ Auto-assign customer based on site matching
- ✅ Auto-create sites for new locations
- ✅ Multi-provider support (Gemini/Claude/OpenAI)
- ✅ Cost optimization (~$0.0001/batch with Gemini Flash)

### Required: Configuration

## 📝 Step-by-Step Setup

### 1. Get AI API Keys

#### Option A: Gemini (Recommended - Cheapest)
1. Go to: https://aistudio.google.com/apikey
2. Sign in with Google account
3. Click "Get API Key" → "Create API key in new project"
4. Copy the key (starts with `AIza...`)
5. **Cost:** ~$0.0001 per batch (10 orders) ✅

#### Option B: Claude (Anthropic)
1. Go to: https://console.anthropic.com
2. Sign up / Sign in
3. Navigate to API Keys
4. Create new key
5. Copy the key (starts with `sk-ant-...`)
6. **Cost:** ~$0.001 per batch (Claude Haiku)

#### Option C: OpenAI (Fallback)
1. Go to: https://platform.openai.com/api-keys
2. Sign in
3. Create new secret key
4. Copy the key (starts with `sk-proj-...`)
5. **Cost:** ~$0.001 per batch (GPT-4o mini)

---

### 2. Configure AI Providers in Database

#### Method 1: Via Admin UI (Recommended)

1. **Navigate to Admin Settings:**
   ```
   http://localhost:3000/admin/ai-settings
   ```

2. **Add Gemini Provider:**
   - Provider Code: `gemini`
   - Provider Name: `Google Gemini`
   - API Key: `AIza...` (paste your key)
   - Default Model: `gemini-1.5-flash`
   - Is Enabled: ✅ Check
   - Is Configured: ✅ Check
   - Cost per 1M input tokens: `0.075`
   - Cost per 1M output tokens: `0.30`
   - Save

3. **Add Claude Provider (Optional fallback):**
   - Provider Code: `claude`
   - Provider Name: `Anthropic Claude`
   - API Key: `sk-ant-...`
   - Default Model: `claude-3-5-haiku-20241022`
   - Is Enabled: ✅ Check
   - Cost per 1M input tokens: `1.0`
   - Cost per 1M output tokens: `5.0`
   - Save

4. **Configure Feature: order_extraction**
   - Feature Code: `order_extraction`
   - Feature Name: `Order Text Extraction with Customer Matching`
   - Module Code: `tms`
   - Provider Priority: `["gemini", "claude", "openai"]`
   - Preferred Model: `gemini-1.5-flash`
   - Max Retries: `2`
   - Timeout Seconds: `30`
   - Fallback Enabled: ✅ Check
   - Is Enabled: ✅ Check
   - Save

#### Method 2: Via Backend .env (Fallback)

If database config is empty, system will use .env:

```bash
# d:\vnss_tms\backend\.env

# Gemini (Primary - Cheapest)
GOOGLE_AI_API_KEY=AIza...your-key-here

# Claude (Fallback)
ANTHROPIC_API_KEY=sk-ant-...your-key-here

# OpenAI (Fallback)
OPENAI_API_KEY=sk-proj-...your-key-here
```

**Restart backend after adding:**
```bash
cd d:\vnss_tms\backend
# Stop current process (Ctrl+C)
# Start again
uvicorn app.main:app --reload
```

---

### 3. Verify Configuration

#### Test Backend API Directly

```bash
curl -X POST http://localhost:8000/api/v1/ai-assistant/parse-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "1) A Tuyến: CHÙA VẼ - An Tảo, Hưng Yên - GAOU6458814",
    "context": {
      "customers": [],
      "sites": [],
      "task": "order_extraction_with_customer_match"
    },
    "feature": "order_extraction"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "order_data": [
    {
      "line_number": 1,
      "driver_name": "A Tuyến",
      "pickup_text": "CHÙA VẼ",
      "delivery_text": "An Tảo, Hưng Yên",
      "container_code": "GAOU6458814",
      "customer_id": null,
      "ambiguous": true
    }
  ],
  "provider_used": "gemini",
  "cost_estimate": 0.0001
}
```

---

### 4. Test Frontend

1. **Navigate to Orders page:**
   ```
   http://localhost:3000/tms/orders
   ```

2. **Click "Create from Text" button**

3. **You should see:**
   - ✅ "🤖 Use AI Parsing" checkbox (checked by default)
   - ✅ Provider dropdown showing "Gemini Flash (Cheapest, ~$0.0001/batch)"
   - ✅ Note: "✅ Auto-assign customer & create sites"

4. **Paste sample order text:**
   ```
   185) A Tuyến: CHÙA VẼ - An Tảo, Hưng Yên- GAOU6458814- Lấy 23/12, giao sáng 24/12- 01x40 HDPE-VN H5604F
   186) A Vụ: CHÙA VẼ - Nhựa HY- GAOU6457839- Lấy 23/12, giao sáng 24/12- 01x40 HDPE-VN
   ```

5. **Click "Phân tích Text"**

6. **Expected behavior:**
   - Spinner shows "AI Parsing..."
   - After 2-3 seconds: Alert shows "✅ Parsed 2 orders using gemini. Cost: $0.0002"
   - Orders table shows parsed data
   - **customer_id auto-assigned** (if match found)
   - Yellow highlight if `ambiguous: true`

---

## 🎯 How It Works

### 1. User Pastes Order Text
```
185) A Tuyến: CHÙA VẼ - An Tảo, Hưng Yên- GAOU6458814- Lấy 23/12
```

### 2. Frontend Sends to AI
```javascript
{
  message: "185) A Tuyến: ...",
  context: {
    customers: [{id: "uuid1", name: "Nhựa HY", code: "NHY"}],
    sites: [{id: "site1", company_name: "Nhựa HY", detailed_address: "An Tảo"}],
    task: "order_extraction_with_customer_match"
  }
}
```

### 3. Backend AI Processing
- AI reads customer & site lists
- Extracts: driver, dates, container_code, pickup/delivery locations
- **Matches "An Tảo" → Site → Customer "Nhựa HY"**
- Auto-assigns `customer_id: "uuid1"`

### 4. Auto-Create Sites
If "CHÙA VẼ" doesn't exist:
- AI extracts: `{company_name: "CHÙA VẼ", city: "Hà Nội"}`
- Backend creates new Site with generated code
- Links to order

### 5. Return to Frontend
```json
{
  "customer_id": "uuid1",  // AUTO-ASSIGNED!
  "ambiguous": false,
  "customer_match_confidence": 0.95
}
```

---

## 💰 Cost Monitoring

### View Usage Logs

```sql
-- Check AI usage in last 24 hours
SELECT
  feature_code,
  provider_code,
  model_used,
  COUNT(*) as calls,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(estimated_cost) as total_cost,
  AVG(latency_ms) as avg_latency_ms
FROM ai_usage_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND feature_code = 'order_extraction'
GROUP BY feature_code, provider_code, model_used
ORDER BY total_cost DESC;
```

### Expected Costs (Gemini Flash)
- **10 orders:** ~$0.0001
- **100 orders/day:** ~$0.001/day = **$0.30/month**
- **1,000 orders/day:** ~$0.01/day = **$3/month**

---

## 🔧 Troubleshooting

### Issue: "No AI providers configured"

**Solution:**
1. Check database `ai_providers` table has records
2. Or add keys to `.env` file
3. Restart backend

### Issue: "AI parsing failed"

**Possible causes:**
1. **Invalid API key** → Check key is correct
2. **Rate limit exceeded** → Wait 1 minute, try again
3. **Network error** → Check internet connection
4. **API quota exceeded** → Check your billing

**Fallback:** Regex parser will be used automatically

### Issue: Customer not auto-assigned

**Possible reasons:**
1. **No matching site** → AI sets `customer_id: null, ambiguous: true`
2. **Customer not in database** → Add customer first
3. **Site not linked to customer** → Add `customer_id` field to Site model (optional enhancement)

**Manual fix:** User can select customer in dropdown

---

## 📊 Success Metrics to Track

After 1 week:
- ✅ **Auto-assignment accuracy:** Should be >95%
- ✅ **Sites created:** Track new sites per day
- ✅ **Cost per batch:** Should be <$0.001
- ✅ **Time saved:** 3-5x faster than manual

---

## 🚀 Next Steps (Optional Enhancements)

### 1. Image-Based Parsing
Use existing endpoint for photos of booking confirmations:
```javascript
POST /ai-assistant/upload-pod
```

### 2. Learning from Corrections
Track when users manually change AI-assigned customer:
- Store in `ai_parsing_sessions` table
- Use to improve future prompts

### 3. Batch Optimization
Process multiple orders in single AI call (lower cost)

### 4. Custom Rules per Customer
Like FMS document parser - learn patterns per customer

---

## 📞 Support

If issues persist:
1. Check backend logs: `d:\vnss_tms\backend\logs\`
2. Check browser console for frontend errors
3. Verify API keys are valid
4. Test with simple 1-line order first

---

**Created:** 2025-01-14
**Status:** Ready for testing
**Estimated setup time:** 15 minutes
