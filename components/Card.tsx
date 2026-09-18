
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, title, className = '', footer }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-gray-900 font-semibold text-base">{title}</h3>
        </div>
      )}
      <div className="flex-grow flex flex-col overflow-hidden">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-auto shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
};
