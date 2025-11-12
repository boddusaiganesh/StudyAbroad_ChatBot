import axios, {AxiosError} from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 second timeout
});

// Add token to requests if available
api.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Handle responses and errors
api.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
        // Handle network errors
        if (!error.response) {
            throw new Error('Network error. Please check your internet connection and try again.');
        }

        // Handle different HTTP error statuses
        const status = error.response.status;
        const data: any = error.response.data;

        let errorMessage = 'An unexpected error occurred. Please try again.';

        switch (status) {
            case 400:
                errorMessage = data?.message || data?.detail || 'Invalid request. Please check your input.';
                break;
            case 401:
                errorMessage = 'Your session has expired. Please log in again.';
                // Clear token on 401
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('token');
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                }
                break;
            case 403:
                errorMessage = 'You do not have permission to perform this action.';
                break;
            case 404:
                errorMessage = 'The requested resource was not found.';
                break;
            case 429:
                errorMessage = 'Too many requests. Please wait a moment and try again.';
                break;
            case 500:
                errorMessage = data?.message || 'Server error. Our team has been notified.';
                break;
            case 503:
                errorMessage = 'Service temporarily unavailable. Please try again later.';
                break;
            default:
                errorMessage = data?.message || data?.detail || errorMessage;
        }

        const enhancedError = new Error(errorMessage);
        (enhancedError as any).status = status;
        (enhancedError as any).originalError = error;

        return Promise.reject(enhancedError);
    }
);

// Helper function to handle API errors
const handleApiError = (error: any, defaultMessage: string): never => {
    console.error('API Error:', error);

    if (error.message) {
        throw new Error(error.message);
    }

    throw new Error(defaultMessage);
};

// Auth APIs
export const signup = async (email: string, password: string) => {
    try {
        if (!email || !email.includes('@')) {
            throw new Error('Please enter a valid email address');
        }

        if (!password || password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        const response = await api.post('/api/auth/signup', {email, password});
        return response.data;
    } catch (error) {
        handleApiError(error, 'Failed to create account. Please try again.');
    }
};

export const login = async (email: string, password: string) => {
    try {
        if (!email || !password) {
            throw new Error('Please enter both email and password');
        }

        const response = await api.post('/api/auth/login', {email, password});
        return response.data;
    } catch (error) {
        handleApiError(error, 'Failed to log in. Please check your credentials.');
    }
};

export const getCurrentUser = async () => {
    try {
        const response = await api.get('/api/auth/me');
        return response.data;
    } catch (error) {
        handleApiError(error, 'Failed to fetch user information.');
    }
};

// Chat APIs
export const sendMessage = async (question: string, country?: string) => {
    try {
        if (!question || !question.trim()) {
            throw new Error('Please enter a question');
        }

        if (question.length > 1000) {
            throw new Error('Question is too long. Please limit to 1000 characters.');
        }

        const response = await api.post('/api/chat', {
            question: question.trim(),
            country
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'Failed to send message. Please try again.');
    }
};

export const getChatHistory = async () => {
    try {
        const response = await api.get('/api/chat/history');
        return response.data;
    } catch (error) {
        console.error('Failed to load chat history:', error);
        // Don't throw error for chat history - just return empty array
        return [];
    }
};

// Utility APIs
export const getCountries = async () => {
    try {
        const response = await api.get('/api/countries');
        return response.data;
    } catch (error) {
        console.error('Failed to load countries:', error);
        // Return default countries as fallback
        return {countries: ['USA', 'UK', 'Canada', 'Australia']};
    }
};

export default api;
