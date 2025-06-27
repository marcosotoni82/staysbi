import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));

    useEffect(() => {
        if (authToken) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [authToken]);

    const setAuth = (token, role) => {
        setAuthToken(token);
        setUserRole(role);
        localStorage.setItem('authToken', token);
        localStorage.setItem('userRole', role);
    };

    const logout = () => {
        setAuthToken(null);
        setUserRole(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
    };

    return (
        <AuthContext.Provider value={{ authToken, userRole, setAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);