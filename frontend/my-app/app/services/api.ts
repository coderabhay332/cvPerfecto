import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://52.87.123.216:5000/api';

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
    const formData = new FormData();
    formData.append('jobDescription', data.jobDescription);
    formData.append('resume', data.resumeFile);

    const response = await api.post('/resume/optimize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getUserResumes: async () => {
    const response = await api.get('/resume');
    return response.data;
  },

  getResumeById: async (id: string) => {
    const response = await api.get(`/resume/${id}`);
    return response.data;
  },

  healthCheck: async () => {
    const response = await api.get('/resume/health');
    return response.data;
  },
};

export default api;
