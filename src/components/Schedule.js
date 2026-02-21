import React, { useState, useMemo } from 'react';
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

const generateTimeOptions = () => {
    const options = [];
    for (let h = 5; h <= 21; h++) { // 5 AM to 9 PM
        for (let m = 0; m < 60; m += 15) {
            const hourStr = String(h).padStart(2, '0');
            const minStr = String(m).padStart(2, '0');
            const time24 = `${hourStr}:${minStr}`;
            options.push({ value: time24, label: formatTimeAMPM(time24) });
        }
    }
    return options;
};

const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
};

function Schedule({
    user, teams, sundaySchedule = [], eventSchedules = [],
    onGenerateSunday, onUpdateSunday, onAddEvent, onEditEvent, onDeleteEvent,
    isLoading
}) {
    const isAdmin = user?.role === 'admin';
    const today = new Date();

    // Calendar State
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState(today); // For mobile view & admin selection

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

    // ─── UTILS ───
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getCalendarDays = (year, month) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
        return days;
    };

    const calendarDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };
    const goToToday = () => {
        setViewYear(today.getFullYear());
        setViewMonth(today.getMonth());
        setSelectedDate(today);
    };

    const timeOptions = useMemo(() => generateTimeOptions(), []);

    // ─── EVENTS MAP ───
    const eventsByDate = useMemo(() => {
        const map = {};

        // Sunday Schedule
        sundaySchedule.forEach(sch => {
            const key = sch.date; // YYYY-MM-DD
            if (!map[key]) map[key] = [];
            map[key].push({
                id: `sunday-${key}`,
                type: 'Sunday evening mass',
                name: 'Sunday Mass',
                date: key,
                teamId: sch.teamId,
                teamName: sch.teamName,
                isSystem: true
            });
        });

        // Manual Events
        eventSchedules.forEach(sch => {
            const key = sch.date;
            if (!map[key]) map[key] = [];
            map[key].push({
                id: sch.id,
                type: sch.type,
                name: sch.name,
                date: key,
                time: sch.time,
                teamId: sch.teamId,
                teamName: sch.teamName,
                isSystem: false
            });
        });

        return map;
    }, [sundaySchedule, eventSchedules]);

    const selectedDayEvents = useMemo(() => {
        if (!selectedDate) return [];
        return eventsByDate[isoDate(selectedDate)] || [];
    }, [selectedDate, eventsByDate]);

    // ─── HANDLERS ───
    const handleDayClick = (date) => {
        if (!date) return;
        setSelectedDate(date);
        if (window.innerWidth < 1024) {
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
        const eventData = {
            date: formDate,
            time: formTime,
            type: formType,
            name: formName,
            teamId: formTeamId,
            teamName: selectedTeamName
        };

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
        'Daily mass',
        'Saturday practice',
        'Sunday morning mass',
        'Sunday evening mass',
        'Special mass practice',
        'Special mass',
        'Marriage mass',
        'Choir meeting',
        'Cleaning',
        'Others'
    ];

    return (
        <div className="animate-fade-in pb-20 md:pb-0">
            <PageHeader
                title="Schedule"
                subtitle="Manage choir masses, practices, and other events."
                actions={isAdmin && (
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={handleGenerateSunday} disabled={isLoading} icon="bi-arrow-repeat" className="hidden md:flex">
                            Auto-Generate
                        </Button>
                        <Button variant="primary" onClick={() => openAddModalForDate(selectedDate || today)} icon="bi-plus-lg">
                            Add Event
                        </Button>
                    </div>
                )}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <Card className="mb-6 overflow-hidden border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800">
                        {/* Calendar Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800">
                            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-500 dark:text-navy-300 transition-colors">
                                <i className="bi bi-chevron-left text-lg"></i>
                            </button>
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                    {MONTHS[viewMonth]} {viewYear}
                                </h2>
                                <button onClick={goToToday} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline mt-1">
                                    Jump to Today
                                </button>
                            </div>
                            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-navy-700 text-slate-500 dark:text-navy-300 transition-colors">
                                <i className="bi bi-chevron-right text-lg"></i>
                            </button>
                        </div>

                        {/* Weekday Header */}
                        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-navy-700 text-center bg-slate-50 dark:!bg-navy-900">
                            {DAYS.map(d => (
                                <div key={d} className="py-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-navy-300">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 auto-rows-[minmax(60px,_1fr)] md:auto-rows-[minmax(100px,_1fr)] bg-slate-200 dark:!bg-navy-950 gap-px border-b border-slate-200 dark:border-navy-700">
                            {calendarDays.map((date, idx) => {
                                if (!date) return <div key={`empty-${idx}`} className="bg-slate-50 dark:bg-navy-950" />;

                                const dateStr = isoDate(date);
                                const events = eventsByDate[dateStr] || [];
                                const isToday = date.toDateString() === today.toDateString();
                                const isSelected = selectedDate && isSameDay(date, selectedDate);

                                return (
                                    <div
                                        key={dateStr}
                                        onClick={() => handleDayClick(date)}
                                        className={`
                                            bg-white dark:!bg-navy-800 p-1 md:p-2 relative group transition-all cursor-pointer h-full min-h-[60px] md:min-h-[100px]
                                            ${isSelected ? 'ring-2 ring-inset ring-primary-500 z-20' : ''}
                                            ${isToday ? 'bg-primary-50/30 dark:!bg-primary-900/10' : ''}
                                            hover:bg-slate-50 dark:hover:!bg-navy-700
                                        `}
                                    >
                                        <div className={`text-right mb-1 text-xs md:text-sm ${isToday ? 'font-bold text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-navy-400'}`}>
                                            {isToday ? <span className="md:bg-primary-100 md:dark:bg-primary-900/30 px-1.5 py-0.5 rounded">Today</span> : date.getDate()}
                                            {isToday && <span className="md:hidden font-bold">Today</span>}
                                        </div>

                                        <div className="flex md:hidden justify-center gap-1.5 absolute bottom-1.5 left-0 right-0 z-10">
                                            {events.map((ev, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-2.5 h-2.5 rounded-full shadow-sm border-2 border-white dark:border-navy-800 ${ev.type.includes('Sunday') ? 'bg-blue-500' : 'bg-pink-500'}`}
                                                />
                                            ))}
                                        </div>

                                        {/* Desktop View: Chips */}
                                        <div className="hidden md:block space-y-1">
                                            {events.map(ev => (
                                                <div
                                                    key={ev.id}
                                                    onClick={(e) => handleEventClick(e, ev)}
                                                    className={`
                                                        px-2 py-1.5 rounded text-[10px] border-l-2 shadow-sm cursor-pointer hover:opacity-90 transition-opacity truncate
                                                        ${ev.type === 'Sunday evening mass'
                                                            ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                                                            : 'bg-pink-50 border-pink-500 text-pink-700 dark:bg-pink-900/30 dark:text-pink-200'}
                                                    `}
                                                >
                                                    <div className="font-bold leading-tight truncate">{ev.name}</div>
                                                    <div className="opacity-80 truncate flex items-center gap-1">
                                                        {ev.time && <span className="font-mono">{formatTimeAMPM(ev.time)}</span>}
                                                        <span>• {ev.teamName}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>

                {/* Selected Day Details Panel */}
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
                                    {isAdmin && (
                                        <Button variant="outline" size="sm" className="mt-3" onClick={() => openAddModalForDate(selectedDate)}>
                                            Schedule Event
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                selectedDayEvents.map(ev => (
                                    <div
                                        key={ev.id}
                                        onClick={() => setShowEventDetails(ev)}
                                        className={`
                                            p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all
                                            ${ev.type === 'Sunday evening mass'
                                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                                : 'bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-800'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${ev.type.includes('Sunday') ? 'text-blue-600 dark:text-blue-400' : 'text-pink-600 dark:text-pink-400'}`}>
                                                {ev.type}
                                            </span>
                                            {ev.time && <span className="font-mono text-xs font-semibold text-slate-600 dark:text-navy-300 bg-white/50 dark:bg-black/20 px-1.5 rounded">{formatTimeAMPM(ev.time)}</span>}
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-300 mb-1">{ev.name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-navy-300">
                                            <i className="bi bi-people-fill"></i>
                                            <span>{ev.teamName}</span>
                                        </div>
                                    </div>
                                ))
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
                                        <select value={formTime} onChange={e => setFormTime(e.target.value)} className="form-select font-mono">
                                            <option value="">-- No Time --</option>
                                            {timeOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div><label className="form-label">Event Type</label>
                                    <select value={formType} onChange={e => setFormType(e.target.value)} className="form-select">
                                        {eventTypes.map(type => (
                                            <option
                                                key={type}
                                                value={type}
                                                disabled={type === 'Sunday evening mass'}
                                            >
                                                {type}{type === 'Sunday evening mass' ? ' (Use Auto-Gen)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div><label className="form-label">Event Name</label><input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Wedding of X & Y" required className="form-input" /></div>

                                <div><label className="form-label">Assign Team</label>
                                    <select value={formTeamId} onChange={e => setFormTeamId(e.target.value)} required className="form-select">
                                        <option value="">Select Team...</option>
                                        <option value="whole">Whole Choir</option>
                                        <option disabled>──────────</option>
                                        {availableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${showEventDetails.type === 'Sunday evening mass' ? 'text-blue-500' : 'text-pink-500'}`}>
                                    {showEventDetails.type}
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{showEventDetails.name}</h3>
                            </div>
                            <button onClick={() => setShowEventDetails(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-navy-200"><i className="bi bi-x-lg"></i></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-4 mb-6">
                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-navy-300">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0">
                                        <i className="bi bi-calendar-event text-slate-500 dark:text-slate-300"></i>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 font-semibold uppercase">Date</span>
                                        <span className="font-medium text-slate-800 dark:text-slate-300">{new Date(showEventDetails.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                </div>

                                {showEventDetails.time && (
                                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-navy-300">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0">
                                            <i className="bi bi-clock text-slate-500 dark:text-slate-300"></i>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-400 font-semibold uppercase">Time</span>
                                            <span className="font-medium text-slate-800 dark:text-slate-300">{formatTimeAMPM(showEventDetails.time)}</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-navy-300">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-navy-700 flex items-center justify-center flex-shrink-0">
                                        <i className="bi bi-people-fill text-slate-500 dark:text-slate-300"></i>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-400 font-semibold uppercase">Assigned Team</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{showEventDetails.teamName}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="flex justify-end gap-3 p-4 border-t border-slate-100 dark:border-navy-700 bg-slate-50 dark:!bg-navy-900 shrink-0 rounded-b-3xl">
                                {!showEventDetails.isSystem && (
                                    <>
                                        <Button variant="secondary" size="sm" onClick={handleEditClick} icon="bi-pencil">Edit</Button>
                                        <Button variant="danger" size="sm" onClick={handleDeleteCurrentEvent} icon="bi-trash">Delete</Button>
                                    </>
                                )}
                                {showEventDetails.isSystem && (
                                    <div className="text-xs text-center text-slate-400 bg-slate-50 dark:bg-navy-800/50 p-2 rounded border border-slate-100 dark:border-navy-700 w-full">
                                        System generated event. Manage via "Auto-Generate".
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
                            <button onClick={() => setShowMobileDetails(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-navy-200">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh]">
                            {selectedDayEvents.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 dark:text-navy-400">
                                    <i className="bi bi-calendar-x text-3xl mb-2 block"></i>
                                    <p>No events scheduled for this day.</p>
                                </div>
                            ) : (
                                selectedDayEvents.map(ev => (
                                    <div
                                        key={ev.id}
                                        onClick={() => {
                                            setShowMobileDetails(false);
                                            setShowEventDetails(ev);
                                        }}
                                        className={`
                                            p-3 rounded-xl border cursor-pointer hover:shadow-md transition-all
                                            ${ev.type === 'Sunday evening mass'
                                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                                                : 'bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-800'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${ev.type.includes('Sunday') ? 'text-blue-600 dark:text-blue-400' : 'text-pink-600 dark:text-pink-400'}`}>
                                                {ev.type}
                                            </span>
                                            {ev.time && <span className="font-mono text-xs font-semibold text-slate-600 dark:text-navy-300 bg-white/50 dark:bg-black/20 px-1.5 rounded">{formatTimeAMPM(ev.time)}</span>}
                                        </div>
                                        <h4 className="font-bold text-slate-800 dark:text-slate-300 mb-1">{ev.name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-navy-300">
                                            <i className="bi bi-people-fill"></i>
                                            <span>{ev.teamName}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {isAdmin && selectedDate && (
                            <div className="p-4 border-t border-slate-100 dark:border-navy-700 bg-slate-50 dark:!bg-navy-900 shrink-0 rounded-b-3xl">
                                <Button variant="primary" className="w-full" onClick={() => {
                                    setShowMobileDetails(false);
                                    openAddModalForDate(selectedDate);
                                }}>
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
