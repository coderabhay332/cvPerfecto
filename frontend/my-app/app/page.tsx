'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import { FileText, ShieldCheck, Sparkles, Rocket, CheckCircle, Upload, ArrowRight } from 'lucide-react';

export default function Home() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const primaryCta = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-24 left-10 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-[28rem] h-[28rem] bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-24 left-1/3 w-[28rem] h-[28rem] bg-cyan-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-white/70 rounded-full px-3 py-1 border border-emerald-100 shadow-sm mb-4">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">AI Resume Optimization</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Land more interviews with a resume tailored by AI
              </h1>
              <p className="mt-4 text-gray-700 text-lg">
                Paste a job description, upload your resume, and get a polished LaTeX resume optimized for the role—within minutes.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={primaryCta}
                  className="inline-flex items-center justify-center px-6 py-3 text-white text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isAuthenticated ? (
                    <>
                      <Rocket className="h-4 w-4 mr-2" />
                      Open dashboard
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Get started
                    </>
                  )}
                </button>
                {!isAuthenticated && (
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-xl text-emerald-700 bg-white/70 hover:bg-white border border-emerald-200 shadow-sm hover:shadow-md transition-all"
                  >
                    Create free account
                  </Link>
                )}
              </div>
              <div className="mt-6 flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1"><ShieldCheck className="h-4 w-4 text-emerald-600" />Secure</div>
                <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-emerald-600" />Fast</div>
                <div className="flex items-center gap-1"><FileText className="h-4 w-4 text-emerald-600" />LaTeX output</div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl blur-3xl opacity-20"></div>
              <div className="relative bg-white/80 backdrop-blur-lg border border-emerald-100/50 rounded-3xl shadow-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Upload className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-base font-semibold text-gray-900">Three simple steps</h3>
                </div>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">1</span>
                    Paste the job description
                  </li>
                  <li className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">2</span>
                    Upload your resume (PDF or DOCX)
                  </li>
                  <li className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">3</span>
                    Get optimized LaTeX to export and share
                  </li>
                </ol>
                <div className="mt-6">
                  <button
                    onClick={primaryCta}
                    className="w-full inline-flex items-center justify-center px-5 py-3 text-white text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md hover:shadow-lg transition-all"
                  >
                    Try it now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[{
            icon: <Sparkles className="h-6 w-6 text-emerald-600" />, title: 'Smart matching', desc: 'Aligns your experience with the job requirements using AI.'
          }, {
            icon: <FileText className="h-6 w-6 text-emerald-600" />, title: 'LaTeX-first', desc: 'Output ready for Overleaf and professional typesetting.'
          }, {
            icon: <Rocket className="h-6 w-6 text-emerald-600" />, title: 'Lightning fast', desc: 'From upload to optimized resume in minutes.'
          }].map((f, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-lg border border-emerald-100/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3">
                {f.icon}
                <h4 className="text-base font-semibold text-gray-900">{f.title}</h4>
              </div>
              <p className="mt-2 text-sm text-gray-700">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white/80 backdrop-blur-lg border border-emerald-100/50 rounded-2xl p-6 shadow-lg text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to optimize your resume?</h3>
          <p className="text-sm text-gray-600 mb-4">Join thousands of job seekers who've landed their dream roles</p>
          <button
            onClick={primaryCta}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all"
          >
            {isAuthenticated ? 'Open dashboard' : 'Get started free'}
          </button>
        </div>
      </section>
    </div>
  );
}