import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

function Admin() {
    const { userRole } = useAuth();

    const [unidades, setUnidades] = useState('');
    const [gonzagaMultiplier, setGonzagaMultiplier] = useState('');
    const [configMessage, setConfigMessage] = useState('');
    const [uploadMessage, setUploadMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);

    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerMessage, setRegisterMessage] = useState('');

    const [users, setUsers] = useState([]);
    const [changePasswordUserId, setChangePasswordUserId] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [passwordChangeMessage, setPasswordChangeMessage] = useState('');

    useEffect(() => {
        if (userRole === 'admin') {
            fetchConfig();
            fetchUsers();
        }
    }, [userRole]);

    const fetchConfig = () => {
        axios.get('http://127.0.0.1:8000/api/config')
            .then(response => {
                setUnidades(response.data.unidades_ativas);
                setGonzagaMultiplier(response.data.gonzaga_commission_multiplier);
            })
            .catch(error => {
                console.error("Erro ao buscar configuração:", error);
            });
    };

    const fetchUsers = () => {
        axios.get('http://127.0.0.1:8000/users')
            .then(response => {
                setUsers(response.data);
            })
            .catch(error => {
                console.error("Erro ao buscar usuários:", error);
            });
    };

    const handleConfigSubmit = (event) => {
        event.preventDefault();
        axios.post('http://127.0.0.1:8000/api/config', {
            unidades_ativas: parseInt(unidades, 10),
            gonzaga_commission_multiplier: parseFloat(gonzagaMultiplier)
        })
            .then(response => {
                setConfigMessage('Configuração atualizada com sucesso!');
            })
            .catch(error => {
                setConfigMessage('Erro ao atualizar a configuração.');
                console.error("Erro ao salvar configuração:", error);
            });
    };

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleFileUpload = () => {
        if (!selectedFile) {
            setUploadMessage('Por favor, selecione um arquivo primeiro.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        axios.post('http://127.0.0.1:8000/api/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
        .then(response => {
            setUploadMessage(response.data.message);
        })
        .catch(error => {
            setUploadMessage(error.response?.data?.detail || 'Erro ao importar a planilha.');
            console.error("Erro ao fazer upload:", error);
        });
    };

    const handleRegisterSubmit = async (event) => {
        event.preventDefault();
        try {
            await axios.post('http://127.0.0.1:8000/register', {
                email: registerEmail,
                password: registerPassword
            });
            setRegisterMessage('Usuário registrado com sucesso!');
            setRegisterEmail('');
            setRegisterPassword('');
            fetchUsers(); // Atualiza a lista de usuários
        } catch (err) {
            setRegisterMessage(err.response?.data?.detail || 'Erro ao registrar usuário.');
            console.error("Erro de registro:", err);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Tem certeza que deseja deletar este usuário?')) {
            try {
                await axios.delete(`http://127.0.0.1:8000/users/${userId}`);
                alert('Usuário deletado com sucesso!');
                fetchUsers(); // Atualiza a lista de usuários
            } catch (err) {
                alert(err.response?.data?.detail || 'Erro ao deletar usuário.');
                console.error("Erro ao deletar usuário:", err);
            }
        }
    };

    const handleChangePassword = async (userId) => {
        try {
            await axios.put(`http://127.0.0.1:8000/users/${userId}/password`, { new_password: newPassword });
            setPasswordChangeMessage('Senha alterada com sucesso!');
            setChangePasswordUserId(null);
            setNewPassword('');
        } catch (err) {
            setPasswordChangeMessage(err.response?.data?.detail || 'Erro ao alterar senha.');
            console.error("Erro ao alterar senha:", err);
        }
    };

    const handleChangeRole = async (userId, newRole) => {
        try {
            await axios.put(`http://127.0.0.1:8000/users/${userId}/role`, { role: newRole });
            alert('Papel do usuário alterado com sucesso!');
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.detail || 'Erro ao alterar papel do usuário.');
            console.error("Erro ao alterar papel:", err);
        }
    };

    if (userRole !== 'admin') {
        return (
            <div className="alert alert-danger" role="alert">
                Acesso negado. Você não tem permissão para acessar esta área.
            </div>
        );
    }

    return (
        <div>
            <h2>Administração</h2>
            <hr />

            <h4>Configurações Gerais</h4>
            <form onSubmit={handleConfigSubmit}>
                <div className="mb-3">
                    <label htmlFor="unidadesInput" className="form-label">Número de Unidades Ativas</label>
                    <input 
                        type="number" 
                        className="form-control" 
                        id="unidadesInput" 
                        value={unidades} 
                        onChange={e => setUnidades(e.target.value)} 
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="gonzagaMultiplierInput" className="form-label">Multiplicador Comissão Gonzaga</label>
                    <input 
                        type="number" 
                        step="0.01" 
                        className="form-control" 
                        id="gonzagaMultiplierInput" 
                        value={gonzagaMultiplier} 
                        onChange={e => setGonzagaMultiplier(e.target.value)} 
                    />
                </div>
                <button type="submit" className="btn btn-primary">Salvar Configurações</button>
            </form>
            {configMessage && <div className="alert alert-info mt-3">{configMessage}</div>}

            <hr className="my-4"/>

            <h4>Importar Base de Dados</h4>
            <div className="mb-3">
                <label htmlFor="fileInput" className="form-label">Selecione a planilha (.xlsx)</label>
                <input 
                    type="file" 
                    className="form-control" 
                    id="fileInput" 
                    accept=".xlsx" 
                    onChange={handleFileChange} 
                />
            </div>
            <button onClick={handleFileUpload} className="btn btn-success">Importar</button>
            {uploadMessage && <div className="alert alert-info mt-3">{uploadMessage}</div>}

            <hr className="my-4"/>

            <h4>Cadastrar Novo Usuário</h4>
            <form onSubmit={handleRegisterSubmit}>
                <div className="mb-3">
                    <label htmlFor="registerEmailInput" className="form-label">Email</label>
                    <input 
                        type="email" 
                        className="form-control" 
                        id="registerEmailInput" 
                        value={registerEmail} 
                        onChange={e => setRegisterEmail(e.target.value)} 
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="registerPasswordInput" className="form-label">Senha</label>
                    <input 
                        type="password" 
                        className="form-control" 
                        id="registerPasswordInput" 
                        value={registerPassword} 
                        onChange={e => setRegisterPassword(e.target.value)} 
                        required
                    />
                </div>
                <button type="submit" className="btn btn-primary">Registrar Usuário</button>
            </form>
            {registerMessage && <div className="alert alert-info mt-3">{registerMessage}</div>}

            <hr className="my-4"/>

            <h4>Gestão de Usuários</h4>
            <table className="table table-striped">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>Papel</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.email}</td>
                            <td>
                                <select 
                                    className="form-select form-select-sm" 
                                    value={user.role} 
                                    onChange={(e) => handleChangeRole(user.id, e.target.value)}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </td>
                            <td>
                                <button 
                                    className="btn btn-sm btn-warning me-2" 
                                    onClick={() => setChangePasswordUserId(user.id)}
                                >
                                    Mudar Senha
                                </button>
                                <button 
                                    className="btn btn-sm btn-danger" 
                                    onClick={() => handleDeleteUser(user.id)}
                                >
                                    Deletar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {changePasswordUserId && (
                <div className="mt-4 p-3 border rounded bg-light">
                    <h5>Mudar Senha para {users.find(u => u.id === changePasswordUserId)?.email}</h5>
                    <div className="mb-3">
                        <label htmlFor="newPasswordInput" className="form-label">Nova Senha</label>
                        <input 
                            type="password" 
                            className="form-control" 
                            id="newPasswordInput" 
                            value={newPassword} 
                            onChange={e => setNewPassword(e.target.value)} 
                            required
                        />
                    </div>
                    <button 
                        className="btn btn-primary me-2" 
                        onClick={() => handleChangePassword(changePasswordUserId)}
                    >
                        Salvar Nova Senha
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => {
                            setChangePasswordUserId(null);
                            setNewPassword('');
                            setPasswordChangeMessage('');
                        }}
                    >
                        Cancelar
                    </button>
                    {passwordChangeMessage && <div className="alert alert-info mt-3">{passwordChangeMessage}</div>}
                </div>
            )}
        </div>
    );
}

export default Admin;