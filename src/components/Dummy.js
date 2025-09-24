import React, { useState, useMemo } from 'react';
import { Row, Col, Card, Table, Form, Spinner, ListGroup } from 'react-bootstrap';
import { pointValues, statusMultipliers } from './ScoreLogic';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard({ attendanceHistory = [], choirMembersList = [], isLoading }) {
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
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];

    // First filter by the selected year to get relevant events
    const yearlyEvents = attendanceHistory.filter(event => 
      new Date(event.date).getFullYear() === parseInt(selectedYear)
    );

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
    let history = (attendanceHistory || []).filter(event => 
      new Date(event.date).getFullYear() === parseInt(selectedYear)
    );

    // Filter by month only if a month is selected
    if (selectedMonth !== '') {
      history = history.filter(event => 
        new Date(event.date).getMonth() === parseInt(selectedMonth)
      );
    }

    return history;
  }, [attendanceHistory, selectedYear, selectedMonth]);

  const { upcomingBirthdays, upcomingAnniversaries } = useMemo(() => {
    if (!choirMembersList || choirMembersList.length === 0) 
      return { upcomingBirthdays: [], upcomingAnniversaries: [] };

    const today = new Date();
    const next30Days = new Date();
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
          birthdays.push({ date: birthdayThisYear, name: member.name, birthdayYear });
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
          anniversaries.push({ date: anniversaryThisYear, name: member.name, anniversaryYear });
        }
      }
    });

    birthdays.sort((a, b) => a.date - b.date);
    anniversaries.sort((a, b) => a.date - b.date);

    return { upcomingBirthdays: birthdays, upcomingAnniversaries: anniversaries };
  }, [choirMembersList]);

  // FIXED: Always return dashboard data object, never null
  const dashboardData = useMemo(() => {
    // Always return a valid dashboard data object, even with no data
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

    // If no data available, return defaults
    if (!filteredHistory || filteredHistory.length === 0 || !choirMembersList || choirMembersList.length === 0) {
      return defaultData;
    }

    const relevantHistory = filteredHistory.filter(event => event.records && event.records.length > 0);
    
    // If no relevant history, still return valid data with member count
    if (relevantHistory.length === 0) {
      return {
        ...defaultData,
        totalMembers: choirMembersList.length,
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
      averageAttendance: sortedMembers.length > 0 
        ? (sortedMembers.reduce((sum, m) => sum + m.percentage, 0) / sortedMembers.length) 
        : 0,
      totalEvents: relevantHistory.length,
      topPerformers,
      needsAttention,
      sortedMembers,
      menAttendance,
      womenAttendance,
    };
  }, [filteredHistory, choirMembersList]);

  // Move this useMemo up so it ALWAYS runs (not after a return)
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

  // FIXED: Only show loading spinner when actually loading, not when dashboardData exists
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading Dashboard...</span>
        </Spinner>
      </div>
    );
  }

  // FIXED: Dashboard data is now guaranteed to exist, so we can always render the dashboard
  const chartData = {
    labels: Object.keys(activityCounts),
    datasets: [
      {
        label: 'Activity Count',
        data: Object.values(activityCounts),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Activity Distribution ${selectedMonth ? `for ${monthName} ` : ''}${selectedYear}`,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div>
      <h2 className="mb-4">Dashboard</h2>

      {/* Year and Month Filter */}
      <Row className="mb-4">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Filter by Year</Form.Label>
            <Form.Select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Filter by Month (Optional)</Form.Label>
            <Form.Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="">All Months</option>
              {availableMonths.map(month => (
                <option key={month.value} value={month.value}>{month.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* Key Metrics Cards */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title className="text-primary">Total Members</Card.Title>
              <Card.Text className="display-4">{dashboardData.totalMembers}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title className="text-success">Average Attendance</Card.Title>
              <Card.Text className="display-4">{dashboardData.averageAttendance.toFixed(0)}%</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title className="text-info">Total Events</Card.Title>
              <Card.Text className="display-4">{dashboardData.totalEvents}</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={3} md={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title className="text-warning">Active Period</Card.Title>
              <Card.Text className="h5">
                {selectedMonth ? `${monthName} ` : ''}{selectedYear}
              </Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Gender-based Attendance */}
      <Row className="mb-4">
        <Col lg={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title className="text-primary">Men's Attendance</Card.Title>
              <Card.Text className="display-5">{dashboardData.menAttendance.toFixed(0)}%</Card.Text>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-3">
          <Card className="text-center h-100">
            <Card.Body>
              <Card.Title className="text-danger">Women's Attendance</Card.Title>
              <Card.Text className="display-5">{dashboardData.womenAttendance.toFixed(0)}%</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Activity Chart */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <div style={{ height: '400px' }}>
                {dashboardData.totalEvents === 0 ? (
                  <div className="d-flex justify-content-center align-items-center h-100">
                    <div className="text-center text-muted">
                      <h5>No Events Yet</h5>
                      <p>Activity chart will appear once attendance records are added.</p>
                    </div>
                  </div>
                ) : (
                  <Bar data={chartData} options={chartOptions} />
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Performers and Needs Attention */}
      <Row className="mb-4">
        <Col lg={6} className="mb-3">
          <Card className="h-100">
            <Card.Header className="bg-success text-white">
              <Card.Title className="mb-0">🏆 Top Performers (≥90%)</Card.Title>
            </Card.Header>
            <Card.Body>
              {dashboardData.topPerformers.length === 0 ? (
                <p className="text-muted">No data available yet or no members with ≥90% attendance.</p>
              ) : (
                <Table striped hover size="sm">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Name</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.topPerformers.map((member, index) => (
                      <tr key={member.id}>
                        <td>{getOrdinalSuffix(index + 1)}</td>
                        <td>{member.name}</td>
                        <td>{member.percentage.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-3">
          <Card className="h-100">
            <Card.Header className="bg-danger text-white">
              <Card.Title className="mb-0">⚠️ Needs Attention (&lt;70%)</Card.Title>
            </Card.Header>
            <Card.Body>
              {dashboardData.needsAttention.length === 0 ? (
                <p className="text-muted">No data available yet or no members with &lt;70% attendance.</p>
              ) : (
                <Table striped hover size="sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData.needsAttention.map((member) => (
                      <tr key={member.id}>
                        <td>{member.name}</td>
                        <td>{member.percentage.toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Upcoming Birthdays and Anniversaries */}
      <Row className="mb-4">
        <Col lg={6} className="mb-3">
          <Card className="h-100">
            <Card.Header className="bg-warning text-dark">
              <Card.Title className="mb-0">🎂 Upcoming Birthdays</Card.Title>
            </Card.Header>
            <Card.Body>
              {upcomingBirthdays.length === 0 ? (
                <p className="text-muted">No upcoming birthdays in the next 30 days.</p>
              ) : (
                <ListGroup variant="flush">
                  {upcomingBirthdays.slice(0, 5).map((birthday, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{birthday.name}</strong>
                        <br />
                        <small className="text-muted">
                          {birthday.date.toLocaleDateString('en-GB')} 
                          ({getOrdinalSuffix(birthday.birthdayYear)} Birthday)
                        </small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6} className="mb-3">
          <Card className="h-100">
            <Card.Header className="bg-info text-white">
              <Card.Title className="mb-0">💒 Upcoming Anniversaries</Card.Title>
            </Card.Header>
            <Card.Body>
              {upcomingAnniversaries.length === 0 ? (
                <p className="text-muted">No upcoming anniversaries in the next 30 days.</p>
              ) : (
                <ListGroup variant="flush">
                  {upcomingAnniversaries.slice(0, 5).map((anniversary, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{anniversary.name}</strong>
                        <br />
                        <small className="text-muted">
                          {anniversary.date.toLocaleDateString('en-GB')} 
                          ({getOrdinalSuffix(anniversary.anniversaryYear)} Anniversary)
                        </small>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default Dashboard;