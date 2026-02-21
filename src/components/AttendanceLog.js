import React, { useState, useMemo } from 'react';
import PageHeader from './Layout/PageHeader';
import Button from './UI/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sanitizeText } from '../utils/pdfUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function toLocalDateStr(dateStr) {
  // dateStr is "YYYY-MM-DD" — parse as UTC to avoid timezone shifts
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function isoToKey(dateStr) {
  return dateStr; // already "YYYY-MM-DD"
}

function calKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    'Present': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Excused but Present': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    'Absent': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    'Excused': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[status] || 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
      {status || 'Not Marked'}
    </span>
  );
}

// ─── Section color dot ────────────────────────────────────────────────────────
const SECTION_COLORS = [
  '#3772FF', '#45B36B', '#EF466F', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];
function getSectionColor(section, allSections) {
  const idx = allSections.indexOf(section);
  return SECTION_COLORS[idx % SECTION_COLORS.length];
}

// ─── Single entry card (inside day detail panel) ──────────────────────────────
function EntryCard({ record, teams, isReadOnly, onStartEdit, onDelete, onDownload, allSections }) {
  const [expanded, setExpanded] = useState(false);
  const totalPresent = record.records.filter(r => r.status === 'Present').length;
  const total = record.records.length;
  const pct = total > 0 ? Math.round((totalPresent / total) * 100) : 0;
  const pctColor = pct < 50 ? 'text-red-500' : pct < 80 ? 'text-amber-500' : 'text-emerald-500';
  const color = getSectionColor(record.section, allSections);

  const getTeamName = (teamId) => {
    if (teamId === 'all-choir') return 'All Choir Members';
    if (teamId === 'na-team') return 'NA';
    const team = teams.find(t => t.id === teamId);
    return team ? team.name : 'Unknown Team';
  };

  return (
    <div className="nock-card overflow-hidden mb-3">
      {/* Header row */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-800 dark:text-white text-sm truncate">{record.section}</div>
            {record.eventName && <div className="text-xs text-slate-400 truncate">{record.eventName}</div>}
            {record.section === 'Sunday evening mass' && record.scheduledTeamId && (
              <div className="text-[10px] text-primary-500 font-semibold mt-0.5">
                <i className="bi bi-people-fill mr-1"></i>{getTeamName(record.scheduledTeamId)}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{totalPresent}<span className="text-slate-400 font-normal text-xs">/{total}</span></div>
            <div className={`text-xs font-bold ${pctColor}`}>{pct}%</div>
          </div>
          <i className={`bi bi-chevron-${expanded ? 'up' : 'down'} text-slate-400 text-xs`}></i>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 px-4 pb-3 border-b border-slate-100 dark:border-slate-700/40">
        {!isReadOnly && (
          <>
            <button
              onClick={() => onStartEdit(record)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
            >
              <i className="bi bi-pencil-fill"></i> Edit
            </button>
            <button
              onClick={() => onDelete(record)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <i className="bi bi-trash-fill"></i> Delete
            </button>
          </>
        )}
        <button
          onClick={() => onDownload(record)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
        >
          <i className="bi bi-download"></i> PDF
        </button>
      </div>

      {/* Member list (expanded) */}
      {expanded && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/40">
          {[...record.records].sort((a, b) => a.name.localeCompare(b.name)).map(rec => (
            <div key={rec.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 flex-shrink-0">
                  {rec.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{rec.name}</div>
                  {rec.reason && <div className="text-xs text-slate-400 italic">"{rec.reason}"</div>}
                </div>
              </div>
              <StatusBadge status={rec.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
function AttendanceLog({ history, onDeleteRecord, onStartEdit, isReadOnly = false, isLoading, teams = [] }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [listSearch, setListSearch] = useState('');
  const [listSection, setListSection] = useState('all');

  // Build a map: "YYYY-MM-DD" → [records]
  const dateMap = useMemo(() => {
    const map = {};
    history.forEach(record => {
      const key = isoToKey(record.date);
      if (!map[key]) map[key] = [];
      map[key].push(record);
    });
    return map;
  }, [history]);

  const allSections = useMemo(() => Array.from(new Set(history.map(h => h.section))).sort(), [history]);

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };
  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(null);
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const key = calKey(viewYear, viewMonth, day);
    if (!dateMap[key]) return; // no entries — don't select
    setSelectedDate(prev => prev === key ? null : key);
  };

  const selectedEntries = selectedDate ? (dateMap[selectedDate] || []) : [];

  const downloadSingleRecordPdf = (record) => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text(`Attendance Report: ${sanitizeText(record.section)}`, 14, 22);
    doc.setFontSize(11); doc.setTextColor(100);
    doc.text(record.eventName
      ? `${sanitizeText(record.eventName)} on ${toLocalDateStr(record.date)}`
      : `on ${toLocalDateStr(record.date)}`, 14, 30);
    const sortedRecords = [...record.records].sort((a, b) => a.name.localeCompare(b.name));
    autoTable(doc, {
      head: [['Member Name', 'Status', 'Reason']],
      body: sortedRecords.map(rec => [sanitizeText(rec.name), rec.status, sanitizeText(rec.reason || '-')]),
      startY: 40, theme: 'grid',
      headStyles: { fillColor: [55, 114, 255], halign: 'center' },
      bodyStyles: { valign: 'middle', halign: 'center' },
    });
    doc.save(`attendance_${record.date}_${sanitizeText(record.section).replace(/\s+/g, '-')}.pdf`);
  };

  const handleDelete = (record) => setRecordToDelete(record);
  const confirmDelete = () => {
    if (recordToDelete) {
      onDeleteRecord(recordToDelete.id);
      // If the deleted record was the only one on that day, deselect
      const key = isoToKey(recordToDelete.date);
      const remaining = (dateMap[key] || []).filter(r => r.id !== recordToDelete.id);
      if (remaining.length === 0) setSelectedDate(null);
    }
    setRecordToDelete(null);
  };

  // List view filtered
  const listRecords = useMemo(() => {
    const lower = listSearch.toLowerCase().trim();
    return [...history]
      .filter(r => {
        if (listSection !== 'all' && r.section !== listSection) return false;
        if (!lower) return true;
        return r.section.toLowerCase().includes(lower)
          || (r.eventName || '').toLowerCase().includes(lower)
          || toLocalDateStr(r.date).includes(lower);
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [history, listSearch, listSection]);

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="spinner"></div></div>;

  return (
    <>
      <PageHeader
        title="Attendance History"
        subtitle="Click any highlighted date to view its attendance entries."
      />

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${viewMode === 'calendar' ? 'bg-primary-500 text-white' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
          style={viewMode === 'calendar' ? { boxShadow: '0 4px 16px rgba(55,114,255,0.35)' } : {}}
        >
          <i className="bi bi-calendar3"></i> Calendar
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${viewMode === 'list' ? 'bg-primary-500 text-white' : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}
          style={viewMode === 'list' ? { boxShadow: '0 4px 16px rgba(55,114,255,0.35)' } : {}}
        >
          <i className="bi bi-list-ul"></i> List
        </button>
      </div>

      {/* ── CALENDAR VIEW ── */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
          {/* Calendar card */}
          <div className="nock-card p-4 sm:p-6">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors">
                <i className="bi bi-chevron-left"></i>
              </button>
              <div className="text-center">
                <div className="text-lg font-extrabold text-slate-800 dark:text-white">{MONTHS[viewMonth]} {viewYear}</div>
                <button onClick={goToToday} className="text-xs text-primary-500 hover:text-primary-600 font-semibold mt-0.5">Today</button>
              </div>
              <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors">
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;
                const key = calKey(viewYear, viewMonth, day);
                const entries = dateMap[key] || [];
                const hasEntries = entries.length > 0;
                const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
                const isSelected = selectedDate === key;

                return (
                  <button
                    key={key}
                    onClick={() => handleDayClick(day)}
                    disabled={!hasEntries}
                    className={`
                      relative flex flex-col items-center justify-start pt-1.5 pb-2 rounded-xl min-h-[52px] sm:min-h-[60px] transition-all duration-150
                      ${isSelected
                        ? 'bg-primary-500 text-white shadow-lg'
                        : isToday
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : hasEntries
                            ? 'hover:bg-slate-100 dark:hover:bg-white/8 cursor-pointer text-slate-800 dark:text-slate-100'
                            : 'text-slate-300 dark:text-slate-600 cursor-default'
                      }
                    `}
                    style={isSelected ? { boxShadow: '0 4px 16px rgba(55,114,255,0.4)' } : {}}
                  >
                    <span className={`text-sm font-bold leading-none ${isToday && !isSelected ? 'text-primary-600 dark:text-primary-400' : ''}`}>
                      {day}
                    </span>
                    {/* Section color dots */}
                    {hasEntries && (
                      <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center max-w-[36px]">
                        {entries.slice(0, 3).map((e, i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : getSectionColor(e.section, allSections) }}
                          />
                        ))}
                        {entries.length > 3 && (
                          <div className={`text-[8px] font-bold leading-none mt-0.5 ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                            +{entries.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Entry count badge */}
                    {hasEntries && entries.length > 1 && !isSelected && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary-500 text-white text-[9px] font-bold flex items-center justify-center">
                        {entries.length}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/40 flex flex-wrap gap-3">
              {allSections.map((sec, i) => (
                <div key={sec} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SECTION_COLORS[i % SECTION_COLORS.length] }}></div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{sec}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div>
            {!selectedDate ? (
              <div className="nock-card p-8 text-center">
                <i className="bi bi-calendar-event text-4xl text-slate-300 dark:text-slate-600 block mb-3"></i>
                <p className="text-slate-400 font-medium text-sm">Select a highlighted date<br />to view its entries</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">Entries for</div>
                    <div className="text-lg font-extrabold text-slate-800 dark:text-white">
                      {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <button onClick={() => setSelectedDate(null)} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                    <i className="bi bi-x-lg text-sm"></i>
                  </button>
                </div>
                {selectedEntries.map(record => (
                  <EntryCard
                    key={record.id}
                    record={record}
                    teams={teams}
                    isReadOnly={isReadOnly}
                    onStartEdit={onStartEdit}
                    onDelete={handleDelete}
                    onDownload={downloadSingleRecordPdf}
                    allSections={allSections}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div>
          {/* Filters */}
          <div className="nock-card p-4 mb-5 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                placeholder="Search by date, event, or type..."
                value={listSearch}
                onChange={e => setListSearch(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            <select value={listSection} onChange={e => setListSection(e.target.value)} className="form-select sm:w-48">
              <option value="all">All Types</option>
              {allSections.map(sec => <option key={sec} value={sec}>{sec}</option>)}
            </select>
          </div>

          {listRecords.length === 0 ? (
            <div className="nock-card p-12 text-center">
              <i className="bi bi-clock-history text-4xl text-slate-300 dark:text-slate-600 block mb-3"></i>
              <p className="text-slate-400 font-medium">No records found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {listRecords.map(record => (
                <EntryCard
                  key={record.id}
                  record={record}
                  teams={teams}
                  isReadOnly={isReadOnly}
                  onStartEdit={onStartEdit}
                  onDelete={handleDelete}
                  onDownload={downloadSingleRecordPdf}
                  allSections={allSections}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {recordToDelete && (
        <div className="modal-overlay" onClick={() => setRecordToDelete(null)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <i className="bi bi-exclamation-triangle-fill text-red-600 dark:text-red-400"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Confirm Delete</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-1">Permanently delete this attendance record?</p>
              <p className="text-sm text-slate-400 mb-6">
                <strong>{recordToDelete.section}</strong> on {toLocalDateStr(recordToDelete.date)}
              </p>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setRecordToDelete(null)}>Cancel</Button>
                <Button variant="danger" onClick={confirmDelete}>Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AttendanceLog;