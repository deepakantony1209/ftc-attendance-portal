import React, { useMemo, useState, useRef, useEffect } from 'react';
import PageHeader from './Layout/PageHeader';

import StatCard from './UI/StatCard';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pointValues, statusMultipliers } from './ScoreLogic';

import { sanitizeText } from '../utils/pdfUtils';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// ─── Compute yearly stats for a single member ───────────────────────────────
function computeStats(member, attendanceHistory, teams) {
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

      if ((event.section === 'Sunday evening mass' || event.section === 'Marriage mass') && event.scheduledTeamId) {
        const scheduledTeam = teams.find(t => t.id === event.scheduledTeamId);
        const isMyTeamScheduled = event.scheduledTeamId === 'whole' || (scheduledTeam && scheduledTeam.members.includes(member.id));
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
// ─── Constants ──────────────────────────────────────────────────────────────
const ALL_CATEGORIES = [
  'Sunday evening mass',
  'Sunday morning mass',
  'Saturday practice',
  'Special mass',
  'Special mass practice',
  'Marriage mass',
  'Choir meeting',
  'Cleaning',
  'Daily mass',
  'Others'
];

// ─── Expanded detail panel ───────────────────────────────────────────────────
function MemberDetailPanel({ member, stats, attendanceHistory, teams, theme }) {
  const isDark = theme === 'dark';
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [activeTab, setActiveTab] = useState('performance');
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
          if ((event.section === 'Sunday evening mass' || event.section === 'Marriage mass') && event.scheduledTeamId) {
            const scheduledTeam = teams.find(t => t.id === event.scheduledTeamId);
            const isMyTeamScheduled = event.scheduledTeamId === 'whole' || (scheduledTeam && scheduledTeam.members.includes(member.id));
            if (!isMyTeamScheduled) {
              if (myRecord.status === 'Present' || myRecord.status === 'Excused but Present') {
                yearlyMaxPoints += maxPts;
                yearlyPoints += maxPts * (statusMultipliers[myRecord.status] || 0);
              }
              return;
            }
          }
          if (myRecord.status === 'Not Applicable') return;
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
          if ((event.section === 'Sunday evening mass' || event.section === 'Marriage mass') && event.scheduledTeamId) {
            const scheduledTeam = teams.find(t => t.id === event.scheduledTeamId);
            const isMyTeamScheduled = event.scheduledTeamId === 'whole' || (scheduledTeam && scheduledTeam.members.includes(member.id));
            if (!isMyTeamScheduled) {
              if (myRecord.status === 'Present' || myRecord.status === 'Excused but Present') {
                monthlyMaxPoints += maxPts;
                monthlyPoints += maxPts * (statusMultipliers[myRecord.status] || 0);
              }
              return;
            }
          }
          if (myRecord.status === 'Not Applicable') return;
          monthlyMaxPoints += maxPts;
          let effectiveStatus = myRecord.status;
          if (myRecord.status === 'Excused') { excuseCounter++; if (excuseCounter > 2) effectiveStatus = 'Absent'; }
          monthlyPoints += maxPts * (statusMultipliers[effectiveStatus] || 0);
        }
      });
      return { percentage: monthlyMaxPoints > 0 ? ((monthlyPoints / monthlyMaxPoints) * 100).toFixed(1) : '0.0', excusesUsed: totalExcusesUsed, excuseBalance: Math.max(0, 2 - totalExcusesUsed), period: new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' }) };
    }
  }, [member, attendanceHistory, selectedYear, selectedMonth, teams]);

  // Compute category counts dynamically (Present, Absent, Excused, Excused but Present)
  const categoryCounts = useMemo(() => {
    const recordsInYear = attendanceHistory.filter(e => new Date(e.date).getFullYear() === selectedYear);
    const recordsInPeriod = selectedMonth === 'all'
      ? recordsInYear
      : recordsInYear.filter(e => new Date(e.date).getMonth() === parseInt(selectedMonth));

    const counts = {};
    ALL_CATEGORIES.forEach(cat => {
      counts[cat] = { attended: 0, absent: 0, excused: 0, excusedPresent: 0, total: 0 };
    });

    recordsInPeriod.forEach(event => {
      const myRecord = event.records.find(r => r.id === member.id);
      if (myRecord) {
        const cat = event.section;
        if (!counts[cat]) {
          counts[cat] = { attended: 0, absent: 0, excused: 0, excusedPresent: 0, total: 0 };
        }

        // Apply Sunday Evening Mass and Marriage Mass team scheduling rule:
        if ((event.section === 'Sunday evening mass' || event.section === 'Marriage mass') && event.scheduledTeamId) {
          const scheduledTeam = teams.find(t => t.id === event.scheduledTeamId);
          const isMyTeamScheduled = event.scheduledTeamId === 'whole' || (scheduledTeam && scheduledTeam.members.includes(member.id));
          if (!isMyTeamScheduled) {
            if (myRecord.status === 'Present') {
              counts[cat].attended++;
              counts[cat].total++;
            } else if (myRecord.status === 'Excused but Present') {
              counts[cat].excusedPresent++;
              counts[cat].total++;
            }
            return;
          }
        }

        if (myRecord.status === 'Not Applicable') return;

        if (myRecord.status === 'Present') {
          counts[cat].attended++;
          counts[cat].total++;
        } else if (myRecord.status === 'Absent') {
          counts[cat].absent++;
          counts[cat].total++;
        } else if (myRecord.status === 'Excused') {
          counts[cat].excused++;
          counts[cat].total++;
        } else if (myRecord.status === 'Excused but Present') {
          counts[cat].excusedPresent++;
          counts[cat].total++;
        }
      }
    });

    let totalAttended = 0;
    let totalAbsent = 0;
    let totalExcused = 0;
    let totalExcusedPresent = 0;
    let totalExpected = 0;
    Object.values(counts).forEach(c => {
      totalAttended += c.attended;
      totalAbsent += c.absent;
      totalExcused += c.excused;
      totalExcusedPresent += c.excusedPresent;
      totalExpected += c.total;
    });

    return {
      breakdown: counts,
      totalAttended,
      totalAbsent,
      totalExcused,
      totalExcusedPresent,
      totalExpected
    };
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

  // Grouped Bar Chart data/options for counts (4 separate datasets)
  const chartCategories = Object.keys(categoryCounts.breakdown).filter(cat => categoryCounts.breakdown[cat].total > 0);
  const barDataCounts = {
    labels: chartCategories,
    datasets: [
      {
        label: 'Attended',
        data: chartCategories.map(cat => categoryCounts.breakdown[cat].attended),
        backgroundColor: 'rgba(16, 185, 129, 0.85)', // Emerald Green
        borderRadius: 4,
      },
      {
        label: 'Absent',
        data: chartCategories.map(cat => categoryCounts.breakdown[cat].absent),
        backgroundColor: 'rgba(239, 68, 68, 0.85)', // Rose Red
        borderRadius: 4,
      },
      {
        label: 'Excused',
        data: chartCategories.map(cat => categoryCounts.breakdown[cat].excused),
        backgroundColor: 'rgba(245, 158, 11, 0.85)', // Amber Yellow
        borderRadius: 4,
      },
      {
        label: 'Excused but Present',
        data: chartCategories.map(cat => categoryCounts.breakdown[cat].excusedPresent),
        backgroundColor: 'rgba(59, 130, 246, 0.85)', // Blue
        borderRadius: 4,
      }
    ]
  };

  const barOptionsCounts = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: tickColor,
          font: { size: 10, family: '"DM Sans", sans-serif' }
        }
      },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
        titleColor: isDark ? '#e2e8f0' : '#1e293b',
        bodyColor: isDark ? '#94a3b8' : '#475569',
        borderColor: isDark ? 'rgba(71,85,105,0.5)' : 'rgba(226,232,240,0.8)',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: tickColor, stepSize: 1 },
        grid: { color: gridColor },
        border: { color: 'transparent' }
      },
      x: {
        ticks: { color: tickColor, font: { size: 10 }, maxRotation: 35 },
        grid: { display: false },
        border: { color: 'transparent' }
      }
    }
  };

  const downloadYearlyPdf = () => {
    const currentYear = new Date().getFullYear();
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text(`Attendance Report - ${currentYear}`, 14, 22);
    doc.setFontSize(14); doc.text(sanitizeText(member.name), 14, 30);
    const summaryBody = [[`Attendance % (${currentYear})`, `${stats.percentage}%`], ['Total Points Earned', `${stats.totalPointsAwarded} / ${stats.totalMaxPoints}`], ['Excused Absences', stats.excusedCount], ['Excuse Balance', `${Math.max(0, 24 - stats.excusedCount)} / 24`], ['Excused but Present', stats.excusedPresentCount]];
    autoTable(doc, { startY: 40, head: [['Current Year Summary', 'Value']], body: summaryBody, theme: 'striped', headStyles: { fillColor: [55, 114, 255] } });
    
    const tableRows = Object.entries(stats.sectionData).map(([section, data]) => { const pct = data.maxPoints > 0 ? ((data.pointsAwarded / data.maxPoints) * 100).toFixed(1) : '0.0'; return [sanitizeText(section), `${data.pointsAwarded.toFixed(1)} / ${data.maxPoints.toFixed(1)}`, `${pct}%`]; });
    if (tableRows.length > 0) autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [['Gathering Type Breakdown', 'Points', 'Percentage (%)']], body: tableRows, theme: 'grid', headStyles: { fillColor: [22, 160, 133] } });

    // Compute yearly counts for PDF
    const yearlyCounts = {};
    ALL_CATEGORIES.forEach(cat => { yearlyCounts[cat] = { attended: 0, absent: 0, excused: 0, excusedPresent: 0, total: 0 }; });
    const recordsInYearForPdf = attendanceHistory.filter(e => new Date(e.date).getFullYear() === currentYear);
    recordsInYearForPdf.forEach(event => {
      const myRecord = event.records.find(r => r.id === member.id);
      if (myRecord) {
        const cat = event.section;
        if (!yearlyCounts[cat]) yearlyCounts[cat] = { attended: 0, absent: 0, excused: 0, excusedPresent: 0, total: 0 };
        if ((event.section === 'Sunday evening mass' || event.section === 'Marriage mass') && event.scheduledTeamId) {
          const scheduledTeam = teams.find(t => t.id === event.scheduledTeamId);
          const isMyTeamScheduled = event.scheduledTeamId === 'whole' || (scheduledTeam && scheduledTeam.members.includes(member.id));
          if (!isMyTeamScheduled) {
            if (myRecord.status === 'Present') {
              yearlyCounts[cat].attended++;
              yearlyCounts[cat].total++;
            } else if (myRecord.status === 'Excused but Present') {
              yearlyCounts[cat].excusedPresent++;
              yearlyCounts[cat].total++;
            }
            return;
          }
        }
        if (myRecord.status === 'Not Applicable') return;
        if (myRecord.status === 'Present') {
          yearlyCounts[cat].attended++;
          yearlyCounts[cat].total++;
        } else if (myRecord.status === 'Absent') {
          yearlyCounts[cat].absent++;
          yearlyCounts[cat].total++;
        } else if (myRecord.status === 'Excused') {
          yearlyCounts[cat].excused++;
          yearlyCounts[cat].total++;
        } else if (myRecord.status === 'Excused but Present') {
          yearlyCounts[cat].excusedPresent++;
          yearlyCounts[cat].total++;
        }
      }
    });

    const countRows = Object.entries(yearlyCounts)
      .filter(([_, c]) => c.total > 0)
      .map(([cat, c]) => [
        sanitizeText(cat),
        c.attended.toString(),
        c.absent.toString(),
        c.excused.toString(),
        c.excusedPresent.toString(),
        c.total.toString()
      ]);

    if (countRows.length > 0) {
      doc.setFontSize(14);
      doc.text('Gathering Type Attendance Counts', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Gathering Type', 'Attended', 'Absent', 'Excused', 'Excused but Present', 'Total Expected']],
        body: countRows,
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94] }
      });
    }

    // Detailed Event Log
    const recordsInYear = attendanceHistory.filter(e => new Date(e.date).getFullYear() === currentYear).sort((a, b) => new Date(a.date) - new Date(b.date));
    const detailedRows = [];
    recordsInYear.forEach(event => {
      const myRecord = event.records.find(r => r.id === member.id);
      if (myRecord) {
        const status = myRecord.status || 'Not Marked';
        const reason = (status === 'Excused' || status === 'Excused but Present') ? myRecord.reason || '-' : '-';
        detailedRows.push([
          new Date(event.date).toLocaleDateString('en-GB'),
          sanitizeText(event.section),
          sanitizeText(event.eventName || '-'),
          status,
          sanitizeText(reason)
        ]);
      }
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
            if (data.cell.raw === 'Absent' || data.cell.raw === 'Excused') data.cell.styles.textColor = [220, 53, 69];
            else if (data.cell.raw === 'Present' || data.cell.raw === 'Excused but Present') data.cell.styles.textColor = [25, 135, 84];
          }
        }
      });
    }

    doc.save(`Yearly_Report_${currentYear}_${sanitizeText(member.name).replace(/\s+/g, '_')}.pdf`);
  };

  const downloadMonthlyPdf = () => {
    if (selectedMonth === 'all') return;
    const doc = new jsPDF();
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
    doc.setFontSize(18); doc.text('Monthly Attendance Report', 14, 22);
    doc.setFontSize(14); doc.text(sanitizeText(member.name), 14, 30);
    doc.setFontSize(11); doc.setTextColor(100); doc.text(`Report for: ${monthName}`, 14, 36);
    const summaryBody = [['Overall Attendance', `${monthlyYearlyStats.percentage}%`], ['Excused Absences', monthlyYearlyStats.excusesUsed], ['Excuse Balance', `${monthlyYearlyStats.excuseBalance} / 2`]];
    autoTable(doc, { startY: 45, head: [['Monthly Summary', 'Value']], body: summaryBody, theme: 'striped' });

    // Compute monthly counts for PDF
    const monthlyCounts = {};
    ALL_CATEGORIES.forEach(cat => { monthlyCounts[cat] = { attended: 0, absent: 0, excused: 0, excusedPresent: 0, total: 0 }; });
    const recordsInMonthForPdf = attendanceHistory.filter(
      e => new Date(e.date).getFullYear() === selectedYear && new Date(e.date).getMonth() === parseInt(selectedMonth)
    );
    recordsInMonthForPdf.forEach(event => {
      const myRecord = event.records.find(r => r.id === member.id);
      if (myRecord) {
        const cat = event.section;
        if (!monthlyCounts[cat]) monthlyCounts[cat] = { attended: 0, absent: 0, excused: 0, excusedPresent: 0, total: 0 };
        if ((event.section === 'Sunday evening mass' || event.section === 'Marriage mass') && event.scheduledTeamId) {
          const scheduledTeam = teams.find(t => t.id === event.scheduledTeamId);
          const isMyTeamScheduled = event.scheduledTeamId === 'whole' || (scheduledTeam && scheduledTeam.members.includes(member.id));
          if (!isMyTeamScheduled) {
            if (myRecord.status === 'Present') {
              monthlyCounts[cat].attended++;
              monthlyCounts[cat].total++;
            } else if (myRecord.status === 'Excused but Present') {
              monthlyCounts[cat].excusedPresent++;
              monthlyCounts[cat].total++;
            }
            return;
          }
        }
        if (myRecord.status === 'Not Applicable') return;
        if (myRecord.status === 'Present') {
          monthlyCounts[cat].attended++;
          monthlyCounts[cat].total++;
        } else if (myRecord.status === 'Absent') {
          monthlyCounts[cat].absent++;
          monthlyCounts[cat].total++;
        } else if (myRecord.status === 'Excused') {
          monthlyCounts[cat].excused++;
          monthlyCounts[cat].total++;
        } else if (myRecord.status === 'Excused but Present') {
          monthlyCounts[cat].excusedPresent++;
          monthlyCounts[cat].total++;
        }
      }
    });

    const monthlyCountRows = Object.entries(monthlyCounts)
      .filter(([_, c]) => c.total > 0)
      .map(([cat, c]) => [
        sanitizeText(cat),
        c.attended.toString(),
        c.absent.toString(),
        c.excused.toString(),
        c.excusedPresent.toString(),
        c.total.toString()
      ]);

    if (monthlyCountRows.length > 0) {
      doc.setFontSize(14);
      doc.text('Monthly Gathering Type Attendance Counts', 14, doc.lastAutoTable.finalY + 15);
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Gathering Type', 'Attended', 'Absent', 'Excused', 'Excused but Present', 'Total Expected']],
        body: monthlyCountRows,
        theme: 'grid',
        headStyles: { fillColor: [52, 73, 94] }
      });
    }

    doc.save(`Monthly_Report_${sanitizeText(member.name).replace(/\s+/g, '_')}_${selectedYear}_${parseInt(selectedMonth) + 1}.pdf`);
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

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-700/40 pb-2">
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'performance'
              ? 'bg-primary-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <i className="bi bi-award-fill mr-1.5"></i>Scores & Credits
        </button>
        <button
          onClick={() => setActiveTab('counts')}
          className={`ml-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'counts'
              ? 'bg-primary-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <i className="bi bi-grid-fill mr-1.5"></i>Attendance Counts
        </button>
      </div>

      {activeTab === 'performance' ? (
        <>
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
        </>
      ) : (
        <>
          {/* Counts overview stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard title="Attended" value={categoryCounts.totalAttended} icon="bi-check-circle-fill" color="success" />
            <StatCard title="Absent" value={categoryCounts.totalAbsent} icon="bi-x-circle-fill" color="danger" />
            <StatCard title="Excused" value={categoryCounts.totalExcused} icon="bi-calendar-x-fill" color="warning" />
            <StatCard title="Excused but Present" value={categoryCounts.totalExcusedPresent} icon="bi-person-check-fill" color="info" />
          </div>

          {/* Grouped Bar Chart of counts */}
          {chartCategories.length > 0 ? (
            <div className="nock-card p-4">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Gathering Count Breakdown</div>
              <div className="h-[240px]">
                <Bar key={isDark ? 'dark-counts' : 'light-counts'} data={barDataCounts} options={barOptionsCounts} />
              </div>
            </div>
          ) : (
            <div className="nock-card p-8 text-center text-slate-400 text-sm">No activity recorded for this period.</div>
          )}

          {/* Detailed counts table */}
          <div className="nock-card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/10 flex items-center justify-between">
              <h6 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-0">Detailed Category Metrics</h6>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Excludes 'Not Applicable' events</span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table w-full text-xs">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/20 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-700/40">
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-center">Attended</th>
                    <th className="px-4 py-3 text-center">Absent</th>
                    <th className="px-4 py-3 text-center">Excused</th>
                    <th className="px-4 py-3 text-center">Excused but Present</th>
                    <th className="px-4 py-3 text-center">Total Expected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
                  {Object.entries(categoryCounts.breakdown).map(([category, c]) => {
                    const hasEvents = c.total > 0;
                    return (
                      <tr key={category} className={`${hasEvents ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600 opacity-60'} hover:bg-slate-50 dark:hover:bg-white/5 transition-colors`}>
                        <td className="px-4 py-3 font-semibold text-left">{category}</td>
                        <td className="px-4 py-3 text-center">
                          {c.attended > 0 ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full text-[11px]">{c.attended}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.absent > 0 ? (
                            <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded-full text-[11px]">{c.absent}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.excused > 0 ? (
                            <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full text-[11px]">{c.excused}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {c.excusedPresent > 0 ? (
                            <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full text-[11px]">{c.excusedPresent}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-800 dark:text-slate-100">
                          {c.total > 0 ? c.total : <span className="text-slate-400 dark:text-slate-600 font-normal">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
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
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800 dark:text-white text-sm">{member.name}</span>
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