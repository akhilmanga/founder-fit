import React from 'react';
import { Users, Twitter, Linkedin, Github, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-black text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-center mb-12">
          {/* Brand Section */}
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-6">
              <Users className="h-8 w-8 text-white" />
              <span className="text-2xl font-bold text-white">FounderFit</span>
            </div>
            <p className="text-gray-400 font-medium mb-6 leading-relaxed max-w-md">
              AI-powered co-founder compatibility analysis to help startups build stronger founding teams.
            </p>
            <div className="flex justify-center space-x-4">
              <a href="https://x.com/akhil_manga" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/in/akhilmanga/" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
              <p className="text-gray-400 font-medium">
                © 2025 FounderFit. All rights reserved.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-gray-400">
              <span className="font-medium text-sm">Made with</span>
              <Heart className="h-4 w-4 text-red-500" />
              <span className="font-medium text-sm">for founders</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;