import React from 'react';
import { Header } from './Header';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-[#1e1e1e]">
            <Header />
            <main className="container mx-auto px-6 py-8 max-w-7xl">
                <div className="animate-in fade-in duration-300">
                    {children}
                </div>
            </main>
        </div>
    );
};