import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ResizablePanelProps {
    /** Initial width in pixels */
    initialWidth?: number;
    /** Minimum panel width in pixels */
    minWidth?: number;
    /** Maximum panel width in pixels */
    maxWidth?: number;
    /** Panel content */
    children: React.ReactNode;
    /** Additional CSS classes for the panel wrapper */
    className?: string;
    /** Whether the handle is on the right side (default) or left */
    handleSide?: 'right' | 'left';
    /** aria-label for the resize handle */
    handleLabel?: string;
    /** Called after the user finishes a resize interaction */
    onResize?: (newWidth: number) => void;
}

/**
 * ResizablePanel — a drag-to-resize horizontal panel.
 *
 * Renders its children inside a container whose width can be changed by
 * dragging a 1 px-wide handle on the right (or left) edge.  Obeys
 * `minWidth` / `maxWidth` constraints and exposes an `onResize` callback.
 * Uses pointer events so it works on both desktop and tablet.
 */
const ResizablePanel: React.FC<ResizablePanelProps> = ({
    initialWidth = 320,
    minWidth = 200,
    maxWidth = 800,
    children,
    className = '',
    handleSide = 'right',
    handleLabel = 'Drag to resize panel',
    onResize,
}) => {
    const [width, setWidth] = useState(initialWidth);
    const [isDragging, setIsDragging] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);

    const handlePointerDown = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            setIsDragging(true);
            dragStartX.current = e.clientX;
            dragStartWidth.current = width;
        },
        [width],
    );

    const handlePointerMove = useCallback(
        (e: PointerEvent) => {
            if (!isDragging) return;
            const delta =
                handleSide === 'right'
                    ? e.clientX - dragStartX.current
                    : dragStartX.current - e.clientX;
            const newWidth = Math.min(
                maxWidth,
                Math.max(minWidth, dragStartWidth.current + delta),
            );
            setWidth(newWidth);
        },
        [isDragging, handleSide, minWidth, maxWidth],
    );

    const handlePointerUp = useCallback(
        (e: PointerEvent) => {
            if (!isDragging) return;
            setIsDragging(false);
            const delta =
                handleSide === 'right'
                    ? e.clientX - dragStartX.current
                    : dragStartX.current - e.clientX;
            const finalWidth = Math.min(
                maxWidth,
                Math.max(minWidth, dragStartWidth.current + delta),
            );
            onResize?.(finalWidth);
        },
        [isDragging, handleSide, minWidth, maxWidth, onResize],
    );

    useEffect(() => {
        if (!isDragging) return;
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [isDragging, handlePointerMove, handlePointerUp]);

    const handle = (
        <div
            role="separator"
            aria-label={handleLabel}
            aria-orientation="vertical"
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onKeyDown={(e) => {
                const step = e.shiftKey ? 50 : 10;
                if (e.key === 'ArrowRight') setWidth((w) => Math.min(maxWidth, w + step));
                if (e.key === 'ArrowLeft') setWidth((w) => Math.max(minWidth, w - step));
            }}
            className={`resize-handle ${isDragging ? 'dragging' : ''} ${
                handleSide === 'right' ? 'right-0' : 'left-0'
            }`}
            style={{
                right: handleSide === 'right' ? 0 : 'unset',
                left: handleSide === 'left' ? 0 : 'unset',
            }}
        />
    );

    return (
        <div
            ref={panelRef}
            className={`relative flex-shrink-0 ${className}`}
            style={{ width }}
        >
            {handleSide === 'left' && handle}
            <div className="w-full h-full overflow-hidden">{children}</div>
            {handleSide === 'right' && handle}
        </div>
    );
};

export default ResizablePanel;
