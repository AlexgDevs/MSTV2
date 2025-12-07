import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div 
            className={cn('card-base', className)}
            style={{
                background: '#FFFFFF',
                borderRadius: '0.75rem',
                border: 'none',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                color: '#0A0A0A',
                margin: '0'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            {children}
        </div>
    );
};

export const CardHeader: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div className={cn(
            'px-6 py-5 border-b border-gray-200',
            'bg-white',
            className
        )}>
            {children}
        </div>
    );
};

export const CardContent: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div className={cn('px-6 py-5', className)}>
            {children}
        </div>
    );
};