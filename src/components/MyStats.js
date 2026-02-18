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

function MyStats({ user, history, teams = [], theme }) {
  const isDark = theme === 'dark';
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [absenceFilter, setAbsenceFilter] = useState('all');
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

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

  const userStats = useMemo(() => {
    const userSundayTeam = teams.find(t => t.type === 'sunday' && t.members.includes(user.id));
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

        if (event.section === 'Sunday evening mass' && event.scheduledTeamId) {
          const isMyTeamScheduled = event.scheduledTeamId === userSundayTeam?.id;
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

  const availableYears = useMemo(() => {
    if (!safeHistory || safeHistory.length === 0) return [new Date().getFullYear()];
    const years = new Set(safeHistory.map(event => new Date(event.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [safeHistory]);

  const monthlyYearlyStats = useMemo(() => {
    const userSundayTeam = teams.find(t => t.type === 'sunday' && t.members.includes(user.id));
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
          if (event.section === 'Sunday evening mass' && event.scheduledTeamId) {
            if (event.scheduledTeamId !== userSundayTeam?.id) {
              if (myRecord.status === 'Present' || myRecord.status === 'Excused but Present') {
                yearlyMaxPoints += maxPointsForEvent;
                yearlyPoints += maxPointsForEvent * (statusMultipliers[myRecord.status] || 0);
              }
              return;
            }
          }
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
          if (event.section === 'Sunday evening mass' && event.scheduledTeamId) {
            if (event.scheduledTeamId !== userSundayTeam?.id) {
              if (myRecord.status === 'Present' || myRecord.status === 'Excused but Present') {
                monthlyMaxPoints += maxPointsForEvent;
                monthlyPoints += maxPointsForEvent * (statusMultipliers[myRecord.status] || 0);
              }
              return;
            }
          }
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

  const absentExcusedDates = useMemo(() => {
    const records = [];
    safeHistory.forEach(event => {
      const myRecord = event.records.find(r => r.id === user.id);
      if (myRecord && (myRecord.status === 'Absent' || myRecord.status === 'Excused')) {
        records.push({ date: event.date, eventType: event.section, eventName: event.eventName || '-', status: myRecord.status, reason: myRecord.status === 'Excused' ? (myRecord.reason || '-') : '-' });
      }
    });
    return records.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [user, safeHistory]);

  const filteredAbsences = useMemo(() => {
    if (absenceFilter === 'absent') return absentExcusedDates.filter(record => record.status === 'Absent');
    else if (absenceFilter === 'excused') return absentExcusedDates.filter(record => record.status === 'Excused');
    return absentExcusedDates;
  }, [absentExcusedDates, absenceFilter]);

  const downloadYearlyPdf = () => {
    const currentYear = new Date().getFullYear();
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text(`My Attendance Report - ${currentYear}`, 14, 22);
    doc.setFontSize(14); doc.text(user.name, 14, 30);
    doc.setFontSize(10); doc.setTextColor(100); doc.text(`Report Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 36);
    autoTable(doc, { startY: 45, head: [['Category', 'Value']], body: [[`My Attendance % (${currentYear})`, `${userStats.percentage}%`], ['Total Credits Earned', `${userStats.totalPointsAwarded} / ${userStats.totalMaxPoints}`], ['"Excused but Present" Count', userStats.excusedPresentCount], ['"Excused" Absences Count', userStats.excusedCount]], theme: 'striped', headStyles: { fillColor: [13, 110, 253] } });
    const tableRows = Object.entries(userStats.sectionData).map(([section, data]) => { const percentage = data.maxPoints > 0 ? ((data.pointsAwarded / data.maxPoints) * 100).toFixed(1) : "0.0"; return [section, `${data.pointsAwarded.toFixed(1)} / ${data.maxPoints.toFixed(1)}`, `${percentage}%`]; });
    autoTable(doc, { startY: (doc).lastAutoTable.finalY + 10, head: [["Gathering Type", "Your Points", "Percentage (%)"]], body: tableRows, theme: 'grid', headStyles: { fillColor: [22, 160, 133] } });
    doc.save(`My_Yearly_Report_${currentYear}_${user.name.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadMonthlyPdf = () => {
    if (selectedMonth === 'all') return;
    const doc = new jsPDF();
    const recordsInMonth = safeHistory.filter(event => new Date(event.date).getFullYear() === selectedYear && new Date(event.date).getMonth() === parseInt(selectedMonth)).sort((a, b) => new Date(a.date) - new Date(b.date));
    doc.setFontSize(18); doc.text('Monthly Attendance Report', 14, 22); doc.setFontSize(14); doc.text(user.name, 14, 30); doc.setFontSize(11); doc.setTextColor(100); doc.text(`Report for: ${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}`, 14, 36);
    const eventDetailsRows = recordsInMonth.map(event => { const myRecord = event.records.find(r => r.id === user.id); const status = myRecord ? myRecord.status : 'Not Marked'; const reason = (status === 'Excused' || status === 'Excused but Present') ? myRecord.reason || '-' : '-'; return [new Date(event.date).toLocaleDateString('en-GB'), event.section, event.eventName || '-', status, reason]; });
    autoTable(doc, { startY: 45, head: [['Date', 'Event Type', 'Event Name', 'My Status', 'Reason']], body: eventDetailsRows, theme: 'grid', headStyles: { fillColor: [13, 110, 253] } });
    doc.save(`Monthly_Report_${user.name.replace(/\s+/g, '_')}_${selectedYear}_${parseInt(selectedMonth) + 1}.pdf`);
  };

  const downloadAbsentExcusedPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text('Absence & Excuse Report', 14, 22); doc.setFontSize(14); doc.text(user.name, 14, 30); doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Filter: ${absenceFilter === 'all' ? 'All Records' : absenceFilter === 'absent' ? 'Absent Only' : 'Excused Only'}`, 14, 36); doc.text(`Report Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 42);
    const tableRows = filteredAbsences.map(record => [new Date(record.date).toLocaleDateString('en-GB'), record.eventType, record.eventName, record.status, record.reason]);
    autoTable(doc, { startY: 50, head: [['Date', 'Event Type', 'Event Name', 'Status', 'Reason']], body: tableRows, theme: 'grid', headStyles: { fillColor: [220, 53, 69] }, didParseCell: function (data) { if (data.section === 'body' && data.column.index === 3) { if (data.cell.raw === 'Absent') data.cell.styles.fillColor = [255, 230, 230]; else if (data.cell.raw === 'Excused') data.cell.styles.fillColor = [255, 250, 205]; } } });
    autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [['Summary', 'Count']], body: [['Total Absences', filteredAbsences.filter(r => r.status === 'Absent').length], ['Total Excused', filteredAbsences.filter(r => r.status === 'Excused').length], ['Total Records', filteredAbsences.length]], theme: 'striped', headStyles: { fillColor: [22, 160, 133] } });
    doc.save(`Absence_Excuse_Report_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const activityColors = [
    'rgba(99,102,241,0.85)',   // indigo
    'rgba(239,68,68,0.85)',    // red
    'rgba(245,158,11,0.85)',   // amber
    'rgba(16,185,129,0.85)',   // emerald
    'rgba(139,92,246,0.85)',   // violet
    'rgba(249,115,22,0.85)',   // orange
    'rgba(20,184,166,0.85)',   // teal
    'rgba(236,72,153,0.85)',   // pink
    'rgba(59,130,246,0.85)',   // blue
    'rgba(107,114,128,0.85)',  // gray
  ];

  const tickColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(0,0,0,0.06)';
  const tooltipBg = isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)';
  const tooltipTitle = isDark ? '#e2e8f0' : '#1e293b';
  const tooltipBody = isDark ? '#94a3b8' : '#475569';
  const tooltipBorder = isDark ? 'rgba(71,85,105,0.5)' : 'rgba(226,232,240,0.8)';

  const barData = {
    labels: Object.keys(userStats.sectionData),
    datasets: [{
      label: 'Attendance %',
      data: Object.values(userStats.sectionData).map(s => s.maxPoints > 0 ? (s.pointsAwarded / s.maxPoints) * 100 : 0),
      backgroundColor: activityColors.slice(0, Object.keys(userStats.sectionData).length),
      borderRadius: 8,
      borderWidth: 0,
    }],
  };

  const barOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipTitle,
        bodyColor: tooltipBody,
        borderColor: tooltipBorder,
        borderWidth: 1,
        cornerRadius: 10,
        padding: 10,
        callbacks: { label: (ctx) => ` ${ctx.parsed.y.toFixed(1)}%` },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { color: tickColor, font: { size: 11 }, callback: (v) => v + '%' },
        grid: { color: gridColor },
        border: { color: 'transparent' },
      },
      x: {
        ticks: { color: tickColor, font: { size: 10 }, maxRotation: 35, minRotation: 0 },
        grid: { display: false },
        border: { color: 'transparent' },
      },
    },
  };

  // SVG Radial Progress Ring values
  const pct = parseFloat(userStats.percentage);
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const earned = parseFloat(userStats.totalPointsAwarded);
  const total = parseFloat(userStats.totalMaxPoints);
  const missed = total - earned;
  const earnedDash = total > 0 ? (earned / total) * circumference : 0;
  const ringColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'; // emerald / amber / red

  return (
    <div>
      <PageHeader
        title="My Statistics"
        subtitle="Track your attendance performance and history."
        actions={
          <div className="relative" ref={downloadMenuRef}>
            <button
              onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              className="btn btn-primary flex items-center gap-2"
            >
              <i className="bi bi-download"></i> Download Report <i className="bi bi-chevron-down text-xs"></i>
            </button>
            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden text-sm">
                <button onClick={() => { downloadYearlyPdf(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50">Current Year Report ({new Date().getFullYear()})</button>
                <button onClick={() => { downloadMonthlyPdf(); setShowDownloadMenu(false); }} disabled={selectedMonth === 'all'} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed">Monthly Report {selectedMonth !== 'all' ? `(${new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'short' })})` : '(Select Month)'}</button>
                <button onClick={() => { downloadAbsentExcusedPdf(); setShowDownloadMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200">Absence & Excuse Report</button>
              </div>
            )}
          </div>
        }
      />

      <Card className="mb-6">
        <Card.Header><h5 className="font-bold text-slate-800 dark:text-white text-sm">Monthly Breakdown</h5></Card.Header>
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

      <Card className="mb-6">
        <Card.Header>
          <div className="flex justify-between items-center">
            <h5 className="font-bold text-slate-800 dark:text-white text-sm">Absence & Excuse Details</h5>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase hidden sm:inline">Filter:</span>
              <select className="form-select py-1 text-sm w-36" value={absenceFilter} onChange={(e) => setAbsenceFilter(e.target.value)}>
                <option value="all">All Records</option>
                <option value="absent">Absent Only</option>
                <option value="excused">Excused Only</option>
              </select>
            </div>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="overflow-x-auto">
            {filteredAbsences.length === 0 ? (
              <div className="text-center py-10">
                <i className="bi bi-check-circle-fill text-4xl text-emerald-200 dark:text-emerald-900 mb-3 block"></i>
                <p className="font-medium text-slate-700 dark:text-slate-300">No {absenceFilter === 'all' ? 'absence' : absenceFilter} records found.</p>
                <p className="text-sm text-slate-400">Great job keeping up with attendance!</p>
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Event Type</th><th>Status</th><th>Reason</th></tr></thead>
                <tbody>
                  {filteredAbsences.map((record, index) => (
                    <tr key={index}>
                      <td className="font-medium">{new Date(record.date).toLocaleDateString('en-GB')}</td>
                      <td><div>{record.eventType}</div><div className="text-xs text-slate-400">{record.eventName}</div></td>
                      <td><span className={`badge ${record.status === 'Absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{record.status}</span></td>
                      <td className="text-sm italic text-slate-500 dark:text-slate-400">{record.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <i className="bi bi-info-circle mr-1"></i> Showing {filteredAbsences.length} record(s).
          </div>
        </Card.Body>
      </Card>

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
            <Card.Header><h5 className="font-bold text-slate-800 dark:text-white text-sm">Credit Distribution</h5></Card.Header>
            <Card.Body className="flex flex-col items-center justify-center gap-6 py-6">
              {/* SVG Radial Progress Ring */}
              <div className="relative flex items-center justify-center">
                <svg width="200" height="200" viewBox="0 0 200 200" className="-rotate-90">
                  {/* Background track */}
                  <circle cx="100" cy="100" r={radius} fill="none" stroke={isDark ? 'rgba(51,65,85,0.8)' : 'rgba(226,232,240,0.8)'} strokeWidth="18" />
                  {/* Progress arc */}
                  <circle
                    cx="100" cy="100" r={radius} fill="none"
                    stroke={ringColor}
                    strokeWidth="18"
                    strokeLinecap="round"
                    strokeDasharray={`${earnedDash} ${circumference}`}
                    style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.4s ease', filter: `drop-shadow(0 0 8px ${ringColor}60)` }}
                  />
                </svg>
                {/* Center label */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-extrabold" style={{ color: ringColor }}>{userStats.percentage}%</span>
                  <span className="text-xs font-semibold text-slate-400 mt-0.5">Attendance</span>
                </div>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" style={{ backgroundColor: ringColor }}></span>
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

      <Card>
        <Card.Header><h5 className="font-bold text-slate-800 dark:text-white text-sm">Activity Breakdown</h5></Card.Header>
        <Card.Body>
          <div className="h-[280px] sm:h-[320px]">
            <Bar key={isDark ? 'dark' : 'light'} data={barData} options={barOptions} />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default MyStats;