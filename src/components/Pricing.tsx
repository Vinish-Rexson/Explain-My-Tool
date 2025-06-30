import React from 'react';
import { Check, Star, Zap } from 'lucide-react';

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    description: "Perfect for trying out the platform",
    features: [
      "3 demo videos per month",
      "Basic AI analysis",
      "Standard voice synthesis",
      "720p video quality",
      "Community support"
    ],
    buttonText: "Get Started",
    buttonStyle: "bg-gray-900 text-white hover:bg-gray-800",
    popular: false
  },
  {
    name: "Professional",
    price: "$29",
    period: "per month",
    description: "For active developers and small teams",
    features: [
      "25 demo videos per month",
      "Advanced AI analysis",
      "Premium voice synthesis",
      "1080p video quality",
      "Custom branding",
      "Analytics dashboard",
      "Priority support"
    ],
    buttonText: "Start Free Trial",
    buttonStyle: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700",
    popular: true
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "per month",
    description: "For teams and organizations",
    features: [
      "Unlimited demo videos",
      "Advanced AI with custom models",
      "Premium voice synthesis",
      "4K video quality",
      "Full custom branding",
      "Advanced analytics",
      "Team collaboration",
      "Dedicated support",
      "API access"
    ],
    buttonText: "Contact Sales",
    buttonStyle: "bg-gray-900 text-white hover:bg-gray-800",
    popular: false
  }
];

const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your needs. All plans include core AI features 
            and professional video generation.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div key={index} className={`relative bg-white rounded-2xl border-2 p-8 ${
              plan.popular ? 'border-purple-500 shadow-xl scale-105' : 'border-gray-200 shadow-lg'
            }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span>Most Popular</span>
                  </div>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-gray-600 mb-4">{plan.description}</p>
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && (
                    <span className="text-gray-600 ml-2">/{plan.period}</span>
                  )}
                </div>
              </div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <button className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 ${plan.buttonStyle}`}>
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            All plans include a 14-day free trial. No credit card required.
          </p>
          <div className="flex justify-center items-center space-x-8 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Instant setup</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4" />
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;