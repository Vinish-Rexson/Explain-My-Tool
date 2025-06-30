import React from 'react';
import { Code2, Github, LogIn } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-2 rounded-lg">
              <Code2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Explain My Tool</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#how-it-works" className="text-gray-600 hover:text-purple-600 transition-colors font-medium">
              How it Works
            </a>
            <a href="#features" className="text-gray-600 hover:text-purple-600 transition-colors font-medium">
              Features
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-purple-600 transition-colors font-medium">
              Pricing
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
              <Github className="h-5 w-5" />
              <span className="hidden sm:block">Connect GitHub</span>
            </button>
            <button className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;