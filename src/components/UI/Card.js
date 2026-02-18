import React from 'react';

const Card = ({ children, className = '', title, headerAction, ...props }) => {
    if (title) {
        return (
            <div className={`nock-card ${className}`} {...props}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-700/40">
                    <h3 className="font-bold text-base text-slate-800 dark:text-white">{title}</h3>
                    {headerAction && <div>{headerAction}</div>}
                </div>
                <div className="p-6">{children}</div>
            </div>
        );
    }

    return (
        <div className={`nock-card ${className}`} {...props}>
            {children}
        </div>
    );
};

Card.Header = ({ children, className = '', ...props }) => (
    <div className={`px-6 py-5 border-b border-slate-100 dark:border-slate-700/40 ${className}`} {...props}>
        {children}
    </div>
);

Card.Body = ({ children, className = '', ...props }) => (
    <div className={`p-6 ${className}`} {...props}>
        {children}
    </div>
);

Card.Footer = ({ children, className = '', ...props }) => (
    <div className={`px-6 py-4 border-t border-slate-100 dark:border-slate-700/40 ${className}`} {...props}>
        {children}
    </div>
);

export default Card;
