import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MaterialSymbol } from 'react-material-symbols';

export default function DashboardWidget({ id, title, children, dragHandleProps }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: 'relative',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card group relative"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-3 p-5 pb-0 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-2 text-on-surface-subtle opacity-0 group-hover:opacity-100 transition-opacity">
          <MaterialSymbol icon="drag_indicator" size={18} />
        </div>
        <h4 className="font-black text-lg text-brand-primary flex-1">{title}</h4>
        {dragHandleProps}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}
