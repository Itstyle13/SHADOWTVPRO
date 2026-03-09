import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Player from './components/Player';
import SplashScreen from './components/SplashScreen';
import './index.css';

const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return children;
};


class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red', background: '#000', height: '100vh', overflow: 'auto' }}>
                    <h2>React Crashed:</h2>
                    <pre>{this.state.error?.toString()}</pre>
                    <pre>{this.state.error?.stack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}

function App() {
    const [showSplash, setShowSplash] = useState(true);

    if (showSplash) {
        return (
            <SplashScreen
                isReady={true} // Siempre ready inicial para dejar pasar los 3s
                onComplete={() => setShowSplash(false)}
            />
        );
    }

    return (
        <ErrorBoundary>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/player"
                        element={
                            <ProtectedRoute>
                                <Player />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Router>
        </ErrorBoundary>
    );
}

export default App;
