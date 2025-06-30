import React from 'react';
import { Code, MessageSquare, Video, Share } from 'lucide-react';

const steps = [
  {
    icon: Code,
    title: "Input Your Code",
    description: "Paste your feature code snippet and describe what it does. Our AI understands your implementation.",
    color: "from-purple-500 to-purple-600"
  },
  {
    icon: MessageSquare,
    title: "AI Creates Script",
    description: "Advanced AI analyzes your code and generates a compelling walkthrough script with technical insights.",
    color: "from-blue-500 to-blue-600"
  },
  {
    icon: Video,
    title: "Generate Video",
    description: "Tavus creates face-talking explainer while ElevenLabs provides professional voice synthesis.",
    color: "from-cyan-500 to-cyan-600"
  },
  {
    icon: Share,
    title: "Share & Track",
    description: "Get your demo video with analytics tracking. Perfect for pitches, tutorials, and documentation.",
    color: "from-green-500 to-green-600"
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            From code to compelling demo in minutes. Our AI handles the entire video creation process.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              <div className="text-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-200`}>
                  <step.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-full w-8 h-0.5 bg-gradient-to-r from-gray-300 to-transparent transform translate-x-4"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;