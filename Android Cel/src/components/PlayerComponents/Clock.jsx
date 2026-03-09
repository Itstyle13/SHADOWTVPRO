import React, { useState, useEffect } from 'react';

const Clock = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    return (
        <span className="status-time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
    );
};

export default React.memo(Clock);
