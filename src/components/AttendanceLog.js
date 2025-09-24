import React, { useState, useMemo, useEffect } from 'react';
import { Table, Button, Modal, Card, Form, InputGroup, Row, Col, Pagination, Badge, Spinner } from 'react-bootstrap';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function AttendanceLog({ history, onDeleteRecord, onStartEdit, isReadOnly = false, isLoading }) {
  const [recordToView, setRecordToView] = useState(null);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(window.innerWidth < 768 ? 5 : 10);

  useEffect(() => {
    const handleResize = () => {
      setRecordsPerPage(window.innerWidth < 768 ? 5 : 10);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // This effect will reset the page to 1 whenever the filters change.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sectionFilter]);

  const filteredHistory = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase().trim();

    const filtered = history.filter(record => {
      // 1. Filter by section (choir type) first
      const matchesSection = sectionFilter === 'all' || record.section === sectionFilter;
      if (!matchesSection) {
        return false;
      }

      // 2. If there's no search term, the record passes the filter
      if (!lowerCaseSearch) {
        return true;
      }

      // 3. Check if the search term matches the event name, section, or date
      const eventNameMatch = record.eventName?.toLowerCase().includes(lowerCaseSearch);
      const sectionMatch = record.section.toLowerCase().includes(lowerCaseSearch);

      // Robust date matching to fix the filtering bug
      const dateObj = new Date(record.date);
      // Use UTC methods to prevent timezone issues
      const day = String(dateObj.getUTCDate()).padStart(2, '0');
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
      const year = dateObj.getUTCFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      const dateMatch = formattedDate.includes(lowerCaseSearch);

      return eventNameMatch || sectionMatch || dateMatch;
    });

    // 4. Sort the final filtered list by date
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [history, searchTerm, sectionFilter]);

  const totalPages = Math.ceil(filteredHistory.length / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredHistory.slice(indexOfFirstRecord, indexOfLastRecord);
  
  const handlePageInputChange = (e) => {
    const pageNum = Number(e.target.value);
    if (pageNum >= 1 && pageNum <= totalPages) {
        setCurrentPage(pageNum);
    }
  };

  const allSections = useMemo(() => ['all', ...Array.from(new Set(history.map(h => h.section)))], [history]);

  const openDeleteDialog = (record) => setRecordToDelete(record);
  const closeDeleteDialog = () => setRecordToDelete(null);
  
  const confirmDelete = () => {
    if (recordToDelete) {
        onDeleteRecord(recordToDelete.id);
    }
    closeDeleteDialog();
  };
  
  const downloadSingleRecordPdf = (record) => {
    const doc = new jsPDF();
    const title = `Attendance Report: ${record.section}`;
    const subtitle = record.eventName ? `${record.eventName} on ${new Date(record.date).toLocaleDateString('en-GB')}` : `on ${new Date(record.date).toLocaleDateString('en-GB')}`;
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 30);
    const tableColumn = ["Member Name", "Status", "Reason"];
    const tableRows = [];
    const sortedRecords = [...record.records].sort((a, b) => a.name.localeCompare(b.name));
    sortedRecords.forEach(rec => tableRows.push([rec.name, rec.status, rec.reason || '-']));
    autoTable(doc, {
      head: [tableColumn], body: tableRows, startY: 40, theme: 'grid',
      headStyles: { fillColor: [22, 160, 133], halign: 'center' },
      bodyStyles: { valign: 'middle', halign: 'center' },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 50 }, 2: { cellWidth: 50 } }
    });
    doc.save(`attendance_${record.date}_${record.section.replace(/\s+/g, '-')}.pdf`);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Present': return <Badge bg="success">Present</Badge>;
      case 'Excused but Present': return <Badge bg="info">Excused but Present</Badge>;
      case 'Absent': return <Badge bg="danger">Absent</Badge>;
      case 'Excused': return <Badge bg="warning" text="dark">Excused</Badge>;
      default: return <Badge bg="secondary">Not Marked</Badge>;
    }
  };

    if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading History...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <Card.Header><h4 className="mb-0">Past Attendance</h4></Card.Header>
        <Card.Body>
          <Row className="mb-3">
            <Col md={8}><InputGroup><Form.Control placeholder="Search by date, event, or type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></InputGroup></Col>
            <Col md={4}><Form.Select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>{allSections.map(sec => <option key={sec} value={sec}>{sec === 'all' ? 'All Types' : sec}</option>)}</Form.Select></Col>
          </Row>
          <Table striped bordered hover responsive>
            <thead><tr><th>Date</th><th>Type / Event</th><th className="text-center">Attendance</th><th className="text-center">Actions</th></tr></thead>
            <tbody>
              {currentRecords.map(record => {
                const totalPresent = record.records.filter(r => r.status === 'Present').length;
                return (
                  <tr key={record.id}>
                    <td>{new Date(record.date).toLocaleDateString('en-GB')}</td>
                    <td>{record.section}{record.eventName && <div className="text-muted small">{record.eventName}</div>}</td>
                    <td className="text-center">{`${totalPresent} / ${record.records.length}`}</td>
                    <td className="text-center">
                      <Button variant="outline-info" size="sm" className="me-2 mb-1 mb-md-0" onClick={() => setRecordToView(record)}>View</Button>
                      {!isReadOnly && (
                        <>
                          <Button variant="outline-secondary" size="sm" className="me-2 mb-1 mb-md-0" onClick={() => onStartEdit(record)}>Edit</Button>
                          <Button variant="outline-danger" size="sm" className="me-2 mb-1 mb-md-0" onClick={() => openDeleteDialog(record)}>Delete</Button>
                          <Button variant="outline-success" size="sm" className="mb-1 mb-md-0" onClick={() => downloadSingleRecordPdf(record)} title="Download Report"><i className="bi bi-download"></i></Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {totalPages > 1 && (
            <div className="d-flex justify-content-center align-items-center mt-3">
              <Pagination>
                <Pagination.First onClick={() => setCurrentPage(1)} disabled={currentPage === 1} />
                <Pagination.Prev onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} />
                <InputGroup size="sm" style={{ width: '150px' }}>
                  <InputGroup.Text>Page</InputGroup.Text>
                  <Form.Control type="number" key={currentPage} defaultValue={currentPage} onBlur={handlePageInputChange} onKeyDown={(e) => { if (e.key === 'Enter') { handlePageInputChange(e); e.target.blur(); } }} min={1} max={totalPages} style={{ textAlign: 'center' }} />
                  <InputGroup.Text>of {totalPages}</InputGroup.Text>
                </InputGroup>
                <Pagination.Next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} />
                <Pagination.Last onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>
      <Modal show={!!recordToView} onHide={() => setRecordToView(null)} size="lg">
        <Modal.Header closeButton><Modal.Title>Attendance Details</Modal.Title></Modal.Header>
        <Modal.Body>
          {recordToView && (
            <>
              <h5>{recordToView.section} on {new Date(recordToView.date).toLocaleDateString('en-GB')}</h5>
              {recordToView.eventName && <p className="text-muted">{recordToView.eventName}</p>}
              <Table striped bordered size="sm">
                <thead><tr><th>Member Name</th><th className="text-center">Status</th></tr></thead>
                <tbody>
                  {recordToView.records.sort((a,b) => a.name.localeCompare(b.name)).map(rec => (
                    <tr key={rec.id}>
                      <td>{rec.name}</td>
                      <td className="text-center">
                        {getStatusBadge(rec.status)}
                        {!isReadOnly && rec.reason && <div className="text-muted small fst-italic mt-1">({rec.reason})</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
        </Modal.Body>
      </Modal>
      <Modal show={!!recordToDelete} onHide={closeDeleteDialog} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Delete</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to permanently delete this record?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDeleteDialog}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Yes, Delete</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default AttendanceLog;