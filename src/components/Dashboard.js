import React, { useState, useMemo } from 'react';
import PageHeader from './Layout/PageHeader';
import StatCard from './UI/StatCard';
import Card from './UI/Card';
import { pointValues, statusMultipliers } from './ScoreLogic';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard({ user, attendanceHistory = [], choirMembersList = [], isLoading, teams = [], theme }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');

  const isDark = theme === 'dark';

  const getOrdinalSuffix = (n) => {
    if (n > 3 && n < 21) return n + 'th';
    switch (n % 10) {
      case 1: return n + 'st';
      case 2: return n + 'nd';
      case 3: return n + 'rd';
      default: return n + 'th';
    }
  };

  const availableYears = useMemo(() => {
    if (!attendanceHistory || attendanceHistory.length === 0) return [new Date().getFullYear()];
    const years = new Set(attendanceHistory.map(event => new Date(event.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [attendanceHistory]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const yearlyEvents = attendanceHistory.filter(event => new Date(event.date).getFullYear() === parseInt(selectedYear));
    yearlyEvents.forEach(event => months.add(new Date(event.date).getMonth()));
    return Array.from(months).sort((a, b) => a - b).map(monthIndex => ({ value: monthIndex.toString(), name: monthNames[monthIndex] }));
  }, [attendanceHistory, selectedYear]);

  const filteredHistory = useMemo(() => {
    let history = (attendanceHistory || []).filter(event => new Date(event.date).getFullYear() === parseInt(selectedYear));
    if (selectedMonth !== '') {
      history = history.filter(event => new Date(event.date).getMonth() === parseInt(selectedMonth));
    }
    return history;
  }, [attendanceHistory, selectedYear, selectedMonth]);

  const { upcomingBirthdays, upcomingAnniversaries } = useMemo(() => {
    if (!choirMembersList || choirMembersList.length === 0) return { upcomingBirthdays: [], upcomingAnniversaries: [] };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const next30Days = new Date(today); next30Days.setDate(today.getDate() + 30);
    const birthdays = []; const anniversaries = [];

    choirMembersList.forEach(member => {
      if (member.dob) {
        const dob = new Date(member.dob);
        const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        let isUpcoming = birthdayThisYear >= today && birthdayThisYear <= next30Days;
        if (!isUpcoming && today.getMonth() === 11 && dob.getMonth() === 0) {
          isUpcoming = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate()) <= next30Days;
        }
        if (isUpcoming) birthdays.push({ date: birthdayThisYear, name: member.name, birthdayYear: today.getFullYear() - dob.getFullYear() });
      }
      if (member.maritalStatus === 'Married' && member.weddingDate) {
        const wd = new Date(member.weddingDate);
        const annivThisYear = new Date(today.getFullYear(), wd.getMonth(), wd.getDate());
        let isUpcoming = annivThisYear >= today && annivThisYear <= next30Days;
        if (!isUpcoming && today.getMonth() === 11 && wd.getMonth() === 0) {
          isUpcoming = new Date(today.getFullYear() + 1, wd.getMonth(), wd.getDate()) <= next30Days;
        }
        if (isUpcoming) anniversaries.push({ date: annivThisYear, name: member.name, anniversaryYear: today.getFullYear() - wd.getFullYear() });
      }
    });
    birthdays.sort((a, b) => a.date - b.date);
    anniversaries.sort((a, b) => a.date - b.date);
    return { upcomingBirthdays: birthdays, upcomingAnniversaries: anniversaries };
  }, [choirMembersList]);

  const dashboardData = useMemo(() => {
    const defaultData = { totalMembers: choirMembersList ? choirMembersList.length : 0, averageAttendance: 0, totalEvents: 0, topPerformers: [], needsAttention: [], sortedMembers: [], menAttendance: 0, womenAttendance: 0 };
    if (!filteredHistory || filteredHistory.length === 0 || !choirMembersList || choirMembersList.length === 0) return defaultData;
    const relevantHistory = filteredHistory.filter(event => event.records && event.records.length > 0);
    if (relevantHistory.length === 0) return { ...defaultData, totalMembers: choirMembersList.length };

    const memberStats = (choirMembersList || []).map(member => {
      let totalPointsAwarded = 0; let totalMaxPoints = 0;
      const excuseCountsByMonth = {};
      const userSundayTeam = teams ? teams.find(t => t.type === 'sunday' && t.members.includes(member.id)) : null;

      relevantHistory.forEach(event => {
        const eventPoints = pointValues[event.section] || 0;
        if (eventPoints > 0) {
          const record = event.records ? event.records.find(rec => rec.id === member.id) : null;
          if (!record) return;
          if (event.section === 'Sunday evening mass' && event.scheduledTeamId) {
            const isMyTeamScheduled = event.scheduledTeamId === userSundayTeam?.id;
            if (!isMyTeamScheduled) {
              if (record.status === 'Present' || record.status === 'Excused but Present') {
                totalMaxPoints += eventPoints;
                totalPointsAwarded += eventPoints * (statusMultipliers[record.status] || 0);
              }
              return;
            }
          }
          totalMaxPoints += eventPoints;
          let effectiveStatus = record.status;
          if (record.status === 'Excused') {
            const month = event.date.substring(0, 7);
            excuseCountsByMonth[month] = (excuseCountsByMonth[month] || 0) + 1;
            if (excuseCountsByMonth[month] > 2) effectiveStatus = 'Absent';
          }
          totalPointsAwarded += eventPoints * (statusMultipliers[effectiveStatus] || 0);
        }
      });
      return { id: member.id, name: member.name, totalPoints: totalPointsAwarded, totalMaxPoints, percentage: totalMaxPoints > 0 ? (totalPointsAwarded / totalMaxPoints) * 100 : 0, gender: member.gender };
    });

    const men = memberStats.filter(m => m.gender === 'Male');
    const women = memberStats.filter(m => m.gender === 'Female');
    const menAttendance = men.reduce((s, m) => s + m.totalMaxPoints, 0) > 0 ? (men.reduce((s, m) => s + m.totalPoints, 0) / men.reduce((s, m) => s + m.totalMaxPoints, 0)) * 100 : 0;
    const womenAttendance = women.reduce((s, m) => s + m.totalMaxPoints, 0) > 0 ? (women.reduce((s, m) => s + m.totalPoints, 0) / women.reduce((s, m) => s + m.totalMaxPoints, 0)) * 100 : 0;
    const sortedMembers = memberStats.sort((a, b) => b.totalPoints - a.totalPoints);

    return {
      totalMembers: choirMembersList.length,
      averageAttendance: sortedMembers.length > 0 ? sortedMembers.reduce((sum, m) => sum + m.percentage, 0) / sortedMembers.length : 0,
      totalEvents: relevantHistory.length,
      topPerformers: sortedMembers.filter(m => m.percentage >= 80).slice(0, 10),
      needsAttention: sortedMembers.filter(m => m.percentage < 60).slice(0, 10),
      sortedMembers, menAttendance, womenAttendance,
    };
  }, [filteredHistory, choirMembersList, teams]);

  const activityCounts = useMemo(() => {
    const counts = {};
    Object.keys(pointValues).forEach(section => { counts[section] = 0; });
    if (filteredHistory && filteredHistory.length > 0) {
      filteredHistory.forEach(event => { if (event.section && counts.hasOwnProperty(event.section)) counts[event.section]++; });
    }
    return counts;
  }, [filteredHistory]);

  const reminderAlert = useMemo(() => {
    if (!choirMembersList || !user || user.role !== 'admin') return null;
    const now = new Date(); const day = now.getDay(); const hour = now.getHours();
    if ((day === 0 || day === 6) && hour >= 21) {
      const offset = now.getTimezoneOffset();
      const localDate = new Date(now.getTime() - (offset * 60 * 1000));
      const todayStr = localDate.toISOString().split('T')[0];
      if (!attendanceHistory.some(record => record.date === todayStr)) {
        return (
          <div className="alert alert-warning mb-5">
            <div className="flex items-center gap-2 font-bold mb-1"><i className="bi bi-exclamation-triangle-fill"></i> Attendance Reminder</div>
            <p className="text-sm mb-0">It's {day === 6 ? 'Saturday' : 'Sunday'} evening and no attendance has been recorded for today. Please remember to mark attendance.</p>
          </div>
        );
      }
    }
    return null;
  }, [user, attendanceHistory, choirMembersList]);

  if (isLoading) {
    return <div className="flex flex-col items-center justify-center min-h-[60vh]"><div className="spinner"></div><p className="mt-3 text-slate-500">Loading Dashboard...</p></div>;
  }

  // Chart colors — vibrant and visible in both modes
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

  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#94a3b8' : '#64748b'; // slate-400 / slate-500
  const legendColor = isDark ? '#cbd5e1' : '#475569'; // slate-300 / slate-600

  const chartData = {
    labels: Object.keys(activityCounts),
    datasets: [{
      label: 'Events',
      data: Object.values(activityCounts),
      backgroundColor: activityColors.slice(0, Object.keys(activityCounts).length),
      borderWidth: 0,
      borderRadius: 8,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          color: legendColor,
          padding: 16,
          font: { size: 12, family: 'Inter, sans-serif' },
        },
      },
      title: { display: false },
      tooltip: {
        backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
        titleColor: isDark ? '#e2e8f0' : '#1e293b',
        bodyColor: isDark ? '#94a3b8' : '#475569',
        borderColor: isDark ? 'rgba(71,85,105,0.5)' : 'rgba(226,232,240,0.8)',
        borderWidth: 1,
        cornerRadius: 10,
        padding: 10,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: tickColor, font: { size: 11 }, stepSize: 1 },
        grid: { color: gridColor },
        border: { color: 'transparent' },
      },
      x: {
        ticks: {
          color: tickColor,
          font: { size: 10 },
          maxRotation: 30,
          minRotation: 0,
        },
        grid: { display: false },
        border: { color: 'transparent' },
      },
    },
  };

  const renderPerformanceTable = (title, members, colorClass, emptyMsg) => (
    <Card className="h-full">
      <Card.Header><h5 className="font-bold text-slate-800 dark:text-white text-sm">{title}</h5></Card.Header>
      <Card.Body className="p-0">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>Member</th><th className="text-right">Score</th></tr></thead>
            <tbody>
              {members.length > 0 ? members.map(m => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}>{m.percentage.toFixed(0)}</span>
                      <span className="text-sm">{m.name}</span>
                    </div>
                  </td>
                  <td className={`text-right font-bold text-sm ${colorClass.includes('emerald') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{m.percentage.toFixed(1)}%</td>
                </tr>
              )) : (
                <tr><td colSpan="2" className="text-center text-slate-400 py-4 text-sm">{emptyMsg}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card.Body>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Overview for ${selectedMonth ? availableMonths.find(m => m.value === selectedMonth)?.name + ' ' : ''}${selectedYear}`}
      />

      {reminderAlert}

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div>
          <label className="form-label">Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="form-select">
            {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label">Month</label>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="form-select">
            <option value="">All Months</option>
            {availableMonths.map(month => <option key={month.value} value={month.value}>{month.name}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <StatCard title="Total Members" value={dashboardData.totalMembers} icon="bi-people-fill" color="primary" />
        <StatCard title="Avg. Attendance" value={`${dashboardData.averageAttendance.toFixed(1)}%`} icon="bi-bar-chart-fill" color="success" />
        <StatCard title="Men's Avg." value={`${dashboardData.menAttendance.toFixed(1)}%`} icon="bi-gender-male" color="info" />
        <StatCard title="Women's Avg." value={`${dashboardData.womenAttendance.toFixed(1)}%`} icon="bi-gender-female" color="warning" />
      </div>

      {/* Chart + Celebrations */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <div className="xl:col-span-2">
          <Card>
            <Card.Header><h5 className="font-bold text-slate-800 dark:text-white text-sm">Activity Breakdown</h5></Card.Header>
            <Card.Body>
              <div className="relative h-[280px] sm:h-[350px]">
                <Bar key={isDark ? 'dark' : 'light'} options={chartOptions} data={chartData} />
              </div>
            </Card.Body>
          </Card>
        </div>
        <div>
          <Card className="h-full">
            <Card.Header><h5 className="font-bold text-slate-800 dark:text-white text-sm">Celebrations 🎉</h5></Card.Header>
            <Card.Body>
              <div className="mb-4">
                <h6 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Upcoming Birthdays</h6>
                {upcomingBirthdays.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingBirthdays.slice(0, 3).map((b, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0"><i className="bi bi-balloon-fill text-xs"></i></div>
                        <div><div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{b.name}</div><div className="text-xs text-slate-400 dark:text-slate-500">{b.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({getOrdinalSuffix(b.birthdayYear)})</div></div>
                      </div>
                    ))}
                    {upcomingBirthdays.length > 3 && <div className="text-center text-xs text-slate-400">+{upcomingBirthdays.length - 3} more</div>}
                  </div>
                ) : <div className="text-sm italic text-slate-400">No upcoming birthdays.</div>}
              </div>
              <hr className="border-slate-200 dark:border-slate-700 my-4" />
              <div>
                <h6 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-2">Upcoming Anniversaries</h6>
                {upcomingAnniversaries.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingAnniversaries.slice(0, 3).map((a, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 flex items-center justify-center flex-shrink-0"><i className="bi bi-heart-fill text-xs"></i></div>
                        <div><div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{a.name}</div><div className="text-xs text-slate-400 dark:text-slate-500">{a.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ({getOrdinalSuffix(a.anniversaryYear)})</div></div>
                      </div>
                    ))}
                    {upcomingAnniversaries.length > 3 && <div className="text-center text-xs text-slate-400">+{upcomingAnniversaries.length - 3} more</div>}
                  </div>
                ) : <div className="text-sm italic text-slate-400">No upcoming anniversaries.</div>}
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Performance Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {renderPerformanceTable('Top Performers (≥80%)', dashboardData.topPerformers, 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', 'No data available')}
        {renderPerformanceTable('Needs Attention (<60%)', dashboardData.needsAttention, 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', 'No data available')}
      </div>
    </>
  );
}

export default Dashboard;
