# Explain My Tool - AI Demo Video Generator

Transform your code into compelling demo videos with AI. Perfect for developers who want to showcase their work without the hassle of video creation.

## 🚀 Features

- **AI-Powered Script Generation** - Multiple AI providers supported (OpenAI, Google Gemini)
- **Professional Voice Synthesis** - ElevenLabs generates natural-sounding voiceovers
- **Face-Talking Avatars** - Optional Tavus integration for realistic AI presenters
- **Multiple Demo Types** - Code walkthroughs, feature pitches, and tutorials
- **Analytics Dashboard** - Track views, shares, and engagement metrics
- **Subscription Management** - Tiered plans with usage limits

## 🆓 **FREE AI Options Available!**

You don't need to pay for OpenAI! We support multiple AI providers:

### **Google Gemini (FREE & Recommended) ⭐**
- ✅ **Completely FREE** - 15 requests/minute, 1M tokens/day
- ✅ **Excellent Quality** - Perfect for code analysis
- ✅ **Easy Setup** - Get API key in 2 minutes
- 🔗 **Get Key**: [Google AI Studio](https://makersuite.google.com/app/apikey)

### **OpenAI GPT-4 (Paid)**
- 💰 **Paid Service** - ~$0.03 per 1K tokens
- ✅ **Highest Quality** - Industry standard
- 🔗 **Get Key**: [OpenAI Platform](https://platform.openai.com/api-keys)

### **Anthropic Claude (Limited Free)**
- 🆓 **Limited Free Tier** - Some free credits
- ✅ **Great Quality** - Excellent for technical content
- 🔗 **Get Key**: [Anthropic Console](https://console.anthropic.com/)

## 🔧 Quick Setup (5 Minutes)

### 1. Get Your FREE Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

### 2. Add to Environment Variables
```bash
# Open your .env file and add:
GOOGLE_GEMINI_API_KEY=AIza_your_key_here
```

### 3. (Optional) Set Up Face Video Generation
If you want AI avatars in your videos:
1. Go to [Tavus](https://tavusapi.com/) and create an account
2. Create an avatar and get your replica ID (UUID format)
3. Add to your .env file:
```bash
TAVUS_API_KEY=your_tavus_api_key
TAVUS_REPLICA_ID=your_replica_uuid_here
```

### 4. Start Creating Videos!
```bash
npm run dev
```

That's it! You can now generate unlimited demo videos for FREE using Google Gemini.

## 📊 API Integration Details

### Google Gemini Integration (FREE)
- **Model**: Gemini Pro for high-quality script generation
- **Cost**: Completely FREE with generous limits
- **Quality**: Excellent for code analysis and explanations
- **Limits**: 15 requests/minute, 1M tokens/day (more than enough!)

### ElevenLabs Integration (Required)
- **Voices**: Professional, Casual, and Enthusiastic options
- **Quality**: High-fidelity voice synthesis
- **Cost**: Free tier available, then paid

### Tavus Integration (Optional)
- **Feature**: Face-talking avatar generation
- **Setup**: Requires creating an avatar and getting replica UUID
- **Optional**: Can be disabled to use audio-only demos
- **Cost**: Paid service for face videos

## 🎯 Usage

1. **Create Project** - Add your code snippet and project details
2. **Configure Demo** - Choose demo type (walkthrough/pitch/tutorial) and voice style
3. **Generate Video** - AI processes your code and creates the demo video
4. **Share & Track** - Get analytics on views, shares, and engagement

## 💰 Cost Breakdown

| Service | Free Tier | Paid Plans | Required |
|---------|-----------|------------|----------|
| **Google Gemini** | ✅ Unlimited* | N/A | ✅ Yes (for scripts) |
| **ElevenLabs** | 10K chars/month | $5+/month | ✅ Yes (for voice) |
| **Tavus** | No free tier | $50+/month | ❌ Optional (face videos) |

*Generous limits: 15 requests/minute, 1M tokens/day

## 🔒 Security

- All API keys are stored securely in environment variables
- User data is protected with Supabase Row Level Security
- Videos are stored securely in Supabase Storage

## 📈 Subscription Tiers

- **Free**: 3 videos per month
- **Professional**: 25 videos per month + advanced features
- **Enterprise**: Unlimited videos + team collaboration

## 🛠️ Development

The app is built with:
- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (Database, Auth, Storage)
- **Edge Functions**: Deno for AI processing
- **AI Services**: Google Gemini (FREE), ElevenLabs, Tavus

## 📝 Environment Variables Reference

```env
# Required for script generation (choose one)
GOOGLE_GEMINI_API_KEY=AIza...     # FREE option ⭐
# OR
OPENAI_API_KEY=sk-...             # Paid option

# Required for voice generation
ELEVENLABS_API_KEY=sk_...

# Optional for face videos
TAVUS_API_KEY=...
TAVUS_REPLICA_ID=...              # UUID from Tavus dashboard

# Automatically configured
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 🚨 Troubleshooting

### Common Issues

1. **"Missing API Key" Error**
   - Make sure you have either `GOOGLE_GEMINI_API_KEY` or `OPENAI_API_KEY` in your `.env` file
   - Restart the development server after adding keys

2. **Google Gemini API Error**
   - Verify your API key is correct (starts with `AIza`)
   - Check you haven't exceeded the rate limits (15 requests/minute)

3. **"Invalid replica_uuid" Error (Tavus)**
   - Make sure you have `TAVUS_REPLICA_ID` set to a valid UUID from your Tavus dashboard
   - Create an avatar in Tavus first, then copy the replica ID
   - The replica ID should be in UUID format (e.g., `123e4567-e89b-12d3-a456-426614174000`)

4. **Video Generation Fails**
   - Check the browser console and server logs for detailed errors
   - Verify API keys are valid and have sufficient credits
   - For face videos, ensure you have both `TAVUS_API_KEY` and `TAVUS_REPLICA_ID` configured

### Getting Help

- Check the browser console for client-side errors
- Check Supabase Edge Function logs for server-side errors
- Verify API key permissions and quotas

## 🎉 Why This Setup is Perfect

✅ **FREE to start** - Google Gemini provides excellent AI for $0
✅ **Production ready** - All the features you need
✅ **Scalable** - Easy to upgrade to paid tiers when needed
✅ **Professional quality** - Generate videos that look amazing

## 📄 License

This project is licensed under the MIT License.