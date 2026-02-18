import React from 'react';

const PageHeader = ({ title, subtitle, actions }) => {
    return (
        <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">{title}</h1>
                    {subtitle && (
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1 font-medium">{subtitle}</p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
                )}
            </div>
        </div>
    );
};

export default PageHeader;
