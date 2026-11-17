import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string; // 4 words or less
  subtitle?: string; // 10 words or less
  helperText?: string;
  icon?: React.ElementType;
  showBack?: boolean;
  backTo?: string;
  badgeText?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  helperText,
  icon: Icon,
  showBack = false,
  backTo,
  badgeText,
  action,
}) => {
  const navigate = useNavigate();
  const desc = helperText || subtitle;

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="page-header-strip mb-5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer mr-1"
            title="Back to previous screen"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}

        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-xs">
            <Icon className="w-5 h-5 stroke-[2.5]" />
          </div>
        )}

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-black text-white leading-tight font-heading">
              {title}
            </h1>
            {badgeText && (
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white backdrop-blur-xs border border-white/20">
                {badgeText}
              </span>
            )}
          </div>
          {desc && (
            <p className="text-xs text-white/90 font-medium mt-0.5 max-w-xl">
              {desc}
            </p>
          )}
        </div>
      </div>

      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
};
