import React, { useMemo, useState } from 'react';
import { Row, Col, Card, Form, DropdownButton, Dropdown } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pointValues, statusMultipliers } from './ScoreLogic';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);


function MyStats({ user, history }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');

  const userStats = useMemo(() => {
    // --- MODIFICATION: Filter for the current year ---
    const currentYear = new Date().getFullYear();
    const relevantHistory = history.filter(event => 
        pointValues.hasOwnProperty(event.section) &&
        new Date(event.date).getFullYear() === currentYear
    );
    // --- END MODIFICATION ---

    const sortedHistory = [...relevantHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
    let totalPointsAwarded = 0;
    let totalMaxPoints = 0;
    const sectionData = {};
    const excuseCountsByMonth = {};
    
    // Raw counts are now also for the current year only
    const allMyRecords = relevantHistory.flatMap(event => event.records.filter(r => r.id === user.id));
    const excusedCount = allMyRecords.filter(r => r.status === 'Excused').length;
    const excusedPresentCount = allMyRecords.filter(r => r.status === 'Excused but Present').length;

    sortedHistory.forEach(event => {
      const myRecord = event.records.find(r => r.id === user.id);
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
      totalPointsAwarded: totalPointsAwarded.toFixed(1),
      totalMaxPoints: totalMaxPoints.toFixed(1),
      excusedCount,
      excusedPresentCount,
      percentage: overallPercentage.toFixed(1),
      sectionData
    };
  }, [user, history]);

  const availableYears = useMemo(() => {
    if (!history || history.length === 0) return [new Date().getFullYear()];
    const years = new Set(history.map(event => new Date(event.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [history]);

  const monthlyYearlyStats = useMemo(() => {
    const recordsInYear = history.filter(event => new Date(event.date).getFullYear() === selectedYear);
    
    if (selectedMonth === 'all') {
      const myRecordsInYear = recordsInYear.flatMap(e => e.records.filter(r => r.id === user.id));
      const totalExcusesUsed = myRecordsInYear.filter(r => r.status === 'Excused').length;
      let yearlyPoints = 0;
      let yearlyMaxPoints = 0;
      const sortedHistory = [...recordsInYear].sort((a, b) => new Date(a.date) - new Date(b.date));
      const excuseCountsByMonth = {};

      sortedHistory.forEach(event => {
          const myRecord = event.records.find(r => r.id === user.id);
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
      
      return {
        percentage: yearlyMaxPoints > 0 ? ((yearlyPoints / yearlyMaxPoints) * 100).toFixed(1) : '0.0',
        excusesUsed: totalExcusesUsed,
        excuseBalance: Math.max(0, 24 - totalExcusesUsed),
        period: `Year ${selectedYear}`
      };
    } 
    else {
      const recordsInMonth = recordsInYear.filter(event => new Date(event.date).getMonth() === parseInt(selectedMonth));
      const myRecordsInMonth = recordsInMonth.flatMap(e => e.records.filter(r => r.id === user.id));
      const totalExcusesUsed = myRecordsInMonth.filter(r => r.status === 'Excused').length;
      let monthlyPoints = 0;
      let monthlyMaxPoints = 0;
      let excuseCounter = 0;

      recordsInMonth.sort((a,b) => new Date(a.date) - new Date(b.date)).forEach(event => {
          const myRecord = event.records.find(r => r.id === user.id);
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

      return {
        percentage: monthlyMaxPoints > 0 ? ((monthlyPoints / monthlyMaxPoints) * 100).toFixed(1) : '0.0',
        excusesUsed: totalExcusesUsed,
        excuseBalance: Math.max(0, 2 - totalExcusesUsed),
        period: new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })
      };
    }
  }, [user, history, selectedYear, selectedMonth]);

  const downloadYearlyPdf = () => {
    const currentYear = new Date().getFullYear();
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`My Attendance Report - ${currentYear}`, 14, 22);
    doc.setFontSize(14);
    doc.text(user.name, 14, 30);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 36);
    autoTable(doc, {
      startY: 45,
      head: [['Category', 'Value']],
      body: [
        [`My Attendance % (${currentYear})`, `${userStats.percentage}%`],
        ['Total Credits Earned', `${userStats.totalPointsAwarded} / ${userStats.totalMaxPoints}`],
        ['"Excused but Present" Count', userStats.excusedPresentCount],
        ['"Excused" Absences Count', userStats.excusedCount],
      ],
      theme: 'striped',
      headStyles: { fillColor: [13, 110, 253] },
    });
    const tableColumn = ["Gathering Type", "Your Points", "Percentage (%)"];
    const tableRows = [];
    Object.entries(userStats.sectionData).forEach(([section, data]) => {
      const percentage = data.maxPoints > 0 ? ((data.pointsAwarded / data.maxPoints) * 100).toFixed(1) : "0.0";
      const row = [ section, `${data.pointsAwarded.toFixed(1)} / ${data.maxPoints.toFixed(1)}`, `${percentage}%` ];
      tableRows.push(row);
    });
    autoTable(doc, {
      startY: (doc).lastAutoTable.finalY + 10,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] }
    });
    doc.save(`My_Yearly_Report_${currentYear}_${user.name.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadMonthlyPdf = () => {
    if (selectedMonth === 'all') return;
    const monthName = new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
    const doc = new jsPDF();
    const recordsInMonth = history.filter(event => new Date(event.date).getFullYear() === selectedYear && new Date(event.date).getMonth() === parseInt(selectedMonth)).sort((a, b) => new Date(a.date) - new Date(b.date));
    doc.setFontSize(18);
    doc.text('Monthly Attendance Report', 14, 22);
    doc.setFontSize(14);
    doc.text(user.name, 14, 30);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Report for: ${monthName}`, 14, 36);
    const eventDetailsRows = recordsInMonth.map(event => {
        const myRecord = event.records.find(r => r.id === user.id);
        const status = myRecord ? myRecord.status : 'Not Marked';
        const reason = (status === 'Excused' || status === 'Excused but Present') ? myRecord.reason || '-' : '-';
        return [new Date(event.date).toLocaleDateString('en-GB'), event.section, event.eventName || '-', status, reason];
    });
    autoTable(doc, {
        startY: 45,
        head: [['Date', 'Event Type', 'Event Name', 'My Status', 'Reason']],
        body: eventDetailsRows,
        theme: 'grid',
        headStyles: { fillColor: [13, 110, 253] },
    });
    const sectionSummary = {};
    let excuseCounter = 0;
    recordsInMonth.forEach(event => {
        const myRecord = event.records.find(r => r.id === user.id);
        if (myRecord && pointValues[event.section]) {
            if (!sectionSummary[event.section]) {
                sectionSummary[event.section] = { pointsAwarded: 0, maxPoints: 0 };
            }
            const maxPointsForEvent = pointValues[event.section];
            sectionSummary[event.section].maxPoints += maxPointsForEvent;
            let effectiveStatus = myRecord.status;
            if (myRecord.status === 'Excused') {
                excuseCounter++;
                if (excuseCounter > 2) effectiveStatus = 'Absent';
            }
            sectionSummary[event.section].pointsAwarded += maxPointsForEvent * (statusMultipliers[effectiveStatus] || 0);
        }
    });
    const sectionSummaryRows = Object.entries(sectionSummary).map(([section, data]) => {
        const percentage = data.maxPoints > 0 ? ((data.pointsAwarded / data.maxPoints) * 100).toFixed(1) : "0.0";
        return [section, `${data.pointsAwarded.toFixed(1)} / ${data.maxPoints.toFixed(1)}`, `${percentage}%`];
    });
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Section Summary', 'Points (Earned / Max)', 'Percentage']],
        body: sectionSummaryRows,
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] },
    });
    const excuseSummaryRows = [['Total Excuses Used This Month', monthlyYearlyStats.excusesUsed], ['Available Excuse Balance This Month', monthlyYearlyStats.excuseBalance]];
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Excuse Summary', 'Count']],
        body: excuseSummaryRows,
        theme: 'grid',
    });
    doc.save(`Monthly_Report_${user.name.replace(/\s+/g, '_')}_${selectedYear}_${parseInt(selectedMonth)+1}.pdf`);
  };
  const doughnutData = {
    labels: ['Credits Earned', 'Credits Missed'],
    datasets: [{
      data: [
        parseFloat(userStats.totalPointsAwarded), 
        parseFloat(userStats.totalMaxPoints) - parseFloat(userStats.totalPointsAwarded)
      ],
      backgroundColor: ['rgba(25, 135, 84, 0.8)', 'rgba(220, 53, 69, 0.8)'],
      borderColor: ['#fff', '#fff'],
      borderWidth: 2,
    }],
  };

  const barData = {
    labels: Object.keys(userStats.sectionData),
    datasets: [{
      label: 'Attendance by Activity',
      data: Object.values(userStats.sectionData).map(s => s.maxPoints > 0 ? (s.pointsAwarded / s.maxPoints) * 100 : 0),
      backgroundColor: 'rgba(13, 110, 253, 0.6)',
    }],
  };
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">My Attendance Summary</h2>
        <DropdownButton
            variant="success"
            id="download-report-dropdown"
            title={<><i className="bi bi-download me-2"></i>Download Summary</>}
        >
            <Dropdown.Item onClick={downloadYearlyPdf}>
                Current Year Report ({new Date().getFullYear()})
            </Dropdown.Item>
            <Dropdown.Item 
                onClick={downloadMonthlyPdf} 
                disabled={selectedMonth === 'all'}
            >
                Monthly Report ({selectedMonth === 'all' 
                    ? 'Select a Month' 
                    : new Date(selectedYear, selectedMonth).toLocaleString('default', { month: 'long' })
                })
            </Dropdown.Item>
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
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </Form.Select>
            </Col>
          </Row>
          <Card.Title className="text-center text-primary mb-3">
            Showing Stats for: <strong>{monthlyYearlyStats.period}</strong>
          </Card.Title>
          <Row className="text-center mb-3">
            <Col md={4} className="mb-3 mb-md-0"><div className="p-3 shadow-sm border rounded kpi-card">
                <h5>Attendance %</h5><h3 className="fw-bold">{monthlyYearlyStats.percentage}%</h3>
            </div></Col>
            <Col md={4} className="mb-3 mb-md-0"><div className="p-3 shadow-sm border rounded kpi-card">
                <h5>Absences (Excused)</h5><h3 className="fw-bold">{monthlyYearlyStats.excusesUsed}</h3>
            </div></Col>
            <Col md={4}><div className="p-3 shadow-sm border rounded kpi-card">
                <h5>Excuses Remaining</h5><h3 className="fw-bold">{monthlyYearlyStats.excuseBalance}</h3>
            </div></Col>
          </Row>
        </Card.Body>
      </Card>
      
      <hr className="my-4"/>

      {/* --- MODIFICATION: Updated heading --- */}
      <h4 className="mb-3">Current Year Summary ({new Date().getFullYear()})</h4>
      <Row>
        <Col md={4} className="mb-4">
          <Card className="text-center h-100 shadow-sm">
            <Card.Body className="d-flex flex-column justify-content-center kpi-card">
              {/* --- MODIFICATION: Updated heading --- */}
              <h5>Current Year Attendance %</h5>
              <h2 className="fw-bold display-4">{userStats.percentage}%</h2>
                    </Card.Body>
          </Card>
        </Col>
        <Col md={8} className="mb-4">
          <Card className="h-100 shadow-sm">
            <Card.Body className="d-flex justify-content-center align-items-center kpi-card">
              <div style={{width: '250px'}}>
                {/* --- MODIFICATION: Updated chart title --- */}
                <Doughnut data={doughnutData} options={{plugins: {title: { display: true, text: `Performance Summary (${new Date().getFullYear()})` }}}} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={6} className="mb-3 mb-md-0">
          <Card className="text-center h-100 shadow-sm kpi-card border">
            <Card.Body>
              <h5><i className="bi bi-person-check-fill text-info me-2"></i>Excused but Present</h5>
              <h2 className="fw-bold">{userStats.excusedPresentCount}</h2>
              <p className="text-muted mb-0">Total for current year.</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
           <Card className="text-center h-100 shadow-sm kpi-card border">
            <Card.Body>
              <h5><i className="bi bi-person-x-fill text-warning me-2"></i>Excused Absences</h5>
              <h2 className="fw-bold">{userStats.excusedCount}</h2>
              <p className="text-muted mb-0">Total for current year.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="shadow-sm kpi-card border">
            <Card.Body>
              {/* --- MODIFICATION: Updated heading --- */}
              <h4 className="mb-3 text-center">Current Year Attendance by Activity (%)</h4>
              <div style={{position: 'relative', height: '40vh'}}>
                <Bar data={barData} options={{maintainAspectRatio: false, plugins: {title: { display: false }}}}/>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default MyStats;