import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
    size = 'md', 
    text,
    fullScreen = false 
}) => {
    const spinner = (
        <div className={`loading-spinner loading-spinner-${size}`}>
            <div className="spinner-ring">
                <div className="spinner-ring-inner"></div>
            </div>
            {text && <p className="loading-spinner-text">{text}</p>}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="loading-spinner-fullscreen">
                {spinner}
            </div>
        );
    }

    return spinner;
};

