import React, { useMemo, useState, useRef, useEffect } from 'react';
import PageHeader from './Layout/PageHeader';
import Card from './UI/Card';
import StatCard from './UI/StatCard';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pointValues, statusMultipliers } from './ScoreLogic';
import { sanitizeText } from '../utils/pdfUtils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function isoToKey(dateStr) { return dateStr; }
function calKey(year, month, day) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; }

function MyStats({ user, history, teams = [], theme, sundaySchedule = [], eventSchedules = [] }) {
  const isDark = theme === 'dark';
  const today = new Date();

  // Stats state
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  // Calendar state
  const [calViewYear, setCalViewYear] = useState(today.getFullYear());
  const [calViewMonth, setCalViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD"

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const safeHistory = useMemo(() => history || [], [history]);

  // ─── USER STATS CALCULATION ───
  const userStats = useMemo(() => {

    const currentYear = new Date().getFullYear();
    const relevantHistory = safeHistory.filter(event => pointValues.hasOwnProperty(event.section) && new Date(event.date).getFullYear() === currentYear);
    const sortedHistory = [...relevantHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalPointsAwarded = 0; let totalMaxPoints = 0;
    const sectionData = {};
    const excuseCountsByMonth = {};

    const allMyRecords = relevantHistory.flatMap(event => event.records.filter(r => r.id === user.id));
    const excusedCount = allMyRecords.filter(r => r.status === 'Excused').length;
    const excusedPresentCount = allMyRecords.filter(r => r.status === 'Excused but Present').length;

    sortedHistory.forEach(event => {
      const myRecord = event.records.find(r => r.id === user.id);
      if (myRecord) {
        const sectionName = event.section;
        if (!sectionData[sectionName]) sectionData[sectionName] = { pointsAwarded: 0, maxPoints: 0 };
        const maxPointsForEvent = pointValues[sectionName] || 0;

        if ((event.section === 'Sunday evening mass' || event.section === 'Marriage mass') && event.scheduledTeamId) {
          const scheduledTeam = teams.find(t => t.id === event.scheduledTeamId);
          const isMyTeamScheduled = event.scheduledTeamId === 'whole' || (scheduledTeam && scheduledTeam.members.includes(user.id));
          if (!isMyTeamScheduled) {
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

        if (myRecord.status === 'Not Applicable') return; // Fully excluded from percentage
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
      totalPointsAwarded: totalPointsAwarded.toFixed(1), totalMaxPoints: totalMaxPoints.toFixed(1),
      excusedCount, excusedPresentCount, percentage: totalMaxPoints > 0 ? ((totalPointsAwarded / totalMaxPoints) * 100).toFixed(1) : '0.0', sectionData
    };
  }, [user, safeHistory, teams]);

  // ─── MONTHLY / YEARLY BREAKDOWN ───
  const monthlyYearlyStats = useMemo(() => {

    const recordsInYear = safeHistory.filter(event => new Date(event.date).getFullYear() === selectedYear);

    if (selectedMonth === 'all') {
      const myRecordsInYear = recordsInYear.flatMap(e => e.records.filter(r => r.id === user.id));
      const totalExcusesUsed = myRecordsInYear.filter(r => r.status === 'Excused').length;
      let yearlyPoints = 0; let yearlyMaxPoints = 0;
      const excuseCountsByMonth = {};

      [...recordsInYear].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(event => {
        const myRecord = event.records.find(r => r.id === user.id);
        if (myRecord && pointValues[event.section]) {
          const maxPointsForEvent = pointValues[event.section];
          if ((event.section === 'Sunday evening mass' || event.section === 'Marriage mass') && event.scheduledTeamId) {
            const scheduledTeam = teams.find(t => t.id === event.scheduledTeamId);
            const isMyTeamScheduled = event.scheduledTeamId === 'whole' || (scheduledTeam && scheduledTeam.members.includes(user.id));
            if (!isMyTeamScheduled) {
              if (myRecord.status === 'Present' || myRecord.status === 'Excused but Present') {
                yearlyMaxPoints += maxPointsForEvent;
                yearlyPoints += maxPointsForEvent * (statusMultipliers[myRecord.status] || 0);
              }
              return;
            }
          }
          if (myRecord.status === 'Not Applicable') return; // Fully excluded from percentage
          yearlyMaxPoints += maxPointsForEvent;
          let effectiveStatus = myRecord.status;
          if (myRecord.status === 'Excused') {
            const month = event.date.substring(0, 7);
            excuseCountsByMonth[month] = (excuseCountsByMonth[month] || 0) + 1;
            if (excuseCountsByMonth[month] > 2) effectiveStatus = 'Absent';
          }
          yearlyPoints += maxPointsForEvent * (statusMultipliers[effectiveStatus] || 0);
        }
      });
      return { percentage: yearlyMaxPoints > 0 ? ((yearlyPoints / yearlyMaxPoints) * 100).toFixed(1) : '0.0', excusesUsed: totalExcusesUsed, excuseBalance: Math.max(0, 24 - totalExcusesUsed), period: `Year ${selectedYear}` };
    } else {
      const recordsInMonth = recordsInYear.filter(event => new Date(event.date).getMonth() === parseInt(selectedMonth));
      const myRecordsInMonth = recordsInMonth.flatMap(e => e.records.filter(r => r.id === user.id));
      const totalExcusesUsed = myRecordsInMonth.filter(r => r.status === 'Excused').length;
      let monthlyPoints = 0; let monthlyMaxPoints = 0; let excuseCounter = 0;

      recordsInMonth.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(event => {
        const myRecord = event.records.find(r => r.id === user.id);
        if (myRecord && pointValues[event.section]) {
          const maxPointsForEvent = pointValues[event.section];
          if ((event.section === 'Sunday evening mass' || event.section === 'Marriage mass') && event.scheduledTeamId) {
            const scheduledTeam = teams.find(t => t.id === event.scheduledTeamId);
            const isMyTeamScheduled = event.scheduledTeamId === 'whole' || (scheduledTeam && scheduledTeam.members.includes(user.id));
            if (!isMyTeamScheduled) {
              if (myRecord.status === 'Present' || myRecord.status === 'Excused but Present') {
                monthlyMaxPoints += maxPointsForEvent;
                monthlyPoints += maxPointsForEvent * (statusMultipliers[myRecord.status] || 0);
              }
              return;
            }
          }
          if (myRecord.status === 'Not Applicable') return; // Fully excluded from percentage
          monthlyMaxPoints += maxPointsForEvent;
          let effectiveStatus = myRecord.status;
          if (myRecord.status === 'Excused') {
            excuseCounter++;
            if (excuseCounter > 2) effectiveStatus = 'Absent';
          }
          monthlyPoints += maxPointsForEvent * (statusMultipliers[effectiveStatus] || 0);
        }
      });
      return { percentage: monthlyMaxPoints > 0 ? ((monthlyPoints / monthlyMaxPoints) * 100).toFixed(1) : '0.0', excusesUsed: totalExcusesUsed, excuseBalance: Math.max(0, 2 - totalExcusesUsed), period: new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' }) };
    }
  }, [user, safeHistory, selectedYear, selectedMonth, teams]);

  // ─── CALENDAR LOGIC ───
  const myAttendanceMap = useMemo(() => {
    const map = {};
    safeHistory.forEach(event => {
      const myRecord = event.records.find(r => r.id === user.id);
      if (myRecord) {
        const key = isoToKey(event.date);
        if (!map[key]) map[key] = [];
        map[key].push({
          ...event,
          myStatus: myRecord.status,
          myReason: myRecord.reason,
          pointsPossible: pointValues[event.section] || 0
        });
      }
    });

    const isAssignedToTeam = (teamId) => {
      if (teamId === 'whole') return true;
      const team = teams.find(t => t.id === teamId);
      return team && team.members.includes(user.id);
    };

    sundaySchedule.forEach(sch => {
      if (isAssignedToTeam(sch.teamId)) {
        const key = isoToKey(sch.date);
        if (!map[key]) map[key] = [];
        const hasRecord = map[key].some(e => e.section === 'Sunday evening mass');
        if (!hasRecord) {
          map[key].push({
            date: sch.date,
            section: 'Sunday evening mass',
            eventName: 'Sunday Evening Mass',
            myStatus: 'Scheduled',
            scheduledTeamId: sch.teamId,
            teamName: sch.teamName || 'Scheduled Team',
            pointsPossible: pointValues['Sunday evening mass'] || 0
          });
        }
      }
    });

    eventSchedules.forEach(sch => {
      if (isAssignedToTeam(sch.teamId)) {
        const key = isoToKey(sch.date);
        if (!map[key]) map[key] = [];
        const hasRecord = map[key].some(e => e.section === sch.type);
        if (!hasRecord) {
          map[key].push({
            date: sch.date,
            section: sch.type,
            eventName: sch.name + (sch.time ? ` (${sch.time})` : ''),
            myStatus: 'Scheduled',
            scheduledTeamId: sch.teamId,
            teamName: sch.teamId === 'whole' ? 'Whole Choir' : (sch.teamName || 'Scheduled for you'),
            pointsPossible: pointValues[sch.type] || 0
          });
        }
      }
    });

    return map;
  }, [safeHistory, user, sundaySchedule, eventSchedules, teams]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calViewYear, calViewMonth, 1).getDay();
    const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calViewYear, calViewMonth]);

  const prevMonth = () => {
    if (calViewMonth === 0) { setCalViewYear(y => y - 1); setCalViewMonth(11); }
    else setCalViewMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (calViewMonth === 11) { setCalViewYear(y => y + 1); setCalViewMonth(0); }
    else setCalViewMonth(m => m + 1);
    setSelectedDate(null);
  };
  const goToToday = () => {
    setCalViewYear(today.getFullYear());
    setCalViewMonth(today.getMonth());
    setSelectedDate(null);
  };

  const selectedEntries = selectedDate ? (myAttendanceMap[selectedDate] || []) : [];

  // ─── DOWNLOADS ───
  const downloadYearlyPdf = () => {
    const currentYear = new Date().getFullYear();
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text(`My Attendance Report - ${currentYear}`, 14, 22);
    doc.setFontSize(14); doc.text(sanitizeText(user.name), 14, 30);
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Report Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 36);
    autoTable(doc, { startY: 45, head: [['Category', 'Value']], body: [[`My Attendance % (${currentYear})`, `${userStats.percentage}%`], ['Total Credits Earned', `${userStats.totalPointsAwarded} / ${userStats.totalMaxPoints}`], ['"Excused but Present" Count', userStats.excusedPresentCount], ['"Excused" Absences Count', userStats.excusedCount]], theme: 'striped', headStyles: { fillColor: [13, 110, 253] } });
    const tableRows = Object.entries(userStats.sectionData).map(([section, data]) => { const percentage = data.maxPoints > 0 ? ((data.pointsAwarded / data.maxPoints) * 100).toFixed(1) : "0.0"; return [section, `${data.pointsAwarded.toFixed(1)} / ${data.maxPoints.toFixed(1)}`, `${percentage}%`]; });
    autoTable(doc, { startY: (doc).lastAutoTable.finalY + 10, head: [["Gathering Type", "Your Points", "Percentage (%)"]], body: tableRows, theme: 'grid', headStyles: { fillColor: [22, 160, 133] } });

    // Detailed Event Log
    const recordsInYear = safeHistory.filter(event => new Date(event.date).getFullYear() === currentYear).sort((a, b) => new Date(a.date) - new Date(b.date));
    const detailedRows = recordsInYear.map(event => {
      const myRecord = event.records.find(r => r.id === user.id);
      const status = myRecord ? myRecord.status : 'Not Marked';
      const reason = (status === 'Excused' || status === 'Excused but Present') ? myRecord.reason || '-' : '-';
      return [
        new Date(event.date).toLocaleDateString('en-GB'),
        sanitizeText(event.section),
        sanitizeText(event.eventName || '-'),
        status,
        sanitizeText(reason)
      ];
    });

    if (detailedRows.length > 0) {
      doc.setFontSize(14);
      doc.text('Detailed Event Log', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Date', 'Event Type', 'Event Name', 'Status', 'Reason']],
        body: detailedRows,
        theme: 'grid',
        headStyles: { fillColor: [75, 85, 99] }, // Slate-600
        didParseCell: function (data) {
          if (data.section === 'body' && data.column.index === 3) {
            if (data.cell.raw === 'Absent') data.cell.styles.textColor = [220, 53, 69];
            else if (data.cell.raw === 'Excused') data.cell.styles.textColor = [255, 193, 7];
            else if (data.cell.raw === 'Present') data.cell.styles.textColor = [25, 135, 84];
          }
        }
      });
    }

    doc.save(`My_Yearly_Report_${currentYear}_${sanitizeText(user.name).replace(/\s+/g, '_')}.pdf`);
  };

  const downloadMonthlyPdf = () => {
    if (selectedMonth === 'all') return;
    const doc = new jsPDF();
    const recordsInMonth = safeHistory.filter(event => new Date(event.date).getFullYear() === selectedYear && new Date(event.date).getMonth() === parseInt(selectedMonth)).sort((a, b) => new Date(a.date) - new Date(b.date));
    doc.setFontSize(18); doc.text('Monthly Attendance Report', 14, 22); doc.setFontSize(14); doc.text(user.name, 14, 30); doc.setFontSize(11); doc.setTextColor(100); doc.text(`Report for: ${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}`, 14, 36);
    const eventDetailsRows = recordsInMonth.map(event => { const myRecord = event.records.find(r => r.id === user.id); const status = myRecord ? myRecord.status : 'Not Marked'; const reason = (status === 'Excused' || status === 'Excused but Present') ? myRecord.reason || '-' : '-'; return [new Date(event.date).toLocaleDateString('en-GB'), sanitizeText(event.section), sanitizeText(event.eventName || '-'), status, sanitizeText(reason)]; });
    autoTable(doc, { startY: 45, head: [['Date', 'Event Type', 'Event Name', 'My Status', 'Reason']], body: eventDetailsRows, theme: 'grid', headStyles: { fillColor: [13, 110, 253] } });
    doc.save(`Monthly_Report_${sanitizeText(user.name).replace(/\s+/g, '_')}_${selectedYear}_${parseInt(selectedMonth) + 1}.pdf`);
  };

  const downloadAbsentExcusedPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text('Absence & Excuse Report', 14, 22); doc.setFontSize(14); doc.text(user.name, 14, 30); doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Filter: All Records`, 14, 36); doc.text(`Report Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 42);
    // Re-calculating absent/excused for PDF since we removed the logic from state
    const records = [];
    safeHistory.forEach(event => {
      const myRecord = event.records.find(r => r.id === user.id);
      if (myRecord && (myRecord.status === 'Absent' || myRecord.status === 'Excused')) {
        records.push({ date: event.date, eventType: event.section, eventName: event.eventName || '-', status: myRecord.status, reason: myRecord.status === 'Excused' ? (myRecord.reason || '-') : '-' });
      }
    });
    const tableRows = records.sort((a, b) => new Date(b.date) - new Date(a.date)).map(record => [new Date(record.date).toLocaleDateString('en-GB'), sanitizeText(record.eventType), sanitizeText(record.eventName), record.status, sanitizeText(record.reason)]);

    autoTable(doc, { startY: 50, head: [['Date', 'Event Type', 'Event Name', 'Status', 'Reason']], body: tableRows, theme: 'grid', headStyles: { fillColor: [220, 53, 69] }, didParseCell: function (data) { if (data.section === 'body' && data.column.index === 3) { if (data.cell.raw === 'Absent') data.cell.styles.fillColor = [255, 230, 230]; else if (data.cell.raw === 'Excused') data.cell.styles.fillColor = [255, 250, 205]; } } });
    doc.save(`Absence_Excuse_Report_${sanitizeText(user.name).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const availableYears = useMemo(() => {
    if (!safeHistory || safeHistory.length === 0) return [new Date().getFullYear()];
    const years = new Set(safeHistory.map(event => new Date(event.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [safeHistory]);

  // ─── CHARTS ───
  const activityColors = ['rgba(99,102,241,0.85)', 'rgba(239,68,68,0.85)', 'rgba(245,158,11,0.85)', 'rgba(16,185,129,0.85)', 'rgba(139,92,246,0.85)', 'rgba(249,115,22,0.85)', 'rgba(20,184,166,0.85)', 'rgba(236,72,153,0.85)', 'rgba(59,130,246,0.85)', 'rgba(107,114,128,0.85)'];
  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(0,0,0,0.06)';
  const barData = {
    labels: Object.keys(userStats.sectionData),
    datasets: [{
      label: 'Attendance %',
      data: Object.values(userStats.sectionData).map(s => s.maxPoints > 0 ? (s.pointsAwarded / s.maxPoints) * 100 : 0),
      backgroundColor: activityColors.slice(0, Object.keys(userStats.sectionData).length),
      borderRadius: 8, borderWidth: 0,
    }],
  };
  const barOptions = {
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100, ticks: { color: tickColor, font: { size: 11 }, callback: (v) => v + '%' }, grid: { color: gridColor }, border: { color: 'transparent' } },
      x: { ticks: { color: tickColor, font: { size: 10 }, maxRotation: 35, minRotation: 0 }, grid: { display: false }, border: { color: 'transparent' } },
    },
  };

  // SVG Radial Progress
  const pct = parseFloat(userStats.percentage);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const earned = parseFloat(userStats.totalPointsAwarded);
  const total = parseFloat(userStats.totalMaxPoints);
  const missed = total - earned;
  const earnedDash = total > 0 ? (earned / total) * circumference : 0;
  const ringColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      <PageHeader
        title="My Statistics"
        subtitle="Track your attendance performance and history."
        actions={
          <div className="relative" ref={downloadMenuRef}>
            <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} className="btn btn-primary flex items-center gap-2">
              <i className="bi bi-download"></i> Download Report <i className="bi bi-chevron-down text-xs"></i>
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden text-sm animate-fade-in-down">
                <button onClick={() => { downloadYearlyPdf(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50">Current Year Report ({new Date().getFullYear()})</button>
                <button onClick={() => { downloadMonthlyPdf(); setShowDownloadMenu(false); }} disabled={selectedMonth === 'all'} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed">Monthly Report {selectedMonth !== 'all' ? `(${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'short' })})` : '(Select Month)'}</button>
                <button onClick={() => { downloadAbsentExcusedPdf(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">Absence & Excuse Report</button>
              </div>
            )}
          </div>
        }
      />

      <Card className="mb-6">
        <Card.Header><h5 className="font-bold text-slate-800 dark:text-white text-base font-heading">Monthly Breakdown</h5></Card.Header>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div><label className="form-label">Year</label><select className="form-select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>{availableYears.map(year => <option key={year} value={year}>{year}</option>)}</select></div>
            <div><label className="form-label">Month</label><select className="form-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}><option value="all">All Months (View Yearly)</option>{Array.from({ length: 12 }, (_, i) => (<option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>))}</select></div>
          </div>
          <div className="text-center mb-6">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Statistics For</div>
            <h4 className="text-2xl font-bold text-primary-600 dark:text-primary-400">{monthlyYearlyStats.period}</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="Attendance" value={`${monthlyYearlyStats.percentage}%`} icon="bi-pie-chart-fill" color={parseFloat(monthlyYearlyStats.percentage) >= 80 ? 'success' : 'warning'} />
            <StatCard title="Absences (Excused)" value={monthlyYearlyStats.excusesUsed} icon="bi-calendar-x-fill" color="danger" />
            <StatCard title="Excuses Remaining" value={monthlyYearlyStats.excuseBalance} icon="bi-check-circle-fill" color="info" />
          </div>
        </Card.Body>
      </Card>

      {/* ─── YEARLY PERFORMANCE CARDS (UNCHANGED) ─── */}
      <div className="mb-4 pl-3 border-l-4 border-primary-500">
        <h5 className="font-bold text-slate-800 dark:text-white">Yearly Performance ({new Date().getFullYear()})</h5>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="h-full">
          <Card.Body className="flex flex-col items-center justify-center text-center p-8">
            <i className="bi bi-trophy-fill text-5xl text-amber-400 mb-4"></i>
            <h2 className="text-5xl font-extrabold text-slate-800 dark:text-white mb-1">{userStats.percentage}%</h2>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Overall Attendance</div>
            <div className="mt-4 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
              {userStats.totalPointsAwarded} / {userStats.totalMaxPoints} Credits
            </div>
          </Card.Body>
          <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-700">
            <div className="p-4 text-center border-r border-slate-100 dark:border-slate-700">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Excused Present</div>
              <div className="text-xl font-bold text-emerald-500">{userStats.excusedPresentCount}</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Excuses</div>
              <div className="text-xl font-bold text-red-500">{userStats.excusedCount}</div>
            </div>
          </div>
        </Card>
        <div className="lg:col-span-2">
          <Card className="h-full">
            <Card.Header><h5 className="font-bold text-slate-800 dark:text-white text-base font-heading">Credit Distribution</h5></Card.Header>
            <Card.Body className="flex flex-col items-center justify-center gap-6 py-6">
              <div className="relative flex items-center justify-center">
                <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
                  <circle cx="100" cy="100" r={radius} fill="none" stroke={isDark ? 'rgba(51,65,85,0.8)' : 'rgba(226,232,240,0.8)'} strokeWidth="18" />
                  <circle cx="100" cy="100" r={radius} fill="none" stroke={ringColor} strokeWidth="18" strokeLinecap="round" strokeDasharray={`${earnedDash} ${circumference}`} style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.4s ease', filter: `drop-shadow(0 0 8px ${ringColor}60)` }} />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-extrabold" style={{ color: ringColor }}>{userStats.percentage}%</span>
                  <span className="text-xs font-semibold text-slate-400 mt-0.5">Attendance</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: ringColor }}></span>
                  <div className="text-sm">
                    <div className="font-bold text-slate-800 dark:text-white">{earned.toFixed(1)}</div>
                    <div className="text-xs text-slate-400">Credits Earned</div>
                  </div>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-400 flex-shrink-0"></span>
                  <div className="text-sm">
                    <div className="font-bold text-slate-800 dark:text-white">{missed.toFixed(1)}</div>
                    <div className="text-xs text-slate-400">Credits Missed</div>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* ─── ACTIVITY BREAKDOWN CHART (UNCHANGED) ─── */}
      <Card className="mb-6">
        <Card.Header><h5 className="font-bold text-slate-800 dark:text-white text-base font-heading">Activity Breakdown</h5></Card.Header>
        <Card.Body>
          <div className="h-[280px] sm:h-[320px]">
            <Bar key={isDark ? 'dark' : 'light'} data={barData} options={barOptions} />
          </div>
        </Card.Body>
      </Card>

      {/* ─── CALENDAR: ABSENCE & EXCUSE TRACKER ─── */}
      <h5 className="font-bold text-slate-800 dark:text-white mb-4 pl-3 border-l-4 border-primary-500">Attendance Calendar</h5>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Calendar Card */}
        <div className="nock-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"><i className="bi bi-chevron-left"></i></button>
            <div className="text-center">
              <div className="text-lg font-extrabold text-slate-800 dark:text-white">{MONTHS[calViewMonth]} {calViewYear}</div>
              <button onClick={goToToday} className="text-xs text-primary-500 hover:text-primary-600 font-semibold mt-0.5">Today</button>
            </div>
            <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"><i className="bi bi-chevron-right"></i></button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} />;
              const key = calKey(calViewYear, calViewMonth, day);
              const entries = myAttendanceMap[key] || [];
              const hasEntries = entries.length > 0;
              const isToday = day === today.getDate() && calViewMonth === today.getMonth() && calViewYear === today.getFullYear();
              const isSelected = selectedDate === key;

              return (
                <button
                  key={key}
                  onClick={() => hasEntries && setSelectedDate(prev => prev === key ? null : key)}
                  disabled={!hasEntries}
                  className={`
                    relative flex flex-col items-center justify-start pt-1.5 rounded-xl h-10 sm:h-14 w-full transition-all duration-150
                    ${isSelected ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-navy-900 z-10 bg-white dark:bg-navy-800 shadow-lg' : ''}
                    ${!isSelected && isToday ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : ''}
                    ${!isSelected && !isToday && hasEntries ? 'hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer' : ''}
                    ${!isSelected && !isToday && !hasEntries ? 'text-slate-300 dark:text-slate-700 cursor-default' : ''}
                  `}
                >
                  <span className={`text-sm font-bold leading-none ${isToday && !isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {day}
                  </span>

                  {/* Event Dots */}
                  {hasEntries && (
                    <div className="flex gap-0.5 mt-1.5 flex-wrap justify-center px-1">
                      {entries.slice(0, 4).map((e, i) => {
                        let dotColor = 'bg-emerald-500'; // Default Present
                        if (e.myStatus === 'Absent') dotColor = 'bg-red-500';
                        else if (e.myStatus === 'Excused') dotColor = 'bg-amber-500';
                        else if (e.myStatus === 'Excused but Present') dotColor = 'bg-sky-500';
                        else if (e.myStatus === 'Not Applicable') dotColor = 'bg-slate-400';
                        else if (e.myStatus === 'Scheduled') dotColor = 'bg-indigo-500';

                        return (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                            title={`${e.section}: ${e.myStatus}`}
                          ></div>
                        );
                      })}
                      {entries.length > 4 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-x-4 gap-y-2 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div><span className="text-xs text-slate-500 dark:text-slate-400">Present</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-500"></div><span className="text-xs text-slate-500 dark:text-slate-400">Excused Present</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-xs text-slate-500 dark:text-slate-400">Excused</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-xs text-slate-500 dark:text-slate-400">Absent</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400"></div><span className="text-xs text-slate-500 dark:text-slate-400">Not Applicable</span></div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="flex flex-col gap-4">
          {!selectedDate ? (
            <div className="nock-card p-8 text-center h-full flex flex-col items-center justify-center min-h-[200px]">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <i className="bi bi-calendar-event text-xl text-slate-400"></i>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Tap a colored date to<br />view your records</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h6 className="font-bold text-slate-800 dark:text-white">
                  {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h6>
                <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="bi bi-x-lg"></i></button>
              </div>

              {selectedEntries.map((entry, idx) => (
                <div key={idx} className="nock-card p-4 relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-1 h-full ${entry.myStatus === 'Absent' ? 'bg-red-500' :
                    entry.myStatus === 'Excused' ? 'bg-amber-500' :
                      entry.myStatus === 'Excused but Present' ? 'bg-sky-500' :
                        entry.myStatus === 'Not Applicable' ? 'bg-slate-400' :
                          entry.myStatus === 'Scheduled' ? 'bg-indigo-500' : 'bg-emerald-500'
                    }`}></div>

                  <div className="pl-3">
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{entry.section}</div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase
                        ${entry.myStatus === 'Absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          entry.myStatus === 'Excused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            entry.myStatus === 'Excused but Present' ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' :
                              entry.myStatus === 'Not Applicable' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' :
                                entry.myStatus === 'Scheduled' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        }
                      `}>
                        {entry.myStatus}
                      </span>
                    </div>
                    {entry.eventName && <div className="text-sm font-semibold text-slate-800 dark:text-white mb-2">{entry.eventName}</div>}

                    {entry.myReason && (
                      <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-xs italic text-slate-500 border border-slate-100 dark:border-slate-700/50">
                        <i className="bi bi-chat-quote-fill mr-1.5 opacity-50"></i>{entry.myReason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MyStats;