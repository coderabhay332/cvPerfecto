'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  isLoading?: boolean;
  error?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onFileRemove,
  selectedFile,
  isLoading = false,
  error,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isLoading,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return <File className="h-8 w-8 text-emerald-500" />;
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 backdrop-blur-sm
          ${
            isDragActive || dragActive
              ? 'border-emerald-400 bg-emerald-50/80 shadow-lg scale-[1.02]'
              : selectedFile
              ? 'border-teal-400 bg-gradient-to-br from-emerald-50/80 to-teal-50/80 shadow-md'
              : error
              ? 'border-red-400 bg-red-50/80'
              : 'border-emerald-200 bg-white/50 hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-md'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onMouseEnter={() => setDragActive(true)}
        onMouseLeave={() => setDragActive(false)}
      >
        <input {...getInputProps()} />
        
        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-100 border-t-emerald-500"></div>
              <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-gray-700">Processing your file...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
              <div className="relative flex items-center justify-center space-x-2 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl p-4">
                {getFileIcon(selectedFile.name)}
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">{selectedFile.name}</p>
              <p className="text-xs text-gray-600 mt-1 font-medium">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFileRemove();
              }}
              className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <X className="h-4 w-4" />
              <span>Remove File</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full blur-xl opacity-20 ${isDragActive ? 'animate-pulse' : ''}`}></div>
              <div className={`relative bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl p-4 transition-transform duration-300 ${isDragActive ? 'scale-110' : ''}`}>
                <Upload className={`h-12 w-12 text-emerald-600 transition-transform duration-300 ${isDragActive ? 'animate-bounce' : ''}`} />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-semibold text-gray-900">
                {isDragActive ? 'Drop your resume here' : 'Upload Your Resume'}
              </p>
              <p className="text-sm text-gray-600">
                Drag and drop or click to browse
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 mt-3 bg-emerald-50/50 rounded-lg px-3 py-2">
                <Sparkles className="h-3 w-3 text-emerald-600" />
                <span>PDF & DOCX • Max 10MB</span>
              </div>
            </div>
          </div>
        )}

        {error && selectedFile && (
          <div className="absolute top-3 right-3 flex items-center space-x-1 bg-red-100 text-red-700 px-3 py-1 rounded-lg shadow-sm">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs font-medium">{error}</span>
          </div>
        )}
      </div>

      {error && !selectedFile && (
        <div className="mt-3 flex items-center space-x-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;