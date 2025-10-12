import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.cvperfecto.space/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    accessToken: string;
    refreshToken: string;
  };
  message: string;
}

export interface ResumeOptimizationData {
  jobDescription: string;
  resumeFile: File;
}

export interface ResumeOptimizationResponse {
  success: boolean;
  data: {
    message: string;
    resume: any;
  };
}

export const authAPI = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post('/users/login', data);
    return response.data;
  },

  signup: async (data: SignupData): Promise<AuthResponse> => {
    const response = await api.post('/users/register', data);
    return response.data;
  },
};

export const resumeAPI = {
  optimizeResume: async (data: ResumeOptimizationData): Promise<ResumeOptimizationResponse> => {
    console.log('🚀 FRONTEND: Starting resume optimization...');
    console.log('📄 File details:', {
      name: data.resumeFile.name,
      size: data.resumeFile.size,
      type: data.resumeFile.type,
      lastModified: data.resumeFile.lastModified
    });
    console.log('📝 Job description:', data.jobDescription);
    
    const formData = new FormData();
    formData.append('jobDescription', data.jobDescription);
    formData.append('resume', data.resumeFile);

    console.log('📤 FRONTEND: Sending request to backend...');
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`  ${key}: ${value}`);
      }
    }

    try {
      const response = await api.post('/resume/optimize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('✅ FRONTEND: Backend response received');
      console.log('Response status:', response.status);
      console.log('Response data:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ FRONTEND: Error during resume optimization');
      console.error('Error details:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  },

  getUserResumes: async () => {
    console.log('📋 FRONTEND: Fetching user resumes...');
    try {
      const response = await api.get('/resume');
      console.log('✅ FRONTEND: User resumes fetched successfully');
      console.log('Resumes data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ FRONTEND: Error fetching user resumes');
      console.error('Error details:', error);
      throw error;
    }
  },

  getResumeById: async (id: string) => {
    console.log('🔍 FRONTEND: Fetching resume by ID:', id);
    try {
      const response = await api.get(`/resume/${id}`);
      console.log('✅ FRONTEND: Resume fetched successfully');
      console.log('Resume data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ FRONTEND: Error fetching resume by ID');
      console.error('Error details:', error);
      throw error;
    }
  },

  healthCheck: async () => {
    console.log('🏥 FRONTEND: Checking backend health...');
    try {
      const response = await api.get('/resume/health');
      console.log('✅ FRONTEND: Backend health check successful');
      console.log('Health data:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ FRONTEND: Backend health check failed');
      console.error('Error details:', error);
      throw error;
    }
  },
};

export default api;
