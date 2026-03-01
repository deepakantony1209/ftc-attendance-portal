import React, { useState } from 'react';
import PageHeader from './Layout/PageHeader';
import Card from './UI/Card';
import { pointValues, statusMultipliers } from './ScoreLogic';

// ─── Collapsible section component ──────────────────────────────────────────
function Collapsible({ title, icon, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="nock-card overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                        <i className={`bi ${icon} text-primary-500 dark:text-primary-400`}></i>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white text-sm sm:text-base">{title}</span>
                </div>
                <i className={`bi bi-chevron-${open ? 'up' : 'down'} text-slate-400 text-xs transition-transform duration-200`}></i>
            </button>
            {open && (
                <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-slate-100 dark:border-slate-700/50 animate-fade-in-down">
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── Step item ──────────────────────────────────────────────────────────────
function Step({ number, title, description, icon }) {
    return (
        <div className="flex gap-4 items-start">
            <div className="w-10 h-10 rounded-2xl bg-primary-500 text-white flex items-center justify-center font-extrabold text-sm flex-shrink-0 shadow-md" style={{ boxShadow: '0 4px 12px rgba(55,114,255,0.3)' }}>
                {number}
            </div>
            <div className="pt-1">
                <div className="flex items-center gap-2 mb-1">
                    {icon && <i className={`bi ${icon} text-primary-400 text-sm`}></i>}
                    <h4 className="font-bold text-slate-800 dark:text-white text-base font-heading">{title}</h4>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

// ─── Info callout ───────────────────────────────────────────────────────────
function Callout({ type = 'info', children }) {
    const styles = {
        info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
        tip: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
        warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300',
    };
    const icons = { info: 'bi-info-circle-fill', tip: 'bi-lightbulb-fill', warning: 'bi-exclamation-triangle-fill' };
    return (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border ${styles[type]} text-sm leading-relaxed`}>
            <i className={`bi ${icons[type]} flex-shrink-0 mt-0.5`}></i>
            <div>{children}</div>
        </div>
    );
}

// ─── Main component ─────────────────────────────────────────────────────────
function HowToUse({ user }) {
    const isAdmin = user?.role === 'admin';

    // Build point values table dynamically from ScoreLogic
    const pointEntries = Object.entries(pointValues).sort((a, b) => b[1] - a[1]);

    return (
        <div>
            <PageHeader
                title="How To Use"
                subtitle="Learn how the app works, step by step."
            />

            {/* ─── QUICK OVERVIEW ─── */}
            <Card className="mb-6 overflow-hidden">
                <div className="p-5 sm:p-6 bg-gradient-to-br from-primary-500 to-indigo-600 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <i className="bi bi-music-note-beamed text-xl opacity-80"></i>
                            <span className="text-xs font-bold uppercase tracking-widest opacity-70">FTC Choir Attendance Portal</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold mb-2">Welcome to the Portal!</h2>
                        <p className="text-sm opacity-90 leading-relaxed max-w-lg">
                            This app helps track choir attendance, manage teams, schedule events, and calculate
                            attendance credits for every member. {isAdmin ? 'As an admin, you have full control over all features.' : 'Here\'s how to get the most out of it.'}
                        </p>
                    </div>
                </div>
            </Card>

            {/* ─── SECTIONS ─── */}
            <div className="space-y-3">

                {/* ─── GETTING STARTED ─── */}
                <Collapsible title="Getting Started" icon="bi-rocket-takeoff-fill" defaultOpen={true}>
                    <div className="space-y-5 mt-3">
                        <Step
                            number={1}
                            icon="bi-box-arrow-in-right"
                            title="Log In"
                            description="Use the email and password provided by your choir admin. If you forget your password, use the 'Forgot Password' link on the login page."
                        />
                        <Step
                            number={2}
                            icon="bi-grid-1x2-fill"
                            title="Check Your Dashboard"
                            description="The Dashboard shows a quick overview: upcoming events, your attendance percentage, and recent records. It's your home base."
                        />
                        <Step
                            number={3}
                            icon="bi-calendar-week"
                            title="View the Schedule"
                            description="The Schedule tab shows all upcoming masses, practices, and events. Tap any date to see what's planned. On mobile, events appear right below the calendar."
                        />
                        {isAdmin && (
                            <Step
                                number={4}
                                icon="bi-calendar-check-fill"
                                title="Mark Attendance"
                                description="Go to the Attendance tab, select a date, event type, and team. Then mark each member as Present, Absent, Excused, or Excused but Present."
                            />
                        )}
                    </div>
                </Collapsible>

                {/* ─── KEY FEATURES ─── */}
                <Collapsible title="Key Features" icon="bi-star-fill">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                        {[
                            { icon: 'bi-grid-1x2-fill', title: 'Dashboard', desc: 'Overview of attendance stats, upcoming events, and quick actions.' },
                            { icon: 'bi-calendar-week', title: 'Schedule', desc: 'View and manage all masses, practices, and special events on a calendar.' },
                            { icon: 'bi-clock-history', title: 'History Log', desc: 'Full log of all past attendance records. Admins can edit or delete entries.' },
                            { icon: 'bi-bar-chart-fill', title: isAdmin ? 'Member Reports' : 'My Stats', desc: isAdmin ? 'Detailed attendance reports for every member with PDF downloads.' : 'Your personal attendance breakdown, credits, and attendance calendar.' },
                            { icon: 'bi-people-fill', title: 'Teams', desc: 'View team rosters. Sunday mass and marriage mass teams are managed separately.' },
                            { icon: 'bi-person-lines-fill', title: 'Members', desc: 'View the full member directory.' + (isAdmin ? ' Admins can add, edit, or remove members.' : '') },
                        ].map((f, i) => (
                            <div key={i} className="nock-card p-4 flex gap-3 items-start">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                    <i className={`bi ${f.icon} text-slate-500 dark:text-slate-400`}></i>
                                </div>
                                <div>
                                    <div className="font-bold text-sm text-slate-800 dark:text-white mb-0.5">{f.title}</div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Collapsible>

                {/* ─── ATTENDANCE STATUSES ─── */}
                <Collapsible title="Attendance Statuses Explained" icon="bi-check-circle-fill">
                    <div className="space-y-3 mt-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Each member can be marked with one of these statuses for any event:
                        </p>
                        <div className="space-y-2">
                            {[
                                { status: 'Present', color: 'emerald', icon: 'bi-check-lg', desc: 'The member attended the event. Full credit awarded.' },
                                { status: 'Absent', color: 'red', icon: 'bi-x-lg', desc: 'The member did not attend. No credit awarded.' },
                                { status: 'Excused', color: 'amber', icon: 'bi-envelope-fill', desc: 'The member informed in advance and was excused. Partial credit (20%) is given, up to 2 excuses per month.' },
                                { status: 'Excused but Present', color: 'sky', icon: 'bi-hand-thumbs-up-fill', desc: 'The member was excused but still showed up. Partial credit (40%) is given — a bonus for going above and beyond!' },
                                { status: 'Not Applicable', color: 'slate', icon: 'bi-dash-lg', desc: 'This event doesn\'t apply to this member. It\'s completely excluded from their percentage.' },
                            ].map((s, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <span className={`w-8 h-8 rounded-lg bg-${s.color}-100 dark:bg-${s.color}-900/30 flex items-center justify-center flex-shrink-0`}>
                                        <i className={`bi ${s.icon} text-${s.color}-500 text-sm`}></i>
                                    </span>
                                    <div>
                                        <span className={`text-xs font-bold uppercase tracking-wider text-${s.color}-600 dark:text-${s.color}-400`}>{s.status}</span>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Collapsible>

                {/* ─── HOW CALCULATIONS WORK ─── */}
                <Collapsible title="How Credits & Percentage Work" icon="bi-calculator-fill">
                    <div className="space-y-5 mt-3">

                        {/* Plain English explanation */}
                        <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-2">
                                <i className="bi bi-chat-quote-fill text-primary-400 mr-2"></i>
                                In Simple Words
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                Every event type is worth a certain number of <strong className="text-slate-700 dark:text-white">credits</strong>.
                                When you attend, you earn those credits. Your <strong className="text-slate-700 dark:text-white">attendance percentage</strong> is
                                simply: <em>credits you earned ÷ credits you could have earned × 100</em>.
                            </p>
                        </div>

                        {/* Credit values table */}
                        <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-2">
                                <i className="bi bi-trophy-fill text-amber-400 mr-2"></i>
                                Credit Values by Event Type
                            </h4>
                            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800">
                                            <th className="text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Event Type</th>
                                            <th className="text-right px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-400">Credits</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {pointEntries.map(([name, pts]) => (
                                            <tr key={name} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-300">{name}</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-primary-600 dark:text-primary-400">{pts}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-slate-400 mt-2 italic">
                                <i className="bi bi-info-circle mr-1"></i>
                                Daily mass is not part of the credit system.
                            </p>
                        </div>

                        {/* Status multipliers */}
                        <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-2">
                                <i className="bi bi-sliders text-indigo-400 mr-2"></i>
                                How Status Affects Credits
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {Object.entries(statusMultipliers).map(([status, multiplier]) => (
                                    <div key={status} className="nock-card p-3 text-center">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{status}</div>
                                        <div className={`text-xl font-extrabold ${multiplier >= 1 ? 'text-emerald-500' : multiplier > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                                            {(multiplier * 100).toFixed(0)}%
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Real example */}
                        <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-2">
                                <i className="bi bi-lightbulb-fill text-amber-400 mr-2"></i>
                                Example Calculation
                            </h4>
                            <div className="nock-card p-4 space-y-3">
                                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                                    Let's say John attended 3 events this month:
                                </p>
                                <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                                    <table className="w-full text-xs sm:text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-800">
                                                <th className="text-left px-3 py-2 text-[10px] font-bold uppercase text-slate-400">Event</th>
                                                <th className="text-center px-3 py-2 text-[10px] font-bold uppercase text-slate-400">Status</th>
                                                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase text-slate-400">Max</th>
                                                <th className="text-right px-3 py-2 text-[10px] font-bold uppercase text-slate-400">Earned</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                            <tr>
                                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Sunday Mass</td>
                                                <td className="px-3 py-2 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Present</span></td>
                                                <td className="px-3 py-2 text-right text-slate-500">30</td>
                                                <td className="px-3 py-2 text-right font-bold text-emerald-600">30.0</td>
                                            </tr>
                                            <tr>
                                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Saturday Practice</td>
                                                <td className="px-3 py-2 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Excused</span></td>
                                                <td className="px-3 py-2 text-right text-slate-500">25</td>
                                                <td className="px-3 py-2 text-right font-bold text-amber-600">5.0</td>
                                            </tr>
                                            <tr>
                                                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">Special Mass</td>
                                                <td className="px-3 py-2 text-center"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Absent</span></td>
                                                <td className="px-3 py-2 text-right text-slate-500">50</td>
                                                <td className="px-3 py-2 text-right font-bold text-red-500">0.0</td>
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-50 dark:bg-slate-800 font-bold">
                                                <td colSpan="2" className="px-3 py-2.5 text-slate-700 dark:text-white">Total</td>
                                                <td className="px-3 py-2.5 text-right text-slate-700 dark:text-white">105</td>
                                                <td className="px-3 py-2.5 text-right text-primary-600 dark:text-primary-400">35.0</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
                                    <i className="bi bi-arrow-right-circle-fill text-primary-500"></i>
                                    <span className="text-sm font-bold text-primary-700 dark:text-primary-300">
                                        Attendance % = 35.0 ÷ 105 × 100 = <span className="text-lg">33.3%</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Collapsible>

                {/* ─── TEAM SCHEDULING RULES ─── */}
                <Collapsible title="Team Scheduling Rules" icon="bi-people-fill">
                    <div className="space-y-4 mt-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            For <strong className="text-slate-700 dark:text-white">Sunday Evening Mass</strong> and <strong className="text-slate-700 dark:text-white">Marriage Mass</strong>,
                            the app knows which team is scheduled. This affects how attendance is counted:
                        </p>

                        <div className="space-y-2">
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/30">
                                <i className="bi bi-check-circle-fill text-blue-500 mt-0.5 flex-shrink-0"></i>
                                <div>
                                    <div className="font-bold text-sm text-slate-800 dark:text-white">Your Team's Turn</div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">It's mandatory — counts toward your percentage whether you attend or not.</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-800/30">
                                <i className="bi bi-gift-fill text-emerald-500 mt-0.5 flex-shrink-0"></i>
                                <div>
                                    <div className="font-bold text-sm text-slate-800 dark:text-white">Not Your Team's Turn</div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">It's optional — if you attend, you get <strong>bonus credits</strong>. If you don't, nothing happens (no penalty).</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/15 border border-purple-100 dark:border-purple-800/30">
                                <i className="bi bi-globe text-purple-500 mt-0.5 flex-shrink-0"></i>
                                <div>
                                    <div className="font-bold text-sm text-slate-800 dark:text-white">"Whole Choir" Events</div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">When an event is assigned to "Whole Choir", it's mandatory for everyone — same as your team's turn.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Collapsible>

                {/* ─── EXCUSE LIMIT ─── */}
                <Collapsible title="Excuse Limits" icon="bi-shield-exclamation">
                    <div className="space-y-3 mt-3">
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            You can be excused up to <strong className="text-slate-700 dark:text-white">2 times per month</strong> and still receive partial credit (20%).
                        </p>
                        <Callout type="warning">
                            <strong>After the 2nd excuse in a month</strong>, any additional excuses are treated as <strong>Absent</strong> (0 credits).
                            So use your excuses wisely!
                        </Callout>
                        <Callout type="info">
                            You get <strong>24 excuses per year</strong> total (2 per month × 12 months). The remaining count is shown on your stats page.
                        </Callout>
                    </div>
                </Collapsible>

                {/* ─── TIPS ─── */}
                <Collapsible title="Tips & Good to Know" icon="bi-lightbulb-fill">
                    <div className="space-y-3 mt-3">
                        <Callout type="tip">
                            <strong>Attendance over 80%?</strong> You're in the <span className="text-emerald-600 dark:text-emerald-400 font-bold">green zone</span>.
                            Between 60–80% is <span className="text-amber-600 dark:text-amber-400 font-bold">amber</span>.
                            Below 60% is <span className="text-red-600 dark:text-red-400 font-bold">red</span>.
                        </Callout>
                        <Callout type="tip">
                            <strong>Download PDF reports</strong> anytime from the {isAdmin ? 'Member Reports' : 'My Stats'} page — yearly, monthly, or absence-specific reports.
                        </Callout>
                        <Callout type="info">
                            <strong>Daily Mass</strong> attendance is recorded but does <strong>not</strong> count toward your credit percentage. It's tracked separately for reference.
                        </Callout>
                        {isAdmin && (
                            <Callout type="info">
                                <strong>Auto-Generated Schedules:</strong> The system auto-generates Sunday mass schedules by rotating teams. You can still manually edit or add events.
                            </Callout>
                        )}
                    </div>
                </Collapsible>

                {/* ─── ADMIN GUIDE ─── */}
                {isAdmin && (
                    <Collapsible title="Admin Guide" icon="bi-shield-lock-fill">
                        <div className="space-y-5 mt-3">
                            <Step
                                number={1}
                                icon="bi-calendar-check-fill"
                                title="Recording Attendance"
                                description="Go to Attendance → pick date, event type, and team → mark each member → click Save. For Sunday/Marriage mass, select the scheduled team so the system knows who was expected."
                            />
                            <Step
                                number={2}
                                icon="bi-calendar-week"
                                title="Managing the Schedule"
                                description="Use 'Auto-Generate' to create Sunday schedules automatically. Use '+ Add Event' to manually schedule practices, special masses, or other events."
                            />
                            <Step
                                number={3}
                                icon="bi-pencil-square"
                                title="Editing Records"
                                description="In the History Log, click on any record to expand it. Use the Edit button to modify attendance or the Delete button to remove it entirely."
                            />
                            <Step
                                number={4}
                                icon="bi-people-fill"
                                title="Managing Teams"
                                description="Create Sunday teams (for rotation) and Marriage teams (for wedding masses). Drag and drop or use the interface to assign members to teams."
                            />
                            <Step
                                number={5}
                                icon="bi-download"
                                title="Downloading Reports"
                                description="In Member Reports, expand any member and click Download for yearly or monthly PDF reports. These include detailed event logs with color-coded statuses."
                            />
                        </div>
                    </Collapsible>
                )}
            </div>

            {/* ─── FOOTER ─── */}
            <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-600 pb-4">
                <p>FTC Choir Attendance Portal • Built with ❤️ for the choir</p>
            </div>
        </div>
    );
}

export default HowToUse;
