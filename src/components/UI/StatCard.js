import React from 'react';

const colorMap = {
    primary: {
        bg: 'bg-primary-500',
        iconBg: 'bg-primary-50 dark:bg-primary-500/10',
        icon: 'text-primary-500',
        glow: 'rgba(55,114,255,0.15)',
    },
    success: {
        bg: 'bg-[#45B36B]',
        iconBg: 'bg-green-50 dark:bg-green-500/10',
        icon: 'text-[#45B36B]',
        glow: 'rgba(69,179,107,0.15)',
    },
    danger: {
        bg: 'bg-[#EF466F]',
        iconBg: 'bg-red-50 dark:bg-red-500/10',
        icon: 'text-[#EF466F]',
        glow: 'rgba(239,70,111,0.15)',
    },
    warning: {
        bg: 'bg-amber-500',
        iconBg: 'bg-amber-50 dark:bg-amber-500/10',
        icon: 'text-amber-500',
        glow: 'rgba(245,158,11,0.15)',
    },
    info: {
        bg: 'bg-sky-500',
        iconBg: 'bg-sky-50 dark:bg-sky-500/10',
        icon: 'text-sky-500',
        glow: 'rgba(14,165,233,0.15)',
    },
};

const StatCard = ({ title, value, icon, subtext, color = 'primary' }) => {
    const c = colorMap[color] || colorMap.primary;

    return (
        <div className="nock-card p-3 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 cursor-default">
            <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                <div className="min-w-0 flex-1">
                    <div className="text-[9px] sm:text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 leading-tight">{title}</div>
                    <div className="text-xl sm:text-3xl font-extrabold text-slate-800 dark:text-white leading-none whitespace-nowrap">{value}</div>
                    {subtext && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{subtext}</div>}
                </div>
                <div
                    className={`${c.iconBg} p-2 sm:p-3 rounded-xl sm:rounded-2xl flex-shrink-0 flex items-center justify-center mt-0.5`}
                    style={{ boxShadow: `0 4px 12px ${c.glow}` }}
                >
                    <i className={`bi ${icon} text-base sm:text-xl ${c.icon}`}></i>
                </div>
            </div>
        </div>
    );
};



export default StatCard;
