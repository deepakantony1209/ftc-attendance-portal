import React, { useMemo, useState, useEffect } from 'react';
import { Row, Col, Card, Form, DropdownButton, Dropdown, Spinner, Alert } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pointValues, statusMultipliers } from './ScoreLogic';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

function MemberReport({ attendanceHistory, choirMembersList, isLoading }) {
  const [selectedUserId, setSelectedUserId] = useState('');

  useEffect(() => {
    if (choirMembersList && choirMembersList.length > 0 && !selectedUserId) {
      const sortedMembers = [...choirMembersList].sort((a, b) => a.name.localeCompare(b.name));
      setSelectedUserId(sortedMembers[0].id);
    }
  }, [choirMembersList, selectedUserId]);

  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return choirMembersList.find(member => member.id === selectedUserId);
  }, [choirMembersList, selectedUserId]);

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');

  useEffect(() => {
    setSelectedYear(new Date().getFullYear());
    setSelectedMonth('all');
  }, [selectedUserId]);

  const userStats = useMemo(() => {
    if (!selectedUser) return null;
    const currentYear = new Date().getFullYear();
    const relevantHistory = attendanceHistory.filter(event => 
        pointValues.hasOwnProperty(event.section) &&
        new Date(event.date).getFullYear() === currentYear
    );
    const sortedHistory = [...relevantHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalPointsAwarded = 0;
    let totalMaxPoints = 0;
    const sectionData = {};
    const excuseCountsByMonth = {};
    const allMyRecords = relevantHistory.flatMap(event => event.records.filter(r => r.id === selectedUser.id));
    const excusedCount = allMyRecords.filter(r => r.status === 'Excused').length;
    const excusedPresentCount = allMyRecords.filter(r => r.status === 'Excused but Present').length;

    sortedHistory.forEach(event => {
      const myRecord = event.records.find(r => r.id === selectedUser.id);
      if (myRecord) {
        const sectionName = event.section;
        if (!sectionData[sectionName]) {
          sectionData[sectionName] = { pointsAwarded: 0, maxPoints: 0 };
        }
        const maxPointsForEvent = pointValues[sectionName] || 0;
        totalMaxPoints += maxPointsForEvent;
        sectionData[sectionName].maxPoints += maxPointsForEvent;
        let effectiveStatus = myRecord.status;
        if (myRecord.status === 'Excused') {
          const month = event.date.substring(0, 7);
          excuseCountsByMonth[month] = (excuseCountsByMonth[month] || 0) + 1;
          if (excuseCountsByMonth[month] > 2) {
            effectiveStatus = 'Absent';
          }
        }
        const multiplier = statusMultipliers[effectiveStatus] || 0;
        const awardedPoints = maxPointsForEvent * multiplier;
        totalPointsAwarded += awardedPoints;
        sectionData[sectionName].pointsAwarded += awardedPoints;
      }
    });
    const overallPercentage = totalMaxPoints > 0 ? (totalPointsAwarded / totalMaxPoints) * 100 : 0;
    return {
      totalPointsAwarded: totalPointsAwarded.toFixed(1), totalMaxPoints: totalMaxPoints.toFixed(1),
      excusedCount, excusedPresentCount, percentage: overallPercentage.toFixed(1), sectionData
    };
  }, [selectedUser, attendanceHistory]);

  const availableYears = useMemo(() => {
    if (!attendanceHistory || attendanceHistory.length === 0) return [new Date().getFullYear()];
    const years = new Set(attendanceHistory.map(event => new Date(event.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [attendanceHistory]);

  const monthlyYearlyStats = useMemo(() => {
    if (!selectedUser) return null;
    const recordsInYear = attendanceHistory.filter(event => new Date(event.date).getFullYear() === selectedYear);
    if (selectedMonth === 'all') {
      const myRecordsInYear = recordsInYear.flatMap(e => e.records.filter(r => r.id === selectedUser.id));
      const totalExcusesUsed = myRecordsInYear.filter(r => r.status === 'Excused').length;
      let yearlyPoints = 0, yearlyMaxPoints = 0;
      const excuseCountsByMonth = {};
      [...recordsInYear].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(event => {
          const myRecord = event.records.find(r => r.id === selectedUser.id);
          if (myRecord && pointValues[event.section]) {
              const maxPointsForEvent = pointValues[event.section];
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
      const myRecordsInMonth = recordsInMonth.flatMap(e => e.records.filter(r => r.id === selectedUser.id));
      const totalExcusesUsed = myRecordsInMonth.filter(r => r.status === 'Excused').length;
      let monthlyPoints = 0, monthlyMaxPoints = 0, excuseCounter = 0;
      recordsInMonth.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(event => {
          const myRecord = event.records.find(r => r.id === selectedUser.id);
          if (myRecord && pointValues[event.section]) {
              const maxPointsForEvent = pointValues[event.section];
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
  }, [selectedUser, attendanceHistory, selectedYear, selectedMonth]);

  // --- START: PDF DOWNLOAD FUNCTIONS ---
  const downloadYearlyPdf = () => {
    if (!selectedUser || !userStats) return;
    const currentYear = new Date().getFullYear();
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(`Attendance Report - ${currentYear}`, 14, 22);
    doc.setFontSize(14);
    doc.text(selectedUser.name, 14, 30);
    
    const excuseBalance = Math.max(0, 24 - userStats.excusedCount);
    
    const summaryBody = [
        [`Attendance % (${currentYear})`, `${userStats.percentage}%`],
        ['Total Points Earned', `${userStats.totalPointsAwarded} / ${userStats.totalMaxPoints}`],
        ['Excused Absences', userStats.excusedCount],
        ['Excuse Balance', `${excuseBalance} / 24`],
        ['Excused but Present', userStats.excusedPresentCount],
    ];
    
    autoTable(doc, {
      startY: 40,
      head: [['Current Year Summary', 'Value']],
      body: summaryBody,
      theme: 'striped',
      headStyles: { fillColor: [13, 110, 253] },
    });
    
    const tableRows = Object.entries(userStats.sectionData).map(([section, data]) => {
      const percentage = data.maxPoints > 0 ? ((data.pointsAwarded / data.maxPoints) * 100).toFixed(1) : "0.0";
      return [ section, `${data.pointsAwarded.toFixed(1)} / ${data.maxPoints.toFixed(1)}`, `${percentage}%` ];
    });
    
    if (tableRows.length > 0) {
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [["Gathering Type Breakdown", "Points", "Percentage (%)"]],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [22, 160, 133] }
        });
    }

    // --- ADDED: Detailed Event Log for the Year ---
    const recordsInYear = attendanceHistory
      .filter(event => new Date(event.date).getFullYear() === currentYear)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const eventDetailsRows = recordsInYear.map(event => {
        const myRecord = event.records.find(r => r.id === selectedUser.id);
        const status = myRecord ? myRecord.status : 'Not Marked';
        const reason = (status === 'Excused' || status === 'Excused but Present') ? myRecord.reason || '-' : '-';
        return [new Date(event.date).toLocaleDateString('en-GB'), event.section, event.eventName || '-', status, reason];
    });

    if (eventDetailsRows.length > 0) {
        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Detailed Event Log', 'Type', 'Event Name', 'Status', 'Reason']],
            body: eventDetailsRows,
            theme: 'grid'
        });
    }

    doc.save(`Yearly_Report_${currentYear}_${selectedUser.name.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadMonthlyPdf = () => {
    if (!selectedUser || selectedMonth === 'all' || !monthlyYearlyStats) return;
    
    const doc = new jsPDF();
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
    const recordsInMonth = attendanceHistory
      .filter(event => new Date(event.date).getFullYear() === selectedYear && new Date(event.date).getMonth() === parseInt(selectedMonth))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate detailed stats for the month
    let totalPointsAwarded = 0;
    let totalMaxPoints = 0;
    let excusedButPresentCount = 0;
    let excuseCounter = 0;
    const sectionData = {};

    recordsInMonth.forEach(event => {
        const myRecord = event.records.find(r => r.id === selectedUser.id);
        if(myRecord) {
            if (myRecord.status === 'Excused but Present') excusedButPresentCount++;
            if (pointValues[event.section]) {
                const maxPointsForEvent = pointValues[event.section];
                totalMaxPoints += maxPointsForEvent;

                if (!sectionData[event.section]) {
                    sectionData[event.section] = { pointsAwarded: 0, maxPoints: 0, count: 0 };
                }
                sectionData[event.section].maxPoints += maxPointsForEvent;
                sectionData[event.section].count++;

                let effectiveStatus = myRecord.status;
                if (myRecord.status === 'Excused') {
                    excuseCounter++;
                    if (excuseCounter > 2) effectiveStatus = 'Absent';
                }
                const awardedPoints = maxPointsForEvent * (statusMultipliers[effectiveStatus] || 0);
                totalPointsAwarded += awardedPoints;
                sectionData[event.section].pointsAwarded += awardedPoints;
            }
        }
    });

    doc.setFontSize(18);
    doc.text('Monthly Attendance Report', 14, 22);
    doc.setFontSize(14);
    doc.text(selectedUser.name, 14, 30);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Report for: ${monthName}`, 14, 36);

    const summaryBody = [
        ['Overall Attendance', `${monthlyYearlyStats.percentage}%`],
        ['Total Points', `${totalPointsAwarded.toFixed(1)} / ${totalMaxPoints.toFixed(1)}`],
        ['Excused Absences', monthlyYearlyStats.excusesUsed],
        ['Excuse Balance', `${monthlyYearlyStats.excuseBalance} / 2`],
        ['Excused but Present', excusedButPresentCount],
    ];
    autoTable(doc, { startY: 45, head: [['Monthly Summary', 'Value']], body: summaryBody, theme: 'striped' });

    const sectionRows = Object.entries(sectionData).map(([section, data]) => {
      const percentage = data.maxPoints > 0 ? (data.pointsAwarded / data.maxPoints) * 100 : 0;
      return [section, data.count, `${data.pointsAwarded.toFixed(1)} / ${data.maxPoints.toFixed(1)}`, `${percentage.toFixed(1)}%`];
    });

    if(sectionRows.length > 0) {
        autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [['Gathering Type Breakdown', 'Count', 'Points', 'Percentage']], body: sectionRows, theme: 'grid' });
    }

    const eventDetailsRows = recordsInMonth.map(event => {
        const myRecord = event.records.find(r => r.id === selectedUser.id);
        const status = myRecord ? myRecord.status : 'Not Marked';
        const reason = (status === 'Excused' || status === 'Excused but Present') ? myRecord.reason || '-' : '-';
        return [new Date(event.date).toLocaleDateString('en-GB'), event.section, event.eventName || '-', status, reason];
    });
    
    if (eventDetailsRows.length > 0) {
        autoTable(doc, { startY: doc.lastAutoTable.finalY + 10, head: [['Detailed Event Log', 'Type', 'Event Name', 'Status', 'Reason']], body: eventDetailsRows, theme: 'grid' });
    }

    doc.save(`Monthly_Report_${selectedUser.name.replace(/\s+/g, '_')}_${selectedYear}_${parseInt(selectedMonth)+1}.pdf`);
  };
  // --- END: PDF DOWNLOAD FUNCTIONS ---

  if (isLoading) {
    return <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}><Spinner animation="border" /></div>;
  }

  if (!selectedUser || !userStats || !monthlyYearlyStats) {
    return (
        <>
            <Card className="shadow-sm mb-4"><Card.Header><Row className="align-items-center"><Col md={6}><h4 className="mb-2 mb-md-0">Member Summary</h4></Col><Col md={6}><Form.Group><Form.Label><strong>Select Member to View</strong></Form.Label><Form.Select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}><option value="" disabled>Loading members...</option>{[...choirMembersList].sort((a,b)=>a.name.localeCompare(b.name)).map(member => (<option key={member.id} value={member.id}>{member.name}</option>))}</Form.Select></Form.Group></Col></Row></Card.Header></Card>
            <Alert variant="info">Select a member to view their report.</Alert>
        </>
    );
  }

  const doughnutData = { labels: ['Credits Earned', 'Credits Missed'], datasets: [{ data: [parseFloat(userStats.totalPointsAwarded), parseFloat(userStats.totalMaxPoints) - parseFloat(userStats.totalPointsAwarded)], backgroundColor: ['rgba(25, 135, 84, 0.8)', 'rgba(220, 53, 69, 0.8)'], borderColor: ['#fff', '#fff'], borderWidth: 2, }], };
  const barData = { labels: Object.keys(userStats.sectionData), datasets: [{ label: 'Attendance by Activity (%)', data: Object.values(userStats.sectionData).map(s => s.maxPoints > 0 ? (s.pointsAwarded / s.maxPoints) * 100 : 0), backgroundColor: 'rgba(13, 110, 253, 0.6)', }], };

  return (
    <div>
      <Card className="shadow-sm mb-4">
        <Card.Header>
            <Row className="align-items-center">
                <Col md={6}>
                    <h4 className="mb-2 mb-md-0">Member Report</h4>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label><strong>Select Member to View</strong></Form.Label>
                        <Form.Select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
                            {[...choirMembersList].sort((a,b)=>a.name.localeCompare(b.name)).map(member => (
                                <option key={member.id} value={member.id}>{member.name}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>
        </Card.Header>
      </Card>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">{selectedUser.name}'s Attendance Report</h2>
        <DropdownButton variant="success" id="download-report-dropdown" title={<><i className="bi bi-download me-2"></i>Download Summary</>}>
            <Dropdown.Item onClick={downloadYearlyPdf}> Current Year Report ({new Date().getFullYear()}) </Dropdown.Item>
            <Dropdown.Item onClick={downloadMonthlyPdf} disabled={selectedMonth === 'all'}> Monthly Report ({selectedMonth === 'all' ? 'Select a Month' : new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })}) </Dropdown.Item>
        </DropdownButton>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Header><h5 className="mb-0">Monthly Summary</h5></Card.Header>
        <Card.Body>
          <Row className="g-3 mb-3">
            <Col md={6}>
              <Form.Label htmlFor="year-select"><strong>Select Year</strong></Form.Label>
              <Form.Select id="year-select" value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label htmlFor="month-select"><strong>Select Month</strong></Form.Label>
              <Form.Select id="month-select" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                <option value="all">All Months (View Yearly)</option>
                {Array.from({ length: 12 }, (_, i) => (<option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>))}
              </Form.Select>
            </Col>
          </Row>
          <Card.Title className="text-center text-primary mb-3">Showing Stats for: <strong>{monthlyYearlyStats.period}</strong></Card.Title>
          <Row className="text-center mb-3">
            <Col md={4} className="mb-3 mb-md-0"><div className="p-3 shadow-sm border rounded kpi-card"><h5>Attendance %</h5><h3 className="fw-bold">{monthlyYearlyStats.percentage}%</h3></div></Col>
            <Col md={4} className="mb-3 mb-md-0"><div className="p-3 shadow-sm border rounded kpi-card"><h5>Absences (Excused)</h5><h3 className="fw-bold">{monthlyYearlyStats.excusesUsed}</h3></div></Col>
            <Col md={4}><div className="p-3 shadow-sm border rounded kpi-card"><h5>Excuses Remaining</h5><h3 className="fw-bold">{monthlyYearlyStats.excuseBalance}</h3></div></Col>
          </Row>
        </Card.Body>
      </Card>
      
      <hr className="my-4"/>

      <h4 className="mb-3">Current Year Summary ({new Date().getFullYear()})</h4>
      <Row>
        <Col md={4} className="mb-4"><Card className="text-center h-100 shadow-sm"><Card.Body className="d-flex flex-column justify-content-center kpi-card"><h5>Current Year Attendance %</h5><p className="small text-muted mb-0">(Based on Credits System)</p><h2 className="fw-bold display-4">{userStats.percentage}%</h2><p className="text-muted mb-0">{userStats.totalPointsAwarded} / {userStats.totalMaxPoints} Credits</p></Card.Body></Card></Col>
        <Col md={8} className="mb-4"><Card className="h-100 shadow-sm"><Card.Body className="d-flex justify-content-center align-items-center kpi-card"><div style={{width: '250px'}}><Doughnut data={doughnutData} options={{plugins: {title: { display: true, text: `Performance Summary (${new Date().getFullYear()})` }}}} /></div></Card.Body></Card></Col>
      </Row>

      <Row className="mb-4">
        <Col md={6} className="mb-3 mb-md-0"><Card className="text-center h-100 shadow-sm kpi-card border"><Card.Body><h5><i className="bi bi-person-check-fill text-info me-2"></i>Excused but Present</h5><h2 className="fw-bold">{userStats.excusedPresentCount}</h2><p className="text-muted mb-0">Total for current year.</p></Card.Body></Card></Col>
        <Col md={6}><Card className="text-center h-100 shadow-sm kpi-card border"><Card.Body><h5><i className="bi bi-person-x-fill text-warning me-2"></i>Excused Absences</h5><h2 className="fw-bold">{userStats.excusedCount}</h2><p className="text-muted mb-0">Total for current year.</p></Card.Body></Card></Col>
      </Row>

      <Row><Col><Card className="shadow-sm kpi-card border"><Card.Body><h4 className="mb-3 text-center">Current Year Attendance by Activity (%)</h4><div style={{position: 'relative', height: '40vh'}}><Bar data={barData} options={{maintainAspectRatio: false, plugins: {title: { display: false }}}}/></div></Card.Body></Card></Col></Row>
    </div>
  );
}

export default MemberReport;