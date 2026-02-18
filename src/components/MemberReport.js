import React, { useMemo, useState, useRef, useEffect } from 'react';
import PageHeader from './Layout/PageHeader';
import Card from './UI/Card';
import StatCard from './UI/StatCard';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pointValues, statusMultipliers } from './ScoreLogic';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// ─── Compute yearly stats for a single member ───────────────────────────────
function computeStats(member, attendanceHistory, teams) {
  const userSundayTeam = teams.find(t => t.type === 'sunday' && t.members.includes(member.id));
  const currentYear = new Date().getFullYear();
  const relevantHistory = attendanceHistory.filter(
    event => pointValues.hasOwnProperty(event.section) && new Date(event.date).getFullYear() === currentYear
  );
  const sortedHistory = [...relevantHistory].sort((a, b) => new Date(a.date) - new Date(b.date));

  let totalPointsAwarded = 0;
  let totalMaxPoints = 0;
  const sectionData = {};
  const excuseCountsByMonth = {};
  const allMyRecords = relevantHistory.flatMap(event => event.records.filter(r => r.id === member.id));
  const excusedCount = allMyRecords.filter(r => r.status === 'Excused').length;
  const excusedPresentCount = allMyRecords.filter(r => r.status === 'Excused but Present').length;

  sortedHistory.forEach(event => {
    const myRecord = event.records.find(r => r.id === member.id);
    if (myRecord) {
      const sectionName = event.section;
      if (!sectionData[sectionName]) sectionData[sectionName] = { pointsAwarded: 0, maxPoints: 0 };
      const maxPointsForEvent = pointValues[sectionName] || 0;

      if (event.section === 'Sunday evening mass' && event.scheduledTeamId) {
        if (event.scheduledTeamId !== userSundayTeam?.id) {
          if (myRecord.status === 'Present' || myRecord.status === 'Excused but Present') {
            totalMaxPoints += maxPointsForEvent;
            sectionData[sectionName].maxPoints += maxPointsForEvent;
            const awarded = maxPointsForEvent * (statusMultipliers[myRecord.status] || 0);
            totalPointsAwarded += awarded;
            sectionData[sectionName].pointsAwarded += awarded;
          }
          return;
        }
      }

      totalMaxPoints += maxPointsForEvent;
      sectionData[sectionName].maxPoints += maxPointsForEvent;
      let effectiveStatus = myRecord.status;
      if (myRecord.status === 'Excused') {
        const month = event.date.substring(0, 7);
        excuseCountsByMonth[month] = (excuseCountsByMonth[month] || 0) + 1;
        if (excuseCountsByMonth[month] > 2) effectiveStatus = 'Absent';
      }
      const awarded = maxPointsForEvent * (statusMultipliers[effectiveStatus] || 0);
      totalPointsAwarded += awarded;
      sectionData[sectionName].pointsAwarded += awarded;
    }
  });

  return {
    totalPointsAwarded: totalPointsAwarded.toFixed(1),
    totalMaxPoints: totalMaxPoints.toFixed(1),
    excusedCount,
    excusedPresentCount,
    percentage: totalMaxPoints > 0 ? ((totalPointsAwarded / totalMaxPoints) * 100).toFixed(1) : '0.0',
    sectionData,
  };
}

// ─── Attendance badge ────────────────────────────────────────────────────────
function AttendanceBadge({ pct }) {
  const p = parseFloat(pct);
  if (p >= 80) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">{pct}%</span>;
  if (p >= 60) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">{pct}%</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">{pct}%</span>;
}

// ─── Mini progress bar ───────────────────────────────────────────────────────
function ProgressBar({ pct }) {
  const p = parseFloat(pct);
  const color = p >= 80 ? '#45B36B' : p >= 60 ? '#f59e0b' : '#EF466F';
  return (
    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }} />
    </div>
  );
}

// ─── Activity bar chart colors ───────────────────────────────────────────────
const activityColors = [
  'rgba(99,102,241,0.85)', 'rgba(239,68,68,0.85)', 'rgba(245,158,11,0.85)',
  'rgba(16,185,129,0.85)', 'rgba(139,92,246,0.85)', 'rgba(249,115,22,0.85)',
  'rgba(20,184,166,0.85)', 'rgba(236,72,153,0.85)', 'rgba(59,130,246,0.85)',
];

