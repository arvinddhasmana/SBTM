import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    subtitle?: string;
    action?: React.ReactNode;
    /** Whether the card body can be collapsed */
    collapsible?: boolean;
    /** Controls initial collapsed state when collapsible=true */
    defaultCollapsed?: boolean;
    /** Accent colour for the top border highlight */
    accent?: 'primary' | 'cyan' | 'green' | 'amber' | 'rose' | 'none';
    /** Remove internal padding */
    noPadding?: boolean;
}

const accentGradientMap: Record<string, string> = {
    primary: 'linear-gradient(90deg, transparent, rgba(14,165,233,0.5), transparent)',
    cyan: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.5), transparent)',
    green: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)',
    amber: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.5), transparent)',
    rose: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.5), transparent)',
    none: 'none',
};

const Card: React.FC<CardProps> = ({
    children,
    className = '',
    title,
    subtitle,
    action,
    collapsible = false,
    defaultCollapsed = false,
    accent = 'primary',
    noPadding = false,
}) => {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    const paddingCls = noPadding ? '' : 'p-5';
    const gradient = accentGradientMap[accent] ?? accentGradientMap.primary;

    return (
        <div className={`glass-card animate-fade-in ${className}`}>
            {/* Accent top line */}
            {accent !== 'none' && (
                <div
                    className="absolute top-0 left-0 right-0 h-px rounded-t-2xl pointer-events-none"
                    style={{ background: gradient }}
                />
            )}

            {/* Header */}
            {(title || action) && (
                <div
                    className={`flex items-center justify-between ${paddingCls} ${
                        !collapsed && children ? 'pb-3' : ''
                    }`}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {title && (
                            <h3 className="text-base font-semibold text-white truncate">
                                {title}
                            </h3>
                        )}
                        {subtitle && (
                            <span className="text-xs text-slate-500 truncate hidden sm:block">
                                {subtitle}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                        {action}
                        {collapsible && (
                            <button
                                type="button"
                                onClick={() => setCollapsed((c) => !c)}
                                aria-expanded={!collapsed}
                                aria-label={collapsed ? 'Expand section' : 'Collapse section'}
                                className="btn-icon"
                            >
                                <ChevronDown
                                    size={16}
                                    className={`transition-transform duration-300 ${
                                        collapsed ? '-rotate-90' : ''
                                    }`}
                                />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Body */}
            {(!collapsible || !collapsed) && children && (
                <div
                    className={`${title || action ? '' : paddingCls} ${
                        title || action ? `${noPadding ? '' : 'px-5 pb-5'}` : ''
                    }`}
                >
                    {children}
                </div>
            )}
        </div>
    );
};

export default Card;

