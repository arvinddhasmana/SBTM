import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    action?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, action }) => {
    return (
        <div className={`glass-card p-6 ${className}`}>
            {(title || action) && (
                <div className="flex items-center justify-between mb-4">
                    {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
                    {action}
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;
