import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const MIN_SIDEBAR_WIDTH = 64; // Collapsed (icon-only)
const DEFAULT_SIDEBAR_WIDTH = 256;
const MAX_SIDEBAR_WIDTH = 480;

const DashboardLayout: React.FC = () => {
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar_collapsed');
        return saved === 'true';
    });

    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem('sidebar_width');
        return saved ? parseInt(saved, 10) : DEFAULT_SIDEBAR_WIDTH;
    });

    const isResizing = useRef(false);

    useEffect(() => {
        localStorage.setItem('sidebar_collapsed', String(isCollapsed));
    }, [isCollapsed]);

    useEffect(() => {
        localStorage.setItem('sidebar_width', String(sidebarWidth));
    }, [sidebarWidth]);

    const startResizing = useCallback(() => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current) return;

        let newWidth = e.clientX;
        if (newWidth < 160) {
            newWidth = MIN_SIDEBAR_WIDTH;
            setIsCollapsed(true);
        } else {
            setIsCollapsed(false);
            if (newWidth > MAX_SIDEBAR_WIDTH) newWidth = MAX_SIDEBAR_WIDTH;
            setSidebarWidth(newWidth);
        }
    }, []);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
        if (isCollapsed && sidebarWidth === MIN_SIDEBAR_WIDTH) {
            setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
        }
    };

    const currentWidth = isCollapsed ? MIN_SIDEBAR_WIDTH : sidebarWidth;

    return (
        <div className="min-h-screen bg-dashboard-bg flex overflow-hidden">
            {/* Sidebar */}
            <div
                style={{ width: currentWidth }}
                className="transition-all duration-300 ease-in-out flex-shrink-0 relative z-50 h-screen"
            >
                <Sidebar
                    width={currentWidth}
                    isCollapsed={isCollapsed}
                    onToggleCollapse={toggleCollapse}
                />

                {/* Resize Handle */}
                {!isCollapsed && (
                    <div
                        onMouseDown={startResizing}
                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/50 transition-colors group z-50"
                    >
                        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-4 h-8 bg-white/10 group-hover:bg-blue-500/50 rounded-l flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-[1px] h-3 bg-white/40" />
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <main
                className="flex-1 overflow-y-auto h-screen relative"
            >
                <Outlet />
            </main>
        </div>
    );
};

export default DashboardLayout;
