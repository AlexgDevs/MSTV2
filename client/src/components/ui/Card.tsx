import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div className={cn(
            'bg-[#252526] rounded-lg border border-[#3e3e42]',
            'shadow-lg backdrop-blur-sm',
            'transition-all duration-200',
            'hover:border-[#464647] hover:shadow-xl',
            className
        )}>
            {children}
        </div>
    );
};

export const CardHeader: React.FC<CardProps> = ({ children, className }) => {
    return (
        <div className={cn(
            'px-6 py-5 border-b border-[#3e3e42]',
            'bg-gradient-to-r from-[#252526] to-[#2d2d30]',
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