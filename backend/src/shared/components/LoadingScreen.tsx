import React from 'react';
import logo from '../../assets/images/logo.webp';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="mb-8 animate-pulse">
        <img src={logo} alt="TARIX" className="h-12 w-auto grayscale opacity-50" />
      </div>

      {/* Loading Dots */}
      <div className="flex gap-2 mb-4">
        <div className="w-3 h-3 rounded-full bg-primary-blue animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-3 h-3 rounded-full bg-primary-blue animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-3 h-3 rounded-full bg-primary-blue animate-bounce"></div>
      </div>

      {/* Text */}
      <p className="text-text-gray text-lg font-medium animate-pulse">Loading...</p>
    </div>
  );
};

export default LoadingScreen;
