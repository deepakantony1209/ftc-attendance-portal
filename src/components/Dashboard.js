import React, { useState, useMemo } from 'react';
import { Row, Col, Card, Table, Form, Spinner, ListGroup, Alert } from 'react-bootstrap';
import { pointValues, statusMultipliers } from './ScoreLogic';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard({ user, attendanceHistory = [], choirMembersList = [], isLoading }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(''); // New state for selected month

  // Helper function to get the correct ordinal suffix for a number
  const getOrdinalSuffix = (n) => {
    if (n > 3 && n < 21) return n + 'th';
    switch (n % 10) {
      case 1: return n + 'st';
      case 2: return n + 'nd';
      case 3: return n + 'rd';
      default: return n + 'th';
    }
  };
  const monthName = new Date(0, selectedMonth).toLocaleString('default', { month: 'long' });

  // 1) Hooks: all useMemo calls must be before any early return and in fixed order
  const availableYears = useMemo(() => {
    if (!attendanceHistory || attendanceHistory.length === 0) {
      return [new Date().getFullYear()];
    }
    const years = new Set(attendanceHistory.map(event => new Date(event.date).getFullYear()));
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [attendanceHistory]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // First filter by the selected year to get relevant events
    const yearlyEvents = attendanceHistory.filter(event => new Date(event.date).getFullYear() === parseInt(selectedYear));

    yearlyEvents.forEach(event => {
      months.add(new Date(event.date).getMonth());
    });

    // Sort and map month indices to names
    return Array.from(months).sort((a, b) => a - b).map(monthIndex => ({
      value: monthIndex.toString(),
      name: monthNames[monthIndex]
    }));
  }, [attendanceHistory, selectedYear]);


  const filteredHistory = useMemo(() => {
    let history = (attendanceHistory || []).filter(event => new Date(event.date).getFullYear() === parseInt(selectedYear));

    // Filter by month only if a month is selected
    if (selectedMonth !== '') {
      history = history.filter(event => new Date(event.date).getMonth() === parseInt(selectedMonth));
    }
    return history;
  }, [attendanceHistory, selectedYear, selectedMonth]);

  const { upcomingBirthdays, upcomingAnniversaries } = useMemo(() => {
    if (!choirMembersList || choirMembersList.length === 0) return { upcomingBirthdays: [], upcomingAnniversaries: [] };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next30Days = new Date(today);
    next30Days.setDate(today.getDate() + 30);

    const birthdays = [];
    const anniversaries = [];

    choirMembersList.forEach(member => {
      if (member.dob) {
        const dob = new Date(member.dob);
        const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());

        let isUpcomingBirthday = birthdayThisYear >= today && birthdayThisYear <= next30Days;
        if (!isUpcomingBirthday && today.getMonth() === 11 && dob.getMonth() === 0) {
          const birthdayNextYear = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
          isUpcomingBirthday = birthdayNextYear <= next30Days;
        }

        if (isUpcomingBirthday) {
          const currentYear = today.getFullYear();
          const birthdayYear = currentYear - dob.getFullYear();
          birthdays.push({
            date: birthdayThisYear,
            name: member.name,
            birthdayYear
          });
        }
      }

      if (member.maritalStatus === 'Married' && member.weddingDate) {
        const weddingDate = new Date(member.weddingDate);
        const anniversaryThisYear = new Date(today.getFullYear(), weddingDate.getMonth(), weddingDate.getDate());

        let isUpcomingAnniversary = anniversaryThisYear >= today && anniversaryThisYear <= next30Days;
        if (!isUpcomingAnniversary && today.getMonth() === 11 && weddingDate.getMonth() === 0) {
          const anniversaryNextYear = new Date(today.getFullYear() + 1, weddingDate.getMonth(), weddingDate.getDate());
          isUpcomingAnniversary = anniversaryNextYear <= next30Days;
        }

        if (isUpcomingAnniversary) {
          const currentYear = today.getFullYear();
          const anniversaryYear = currentYear - weddingDate.getFullYear();
          anniversaries.push({
            date: anniversaryThisYear,
            name: member.name,
            anniversaryYear
          });
        }
      }
    });

    birthdays.sort((a, b) => a.date - b.date);
    anniversaries.sort((a, b) => a.date - b.date);

    return { upcomingBirthdays: birthdays, upcomingAnniversaries: anniversaries };
  }, [choirMembersList]);

  const dashboardData = useMemo(() => {
    // ✅ Always return default data structure instead of null
    const defaultData = {
      totalMembers: choirMembersList ? choirMembersList.length : 0,
      averageAttendance: 0,
      totalEvents: 0,
      topPerformers: [],
      needsAttention: [],
      sortedMembers: [],
      menAttendance: 0,
      womenAttendance: 0,
    };

    if (!filteredHistory || filteredHistory.length === 0 || !choirMembersList || choirMembersList.length === 0) {
      return defaultData; // ✅ Return valid data, not null
    }

    const relevantHistory = filteredHistory.filter(event => event.records && event.records.length > 0);
    if (relevantHistory.length === 0 || !choirMembersList || choirMembersList.length === 0) {
      return {
        totalMembers: choirMembersList.length,
        averageAttendance: 0,
        totalEvents: 0,
        topPerformers: [],
        needsAttention: [],
        sortedMembers: [],
        menAttendance: 0,
        womenAttendance: 0,
      };
    }

    const memberStats = (choirMembersList || []).map(member => {
      let totalPointsAwarded = 0;
      let totalMaxPoints = 0;

      relevantHistory.forEach(event => {
        const eventPoints = pointValues[event.section] || 0;

        if (eventPoints > 0) {
          totalMaxPoints += eventPoints;
          const record = event.records ? event.records.find(rec => rec.id === member.id) : null;
          const status = record ? record.status : 'Absent';
          const multiplier = statusMultipliers[status] || 0;
          totalPointsAwarded += eventPoints * multiplier;
        }
      });

      const percentage = totalMaxPoints > 0 ? (totalPointsAwarded / totalMaxPoints) * 100 : 0;

      return {
        id: member.id,
        name: member.name,
        totalPoints: totalPointsAwarded,
        totalMaxPoints: totalMaxPoints,
        percentage,
        gender: member.gender, // Assuming gender property exists
      };
    });

    const men = memberStats.filter(m => m.gender === 'Male');
    const women = memberStats.filter(m => m.gender === 'Female');

    const menTotalPoints = men.reduce((sum, m) => sum + m.totalPoints, 0);
    const menTotalMaxPoints = men.reduce((sum, m) => sum + m.totalMaxPoints, 0);
    const menAttendance = menTotalMaxPoints > 0 ? (menTotalPoints / menTotalMaxPoints) * 100 : 0;

    const womenTotalPoints = women.reduce((sum, m) => sum + m.totalPoints, 0);
    const womenTotalMaxPoints = women.reduce((sum, m) => sum + m.totalMaxPoints, 0);
    const womenAttendance = womenTotalMaxPoints > 0 ? (womenTotalPoints / womenTotalMaxPoints) * 100 : 0;

    const sortedMembers = memberStats.sort((a, b) => b.totalPoints - a.totalPoints);

    const topPerformers = sortedMembers.filter(m => m.percentage >= 90).slice(0, 10);
    const needsAttention = sortedMembers.filter(m => m.percentage < 70).slice(0, 10);

    return {
      totalMembers: choirMembersList.length,
      averageAttendance: sortedMembers.length > 0 ? (sortedMembers.reduce((sum, m) => sum + m.percentage, 0) / sortedMembers.length) : 0,
      totalEvents: relevantHistory.length,
      topPerformers,
      needsAttention,
      sortedMembers,
      menAttendance,
      womenAttendance,
    };
  }, [filteredHistory, choirMembersList]);

  // move this useMemo up so it ALWAYS runs (not after a return)
  const activityCounts = useMemo(() => {
    const counts = {};
    Object.keys(pointValues).forEach(section => {
      counts[section] = 0;
    });

    if (filteredHistory && filteredHistory.length > 0) {
      filteredHistory.forEach(event => {
        if (event.section && counts.hasOwnProperty(event.section)) {
          counts[event.section]++;
        }
      });
    }
    return counts;
  }, [filteredHistory]);

  // --- END: all hooks above this point ---

  const reminderAlert = useMemo(() => {
    // Only for admins
    if (!choirMembersList || !user || user.role !== 'admin') return null;

    const now = new Date();
    const day = now.getDay(); // 0 is Sunday, 6 is Saturday
    const hour = now.getHours();

    // Check if Saturday or Sunday
    const isWeekend = day === 0 || day === 6;
    // Check if Evening (e.g., after 4 PM)
    const isEvening = hour >= 21;

    if (isWeekend && isEvening) {
      // Format today as YYYY-MM-DD to match stored dates
      // Note: Using local time to match user's perspective
      const offset = now.getTimezoneOffset();
      const localDate = new Date(now.getTime() - (offset * 60 * 1000));
      const todayStr = localDate.toISOString().split('T')[0];

      const hasAttendanceToday = attendanceHistory.some(record => record.date === todayStr);

      if (!hasAttendanceToday) {
        return (
          <Alert variant="warning" className="mb-4 shadow-sm border-warning">
            <Alert.Heading><i className="bi bi-exclamation-triangle-fill me-2"></i>Attendance Reminder</Alert.Heading>
            <p className="mb-0">
              It's {day === 6 ? 'Saturday' : 'Sunday'} evening and no attendance has been recorded for today yet.
              Please remember to mark attendance for {day === 6 ? 'Saturday Practice' : 'Sunday Mass'}.
            </p>
          </Alert>
        );
      }
    }
    return null;
  }, [user, attendanceHistory, choirMembersList]);


  if (isLoading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2">Loading Dashboard...</p>
      </div>
    );
  }

  const activityColors = [
    'rgba(13, 110, 253, 0.6)',
    'rgba(220, 53, 69, 0.6)',
    'rgba(255, 193, 7, 0.6)',
    'rgba(32, 201, 151, 0.6)',
    'rgba(111, 66, 194, 0.6)',
    'rgba(253, 126, 20, 0.6)',
    'rgba(25, 135, 84, 0.6)',
    'rgba(102, 16, 242, 0.6)',
    'rgba(232, 62, 140, 0.6)',
    'rgba(108, 117, 125, 0.6)',
  ];

  const chartData = {
    labels: Object.keys(activityCounts),
    datasets: [
      {
        label: 'Type of Activities',
        data: Object.values(activityCounts),
        backgroundColor: activityColors.slice(0, Object.keys(activityCounts).length),
        borderColor: activityColors.slice(0, Object.keys(activityCounts).length).map(color => color.replace(/, 0\.6\)/, ', 1)')),
        borderWidth: 1,
      },
    ],
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
        }
      },
      title: {
        display: true,
        text: `Number of Activities by Type (${selectedMonth ? availableMonths.find(m => m.value === selectedMonth)?.name + ' ' : ''}${selectedYear})`,
      },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };



  return (
    <>
      {reminderAlert}
      <h2 className="mb-4">Home</h2>
      <Form className="mb-4">
        <Row className="align-items-center">
          <Form.Group as={Col} sm="6" md="3" controlId="selectYear" className="mb-2">
            <Form.Label className="fw-bold">Select Year</Form.Label>
            <Form.Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group as={Col} sm="6" md="3" controlId="selectMonth" className="mb-2">
            <Form.Label className="fw-bold">Select Month</Form.Label>
            <Form.Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="">All Months</option>
              {availableMonths.map(month => (
                <option key={month.value} value={month.value}>{month.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Row>
      </Form>

      <Row className="mb-4">
        <Col md={4} className="mb-3 mb-md-0">
          <Card className="text-center h-100 shadow-sm kpi-card border">
            <Card.Body>
              <h5>Total Members</h5>
              <h2 className="fw-bold">{dashboardData.totalMembers}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4} className="mb-3 mb-md-0">
          <Card className="text-center h-100 shadow-sm kpi-card border">
            <Card.Body>
              <h5>{selectedMonth ? `${monthName} Attendance %` : 'Overall Attendance %'}</h5>
              <h2 className="fw-bold">{dashboardData.averageAttendance.toFixed(1)}%</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center h-100 shadow-sm kpi-card border">
            <Card.Body>
              <h5>Total Activities</h5>
              <h2 className="fw-bold">{dashboardData.totalEvents}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6} className="mb-3 mb-md-0">
          <Card className="text-center h-100 shadow-sm kpi-card border">
            <Card.Body>
              <h5>Men's Attendance %</h5>
              <h2 className="fw-bold">{dashboardData.menAttendance.toFixed(1)}%</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="text-center h-100 shadow-sm kpi-card border">
            <Card.Body>
              <h5>Women's Attendance %</h5>
              <h2 className="fw-bold">{dashboardData.womenAttendance.toFixed(1)}%</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col lg={6} className="mb-3 mb-lg-0">
          <Card className="h-100 shadow-sm">
            <Card.Header className="fw-bold">🥳 Upcoming Birthdays</Card.Header>
            <Card.Body className="p-0">
              {upcomingBirthdays.length > 0 ? (
                <ListGroup variant="flush">
                  {upcomingBirthdays.map((b, index) => (
                    <ListGroup.Item key={index}>
                      <i className="bi bi-balloon-fill me-2 text-primary"></i>
                      {b.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {getOrdinalSuffix(b.birthdayYear)} Birthday of {b.name}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="p-3 text-muted">No upcoming birthdays in the next 30 days.</div>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="fw-bold">❤️ Upcoming Anniversaries</Card.Header>
            <Card.Body className="p-0">
              {upcomingAnniversaries.length > 0 ? (
                <ListGroup variant="flush">
                  {upcomingAnniversaries.map((a, index) => (
                    <ListGroup.Item key={index}>
                      <i className="bi bi-heart-fill me-2 text-danger"></i>
                      {a.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {getOrdinalSuffix(a.anniversaryYear)} Wedding Anniversary of {a.name}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="p-3 text-muted">No upcoming anniversaries in the next 30 days.</div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="p-3 mb-4 shadow-sm">
        <div style={{ position: 'relative', height: '40vh', overflowX: 'auto', paddingBottom: '20px' }}>
          <div style={{ width: '100%', minWidth: '600px', height: '100%' }}>
            <Bar options={chartOptions} data={chartData} />
          </div>
        </div>
      </Card>

      <Row>
        <Col md={6} className="mb-3 mb-md-0">
          <Card className="h-100 shadow-sm">
            <Card.Header className="fw-bold">✅ Good Attendance (&gt;90%)</Card.Header>
            <Table striped borderless hover size="sm" className="mb-0">
              <tbody>
                {dashboardData.topPerformers.map(m => <tr key={m.id}><td>{m.name}</td><td className="text-end fw-bold">{m.percentage.toFixed(0)}%</td></tr>)}
              </tbody>
            </Table>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100 shadow-sm">
            <Card.Header className="fw-bold">⚠️ Needs Improvement (&lt;70%)</Card.Header>
            <Table striped borderless hover size="sm" className="mb-0">
              <tbody>
                {dashboardData.needsAttention.map(m => <tr key={m.id}><td>{m.name}</td><td className="text-end fw-bold">{m.percentage.toFixed(0)}%</td></tr>)}
              </tbody>
            </Table>
          </Card>
        </Col>
      </Row>
    </>
  );
}

export default Dashboard;
