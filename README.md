# Explain My Tool - AI Demo Video Generator

Transform your code into compelling demo videos with AI. Perfect for developers who want to showcase their work without the hassle of video creation.

## 🚀 Features

- **AI-Powered Script Generation** - Multiple AI providers supported (OpenAI, Google Gemini)
- **Professional Voice Synthesis** - ElevenLabs generates natural-sounding voiceovers
- **Face-Talking Avatars** - Optional Tavus integration for realistic AI presenters
- **GitHub Integration** - Import repositories and create demos from existing code
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

### 2. Set Up GitHub Integration (Optional)
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: "Explain My Tool"
   - **Homepage URL**: `http://localhost:5173` (or your domain)
   - **Authorization callback URL**: `http://localhost:5173/github-callback`
4. Copy the Client ID and Client Secret

### 3. Add to Environment Variables
Create a `.env` file in your project root:
```bash
# Required: AI Script Generation (choose one)
GOOGLE_GEMINI_API_KEY=AIza_your_key_here

# Required: Voice Generation
ELEVENLABS_API_KEY=sk_your_elevenlabs_key_here

# Optional: GitHub Integration
VITE_GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Optional: Face Video Generation
TAVUS_API_KEY=your_tavus_api_key
TAVUS_REPLICA_ID=your_replica_uuid_here

# Automatically configured by Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start Creating Videos!
```bash
npm run dev
```

## 🐙 GitHub Integration Setup

### Step 1: Create GitHub OAuth App
1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: `Explain My Tool`
   - **Homepage URL**: `http://localhost:5173` (or your production domain)
   - **Application description**: `AI-powered demo video generator for developers`
   - **Authorization callback URL**: `http://localhost:5173/github-callback`

### Step 2: Configure Environment Variables
Add these to your `.env` file:
```env
# GitHub OAuth Configuration
VITE_GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

### Step 3: Restart Development Server
```bash
npm run dev
```

### Step 4: Connect Your GitHub Account
1. Go to your dashboard
2. Click "Import from GitHub" or the GitHub connect button
3. Authorize the application
4. Your repositories will be synced automatically

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

### GitHub Integration (Optional)
- **OAuth Flow**: Secure GitHub OAuth 2.0 integration
- **Permissions**: Read access to repositories and user profile
- **Features**: Import repositories, sync metadata, create demos from existing code
- **Cost**: Free (uses GitHub's free API)

## 🎯 Usage

### Creating Demos from Scratch
1. **Create Project** - Add your code snippet and project details
2. **Configure Demo** - Choose demo type (walkthrough/pitch/tutorial) and voice style
3. **Generate Video** - AI processes your code and creates the demo video
4. **Share & Track** - Get analytics on views, shares, and engagement

### Creating Demos from GitHub
1. **Connect GitHub** - Authorize the application to access your repositories
2. **Browse Repositories** - View all your repositories with metadata
3. **Select Repository** - Click any repository to create a demo from it
4. **Auto-fill Form** - Repository data automatically fills the project creation form
5. **Generate Video** - Same AI processing as manual creation

## 💰 Cost Breakdown

| Service | Free Tier | Paid Plans | Required |
|---------|-----------|------------|----------|
| **Google Gemini** | ✅ Unlimited* | N/A | ✅ Yes (for scripts) |
| **ElevenLabs** | 10K chars/month | $5+/month | ✅ Yes (for voice) |
| **Tavus** | No free tier | $50+/month | ❌ Optional (face videos) |
| **GitHub** | ✅ Free API | N/A | ❌ Optional (repo import) |

*Generous limits: 15 requests/minute, 1M tokens/day

## 🔒 Security

- All API keys are stored securely in environment variables
- User data is protected with Supabase Row Level Security
- Videos are stored securely in Supabase Storage
- GitHub OAuth uses secure authorization flow with state verification

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
- **GitHub Integration**: OAuth 2.0 with repository sync

## 📝 Environment Variables Reference

```env
# Required for script generation (choose one)
GOOGLE_GEMINI_API_KEY=AIza...     # FREE option ⭐
# OR
OPENAI_API_KEY=sk-...             # Paid option

# Required for voice generation
ELEVENLABS_API_KEY=sk_...

# Optional for GitHub integration
VITE_GITHUB_CLIENT_ID=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

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

2. **"GitHub integration not configured"**
   - Add `VITE_GITHUB_CLIENT_ID` to your `.env` file
   - Create a GitHub OAuth app and get the Client ID
   - Restart the development server

3. **Google Gemini API Error**
   - Verify your API key is correct (starts with `AIza`)
   - Check you haven't exceeded the rate limits (15 requests/minute)

4. **"Invalid replica_uuid" Error (Tavus)**
   - Make sure you have `TAVUS_REPLICA_ID` set to a valid UUID from your Tavus dashboard
   - Create an avatar in Tavus first, then copy the replica ID
   - The replica ID should be in UUID format (e.g., `123e4567-e89b-12d3-a456-426614174000`)

5. **Video Generation Fails**
   - Check the browser console and server logs for detailed errors
   - Verify API keys are valid and have sufficient credits
   - For face videos, ensure you have both `TAVUS_API_KEY` and `TAVUS_REPLICA_ID` configured

6. **GitHub OAuth Errors**
   - Verify your callback URL matches exactly: `http://localhost:5173/github-callback`
   - Check that both `VITE_GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set
   - Make sure your GitHub OAuth app is not suspended

### Getting Help

- Check the browser console for client-side errors
- Check Supabase Edge Function logs for server-side errors
- Verify API key permissions and quotas

## 🎉 Why This Setup is Perfect

✅ **FREE to start** - Google Gemini provides excellent AI for $0  
✅ **Production ready** - All the features you need  
✅ **Scalable** - Easy to upgrade to paid tiers when needed  
✅ **Professional quality** - Generate videos that look amazing  
✅ **GitHub integration** - Import existing code seamlessly  
✅ **Secure** - OAuth flow with proper state verification  

## 📄 License

This project is licensed under the MIT License.