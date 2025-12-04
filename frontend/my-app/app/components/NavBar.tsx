'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { FileText, LogOut, User } from 'lucide-react';

const NavBar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Define color schemes based on page
  const getPageColors = () => {
    if (pathname === '/dashboard') {
      return {
        bg: 'bg-white/80',
        border: 'border-emerald-100/50',
        logoGradient: 'from-emerald-400 to-teal-500',
        textGradient: 'from-emerald-600 to-teal-600',
        activeBg: 'bg-emerald-50',
        activeText: 'text-emerald-700',
        hoverText: 'hover:text-emerald-700',
        hoverBg: 'hover:bg-emerald-50',
        userBg: 'bg-emerald-50/50',
        userBorder: 'border-emerald-200',
        userIconGradient: 'from-emerald-400 to-teal-500',
        buttonBg: 'bg-white/50',
        buttonHoverBg: 'hover:bg-emerald-50',
        buttonBorder: 'border-gray-200',
        buttonHoverBorder: 'hover:border-emerald-300',
        ctaGradient: 'from-emerald-500 to-teal-500',
        ctaHoverGradient: 'hover:from-emerald-600 hover:to-teal-600'
      };
    } else if (pathname === '/login' || pathname === '/signup') {
      return {
        bg: 'bg-white/70',
        border: 'border-blue-100/50',
        logoGradient: 'from-blue-400 to-indigo-500',
        textGradient: 'from-blue-600 to-indigo-600',
        activeBg: 'bg-blue-50',
        activeText: 'text-blue-700',
        hoverText: 'hover:text-blue-700',
        hoverBg: 'hover:bg-blue-50',
        userBg: 'bg-blue-50/50',
        userBorder: 'border-blue-200',
        userIconGradient: 'from-blue-400 to-indigo-500',
        buttonBg: 'bg-white/50',
        buttonHoverBg: 'hover:bg-blue-50',
        buttonBorder: 'border-gray-200',
        buttonHoverBorder: 'hover:border-blue-300',
        ctaGradient: 'from-blue-500 to-indigo-500',
        ctaHoverGradient: 'hover:from-blue-600 hover:to-indigo-600'
      };
    } else {
      // Home page - emerald theme
      return {
        bg: 'bg-white/80',
        border: 'border-emerald-100/50',
        logoGradient: 'from-emerald-400 to-teal-500',
        textGradient: 'from-emerald-600 to-teal-600',
        activeBg: 'bg-emerald-50',
        activeText: 'text-emerald-700',
        hoverText: 'hover:text-emerald-700',
        hoverBg: 'hover:bg-emerald-50',
        userBg: 'bg-emerald-50/50',
        userBorder: 'border-emerald-200',
        userIconGradient: 'from-emerald-400 to-teal-500',
        buttonBg: 'bg-white/50',
        buttonHoverBg: 'hover:bg-emerald-50',
        buttonBorder: 'border-gray-200',
        buttonHoverBorder: 'hover:border-emerald-300',
        ctaGradient: 'from-emerald-500 to-teal-500',
        ctaHoverGradient: 'hover:from-emerald-600 hover:to-teal-600'
      };
    }
  };

  const colors = getPageColors();

  return (
    <nav className={`sticky top-0 z-50 ${colors.bg} backdrop-blur-md border-b ${colors.border}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-2">
              <div className={`bg-gradient-to-br ${colors.logoGradient} rounded-xl p-2 shadow-lg`}>
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className={`text-base sm:text-lg font-bold bg-gradient-to-r ${colors.textGradient} bg-clip-text text-transparent`}>
                CV Perfecto
              </span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive('/')
                  ? `${colors.activeText} ${colors.activeBg}`
                  : `text-gray-700 ${colors.hoverText} ${colors.hoverBg}`
              }`}
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive('/dashboard')
                  ? `${colors.activeText} ${colors.activeBg}`
                  : `text-gray-700 ${colors.hoverText} ${colors.hoverBg}`
              }`}
            >
              Dashboard
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                <div className={`hidden sm:flex items-center space-x-2 ${colors.userBg} px-3 py-2 rounded-xl border ${colors.userBorder}`}>
                  <div className={`bg-gradient-to-br ${colors.userIconGradient} rounded-lg p-1.5`}>
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                    {user?.name}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 ${colors.hoverText} ${colors.buttonBg} ${colors.buttonHoverBg} rounded-xl transition-all duration-200 border ${colors.buttonBorder} ${colors.buttonHoverBorder} shadow-sm hover:shadow-md`}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className={`px-4 py-2 text-sm font-semibold text-gray-700 ${colors.hoverText} ${colors.buttonBg} ${colors.buttonHoverBg} rounded-xl transition-all duration-200 border ${colors.buttonBorder} ${colors.buttonHoverBorder} shadow-sm hover:shadow-md`}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className={`px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r ${colors.ctaGradient} ${colors.ctaHoverGradient} rounded-xl transition-all duration-200 shadow-md hover:shadow-lg`}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
