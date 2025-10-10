'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import { FileText, Loader2 } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center mb-8">
          <FileText className="h-16 w-16 text-blue-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">CV Perfecto</h1>
        <p className="text-lg text-gray-600 mb-8">AI-Powered Resume Optimization</p>
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    </div>
  );
}