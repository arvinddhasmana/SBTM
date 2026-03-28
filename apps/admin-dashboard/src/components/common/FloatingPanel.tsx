import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, GripVertical } from 'lucide-react';

interface FloatingPanelProps {
    id: string;
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    defaultPosition?: { x: number; y: number };
    defaultSize?: { width: string | number; height: string | number };
    className?: string;
    anchor?: 'left' | 'right';
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({
    id,
    title,
    icon,
    children,
    defaultPosition = { x: 20, y: 20 },
    defaultSize = { width: 'auto', height: 'auto' },
    className = '',
    anchor = 'left',
}) => {
    const [position, setPosition] = useState(() => {
        const saved = localStorage.getItem(`panel_pos_${id}`);
        return saved ? JSON.parse(saved) : defaultPosition;
    });
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem(`panel_collapsed_${id}`);
        return saved ? JSON.parse(saved) : false;
    });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    // Reset manual resize on collapse
    useEffect(() => {
        if (isCollapsed && panelRef.current) {
            panelRef.current.style.width = '';
            panelRef.current.style.height = '';
        }
    }, [isCollapsed]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) {
            setIsDragging(true);
            dragOffset.current = {
                x: anchor === 'left' ? e.clientX - position.x : (window.innerWidth - e.clientX) - position.x,
                y: e.clientY - position.y,
            };
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const newPos = {
                    x: anchor === 'left' ? e.clientX - dragOffset.current.x : (window.innerWidth - e.clientX) - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y,
                };
                setPosition(newPos);
                localStorage.setItem(`panel_pos_${id}`, JSON.stringify(newPos));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, id, anchor]);

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem(`panel_collapsed_${id}`, JSON.stringify(newState));
    };

    const dynamicStyle: React.CSSProperties = {
        top: `${position.y}px`,
        width: isCollapsed ? '150px' : defaultSize.width,
        height: isCollapsed ? 'auto' : defaultSize.height,
        resize: isCollapsed ? 'none' : 'both',
        overflow: 'hidden',
        minWidth: '150px',
        minHeight: '32px',
    };

    if (anchor === 'left') {
        dynamicStyle.left = `${position.x}px`;
    } else {
        dynamicStyle.right = `${position.x}px`;
    }

    return (
        <div
            ref={panelRef}
            className={`absolute z-[1001] flex flex-col glass-card border-white/20 select-none transition-shadow duration-300 ${isDragging ? 'shadow-2xl ring-2 ring-blue-500/30' : ''
                } ${className}`}
            style={dynamicStyle}
            onMouseDown={handleMouseDown}
        >
            {/* Header / Drag Handle */}
            <div className="drag-handle flex items-center justify-between p-1.5 border-b border-white/5 bg-white/5 cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-1.5 overflow-hidden pointer-events-none">
                    <div className="p-1 glass-item rounded text-blue-400 opacity-90">
                        {icon}
                    </div>
                    <h3 className="text-[9px] font-black text-white uppercase tracking-tighter truncate">
                        {title}
                    </h3>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleCollapse();
                        }}
                        className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white"
                    >
                        {isCollapsed ? <Plus size={10} /> : <Minus size={10} />}
                    </button>
                    <div className="p-1 text-white/30 hover:text-white/60 transition-colors pointer-events-none">
                        <GripVertical size={10} />
                    </div>
                </div>
            </div>

            {/* Content 영역 */}
            {!isCollapsed && (
                <div className="p-2 overflow-auto custom-scrollbar flex-1 pointer-events-auto">
                    {children}
                </div>
            )}
        </div>
    );
};

export default FloatingPanel;
