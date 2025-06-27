import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import Admin from './Admin';
import Login from './Login';
import { AuthProvider, useAuth } from './AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import logo from './logostays.jpg';

// Componente de rota protegida
const PrivateRoute = ({ children, requiredRole }) => {
    const { authToken, userRole } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authToken) {
            navigate('/login');
        } else if (requiredRole && userRole !== requiredRole) {
            navigate('/'); // Redireciona para o dashboard se não tiver a role necessária
        }
    }, [authToken, userRole, requiredRole, navigate]);

    if (!authToken) {
        return null; // Ou um spinner de carregamento
    }

    if (requiredRole && userRole !== requiredRole) {
        return null; // Ou uma mensagem de acesso negado
    }

    return children;
};

function AppContent() {
    const { authToken, userRole, logout } = useAuth();
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [selectedState, setSelectedState] = useState('Todos');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="app-container">
            {/* Botão Hambúrguer para Mobile */}
            <button className="hamburger-menu-button d-md-none" onClick={toggleSidebar}>
                &#9776;
            </button>

            <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header text-center mb-4">
                    <img src={logo} alt="Gonzaga Stays Intelligence Logo" className="img-fluid mb-2" style={{ maxWidth: '150px' }} />
                </div>
                <nav className="nav flex-column">
                    <NavLink className="nav-link" to="/" onClick={() => setIsSidebarOpen(false)}>Dashboard</NavLink>
                    {userRole === 'admin' && (
                        <NavLink className="nav-link" to="/admin" onClick={() => setIsSidebarOpen(false)}>Admin</NavLink>
                    )}
                    {authToken && <button className="btn btn-link nav-link" onClick={logout}>Sair</button>}
                </nav>
            </div>
            {isSidebarOpen && <div className="sidebar-overlay d-md-none" onClick={toggleSidebar}></div>}

            <main className="main-content">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route 
                        path="/" 
                        element={
                            <PrivateRoute>
                                <Dashboard 
                                    startDate={startDate} 
                                    setStartDate={setStartDate} 
                                    endDate={endDate} 
                                    setEndDate={setEndDate} 
                                    selectedState={selectedState} 
                                    setSelectedState={setSelectedState} 
                                />
                            </PrivateRoute>
                        }
                    />
                    <Route 
                        path="/admin" 
                        element={
                            <PrivateRoute requiredRole="admin">
                                <Admin />
                            </PrivateRoute>
                        }
                    />
                </Routes>
                <footer className="footer mt-auto py-3 bg-light">
                    <div className="container text-center">
                        <span className="text-muted">by Gonzaga Stays Intelligence</span>
                    </div>
                </footer>
            </main>
        </div>
    );
}

function App() {
    return (
        <Router>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </Router>
    );
}

export default App;