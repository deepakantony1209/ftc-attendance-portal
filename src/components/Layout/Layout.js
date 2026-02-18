import React, { useState } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ user, children, onLogout, theme, toggleTheme }) => {
    const [showSidebar, setShowSidebar] = useState(false);

    return (
        <div className="min-h-screen">
            {/* Mobile Header — always dark navy to match sidebar */}
            <div
                className="mobile-header lg:hidden fixed top-0 left-0 right-0 h-[60px] z-30 flex items-center justify-between px-4 border-b border-white/5"
                style={{ background: '#141416' }}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSidebar(true)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-white/10 transition-colors"
                    >
                        <i className="bi bi-list text-2xl"></i>
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-primary-500 flex items-center justify-center">
                            <i className="bi bi-music-note-beamed text-white text-xs"></i>
                        </div>
                        <span className="font-bold text-white text-sm">FTC Portal</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-lg text-slate-400 hover:bg-white/10 transition-colors"
                    >
                        <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-amber-400' : 'bi-moon-fill text-indigo-400'}`}></i>
                    </button>
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-bold text-sm">
                        {user.name.charAt(0)}
                    </div>
                </div>
            </div>

            <Sidebar
                user={user}
                show={showSidebar}
                onHide={() => setShowSidebar(false)}
                onLogout={onLogout}
                theme={theme}
                toggleTheme={toggleTheme}
            />

            {/* Main Content */}
            <main className="mobile-content-offset lg:ml-[260px] lg:pt-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-h-screen">
                {children}
            </main>
        </div>
    );
};

export default Layout;
