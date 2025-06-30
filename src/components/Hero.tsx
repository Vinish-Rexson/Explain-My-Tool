import React from 'react';
import { Play, Sparkles, ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 pt-20 pb-32">
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4 mr-2" />
            AI-Powered Demo Generation
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Turn Your Code Into
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent block">
              Compelling Demo Videos
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Stop struggling with video creation. Input your feature and code snippet, 
            and our AI generates professional pitch videos and tutorials automatically.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <button className="group bg-purple-600 text-white px-8 py-4 rounded-xl hover:bg-purple-700 transition-all duration-200 flex items-center space-x-2 text-lg font-semibold shadow-lg hover:shadow-xl">
              <Play className="h-5 w-5" />
              <span>Create Your First Demo</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="text-purple-600 hover:text-purple-700 font-semibold text-lg flex items-center space-x-2 transition-colors">
              <Play className="h-5 w-5" />
              <span>Watch Example</span>
            </button>
          </div>
          
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-800 px-6 py-4 flex items-center space-x-3">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-gray-400 text-sm">demo-generator.ai</span>
              </div>
              <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                    <Play className="h-8 w-8 text-white ml-1" />
                  </div>
                  <p className="text-gray-600 font-medium">Demo Video Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;