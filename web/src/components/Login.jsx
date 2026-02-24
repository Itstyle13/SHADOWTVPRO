import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config';

const Login = () => {
    const [xtreamUrl, setXtreamUrl] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Usamos la constante centralizada
            const response = await axios.post(`${API_BASE}/auth/login`, {
                xtreamUrl,
                username,
                password
            });

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('userInfo', JSON.stringify(response.data.user_info));
            navigate('/player');
        } catch (err) {
            const message = err.response?.data?.error || 'No se pudo conectar con el servidor. ¿Está el backend encendido?';
            setError(message);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px' }}>
            <h2>IPTV LOGIN</h2>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px' }}>
                <input
                    type="url"
                    placeholder="http://server.url:port"
                    value={xtreamUrl}
                    onChange={(e) => setXtreamUrl(e.target.value)}
                    style={{ padding: '10px', background: '#333', border: '1px solid #555', color: '#fff' }}
                    required
                />
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ padding: '10px', background: '#333', border: '1px solid #555', color: '#fff' }}
                    required
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ padding: '10px', background: '#333', border: '1px solid #555', color: '#fff' }}
                />
                <button type="submit" style={{ padding: '10px', background: '#e50914', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    ENTER
                </button>
            </form>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
    );
};

export default Login;
