'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { resumeAPI, ResumeOptimizationData } from '../services/api';
import FileUpload from '../components/FileUpload';
import ResumeResults from '../components/ResumeResults';
import { LogOut, User, FileText, Upload, AlertCircle, CheckCircle, Sparkles, Zap } from 'lucide-react';

export default function DashboardPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      // Check backend health when component mounts
      checkBackendHealth();
    }
  }, [isAuthenticated, router]);

  const checkBackendHealth = async () => {
    try {
      console.log('🏥 DASHBOARD: Checking backend health...');
      const healthResponse = await resumeAPI.healthCheck();
      console.log('✅ DASHBOARD: Backend is healthy:', healthResponse);
    } catch (error) {
      console.error('❌ DASHBOARD: Backend health check failed:', error);
      setError('Backend server is not responding. Please check if the server is running.');
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setFileError(null);
    setError(null);
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setFileError(null);
    setError(null);
  };

  const validateForm = () => {
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return false;
    }
    if (!selectedFile) {
      setFileError('Please upload your resume');
      return false;
    }
    return true;
  };

  const handleOptimizeResume = async () => {
    console.log('🎯 DASHBOARD: Starting resume optimization process...');
    
    if (!validateForm()) {
      console.log('❌ DASHBOARD: Form validation failed');
      return;
    }

    console.log('✅ DASHBOARD: Form validation passed');
    console.log('📄 DASHBOARD: Selected file:', selectedFile?.name, selectedFile?.size, selectedFile?.type);
    console.log('📝 DASHBOARD: Job description length:', jobDescription.length);

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const data: ResumeOptimizationData = {
        jobDescription: jobDescription.trim(),
        resumeFile: selectedFile!,
      };

      console.log('📤 DASHBOARD: Calling resumeAPI.optimizeResume...');
      const response = await resumeAPI.optimizeResume(data);
      
      console.log('📥 DASHBOARD: Received response from API');
      console.log('Response success:', response.success);
      console.log('Response data:', response);
      
      if (response.success) {
        console.log('✅ DASHBOARD: Resume optimization successful');
        setResults(response.data);
      } else {
        console.log('❌ DASHBOARD: Resume optimization failed - success: false');
        setError('Failed to optimize resume. Please try again.');
      }
    } catch (err: any) {
      console.log('❌ DASHBOARD: Error during resume optimization');
      
      setError(err.response?.data?.message || 'An error occurred while processing your resume.');
    } finally {
      console.log('🏁 DASHBOARD: Resume optimization process completed');
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-600"></div>
          <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute top-60 right-10 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-lg shadow-lg border-b border-emerald-100/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl p-2 shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                CV Perfecto
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-emerald-50/50 px-4 py-2 rounded-xl border border-emerald-200">
                <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg p-1.5">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-emerald-700 bg-white/50 hover:bg-emerald-50 rounded-xl transition-all duration-200 border border-gray-200 hover:border-emerald-300 shadow-sm hover:shadow-md"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Welcome Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-emerald-100/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-200 to-teal-200 rounded-full blur-3xl opacity-20 -mr-32 -mt-32"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <Sparkles className="h-6 w-6 text-emerald-600" />
                <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Welcome back, {user?.name}!
                </h2>
              </div>
              <p className="text-gray-600 text-lg">
                Upload your resume and job description to get AI-powered optimization suggestions.
              </p>
            </div>
          </div>

          {/* Job Description Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-emerald-100/50">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-900">Job Description</h3>
            </div>
            <div className="relative">
              <textarea
                value={jobDescription}
                onChange={(e) => {
                  setJobDescription(e.target.value);
                  setError(null);
                }}
                placeholder="Paste the job description here to optimize your resume for this specific role..."
                className="w-full h-40 px-4 py-3 bg-white/50 border-2 border-emerald-200 rounded-2xl focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none transition-all duration-200 placeholder-gray-400"
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-emerald-600" />
                  {jobDescription.length}/10,000 characters
                </p>
                {jobDescription.length > 0 && (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                )}
              </div>
            </div>
          </div>

          {/* Resume Upload Section */}
          <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl p-8 border border-emerald-100/50">
            <div className="flex items-center gap-2 mb-4">
              <Upload className="h-5 w-5 text-emerald-600" />
              <h3 className="text-lg font-bold text-gray-900">Upload Resume</h3>
            </div>
            <FileUpload
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              selectedFile={selectedFile}
              isLoading={isLoading}
              error={fileError || undefined}
            />
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleOptimizeResume}
              disabled={isLoading || !jobDescription.trim() || !selectedFile}
              className="relative group flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-2xl transform hover:-translate-y-1 disabled:hover:transform-none font-semibold text-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-2xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-200"></div>
              {isLoading ? (
                <>
                  <div className="relative animate-spin rounded-full h-6 w-6 border-4 border-white border-t-transparent"></div>
                  <span className="relative">Processing Magic...</span>
                </>
              ) : (
                <>
                  <Sparkles className="relative h-6 w-6" />
                  <span className="relative">Optimize Resume</span>
                </>
              )}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm border-2 border-red-200 rounded-2xl p-4 flex items-center space-x-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-red-100 rounded-xl p-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <span className="text-red-700 font-medium">{error}</span>
            </div>
          )}

          {/* Results Section */}
          {(isLoading || results || error) && (
            <ResumeResults
              results={results}
              isLoading={isLoading}
              error={error}
              onDownload={() => {
                const rawLatexCode = results.resume?.optimizedLatex || results.optimizedLatex;
                if (rawLatexCode) {
                  const cleanLatexCode = rawLatexCode.replace(/```latex\s*/g, '').replace(/```\s*$/g, '').trim();
                  const blob = new Blob([cleanLatexCode], { type: 'text/plain' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'optimized_resume.ltx';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                }
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}