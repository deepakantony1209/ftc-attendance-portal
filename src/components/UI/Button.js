import React from 'react';

const variants = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:hover:bg-slate-700 dark:text-slate-200',
    danger: 'bg-[#EF466F] hover:bg-[#d93360] text-white',
    success: 'bg-[#45B36B] hover:bg-[#35a05a] text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-900/20',
    'outline-danger': 'border-2 border-[#EF466F] text-[#EF466F] hover:bg-red-50 dark:hover:bg-red-900/20',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/50',
    link: 'text-primary-500 hover:text-primary-600 underline-offset-2 hover:underline dark:text-primary-400 p-0',
};

const shadows = {
    primary: '0 4px 16px rgba(55,114,255,0.35)',
    danger: '0 4px 16px rgba(239,70,111,0.35)',
    success: '0 4px 16px rgba(69,179,107,0.35)',
    warning: '0 4px 16px rgba(245,158,11,0.35)',
};

const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
};

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    className = '',
    disabled,
    type = 'button',
    onClick,
    ...props
}) => {
    const shadow = shadows[variant] || '';
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            style={shadow && !disabled ? { boxShadow: shadow } : {}}
            className={`
        inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-200 cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:ring-offset-2
        dark:focus:ring-offset-navy-900
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        active:scale-[0.98]
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${className}
      `}
            {...props}
        >
            {icon && <i className={`bi ${icon}`}></i>}
            {children}
        </button>
    );
};

export default Button;
