import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className={`${sizeClasses[size]} text-primary-500 animate-spin`} />
            {text && <p className="text-sm text-slate-400">{text}</p>}
        </div>
    );
};

export default LoadingSpinner;
