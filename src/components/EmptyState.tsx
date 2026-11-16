import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className = '',
}) => {
  return (
    <div
      className={`card-base p-10 text-center flex flex-col items-center justify-center max-w-lg mx-auto my-6 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#EAEFF5] text-navy flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-navy mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-muted mb-4 max-w-sm">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded text-white bg-orange hover:bg-orange-hover transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
