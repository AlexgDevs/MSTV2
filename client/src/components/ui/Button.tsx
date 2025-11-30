import React from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    className,
    disabled,
    ...props
}) => {
    const baseStyles = `
        rounded-md font-medium transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-[#007acc] focus:ring-offset-2 focus:ring-offset-[#1e1e1e]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-current
        active:scale-[0.98]
    `;

    const variants = {
        primary: `
            bg-[#007acc] text-white 
            hover:bg-[#1a8cd8] hover:shadow-lg hover:shadow-[#007acc]/30
            active:bg-[#005a9e]
            border border-transparent
        `,
        secondary: `
            bg-[#2d2d30] text-[#cccccc]
            hover:bg-[#3e3e42] hover:border-[#464647]
            active:bg-[#252526]
            border border-[#3e3e42]
        `,
        outline: `
            border border-[#3e3e42] bg-transparent text-[#cccccc]
            hover:bg-[#2a2d2e] hover:border-[#464647]
            active:bg-[#252526]
        `,
        ghost: `
            bg-transparent text-[#cccccc]
            hover:bg-[#2a2d2e]
            active:bg-[#252526]
            border border-transparent
        `
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    return (
        <button
            className={cn(
                baseStyles,
                variants[variant],
                sizes[size],
                className
            )}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};