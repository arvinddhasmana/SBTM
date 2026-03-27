import React, { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
    /** Section heading shown in the toggle bar */
    title: string;
    /** Whether the section starts expanded */
    defaultExpanded?: boolean;
    /** Content to show / hide */
    children: React.ReactNode;
    /** Extra classes for the outer container */
    className?: string;
    /** Icon shown before the title */
    icon?: React.ReactNode;
    /** Compact heading variant — smaller padding */
    compact?: boolean;
    /** Badge / counter element shown after the title */
    badge?: React.ReactNode;
    /** Controlled expanded state (overrides internal state when provided) */
    expanded?: boolean;
    /** Called when the user toggles the section */
    onToggle?: (expanded: boolean) => void;
}

/**
 * CollapsibleSection — a panel that can be expanded or collapsed with an
 * animated chevron header.  Supports both controlled and uncontrolled usage.
 */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    defaultExpanded = true,
    children,
    className = '',
    icon,
    compact = false,
    badge,
    expanded: controlledExpanded,
    onToggle,
}) => {
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
    const contentRef = useRef<HTMLDivElement>(null);

    const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

    const toggle = () => {
        const next = !isExpanded;
        if (controlledExpanded === undefined) setInternalExpanded(next);
        onToggle?.(next);
    };

    const paddingCls = compact ? 'px-3 py-2' : 'px-4 py-3';

    return (
        <div className={`overflow-hidden ${className}`}>
            {/* ── Header / Toggle ────────────────────────────────────── */}
            <button
                type="button"
                onClick={toggle}
                aria-expanded={isExpanded}
                className={`w-full flex items-center justify-between ${paddingCls} rounded-xl transition-all duration-200 group`}
                style={{
                    background: isExpanded
                        ? 'rgba(14, 165, 233, 0.06)'
                        : 'transparent',
                    border: '1px solid',
                    borderColor: isExpanded
                        ? 'rgba(14, 165, 233, 0.15)'
                        : 'transparent',
                }}
            >
                <div className="flex items-center gap-2 min-w-0">
                    {icon && (
                        <span
                            className={`flex-shrink-0 transition-colors ${
                                isExpanded ? 'text-primary-400' : 'text-slate-500'
                            }`}
                        >
                            {icon}
                        </span>
                    )}
                    <span
                        className={`font-semibold text-sm truncate transition-colors ${
                            isExpanded ? 'text-white' : 'text-slate-400'
                        }`}
                    >
                        {title}
                    </span>
                    {badge && <span className="ml-2 flex-shrink-0">{badge}</span>}
                </div>
                <ChevronDown
                    size={16}
                    className={`flex-shrink-0 text-slate-500 group-hover:text-slate-300 transition-all duration-300 ${
                        isExpanded ? 'rotate-0' : '-rotate-90'
                    }`}
                />
            </button>

            {/* ── Content ────────────────────────────────────────────── */}
            <div
                ref={contentRef}
                className="collapse-content"
                style={{
                    maxHeight: isExpanded
                        ? `${contentRef.current?.scrollHeight ?? 9999}px`
                        : '0px',
                    opacity: isExpanded ? 1 : 0,
                }}
            >
                <div className={compact ? 'pt-2' : 'pt-3'}>{children}</div>
            </div>
        </div>
    );
};

export default CollapsibleSection;
