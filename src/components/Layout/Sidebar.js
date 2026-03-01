import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ user, show, onHide, onLogout, theme, toggleTheme }) => {
    const location = useLocation();
    const isActive = (path) => location.pathname === path;

    const NavLink = ({ to, icon, label }) => {
        const active = isActive(to);
        return (
            <Link
                to={to}
                onClick={onHide}
                className={`relative flex items-center gap-3.5 px-4 py-3 mx-3 mb-1 rounded-2xl text-sm font-semibold transition-all duration-200
                    ${active
                        ? 'bg-primary-500 text-white shadow-primary'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                style={active ? { boxShadow: '0 4px 16px rgba(55,114,255,0.4)' } : {}}
            >
                <i className={`bi ${icon} text-lg flex-shrink-0`}></i>
                <span>{label}</span>
                {active && (
                    <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white/60"></span>
                )}
            </Link>
        );
    };

    const adminLinks = [
        { to: '/', icon: 'bi-grid-1x2-fill', label: 'Dashboard' },
        { to: '/schedule', icon: 'bi-calendar-week', label: 'Schedule' },
        { to: '/attendance', icon: 'bi-calendar-check-fill', label: 'Attendance' },
        { to: '/log', icon: 'bi-clock-history', label: 'History Log' },
        { to: '/teams', icon: 'bi-people-fill', label: 'Teams' },
        { to: '/members', icon: 'bi-person-lines-fill', label: 'Members' },
        { to: '/statistics', icon: 'bi-bar-chart-fill', label: 'Reports' },
        { to: '/how-to-use', icon: 'bi-question-circle-fill', label: 'How To Use' },
    ];

    const memberLinks = [
        { to: '/', icon: 'bi-grid-1x2-fill', label: 'Dashboard' },
        { to: '/schedule', icon: 'bi-calendar-week', label: 'Schedule' },
        { to: '/my-stats', icon: 'bi-speedometer2', label: 'My Stats' },
        { to: '/log', icon: 'bi-clock-history', label: 'History' },
        { to: '/teams', icon: 'bi-people-fill', label: 'Teams' },
        { to: '/members', icon: 'bi-person-lines-fill', label: 'Members' },
        { to: '/profile', icon: 'bi-person-circle', label: 'Profile' },
        { to: '/how-to-use', icon: 'bi-question-circle-fill', label: 'How To Use' },
    ];

    const links = user.role === 'admin' ? adminLinks : memberLinks;

    return (
        <>
            {/* Backdrop */}
            {show && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
                    onClick={onHide}
                />
            )}

            {/* Sidebar — always dark navy */}
            <aside
                className={`fixed top-0 left-0 h-screen w-[260px] z-50
                    flex flex-col transition-transform duration-300 ease-in-out
                    lg:translate-x-0
                    ${show ? 'translate-x-0' : '-translate-x-full'}`}
                style={{ background: '#141416' }}
            >
                {/* Logo */}
                <div className="h-[70px] flex items-center px-6 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center" style={{ boxShadow: '0 4px 12px rgba(55,114,255,0.5)' }}>
                            <i className="bi bi-music-note-beamed text-white text-sm"></i>
                        </div>
                        <span className="text-lg font-bold text-white tracking-tight font-heading">FTC Portal</span>
                    </div>
                </div>

                {/* Section label */}
                <div className="px-6 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Menu</span>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto pb-4">
                    {links.map(link => (
                        <NavLink key={link.to} {...link} />
                    ))}
                </nav>

                {/* Divider */}
                <div className="mx-6 border-t border-white/5 flex-shrink-0"></div>

                {/* Footer */}
                <div className="p-4 flex-shrink-0 space-y-3">
                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-all duration-200"
                    >
                        <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-amber-400' : 'bi-moon-fill text-indigo-400'} text-base`}></i>
                        <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </button>

                    {/* User card */}
                    <div className="flex items-center gap-3 px-2 py-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {user.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <div className="font-semibold text-sm text-white truncate">{user.name}</div>
                            <div className="text-xs text-slate-500 capitalize">{user.role}</div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 flex-shrink-0"
                            title="Log out"
                        >
                            <i className="bi bi-box-arrow-right text-base"></i>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
