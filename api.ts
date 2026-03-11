import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          const token = parsed?.state?.accessToken;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch {}
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        if (typeof window !== 'undefined') {
          const authData = localStorage.getItem('auth-storage');
          if (authData) {
            const parsed = JSON.parse(authData);
            const refreshToken = parsed?.state?.refreshToken;
            
            if (refreshToken) {
              const response = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
              const { accessToken, refreshToken: newRefreshToken } = response.data.data;
              
              // Update stored tokens
              const newAuth = {
                ...parsed,
                state: { ...parsed.state, accessToken, refreshToken: newRefreshToken }
              };
              localStorage.setItem('auth-storage', JSON.stringify(newAuth));
              
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return api(originalRequest);
            }
          }
        }
      } catch {
        // Refresh failed - logout
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
          window.location.href = '/auth/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// API helper functions
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data: any) => api.put('/auth/change-password', data),
};

export const courseApi = {
  getAll: (params?: any) => api.get('/courses', { params }),
  getFeatured: () => api.get('/courses/featured'),
  getBySlug: (slug: string) => api.get(`/courses/${slug}`),
  create: (data: any) => api.post('/courses', data),
  update: (id: string, data: any) => api.put(`/courses/${id}`, data),
  delete: (id: string) => api.delete(`/courses/${id}`),
};

export const articleApi = {
  getAll: (params?: any) => api.get('/articles', { params }),
  getPopular: () => api.get('/articles/popular'),
  getBySlug: (slug: string) => api.get(`/articles/${slug}`),
  create: (data: any) => api.post('/articles', data),
  update: (id: string, data: any) => api.put(`/articles/${id}`, data),
  delete: (id: string) => api.delete(`/articles/${id}`),
};

export const enrollmentApi = {
  getMyEnrollments: () => api.get('/enrollments'),
  enroll: (courseId: string) => api.post(`/enrollments/${courseId}`),
};

export const progressApi = {
  getCourseProgress: (courseId: string) => api.get(`/progress/course/${courseId}`),
  updateLessonProgress: (lessonId: string, data: any) => api.post(`/progress/lesson/${lessonId}`, data),
};

export const videoApi = {
  requestAccess: (lessonId: string) => api.get(`/video/access/${lessonId}`),
};

export const commentApi = {
  getArticleComments: (articleId: string) => api.get(`/comments/article/${articleId}`),
  postComment: (articleId: string, data: any) => api.post(`/comments/article/${articleId}`, data),
  deleteComment: (id: string) => api.delete(`/comments/${id}`),
};

export const categoryApi = {
  getAll: () => api.get('/categories'),
};

export const bookmarkApi = {
  getAll: () => api.get('/bookmarks'),
  add: (data: any) => api.post('/bookmarks', data),
  remove: (id: string) => api.delete(`/bookmarks/${id}`),
};

export const notificationApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

export const messageApi = {
  send: (data: any) => api.post('/messages', data),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  updateUser: (id: string, data: any) => api.patch(`/admin/users/${id}`, data),
  getCourses: (params?: any) => api.get('/admin/courses', { params }),
  getArticles: () => api.get('/admin/articles'),
  getComments: (params?: any) => api.get('/admin/comments', { params }),
  updateComment: (id: string, data: any) => api.patch(`/admin/comments/${id}`, data),
  getMessages: () => api.get('/admin/messages'),
  getChartData: (params?: any) => api.get('/admin/analytics/chart', { params }),
};

export const analyticsApi = {
  track: (data: any) => api.post('/analytics/track', data).catch(() => {}),
};
