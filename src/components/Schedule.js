import React, { useState, useMemo, useCallback } from 'react';
import PageHeader from './Layout/PageHeader';
import Card from './UI/Card';
import Button from './UI/Button';

// ─── HELPERS ───
const isoDate = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatTimeAMPM = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
};

const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
};

const getWeekDays = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const days = [];
    for (let i = 0; i < 7; i++) {
        const dd = new Date(start);
        dd.setDate(start.getDate() + i);
        days.push(dd);
    }
    return days;
};

const HOURS = Array.from({ length: 17 }, (_, i) => i + 5); // 5 AM to 9 PM
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function Schedule({
    user, teams, sundaySchedule = [], eventSchedules = [], attendanceHistory = [], choirMembersList = [],
    onGenerateSunday, onUpdateSunday, onAddEvent, onEditEvent, onDeleteEvent, onMarkAttendance,
    isLoading
}) {
    const isAdmin = user?.role === 'admin';
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const today = useMemo(() => new Date(), []);

    // View Mode
    const [viewMode, setViewMode] = useState('month'); // 'week', 'month', 'year'

    // Calendar State
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewWeekStart, setViewWeekStart] = useState(() => {
        const d = new Date(today);
        d.setDate(d.getDate() - d.getDay());
        return d;
    });
    const [selectedDate, setSelectedDate] = useState(today);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEventDetails, setShowEventDetails] = useState(null);
    const [showMobileDetails, setShowMobileDetails] = useState(false);

    // Add/Edit Form State
    const [editingEventId, setEditingEventId] = useState(null);
    const [formDate, setFormDate] = useState('');
    const [formTime, setFormTime] = useState('');
    const [formType, setFormType] = useState('Daily mass');
    const [formName, setFormName] = useState('');
    const [formTeamId, setFormTeamId] = useState('');

    // ─── CALENDAR UTILS ───
    const getCalendarDays = (year, month) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
        return days;
    };

    const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);
    const weekDays = useMemo(() => getWeekDays(viewWeekStart), [viewWeekStart]);

    // ─── NAVIGATION ───
    const navigatePrev = useCallback(() => {
        if (viewMode === 'week') {
            setViewWeekStart(prev => {
                const d = new Date(prev);
                d.setDate(d.getDate() - 7);
                return d;
            });
        } else if (viewMode === 'month') {
            if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
            else setViewMonth(m => m - 1);
        } else {
            setViewYear(y => y - 1);
        }
    }, [viewMode, viewMonth]);

    const navigateNext = useCallback(() => {
        if (viewMode === 'week') {
            setViewWeekStart(prev => {
                const d = new Date(prev);
                d.setDate(d.getDate() + 7);
                return d;
            });
        } else if (viewMode === 'month') {
            if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
            else setViewMonth(m => m + 1);
        } else {
            setViewYear(y => y + 1);
        }
    }, [viewMode, viewMonth]);

    const goToToday = useCallback(() => {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
        const d = new Date(today);
        d.setDate(d.getDate() - d.getDay());
        setViewWeekStart(d);
        setSelectedDate(today);
    }, [today]);

    const getHeaderTitle = () => {
        if (viewMode === 'year') return `${viewYear}`;
        if (viewMode === 'week') {
            const end = new Date(viewWeekStart);
            end.setDate(end.getDate() + 6);
            const sm = MONTHS_SHORT[viewWeekStart.getMonth()];
            const em = MONTHS_SHORT[end.getMonth()];
            if (viewWeekStart.getMonth() === end.getMonth()) {
                return `${sm} ${viewWeekStart.getDate()} – ${end.getDate()}, ${viewWeekStart.getFullYear()}`;
            }
            return `${sm} ${viewWeekStart.getDate()} – ${em} ${end.getDate()}, ${end.getFullYear()}`;
        }
        return `${MONTHS[viewMonth]} ${viewYear}`;
    };

    // ─── EVENTS MAP ───
    const eventsByDate = useMemo(() => {
        const map = {};
        sundaySchedule.forEach(sch => {
            const key = sch.date;
            if (!map[key]) map[key] = [];
            map[key].push({ id: `sunday-${key}`, type: 'Sunday evening mass', name: 'Sunday Mass', date: key, teamId: sch.teamId, teamName: sch.teamName, isSystem: true });
        });
        eventSchedules.forEach(sch => {
            const key = sch.date;
            if (!map[key]) map[key] = [];
            map[key].push({ id: sch.id, type: sch.type, name: sch.name, date: key, time: sch.time, teamId: sch.teamId, teamName: sch.teamName, isSystem: false });
        });
        return map;
    }, [sundaySchedule, eventSchedules]);

    const selectedDayEvents = useMemo(() => {
        if (!selectedDate) return [];
        return eventsByDate[isoDate(selectedDate)] || [];
    }, [selectedDate, eventsByDate]);

    const memberMap = useMemo(() => {
        return new Map((choirMembersList || []).map(m => [m.id, m]));
    }, [choirMembersList]);

    // ─── HANDLERS ───
    const handleDayClick = (date) => {
        if (!date) return;
        setSelectedDate(date);
        // In month view, day events show inline below calendar — no modal needed
        if (viewMode !== 'month' && window.innerWidth < 1024) {
            setShowMobileDetails(true);
        }
    };

    const handleEventClick = (e, event) => {
        e.stopPropagation();
        setShowEventDetails(event);
    };

    const openAddModalForDate = (date) => {
        if (!isAdmin) return;
        setEditingEventId(null);
        setFormDate(isoDate(date));
        setFormTime('');
        setFormType('Daily mass');
        setFormName('');
        setFormTeamId('');
        setShowAddModal(true);
    };

    const handleEditClick = () => {
        if (!showEventDetails) return;
        setEditingEventId(showEventDetails.id);
        setFormDate(showEventDetails.date);
        setFormTime(showEventDetails.time || '');
        setFormType(showEventDetails.type);
        setFormName(showEventDetails.name);
        setFormTeamId(showEventDetails.teamId);
        setShowEventDetails(null);
        setShowAddModal(true);
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!formDate || !formName || !formTeamId) return;
        const selectedTeamName = formTeamId === 'whole' ? 'Whole Choir' : (teams.find(t => t.id === formTeamId)?.name || 'Unknown');
        const eventData = { date: formDate, time: formTime, type: formType, name: formName, teamId: formTeamId, teamName: selectedTeamName };
        if (editingEventId && onEditEvent) {
            await onEditEvent(editingEventId, eventData);
        } else {
            await onAddEvent(eventData);
        }
        setShowAddModal(false);
    };

    const handleDeleteCurrentEvent = async () => {
        if (showEventDetails && !showEventDetails.isSystem && onDeleteEvent) {
            if (window.confirm("Are you sure you want to delete this event?")) {
                await onDeleteEvent(showEventDetails.id);
                setShowEventDetails(null);
            }
        }
    };

    const handleGenerateSunday = async () => {
        if (onGenerateSunday) await onGenerateSunday();
    };

    const availableTeams = useMemo(() => {
        if (formType === 'Marriage mass') return teams.filter(t => t.type === 'marriage');
        return teams.filter(t => t.type === 'sunday');
    }, [teams, formType]);

    const eventTypes = [
        'Daily mass', 'Saturday practice', 'Sunday morning mass', 'Sunday evening mass',
        'Special mass practice', 'Special mass', 'Marriage mass', 'Choir meeting', 'Cleaning', 'Others'
    ];

    const handleYearDateClick = (date) => {
        setSelectedDate(date);
        setViewMonth(date.getMonth());
        setViewYear(date.getFullYear());
        setViewMode('month');
    };

    // ─── RENDER: EVENT CHIP ───
    const renderEventChip = (ev) => {
        const isAtt = ev.isAttendance;
        const colorClasses = isAtt
            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
            : ev.type === 'Sunday evening mass'
                ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                : 'bg-pink-50 border-pink-500 text-pink-700 dark:bg-pink-900/30 dark:text-pink-200';
        return (
            <div
                key={ev.id}
                onClick={(e) => handleEventClick(e, ev)}
                className={`px-2 py-1 rounded text-[10px] border-l-2 shadow-sm cursor-pointer hover:opacity-90 transition-opacity truncate ${colorClasses}`}
            >
                <div className="font-bold leading-tight truncate flex items-center gap-1">
                    {isAtt && <i className="bi bi-check-circle-fill text-emerald-500 text-[9px]"></i>}
                    {ev.name}
                </div>
                <div className="opacity-80 truncate flex items-center gap-1">
                    {ev.time && <span className="font-mono">{formatTimeAMPM(ev.time)}</span>}
                    <span>• {ev.teamName}</span>
                </div>
            </div>
        );
    };

    // ─── RENDER: DATE CIRCLE ───
    const renderDateCircle = (date, size = 'md') => {
        const isToday = isSameDay(date, today);
        const sizeClasses = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 md:w-7 md:h-7 text-xs md:text-sm';
        return (
            <div className={`flex items-center justify-center rounded-full transition-colors ${sizeClasses} ${isToday ? 'bg-primary-600 text-white font-bold shadow-md' : 'text-slate-500 dark:text-navy-400 font-medium'}`}>
                {date.getDate()}
            </div>
        );
    };

    // ─── RENDER: MONTH VIEW ───
    const renderMonthView = () => (
        <>
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-navy-700 text-center bg-slate-50 dark:!bg-navy-900">
                {DAYS.map(d => (
                    <div key={d} className="py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-navy-300">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-[minmax(60px,_1fr)] md:auto-rows-[minmax(100px,_1fr)] bg-slate-200 dark:!bg-navy-950 gap-px border-b border-slate-200 dark:border-navy-700">
                {calendarDays.map((date, idx) => {
                    if (!date) return <div key={`empty-${idx}`} className="bg-slate-50 dark:bg-navy-950" />;
                    const dateStr = isoDate(date);
                    const events = eventsByDate[dateStr] || [];
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    return (
                        <div key={dateStr} onClick={() => handleDayClick(date)}
                            className={`p-1 md:p-2 relative group transition-all cursor-pointer h-full min-h-[60px] md:min-h-[100px]
                                ${isSelected ? 'bg-primary-50 dark:!bg-primary-900/20' : 'bg-white dark:!bg-navy-800'} hover:bg-slate-50 dark:hover:!bg-navy-700`}>
                            <div className="flex justify-end mb-1">{renderDateCircle(date)}</div>
                            <div className="flex md:hidden justify-center gap-1 absolute bottom-1.5 left-0 right-0 z-10">
                                {events.slice(0, 3).map((ev, i) => (
                                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${ev.isAttendance ? 'bg-emerald-500' : ev.type.includes('Sunday') ? 'bg-blue-500' : 'bg-pink-500'}`} />
                                ))}
                                {events.length > 3 && (
                                    <span className="text-[8px] font-bold text-slate-400 dark:text-navy-400 leading-none">+{events.length - 3}</span>
                                )}
                            </div>
                            <div className="hidden md:block space-y-1">{events.map(ev => renderEventChip(ev))}</div>
                        </div>
                    );
                })}
            </div>
        </>
    );

    // ─── RENDER: WEEK VIEW ───
    const renderWeekView = () => (
        <div className="overflow-auto max-h-[65vh] md:max-h-[75vh]">
            <table className="w-full border-collapse table-fixed" style={{ minWidth: '500px' }}>
                {/* Column widths */}
                <colgroup>
                    <col style={{ width: '50px' }} />
                    {weekDays.map((_, i) => <col key={i} />)}
                </colgroup>
                {/* Sticky Day Header */}
                <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 dark:!bg-navy-900">
                        <th className="py-2 border-b border-r border-slate-200 dark:border-navy-700"></th>
                        {weekDays.map(date => {
                            const isToday = isSameDay(date, today);
                            return (
                                <th key={isoDate(date)}
                                    className="py-2 text-center border-b border-r border-slate-200 dark:border-navy-700 last:border-r-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors font-normal"
                                    onClick={() => handleDayClick(date)}>
                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500 dark:text-navy-300'}`}>
                                        {DAYS[date.getDay()]}
                                    </div>
                                    <div className="flex justify-center mt-1">{renderDateCircle(date)}</div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                {/* Time Grid */}
                <tbody>
                    {HOURS.map(hour => {
                        const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
                        return (
                            <tr key={hour} className="border-b border-slate-100 dark:border-navy-800">
                                <td className="text-[10px] text-slate-400 dark:text-navy-400 text-right pr-2 pt-0.5 border-r border-slate-200 dark:border-navy-700 font-mono align-top h-[48px] whitespace-nowrap">
                                    {label}
                                </td>
                                {weekDays.map(date => {
                                    const dateStr = isoDate(date);
                                    const events = (eventsByDate[dateStr] || []).filter(ev => {
                                        if (!ev.time) return hour === 9;
                                        const h = parseInt(ev.time.split(':')[0], 10);
                                        return h === hour;
                                    });
                                    return (
                                        <td key={`${dateStr}-${hour}`}
                                            className="border-r border-slate-100 dark:border-navy-800 last:border-r-0 p-0.5 align-top hover:bg-slate-50 dark:hover:bg-navy-700/30 cursor-pointer transition-colors h-[48px] overflow-hidden"
                                            onClick={() => { setSelectedDate(date); if (isAdmin) { setFormDate(dateStr); setFormTime(`${String(hour).padStart(2, '0')}:00`); } }}
                                        >
                                            {events.map(ev => (
                                                <div key={ev.id} onClick={(e) => handleEventClick(e, ev)}
                                                    className={`text-[9px] md:text-[10px] px-1 py-0.5 rounded mb-0.5 truncate cursor-pointer font-semibold border-l-2 overflow-hidden max-w-full
                                                        ${ev.type === 'Sunday evening mass'
                                                            ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                                                            : 'bg-pink-50 border-pink-500 text-pink-700 dark:bg-pink-900/30 dark:text-pink-200'}`}>
                                                    {ev.time && <span className="font-mono">{formatTimeAMPM(ev.time)} </span>}{ev.name}
                                                </div>
                                            ))}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    // ─── RENDER: YEAR VIEW ───
    const renderYearView = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4 md:p-6">
            {Array.from({ length: 12 }, (_, month) => {
                const days = getCalendarDays(viewYear, month);
                return (
                    <div key={month} className="select-none">
                        <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-2 tracking-wide">{MONTHS[month]}</h3>
                        <div className="grid grid-cols-7 gap-0 text-center mb-1">
                            {DAYS_SHORT.map((d, i) => (
                                <div key={i} className="text-[10px] font-bold text-slate-400 dark:text-navy-400 py-0.5">{d}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-0 text-center">
                            {days.map((date, i) => {
                                if (!date) return <div key={`e-${i}`} className="py-1" />;
                                const dateStr = isoDate(date);
                                const hasEvents = !!eventsByDate[dateStr];
                                const isToday = isSameDay(date, today);
                                return (
                                    <div key={dateStr}
                                        onClick={() => handleYearDateClick(date)}
                                        className="py-1 cursor-pointer hover:bg-slate-100 dark:hover:bg-navy-700 rounded transition-colors relative flex justify-center">
                                        <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] transition-colors
                                            ${isToday ? 'bg-primary-600 text-white font-bold' : 'text-slate-600 dark:text-navy-300 font-medium'}`}>
                                            {date.getDate()}
                                        </div>
                                        {hasEvents && !isToday && (
                                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // ─── RENDER: EVENT CARD (for side panel & mobile) ───
    const renderEventCard = (ev, onClickHandler) => {
        const isAtt = ev.isAttendance;
        const cardColor = isAtt
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800'
            : ev.type === 'Sunday evening mass'
                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                : 'bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-800';
        const labelColor = isAtt
            ? 'text-emerald-600 dark:text-emerald-400'
            : ev.type.includes('Sunday') ? 'text-blue-600 dark:text-blue-400' : 'text-pink-600 dark:text-pink-400';
        return (
            <div key={ev.id} onClick={onClickHandler}
                className={`p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all ${cardColor}`}>
                <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${labelColor}`}>
                        {isAtt && <i className="bi bi-check-circle-fill"></i>}
                        {ev.type}
                    </span>
                    {ev.time && <span className="font-mono text-xs font-semibold text-slate-600 dark:text-navy-300 bg-white/50 dark:bg-black/20 px-1.5 rounded">{formatTimeAMPM(ev.time)}</span>}
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-300 mb-1">{ev.name}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-navy-300">
                    <i className={`bi ${isAtt ? 'bi-clipboard-check' : 'bi-people-fill'}`}></i><span>{ev.teamName}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in pb-20 md:pb-0">
            <PageHeader
                title="Schedule"
                subtitle="Manage choir masses, practices, and other events."
                actions={isAdmin && (
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleGenerateSunday} disabled={isLoading} icon="bi-arrow-repeat" className="hidden md:flex">Auto-Generate</Button>
                        <Button variant="primary" onClick={() => openAddModalForDate(selectedDate || today)} icon="bi-plus-lg">Add Event</Button>
                    </div>
                )}
            />

            <div className={`grid grid-cols-1 ${viewMode !== 'year' ? 'lg:grid-cols-3' : ''} gap-6`}>
                <div className={viewMode !== 'year' ? 'lg:col-span-2' : ''}>
                    <Card className={`mb-6 border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 ${viewMode === 'week' ? 'overflow-visible' : 'overflow-hidden'}`}>
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between p-3 md:p-4 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800">
                            <div className="flex items-center gap-2">
                                <button onClick={goToToday} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-navy-600 text-slate-600 dark:text-navy-300 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors">
                                    Today
                                </button>
                                <button onClick={navigatePrev} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-500 dark:text-navy-300 transition-colors">
                                    <i className="bi bi-chevron-left"></i>
                                </button>
                                <button onClick={navigateNext} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-500 dark:text-navy-300 transition-colors">
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                                <h2 className="text-base md:text-xl font-bold text-slate-800 dark:text-white ml-2">{getHeaderTitle()}</h2>
                            </div>
                            {/* View Mode Selector */}
                            <select value={viewMode} onChange={e => setViewMode(e.target.value)}
                                className="text-xs md:text-sm font-semibold rounded-lg border border-slate-300 dark:border-navy-600 bg-white dark:bg-navy-700 text-slate-700 dark:text-navy-200 px-2 md:px-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-navy-600 transition-colors focus:ring-2 focus:ring-primary-500 focus:outline-none">
                                <option value="week">Week</option>
                                <option value="month">Month</option>
                                <option value="year">Year</option>
                            </select>
                        </div>

                        {/* View Content */}
                        {viewMode === 'month' && renderMonthView()}
                        {viewMode === 'week' && renderWeekView()}
                        {viewMode === 'year' && renderYearView()}
                    </Card>

                    {/* Inline Day View (mobile, month view only) */}
                    {viewMode === 'month' && selectedDate && (
                        <div className="lg:hidden">
                            <Card className="border border-slate-200 dark:border-navy-700 bg-white dark:!bg-navy-800">
                                <div className="p-4 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:!bg-navy-900">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                        {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-navy-300 mt-1">
                                        {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''} scheduled
                                    </p>
                                </div>
                                <div className="p-4 space-y-3">
                                    {selectedDayEvents.length === 0 ? (
                                        <div className="text-center py-6 text-slate-400 dark:text-navy-400">
                                            <i className="bi bi-calendar-x text-2xl mb-2 block"></i>
                                            <p className="text-sm">No events scheduled for this day.</p>
                                            {isAdmin && (
                                                <Button variant="outline" size="sm" className="mt-3" onClick={() => openAddModalForDate(selectedDate)}>Schedule Event</Button>
                                            )}
                                        </div>
                                    ) : (
                                        selectedDayEvents.map(ev => renderEventCard(ev, () => setShowEventDetails(ev)))
                                    )}
                                </div>
                                {isAdmin && selectedDayEvents.length > 0 && (
                                    <div className="p-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:!bg-navy-900 rounded-b-3xl">
                                        <Button variant="primary" className="w-full" onClick={() => openAddModalForDate(selectedDate)}>
                                            <i className="bi bi-plus-lg mr-2"></i> Add Event
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}
                </div>

                {/* Selected Day Details Panel (not shown in year view) */}
                {viewMode !== 'year' && (
                    <div className="hidden lg:block lg:col-span-1">
                        <Card className="sticky top-6 h-full border border-slate-200 dark:border-navy-700 bg-white dark:!bg-navy-800">
                            <div className="p-4 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:!bg-navy-900">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                    {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a Date'}
                                </h3>
                                {selectedDate && <p className="text-xs text-slate-500 dark:text-navy-300 mt-1">
                                    {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''} scheduled
                                </p>}
                            </div>
                            <div className="p-4 space-y-3 min-h-[200px]">
                                {selectedDayEvents.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400 dark:text-navy-400">
                                        <i className="bi bi-calendar-x text-3xl mb-2 block"></i>
                                        <p>No events scheduled for this day.</p>
                                        {isAdmin && (<Button variant="outline" size="sm" className="mt-3" onClick={() => openAddModalForDate(selectedDate)}>Schedule Event</Button>)}
                                    </div>
                                ) : (
                                    selectedDayEvents.map(ev => renderEventCard(ev, () => setShowEventDetails(ev)))
                                )}
                            </div>
                            {isAdmin && selectedDate && (
                                <div className="p-4 border-t border-slate-200 dark:border-navy-700 bg-slate-50 dark:!bg-navy-900 mt-auto rounded-b-3xl">
                                    <Button variant="primary" className="w-full" onClick={() => openAddModalForDate(selectedDate)}>
                                        <i className="bi bi-plus-lg mr-2"></i> Add Event
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </div>
                )}
            </div>

            {/* Add/Edit Event Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 shrink-0">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{editingEventId ? 'Edit Event' : 'Schedule New Event'}</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-navy-200"><i className="bi bi-x-lg"></i></button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <form id="addEventForm" onSubmit={handleAddSubmit} className="p-6 space-y-4 pb-20">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="form-label">Date</label><input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required className="form-input" /></div>
                                    <div><label className="form-label">Time</label>
                                        <input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="form-input font-mono w-full" />
                                    </div>
                                </div>
                                <div><label className="form-label">Event Type</label>
                                    <select value={formType} onChange={e => setFormType(e.target.value)} className="form-select">
                                        {eventTypes.map(type => (
                                            <option key={type} value={type} disabled={type === 'Sunday evening mass'}>
                                                {type}{type === 'Sunday evening mass' ? ' (Use Auto-Gen)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div><label className="form-label">Event Name</label><input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Wedding of X & Y" required className="form-input" /></div>
                                <div>
                                    <label className="form-label">Assign Team</label>
                                    <select value={formTeamId} onChange={e => setFormTeamId(e.target.value)} required className="form-select">
                                        <option value="">Select Team...</option>
                                        {formType !== 'Marriage mass' && (<><option value="whole">Choir member</option><option disabled>──────────</option></>)}
                                        {availableTeams.map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                                    </select>
                                </div>
                            </form>
                        </div>
                        <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-navy-700 bg-slate-50 dark:!bg-navy-900 shrink-0 rounded-b-3xl">
                            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                            <Button variant="primary" form="addEventForm" type="submit">{editingEventId ? 'Update Event' : 'Schedule Event'}</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Event Details Modal */}
            {showEventDetails && (
                <div className="modal-overlay" onClick={() => setShowEventDetails(null)}>
                    <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 shrink-0">
                            <div>
                                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${showEventDetails.type === 'Sunday evening mass' ? 'text-blue-500' : 'text-pink-500'}`}>{showEventDetails.type}</div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{showEventDetails.name}</h3>
                            </div>
                            <button onClick={() => setShowEventDetails(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-navy-200"><i className="bi bi-x-lg"></i></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-4 mb-6">
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-navy-300">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0"><i className="bi bi-calendar-event text-slate-500 dark:text-slate-300"></i></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 font-semibold uppercase">Date</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-300">{new Date(showEventDetails.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </div>
                                {showEventDetails.time && (
                                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-navy-300">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0"><i className="bi bi-clock text-slate-500 dark:text-slate-300"></i></div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-400 font-semibold uppercase">Time</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-300">{formatTimeAMPM(showEventDetails.time)}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-navy-300">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0"><i className="bi bi-people-fill text-slate-500 dark:text-slate-300"></i></div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 font-semibold uppercase">Assigned Team</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{showEventDetails.teamName}</span>
                                    </div>
                                </div>

                                {showEventDetails.teamId && showEventDetails.teamId !== 'whole' && (
                                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-navy-700">
                                        <h5 className="font-bold text-slate-800 dark:text-white mb-2 text-sm font-heading">Team Members</h5>
                                        {(() => {
                                            const team = teams.find(t => t.id === showEventDetails.teamId);
                                            if (!team || !team.members || team.members.length === 0) {
                                                return <div className="text-xs text-slate-400 italic">No members assigned to this team.</div>;
                                            }
                                            return (
                                                <div className="flex flex-wrap gap-2">
                                                    {team.members.map(memberId => {
                                                        const member = memberMap.get(memberId);
                                                        if (!member) return null;
                                                        return (
                                                            <div key={memberId} className="flex items-center gap-1.5 bg-slate-100 dark:bg-navy-700 px-2.5 py-1 rounded-md">
                                                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold outline outline-1 outline-white dark:outline-navy-800 ${member.gender === 'Female' ? 'bg-amber-500' : 'bg-sky-500'}`}>
                                                                    {member.name.charAt(0)}
                                                                </div>
                                                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{member.name}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                        {isAdmin && (
                            <div className="flex flex-col gap-3 p-4 border-t border-slate-100 dark:border-navy-700 bg-slate-50 dark:!bg-navy-900 shrink-0 rounded-b-3xl">
                                <Button variant="primary" className="w-full py-3" onClick={() => onMarkAttendance(showEventDetails)} icon="bi-calendar-check">Mark Attendance</Button>
                                {!showEventDetails.isSystem && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button variant="secondary" className="w-full" onClick={handleEditClick} icon="bi-pencil">Edit</Button>
                                        <Button variant="danger" className="w-full" onClick={handleDeleteCurrentEvent} icon="bi-trash">Delete</Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Mobile Selected Day Highlights */}
            {showMobileDetails && (
                <div className="modal-overlay lg:hidden" onClick={() => setShowMobileDetails(false)}>
                    <div className="modal-content max-w-sm mt-auto mb-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 shrink-0">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                    {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a Date'}
                                </h3>
                                {selectedDate && <p className="text-xs text-slate-500 dark:text-navy-300 mt-1">
                                    {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''} scheduled
                                </p>}
                            </div>
                            <button onClick={() => setShowMobileDetails(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-navy-200"><i className="bi bi-x-lg"></i></button>
                        </div>
                        <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
                            {selectedDayEvents.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 dark:text-navy-400">
                                    <i className="bi bi-calendar-x text-3xl mb-2 block"></i>
                                    <p>No events scheduled for this day.</p>
                                </div>
                            ) : (
                                selectedDayEvents.map(ev => renderEventCard(ev, () => { setShowMobileDetails(false); setShowEventDetails(ev); }))
                            )}
                        </div>
                        {isAdmin && selectedDate && (
                            <div className="p-4 border-t border-slate-100 dark:border-navy-700 bg-slate-50 dark:!bg-navy-900 shrink-0 rounded-b-3xl">
                                <Button variant="primary" className="w-full" onClick={() => { setShowMobileDetails(false); openAddModalForDate(selectedDate); }}>
                                    <i className="bi bi-plus-lg mr-2"></i> Add Event
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Schedule;
