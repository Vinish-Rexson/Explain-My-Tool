# Explain My Tool - AI Demo Video Generator

Transform your code into compelling demo videos with AI. Perfect for developers who want to showcase their work without the hassle of video creation.

## 🚀 Features

- **AI-Powered Script Generation** - OpenAI GPT-4 analyzes your code and creates compelling narratives
- **Professional Voice Synthesis** - ElevenLabs generates natural-sounding voiceovers
- **Face-Talking Avatars** - Optional Tavus integration for realistic AI presenters
- **Multiple Demo Types** - Code walkthroughs, feature pitches, and tutorials
- **Analytics Dashboard** - Track views, shares, and engagement metrics
- **Subscription Management** - Tiered plans with usage limits

## 🔧 Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

### 2. Required API Keys

#### OpenAI (Required)
- Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Add to `.env`: `OPENAI_API_KEY=your_key_here`

#### ElevenLabs (Required)
- Sign up at [ElevenLabs](https://elevenlabs.io/)
- Get your API key from your profile
- Add to `.env`: `ELEVENLABS_API_KEY=your_key_here`

#### Tavus (Optional - for face avatars)
- Sign up at [Tavus](https://tavusapi.com/)
- Get your API key from the dashboard
- Add to `.env`: `TAVUS_API_KEY=your_key_here`

### 3. Supabase Setup

The Supabase configuration is already set up. Make sure you have:
- Connected to Supabase (click "Connect to Supabase" button)
- Database migrations applied
- Storage bucket created for demo assets

### 4. Start Development

```bash
npm run dev
```

## 📊 API Integration Details

### OpenAI Integration
- **Model**: GPT-4 for high-quality script generation
- **Purpose**: Analyzes code and creates compelling demo scripts
- **Customization**: Adapts tone and style based on demo type and voice preference

### ElevenLabs Integration
- **Voices**: Professional, Casual, and Enthusiastic options
- **Quality**: High-fidelity voice synthesis
- **Languages**: Supports multiple languages and accents

### Tavus Integration
- **Feature**: Face-talking avatar generation
- **Optional**: Can be disabled to use audio-only demos
- **Customization**: Professional backgrounds and avatar selection

## 🎯 Usage

1. **Create Project** - Add your code snippet and project details
2. **Configure Demo** - Choose demo type (walkthrough/pitch/tutorial) and voice style
3. **Generate Video** - AI processes your code and creates the demo video
4. **Share & Track** - Get analytics on views, shares, and engagement

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
- **AI Services**: OpenAI, ElevenLabs, Tavus

## 📝 Environment Variables Reference

```env
# Required
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...

# Optional (for face avatars)
TAVUS_API_KEY=...

# Automatically configured
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 🚨 Troubleshooting

### Common Issues

1. **"Missing API Key" Error**
   - Check that all required API keys are in your `.env` file
   - Restart the development server after adding keys

2. **Video Generation Fails**
   - Verify API keys are valid and have sufficient credits
   - Check the browser console and server logs for detailed errors

3. **Face Video Not Generated**
   - Ensure `TAVUS_API_KEY` is set if face avatars are enabled
   - Face video generation is optional and will fallback to audio-only

### Getting Help

- Check the browser console for client-side errors
- Check Supabase Edge Function logs for server-side errors
- Verify API key permissions and quotas

## 📄 License

This project is licensed under the MIT License.