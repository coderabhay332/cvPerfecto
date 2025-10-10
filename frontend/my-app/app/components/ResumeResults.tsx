'use client';

import React, { useState } from 'react';
import { Download, FileText, CheckCircle, AlertCircle, Loader2, Copy, Sparkles } from 'lucide-react';

interface ResumeResultsProps {
  results: any;
  isLoading: boolean;
  error: string | null;
  onDownload?: () => void;
}

const ResumeResults: React.FC<ResumeResultsProps> = ({
  results,
  isLoading,
  error,
  onDownload,
}) => {
  const [copied, setCopied] = useState(false);

  const getLatexCode = () => {
    const latexCode = results.resume?.optimizedLatex || results.optimizedLatex || '';
    // Remove ```latex and ``` markdown formatting
    return latexCode.replace(/```latex\s*/g, '').replace(/```\s*$/g, '').trim();
  };

  const handleCopy = async () => {
    const latexCode = getLatexCode();
    if (latexCode) {
      try {
        await navigator.clipboard.writeText(latexCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-emerald-100/50">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <div className="relative">
              <Loader2 className="h-16 w-16 text-emerald-600 animate-spin" />
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-teal-500 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Processing Your Resume
            </h3>
            <p className="text-sm text-gray-600 max-w-md">
              Our AI is analyzing your resume and optimizing it for the job description...
            </p>
          </div>
          <div className="w-full max-w-md">
            <div className="bg-emerald-100 rounded-full h-3 overflow-hidden shadow-inner">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full animate-pulse shadow-lg transition-all duration-300" style={{ width: '60%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-red-100/50">
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-red-400 rounded-full blur-2xl opacity-20"></div>
            <div className="relative bg-red-100 rounded-2xl p-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-gray-900">Processing Failed</h3>
            <p className="text-sm text-red-600 max-w-md">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
          >
            <AlertCircle className="h-5 w-5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-emerald-100/50">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-emerald-100">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl p-3">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Resume Optimized Successfully!
            </h3>
            <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              Your LaTeX resume code is ready
            </p>
          </div>
        </div>
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center space-x-2 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold"
          >
            <Download className="h-5 w-5" />
            <span>Download .ltx</span>
          </button>
        )}
      </div>

      {/* LaTeX Code Display */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Optimized LaTeX Resume Code
          </h4>
          <button
            onClick={handleCopy}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 font-semibold shadow-md hover:shadow-lg ${
              copied
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
        
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-xl border border-emerald-500/20">
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <pre className="text-sm text-emerald-400 whitespace-pre-wrap font-mono leading-relaxed">
                {getLatexCode() || 'No LaTeX code available'}
              </pre>
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-200 rounded-xl p-4">
          <Sparkles className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-emerald-700">Pro Tip:</span> Copy this code and paste it into your LaTeX editor (Overleaf, TeXstudio, etc.) to generate your professionally optimized resume
          </p>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(16, 185, 129, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #14b8a6);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #0d9488);
        }
      `}</style>
    </div>
  );
};

export default ResumeResults;