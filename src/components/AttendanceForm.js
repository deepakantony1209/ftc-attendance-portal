import React, { useState, useMemo, useEffect } from 'react';
import { Form, Row, Col, Button, InputGroup, Accordion, Badge } from 'react-bootstrap';

function AttendanceForm({
  members,
  selectedDate, setSelectedDate, selectedSection, setSelectedSection,
  attendanceSections, handleAttendance, handleReasonChange, handleSave,
  eventName, setEventName, specialSections,
  isEditing, onCancelEdit, 
  handleToggleBulkMarking, handleClearAttendance, bulkMarkingMode
}) {

  const [searchTerm, setSearchTerm] = useState('');
  // New state to control which accordion panels are open
  const [activeKeys, setActiveKeys] = useState([]);

  // --- LOGIC TO CONTROL THE STEP-BY-STEP FORM ---
  const isSectionDisabled = !selectedDate;
  const isContentDisabled = !selectedDate || !selectedSection || (specialSections.includes(selectedSection) && !eventName.trim());

  const getDropdownClass = (status) => {
    if (status === 'Present' || status === 'Excused but Present') return 'status-present';
    if (status === 'Absent' || status === 'Excused') return 'status-absent';
    return 'status-unmarked';
  };

  const { maleMembers, femaleMembers } = useMemo(() => {
    const filtered = members.filter(member =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const male = filtered
      .filter(m => m.gender === 'Male')
      .sort((a, b) => a.name.localeCompare(b.name));

    const female = filtered
      .filter(m => m.gender === 'Female')
      .sort((a, b) => a.name.localeCompare(b.name));

    return { maleMembers: male, femaleMembers: female };
  }, [members, searchTerm]);

  // This effect opens the accordions dynamically based on search results
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setActiveKeys([]); // Close all if search is empty
      return;
    }

    const newActiveKeys = [];
    if (maleMembers.length > 0) newActiveKeys.push('0'); // Event key for Male panel
    if (femaleMembers.length > 0) newActiveKeys.push('1'); // Event key for Female panel
    setActiveKeys(newActiveKeys);

  }, [searchTerm, maleMembers, femaleMembers]);

  const renderMemberList = (memberList, gender) => {
    if (memberList.length === 0) {
      return <li className="list-group-item text-muted">No {gender} members found.</li>;
    }
    return memberList.map(member => (
      <li key={member.id} className="list-group-item d-flex flex-wrap justify-content-between align-items-center py-3">
        <span className="fw-medium mb-2 mb-md-0">{member.name}</span>
        <div className="d-flex align-items-center gap-2 flex-wrap justify-content-end" style={{width: '100%', maxWidth: '420px'}}>
          <Form.Select
            value={member.status || ''}
            onChange={(e) => handleAttendance(member.id, e.target.value)}
            className={getDropdownClass(member.status)}
            style={{minWidth: '180px', flex: 1}}
            disabled={isContentDisabled}
          >
            <option value="" disabled>Mark Attendance</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Excused but Present">Excused but Present</option>
            <option value="Excused">Excused</option>
          </Form.Select>
          
          {(member.status === 'Excused' || member.status === 'Excused but Present') && (
            <Form.Control
              type="text"
              placeholder="Enter the Reason"
              value={member.reason || ''}
              onChange={(e) => handleReasonChange(member.id, e.target.value)}
              style={{minWidth: '180px', flex: 1}}
              required
              disabled={isContentDisabled}
            />
          )}
        </div>
      </li>
    ));
  };


  return (
    <>
      <Row className="g-3 mb-4 align-items-end">
        <Col md={6}>
          <Form.Label htmlFor="date-picker"><strong>Select Date</strong></Form.Label>
          <Form.Control
            type="date" id="date-picker" value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)} required
          />
        </Col>
        <Col md={6}>
          <Form.Label htmlFor="section-select"><strong>Select Activity Type</strong></Form.Label>
          <Form.Select
            id="section-select" value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)} required
            disabled={isSectionDisabled}
          >
            <option value="" disabled>Select an Activity Type</option>
            {attendanceSections.map(section => (
              <option key={section} value={section}>{section}</option>
            ))}
          </Form.Select>
        </Col>

        {specialSections.includes(selectedSection) && (
          <Col xs={12} className="mt-3">
            <Form.Label htmlFor="event-name"><strong>Name of the activity</strong></Form.Label>
            <Form.Control
              type="text" id="event-name" value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g., Easter Vigil, St.Cecili Feast" required
              disabled={isSectionDisabled}
            />
          </Col>
        )}
      </Row>

      <div className={`border-top pt-4 mt-4 ${isContentDisabled ? 'opacity-50' : ''}`}>
        <Row className="align-items-center mb-3">
            <Col md={6}>
                <h3 className="mb-0">Record Attendance</h3>
            </Col>
            <Col md={6}>
                <InputGroup>
                    <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
                    <Form.Control
                        type="text"
                        placeholder="Search for a member..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        disabled={isContentDisabled}
                    />
                </InputGroup>
            </Col>
        </Row>
        
        {/* MODIFIED: Accordion is now controlled by state */}
        <Accordion activeKey={activeKeys} onSelect={(keys) => setActiveKeys(keys)} alwaysOpen className="mt-3">
            <Accordion.Item eventKey="0">
                <Accordion.Header>
                    Male Members
                    <Badge bg="secondary" pill className="ms-2">{maleMembers.length}</Badge>
                </Accordion.Header>
                <Accordion.Body className="p-0">
                    <ul className="list-group list-group-flush">
                        {renderMemberList(maleMembers, 'male')}
                    </ul>
                </Accordion.Body>
            </Accordion.Item>
            <Accordion.Item eventKey="1">
                <Accordion.Header>
                    Female Members
                    <Badge bg="secondary" pill className="ms-2">{femaleMembers.length}</Badge>
                </Accordion.Header>
                <Accordion.Body className="p-0">
                    <ul className="list-group list-group-flush">
                        {renderMemberList(femaleMembers, 'female')}
                    </ul>
                </Accordion.Body>
            </Accordion.Item>
        </Accordion>
      </div>

      <div className="d-grid mt-4 d-md-flex justify-content-between align-items-center">
        <div className={`mb-3 mb-md-0 ${isContentDisabled ? 'opacity-50 pe-none' : ''}`}>
            <Form.Group className="mb-2">
                <Form.Check
                    type="switch"
                    id="mark-present-switch"
                    label="Set remaining to 'Present'"
                    checked={bulkMarkingMode === 'present'}
                    disabled={bulkMarkingMode === 'absent' || isContentDisabled}
                    onChange={() => handleToggleBulkMarking('present')}
                />
            </Form.Group>
            <Form.Group>
                <Form.Check
                    type="switch"
                    id="mark-absent-switch"
                    label="Set remaining to 'Absent'"
                    checked={bulkMarkingMode === 'absent'}
                    disabled={bulkMarkingMode === 'present' || isContentDisabled}
                    onChange={() => handleToggleBulkMarking('absent')}
                />
            </Form.Group>
        </div>
        
        <div className="d-flex gap-2">
            <Button variant="outline-secondary" size="lg" onClick={handleClearAttendance} disabled={isContentDisabled}>
              Clear All
            </Button>
            {isEditing && (
              <Button variant="secondary" size="lg" onClick={onCancelEdit} disabled={isContentDisabled}>
                Cancel Changes
              </Button>
            )}
            <Button variant="primary" size="lg" onClick={handleSave} disabled={isContentDisabled}>
              {isEditing ? 'Update Attendance' : 'Save Attendance'}
            </Button>
        </div>
      </div>
    </>
  );
}

export default AttendanceForm;