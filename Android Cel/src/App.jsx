import { useState } from 'react';
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
    );
}

export default App;
