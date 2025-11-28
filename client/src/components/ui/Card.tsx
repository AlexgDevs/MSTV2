import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div className={cn('bg-white rounded-lg shadow-md border border-gray-200', className)}>
            {children}
        </div>
    );
};

export const CardHeader: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div className={cn('px-6 py-4 border-b border-gray-200', className)}>
            {children}
        </div>
    );
};

export const CardContent: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div className={cn('px-6 py-4', className)}>
            {children}
        </div>
    );
};