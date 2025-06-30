import React from 'react';
import { 
  Zap, 
  Brain, 
  Mic, 
  Users, 
  BarChart3, 
  Shield, 
  Clock, 
  Palette,
  Github,
  Database
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: "AI Code Analysis",
    description: "Advanced AI understands your code structure, logic, and implementation details to create accurate explanations."
  },
  {
    icon: Users,
    title: "Tavus Face Generation",
    description: "Generate realistic face-talking explainer videos that make your demos more engaging and personal."
  },
  {
    icon: Mic,
    title: "ElevenLabs Voice",
    description: "Professional voice synthesis creates clear, natural-sounding narration for your technical walkthroughs."
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Generate professional demo videos in minutes, not hours. Perfect for rapid prototyping and iteration."
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track video performance, viewer engagement, and conversion metrics with detailed analytics."
  },
  {
    icon: Github,
    title: "GitHub Integration",
    description: "Connect directly to your repositories and automatically generate demos for new features and releases."
  },
  {
    icon: Database,
    title: "Supabase Backend",
    description: "Secure cloud storage for your projects, videos, and analytics data with real-time synchronization."
  },
  {
    icon: Palette,
    title: "Custom Branding",
    description: "Customize video templates, colors, and branding to match your company or personal style."
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level security for your code and data with SOC 2 compliance and encrypted storage."
  }
];

const Features = () => {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Powerful Features for Developers
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Everything you need to create professional demo videos from your code, 
            powered by cutting-edge AI technology.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-100">
              <div className="flex items-start space-x-4">
                <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-3 rounded-lg flex-shrink-0">
                  <feature.icon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;