import { createContext, useContext, useState, useEffect } from 'react';
import { apiCall } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for session
        const savedUser = localStorage.getItem('trogifts_user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        // Hardcoded Admin Override shortcut
        if (email.toLowerCase() === 'admin' && password === 'qazplm098') {
            const adminUser = { uid: 'admin_1', role: 'admin', name: 'System Admin', email: 'admin' };
            setUser(adminUser);
            localStorage.setItem('trogifts_user', JSON.stringify(adminUser));
            return adminUser;
        }

        try {
            const userData = await apiCall('login', { email, password });
            setUser(userData);
            localStorage.setItem('trogifts_user', JSON.stringify(userData));
            return userData;
        } catch (error) {
            console.error('Login error:', error);
            throw error; // Let UI handle invalid creds
        }
    };

    const register = async (name, email, phone, password) => {
        try {
            const newUser = await apiCall('register', { name, email, phone, password });
            return newUser;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('trogifts_user');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
