import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { setAuth } = useAuth();

    const handleSubmit = async (event) => {
        event.preventDefault();
        try {
            const response = await axios.post('http://127.0.0.1:8000/token', {
                email,
                password
            });
            setAuth(response.data.access_token, response.data.user_role);
            navigate('/'); // Redireciona para o dashboard após o login
        } catch (err) {
            setError('Credenciais inválidas. Por favor, tente novamente.');
            console.error("Erro de login:", err);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header text-center">Login</div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label htmlFor="emailInput" className="form-label">Email</label>
                                    <input 
                                        type="email" 
                                        className="form-control" 
                                        id="emailInput" 
                                        value={email} 
                                        onChange={e => setEmail(e.target.value)} 
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="passwordInput" className="form-label">Senha</label>
                                    <input 
                                        type="password" 
                                        className="form-control" 
                                        id="passwordInput" 
                                        value={password} 
                                        onChange={e => setPassword(e.target.value)} 
                                        required
                                    />
                                </div>
                                {error && <div className="alert alert-danger">{error}</div>}
                                <button type="submit" className="btn btn-primary w-100">Entrar</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;