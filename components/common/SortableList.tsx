import React from 'react';
import {
    useSortable,
    SortableContext,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

export interface SortableItemData {
    id: string;
    [key: string]: any;
}

interface SortableListProps<T extends SortableItemData> {
    items: T[];
    onReorder: (activeId: string, overId: string) => void;
    renderItem: (item: T, isDragging: boolean) => React.ReactNode;
    direction?: 'vertical' | 'horizontal';
    className?: string;
}

/**
 * Generic sortable list component
 * Handles drag-and-drop reordering with accessibility
 */
export function SortableList<T extends SortableItemData>({
    items,
    onReorder,
    renderItem,
    direction = 'vertical',
    className,
}: SortableListProps<T>) {
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over || active.id === over.id) return;

        onReorder(active.id as string, over.id as string);
    };

    const strategy = direction === 'vertical'
        ? verticalListSortingStrategy
        : horizontalListSortingStrategy;

    return (
        <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={items.map(item => item.id)} strategy={strategy}>
                <div className={cn(
                    direction === 'vertical' ? 'flex flex-col gap-2' : 'flex flex-row gap-2',
                    className
                )}>
                    {items.map(item => (
                        <SortableItemWrapper
                            key={item.id}
                            id={item.id}
                            isDragging={activeId === item.id}
                        >
                            {renderItem(item, activeId === item.id)}
                        </SortableItemWrapper>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}

interface SortableItemWrapperProps {
    id: string;
    children: React.ReactNode;
    isDragging: boolean;
}

/**
 * Individual sortable item wrapper
 */
function SortableItemWrapper({ id, children, isDragging }: SortableItemWrapperProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isCurrentlyDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isCurrentlyDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                'touch-none',
                isCurrentlyDragging && 'z-50 cursor-grabbing scale-105 shadow-lg',
                !isCurrentlyDragging && 'cursor-grab'
            )}
        >
            {children}
        </div>
    );
}

export default SortableList;