// ─── Expanded detail panel ───────────────────────────────────────────────────
function MemberDetailPanel({ member, stats, attendanceHistory, teams, theme }) {
  const isDark = theme === 'dark';
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) setShowDownloadMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableYears = useMemo(() => {
    if (!attendanceHistory || attendanceHistory.length === 0) return [new Date().getFullYear()];
    const years = new Set(attendanceHistory.map(e => new Date(e.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [attendanceHistory]);

  const monthlyYearlyStats = useMemo(() => {
    const userSundayTeam = teams.find(t => t.type === 'sunday' && t.members.includes(member.id));
    const recordsInYear = attendanceHistory.filter(e => new Date(e.date).getFullYear() === selectedYear);
    if (selectedMonth === 'all') {
      const myRecordsInYear = recordsInYear.flatMap(e => e.records.filter(r => r.id === member.id));
      const totalExcusesUsed = myRecordsInYear.filter(r => r.status === 'Excused').length;
      let yearlyPoints = 0; let yearlyMaxPoints = 0;
      const excuseCountsByMonth = {};
      [...recordsInYear].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(event => {
        const myRecord = event.records.find(r => r.id === member.id);
        if (myRecord && pointValues[event.section]) {
          const maxPts = pointValues[event.section];
          if (event.section === 'Sunday evening mass' && event.scheduledTeamId) {
            if (event.scheduledTeamId !== userSundayTeam?.id) {
              if (myRecord.status === 'Present' || myRecord.status === 'Excused but Present') {
                yearlyMaxPoints += maxPts;
                yearlyPoints += maxPts * (statusMultipliers[myRecord.status] || 0);
              }
              return;
            }
          }
          yearlyMaxPoints += maxPts;
          let effectiveStatus = myRecord.status;
          if (myRecord.status === 'Excused') {
            const month = event.date.substring(0, 7);
            excuseCountsByMonth[month] = (excuseCountsByMonth[month] || 0) + 1;
            if (excuseCountsByMonth[month] > 2) effectiveStatus = 'Absent';
          }
          yearlyPoints += maxPts * (statusMultipliers[effectiveStatus] || 0);
        }
      });
      return { percentage: yearlyMaxPoints > 0 ? ((yearlyPoints / yearlyMaxPoints) * 100).toFixed(1) : '0.0', excusesUsed: totalExcusesUsed, excuseBalance: Math.max(0, 24 - totalExcusesUsed), period: `Year ${selectedYear}` };
    } else {
      const recordsInMonth = recordsInYear.filter(e => new Date(e.date).getMonth() === parseInt(selectedMonth));
      const myRecordsInMonth = recordsInMonth.flatMap(e => e.records.filter(r => r.id === member.id));
      const totalExcusesUsed = myRecordsInMonth.filter(r => r.status === 'Excused').length;
      let monthlyPoints = 0; let monthlyMaxPoints = 0; let excuseCounter = 0;
      recordsInMonth.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(event => {
        const myRecord = event.records.find(r => r.id === member.id);
        if (myRecord && pointValues[event.section]) {
          const maxPts = pointValues[event.section];
          if (event.section === 'Sunday evening mass' && event.scheduledTeamId) {
            if (event.scheduledTeamId !== userSundayTeam?.id) {
              if (myRecord.status === 'Present' || myRecord.status === 'Excused but Present') {
                monthlyMaxPoints += maxPts;
                monthlyPoints += maxPts * (statusMultipliers[myRecord.status] || 0);
              }
              return;
            }
          }
          monthlyMaxPoints += maxPts;
          let effectiveStatus = myRecord.status;
          if (myRecord.status === 'Excused') { excuseCounter++; if (excuseCounter > 2) effectiveStatus = 'Absent'; }
          monthlyPoints += maxPts * (statusMultipliers[effectiveStatus] || 0);
        }
      });
      return { percentage: monthlyMaxPoints > 0 ? ((monthlyPoints / monthlyMaxPoints) * 100).toFixed(1) : '0.0', excusesUsed: totalExcusesUsed, excuseBalance: Math.max(0, 2 - totalExcusesUsed), period: new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' }) };
    }
  }, [member, attendanceHistory, selectedYear, selectedMonth, teams]);

  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(0,0,0,0.06)';

  const barData = {
    labels: Object.keys(stats.sectionData),
    datasets: [{
      label: 'Attendance %',
      data: Object.values(stats.sectionData).map(s => s.maxPoints > 0 ? (s.pointsAwarded / s.maxPoints) * 100 : 0),
      backgroundColor: activityColors.slice(0, Object.keys(stats.sectionData).length),
      borderRadius: 8,
      borderWidth: 0,
    }],
  };

  const barOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.y.toFixed(1)}%` } },
    },
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { color: tickColor, callback: v => v + '%' }, grid: { color: gridColor }, border: { color: 'transparent' } },
      x: { ticks: { color: tickColor, font: { size: 10 }, maxRotation: 35 }, grid: { display: false }, border: { color: 'transparent' } },
    },
  };

  const downloadYearlyPdf = () => {
    const currentYear = new Date().getFullYear();
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text(`Attendance Report - ${currentYear}`, 14, 22);
    doc.setFontSize(14); doc.text(member.name, 14, 30);
    const summaryBody = [[`Attendance % (${currentYear})`, `${stats.percentage}%`], ['Total Points Earned', `${stats.totalPointsAwarded} / ${stats.totalMaxPoints}`], ['Excused Absences', stats.excusedCount], ['Excuse Balance', `${Math.max(0, 24 - stats.excusedCount)} / 24`], ['Excused but Present', stats.excusedPresentCount]];
    autoTable(doc, { startY: 40, head: [['Current Year Summary', 'Value']], body: summaryBody, theme: 'striped', headStyles: { fillColor: [55, 114, 255] } });
    const tableRows = Object.entries(stats.sectionData).map(([section, data]) => { const pct = data.maxPoints > 0 ? ((data.pointsAwarded / data.maxPoints) * 100).toFixed(1) : '0.0'; return [section, `${data.pointsAwarded.toFixed(1)} / ${data.maxPoints.toFixed(1)}`, `${pct}%`]; });
    if (tableRows.length > 0) autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [['Gathering Type Breakdown', 'Points', 'Percentage (%)']], body: tableRows, theme: 'grid', headStyles: { fillColor: [22, 160, 133] } });
    doc.save(`Yearly_Report_${currentYear}_${member.name.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadMonthlyPdf = () => {
    if (selectedMonth === 'all') return;
    const doc = new jsPDF();
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
    doc.setFontSize(18); doc.text('Monthly Attendance Report', 14, 22);
    doc.setFontSize(14); doc.text(member.name, 14, 30);
    doc.setFontSize(11); doc.setTextColor(100); doc.text(`Report for: ${monthName}`, 14, 36);
    const summaryBody = [['Overall Attendance', `${monthlyYearlyStats.percentage}%`], ['Excused Absences', monthlyYearlyStats.excusesUsed], ['Excuse Balance', `${monthlyYearlyStats.excuseBalance} / 2`]];
    autoTable(doc, { startY: 45, head: [['Monthly Summary', 'Value']], body: summaryBody, theme: 'striped' });
    doc.save(`Monthly_Report_${member.name.replace(/\s+/g, '_')}_${selectedYear}_${parseInt(selectedMonth) + 1}.pdf`);
  };

  return (
    <div className="mt-3 border-t border-slate-100 dark:border-slate-700/50 pt-4 space-y-4 animate-slide-up">
      {/* Period filters + download */}
      <div className="flex flex-col sm:flex-row gap-3 items-end justify-between">
        <div className="flex gap-3 flex-wrap">
          <div>
            <label className="form-label">Year</label>
            <select className="form-select" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Month</label>
            <select className="form-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              <option value="all">All Months</option>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>)}
            </select>
          </div>
        </div>
        <div className="relative" ref={downloadMenuRef}>
          <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 transition-colors" style={{ boxShadow: '0 4px 16px rgba(55,114,255,0.35)' }}>
            <i className="bi bi-download"></i> Download <i className="bi bi-chevron-down text-xs"></i>
          </button>
          {showDownloadMenu && (
            <div className="absolute right-0 mt-2 w-56 nock-card z-50 overflow-hidden text-sm">
              <button onClick={() => { downloadYearlyPdf(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/40">
                Current Year Report ({new Date().getFullYear()})
              </button>
              <button onClick={() => { downloadMonthlyPdf(); setShowDownloadMenu(false); }} disabled={selectedMonth === 'all'} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed">
                Monthly Report {selectedMonth !== 'all' ? `(${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'short' })})` : '(Select Month)'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Period stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title={`Attendance — ${monthlyYearlyStats.period}`} value={`${monthlyYearlyStats.percentage}%`} icon="bi-pie-chart-fill" color={parseFloat(monthlyYearlyStats.percentage) >= 80 ? 'success' : 'warning'} />
        <StatCard title="Excused Absences" value={monthlyYearlyStats.excusesUsed} icon="bi-calendar-x-fill" color="danger" />
        <StatCard title="Excuses Remaining" value={monthlyYearlyStats.excuseBalance} icon="bi-check-circle-fill" color="info" />
      </div>

      {/* Yearly overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="nock-card p-4 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Overall ({new Date().getFullYear()})</div>
          <div className="text-2xl font-extrabold" style={{ color: parseFloat(stats.percentage) >= 80 ? '#45B36B' : parseFloat(stats.percentage) >= 60 ? '#f59e0b' : '#EF466F' }}>{stats.percentage}%</div>
        </div>
        <div className="nock-card p-4 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Credits</div>
          <div className="text-lg font-extrabold text-slate-800 dark:text-white">{stats.totalPointsAwarded}<span className="text-xs text-slate-400 font-normal"> / {stats.totalMaxPoints}</span></div>
        </div>
        <div className="nock-card p-4 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Excused Present</div>
          <div className="text-2xl font-extrabold text-emerald-500">{stats.excusedPresentCount}</div>
        </div>
        <div className="nock-card p-4 text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Excuses</div>
          <div className="text-2xl font-extrabold text-red-500">{stats.excusedCount}</div>
        </div>
      </div>

      {/* Activity breakdown chart */}
      {Object.keys(stats.sectionData).length > 0 && (
        <div className="nock-card p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Activity Breakdown</div>
          <div className="h-[200px]">
            <Bar key={isDark ? 'dark' : 'light'} data={barData} options={barOptions} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
function MemberReport({ attendanceHistory, choirMembersList, isLoading, teams = [], theme }) {
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  const membersWithStats = useMemo(() => {
    if (!choirMembersList || !attendanceHistory) return [];
    return [...choirMembersList]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(member => ({
        member,
        stats: computeStats(member, attendanceHistory, teams),
      }));
  }, [choirMembersList, attendanceHistory, teams]);

  const filtered = useMemo(() => {
    if (!search.trim()) return membersWithStats;
    return membersWithStats.filter(({ member }) =>
      member.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [membersWithStats, search]);

  const toggle = (id) => setExpandedId(prev => prev === id ? null : id);

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="spinner"></div></div>;

  return (
    <div>
      <PageHeader
        title="Member Reports"
        subtitle={`Attendance overview for all ${choirMembersList.length} members — click to expand details.`}
      />

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <i className="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input
          type="text"
          placeholder="Search member..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-input pl-10"
        />
      </div>

      {/* Member list */}
      <div className="nock-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No members found.</div>
        ) : (
          filtered.map(({ member, stats }, idx) => {
            const isOpen = expandedId === member.id;
            const pct = parseFloat(stats.percentage);
            const ringColor = pct >= 80 ? '#45B36B' : pct >= 60 ? '#f59e0b' : '#EF466F';

            return (
              <div
                key={member.id}
                className={`${idx < filtered.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/40' : ''}`}
              >
                {/* Row */}
                <button
                  onClick={() => toggle(member.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${ringColor}cc, ${ringColor})` }}
                  >
                    {member.name.charAt(0)}
                  </div>

                  {/* Name + progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800 dark:text-white text-sm truncate">{member.name}</span>
                      {member.gender && (
                        <i className={`bi ${member.gender === 'Male' ? 'bi-gender-male text-sky-400' : 'bi-gender-female text-amber-400'} text-xs flex-shrink-0`}></i>
                      )}
                    </div>
                    <ProgressBar pct={stats.percentage} />
                  </div>

                  {/* Stats summary */}
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0 text-right">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Credits</div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{stats.totalPointsAwarded}/{stats.totalMaxPoints}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Excuses</div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">{stats.excusedCount}</div>
                    </div>
                  </div>

                  {/* Badge + chevron */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <AttendanceBadge pct={stats.percentage} />
                    <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} text-slate-400 text-xs transition-transform duration-200`}></i>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-5">
                    <MemberDetailPanel
                      member={member}
                      stats={stats}
                      attendanceHistory={attendanceHistory}
                      teams={teams}
                      theme={theme}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MemberReport;