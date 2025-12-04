'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Footer: React.FC = () => {
  const year = new Date().getFullYear();
  const pathname = usePathname();

  // Define color schemes based on page
  const getPageColors = () => {
    if (pathname === '/dashboard') {
      return {
        bg: 'bg-white/60',
        border: 'border-emerald-100/50',
        hoverText: 'hover:text-emerald-700'
      };
    } else if (pathname === '/login' || pathname === '/signup') {
      return {
        bg: 'bg-white/50',
        border: 'border-blue-100/50',
        hoverText: 'hover:text-blue-700'
      };
    } else {
      // Home page - emerald theme
      return {
        bg: 'bg-white/60',
        border: 'border-emerald-100/50',
        hoverText: 'hover:text-emerald-700'
      };
    }
  };

  const colors = getPageColors();

  return (
    <footer className={`mt-16 border-t ${colors.border} ${colors.bg} backdrop-blur-md`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <h4 className="text-sm font-semibold text-gray-900">CV Perfecto</h4>
            <p className="mt-2 text-sm text-gray-600">AI-powered resume optimization tailored to your job description.</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Product</h4>
            <ul className="mt-2 space-y-2 text-sm">
              <li><Link href="/" className={`text-gray-600 ${colors.hoverText}`}>Home</Link></li>
              <li><Link href="/dashboard" className={`text-gray-600 ${colors.hoverText}`}>Dashboard</Link></li>
              <li><a href="https://overleaf.com" target="_blank" rel="noreferrer" className={`text-gray-600 ${colors.hoverText}`}>Overleaf</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">Legal</h4>
            <ul className="mt-2 space-y-2 text-sm">
              <li><a className={`text-gray-600 ${colors.hoverText}`} href="#">Privacy</a></li>
              <li><a className={`text-gray-600 ${colors.hoverText}`} href="#">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex items-center justify-between text-xs text-gray-500">
          <span>© {year} CV Perfecto</span>
          <span>Built with Next.js + Tailwind</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
