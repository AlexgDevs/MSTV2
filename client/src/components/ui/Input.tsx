import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    className,
    ...props
}) => {
    return (
        <div className="space-y-2">
            {label && (
                <label className="block text-sm font-medium text-[#cccccc]">
                    {label}
                </label>
            )}
            <input
                className={cn(
                    'w-full px-4 py-2.5',
                    'bg-[#1e1e1e] text-[#cccccc]',
                    'border border-[#3e3e42] rounded-md',
                    'placeholder:text-[#6a6a6a]',
                    'focus:outline-none focus:ring-2 focus:ring-[#007acc] focus:border-[#007acc]',
                    'transition-all duration-200',
                    'hover:border-[#464647]',
                    error && 'border-[#f48771] focus:ring-[#f48771]',
                    className
                )}
                {...props}
            />
            {error && (
                <p className="text-sm text-[#f48771] flex items-center gap-1">
                    <span>⚠</span>
                    {error}
                </p>
            )}
        </div>
    );
};