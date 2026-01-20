import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Accordion, Button, Card, Col, Form, InputGroup, ListGroup, Modal, Row, Spinner, Badge } from 'react-bootstrap';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ManageTeams({
  loggedInUser,
  choirMembersList,
  teams,
  onUpdateTeam,
  onCreateTeam,
  onDeleteTeam,
  isReadOnly = false,
  isLoading
}) {
  // --- STATE MANAGEMENT ---
  const [sundaySearch, setSundaySearch] = useState('');
  const [marriageSearch, setMarriageSearch] = useState('');
  const [sundayActiveKeys, setSundayActiveKeys] = useState([]);
  const [marriageActiveKeys, setMarriageActiveKeys] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [teamToModify, setTeamToModify] = useState(null);
  const [teamTypeToCreate, setTeamTypeToCreate] = useState(null);

  // --- DATA PROCESSING ---
  const memberMap = useMemo(() => new Map(choirMembersList.map(m => [m.id, m])), [choirMembersList]);

  // Processes and returns the teams for a specific type ('sunday' or 'marriage')
  const getProcessedTeamsForType = useCallback((type) => {
    return teams
      .filter(team => team.type === type)
      .map(team => ({
        ...team,
        memberDetails: team.members
          .map(id => memberMap.get(id))
          .filter(Boolean)
          .sort((a, b) => {
            // 1. Organist Priority
            if (a.isOrganist && !b.isOrganist) return -1;
            if (!a.isOrganist && b.isOrganist) return 1;

            // 2. Gender Priority (Female comes before Male)
            // We treat 'Female' as higher priority than others for this specific sort requirements
            const isAFemale = a.gender === 'Female';
            const isBFemale = b.gender === 'Female';

            if (isAFemale && !isBFemale) return -1;
            if (!isAFemale && isBFemale) return 1;

            // 3. Alphabetical by Name
            return a.name.localeCompare(b.name);
          }),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, memberMap]);

  const sundayTeams = useMemo(() => getProcessedTeamsForType('sunday'), [getProcessedTeamsForType]);
  const marriageTeams = useMemo(() => getProcessedTeamsForType('marriage'), [getProcessedTeamsForType]);

  // Gets the list of members who are NOT assigned to any team of a specific type
  const getUnassignedMembersForType = useCallback((type) => {
    const relevantTeams = teams.filter(team => team.type === type);
    const assignedMemberIds = new Set(relevantTeams.flatMap(team => team.members));
    return choirMembersList
      .filter(member => !assignedMemberIds.has(member.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, choirMembersList]);

  const unassignedSundayMembers = useMemo(() => getUnassignedMembersForType('sunday'), [getUnassignedMembersForType]);
  const unassignedMarriageMembers = useMemo(() => getUnassignedMembersForType('marriage'), [getUnassignedMembersForType]);

  // Filters teams based on the search term for each section
  const filterTeams = (teamsToFilter, searchTerm) => {
    if (!searchTerm.trim()) return teamsToFilter;
    const lowerCaseSearch = searchTerm.toLowerCase();

    return teamsToFilter.map(team => ({
      ...team,
      memberDetails: team.memberDetails.filter(m => m.name.toLowerCase().includes(lowerCaseSearch))
    })).filter(team => team.memberDetails.length > 0);
  };

  const filteredSundayTeams = useMemo(() => filterTeams(sundayTeams, sundaySearch), [sundayTeams, sundaySearch]);
  const filteredMarriageTeams = useMemo(() => filterTeams(marriageTeams, marriageSearch), [marriageTeams, marriageSearch]);

  // --- EFFECTS FOR ACCORDION KEYS ---
  useEffect(() => {
    const defaultKeys = isReadOnly && loggedInUser
      ? (teams.find(team => team.members.includes(loggedInUser.id))?.id ? [teams.find(team => team.members.includes(loggedInUser.id)).id] : [])
      : teams.map(t => t.id);

    if (!sundaySearch) setSundayActiveKeys(defaultKeys.filter(key => sundayTeams.some(t => t.id === key)));
    else setSundayActiveKeys(filteredSundayTeams.map(t => t.id));

    if (!marriageSearch) setMarriageActiveKeys(defaultKeys.filter(key => marriageTeams.some(t => t.id === key)));
    else setMarriageActiveKeys(filteredMarriageTeams.map(t => t.id));
  }, [isReadOnly, loggedInUser, teams, sundayTeams, marriageTeams, sundaySearch, marriageSearch, filteredSundayTeams, filteredMarriageTeams]);

  // --- HANDLERS ---
  const handleOpenAddModal = (team) => {
    setTeamToModify(team);
    setShowAddModal(true);
  };

  const handleAddMember = (memberId) => {
    if (!teamToModify) return;
    onUpdateTeam(teamToModify.id, [...teamToModify.members, memberId]);
  };

  const handleRemoveMember = (team, memberId) => {
    onUpdateTeam(team.id, team.members.filter(id => id !== memberId));
  };

  const handleOpenCreateModal = (type) => {
    setTeamTypeToCreate(type);
    setNewTeamName('');
    setShowCreateModal(true);
  };

  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    const success = await onCreateTeam(newTeamName, teamTypeToCreate);
    if (success) {
      setNewTeamName('');
      setShowCreateModal(false);
      setTeamTypeToCreate(null);
    }
  };

  const handleDeleteTeamConfirm = () => {
    if (teamToModify) {
      onDeleteTeam(teamToModify.id, teamToModify.name);
      setShowDeleteModal(false);
      setTeamToModify(null);
    }
  };

  // --- PDF DOWNLOAD FUNCTIONALITY ---
  const handleDownloadPdf = (teamData, title) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, 14, 30);

    const tableRows = [];
    teamData.forEach(team => {
      tableRows.push([{
        content: `${team.name} (${team.memberDetails.length} Members)`,
        colSpan: 1,
        styles: { fontStyle: 'bold', fillColor: '#f0f0f0', textColor: '#000' }
      }]);
      if (team.memberDetails.length > 0) {
        team.memberDetails.forEach(member => {
          const displayName = member.isOrganist ? `${member.name} (Organist)` : member.name;
          tableRows.push([displayName]);
        });
      } else {
        tableRows.push(['- No members in this team -']);
      }
    });

    autoTable(doc, {
      head: [[`${title} List`]],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [13, 110, 253] }
    });
    doc.save(`${title.replace(/\s+/g, '_')}_Report.pdf`);
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner>
      </div>
    );
  }

  // --- RENDER LOGIC ---
  const renderTeamSection = (title, teams, searchTerm, setSearchTerm, activeKeys, setActiveKeys, type, handlePdf) => (
    <Card className="shadow-sm">
      <Card.Header>
        <Row className="align-items-center g-3">
          <Col sm={12} md={5}><h4 className="mb-0">{title}</h4></Col>
          <Col sm={12} md={7} className="d-flex flex-wrap justify-content-md-end gap-2">
            <InputGroup style={{ maxWidth: '300px' }}>
              <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
              <Form.Control placeholder="Search members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </InputGroup>
            {!isReadOnly && (
              <Button variant="success" onClick={() => handleOpenCreateModal(type)} className="action-btn">
                <i className="bi bi-plus-lg me-2"></i>Create Team
              </Button>
            )}
            <Button variant="outline-primary" onClick={handlePdf} className="action-btn">
              <i className="bi bi-download me-2"></i>Download PDF
            </Button>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        <Accordion activeKey={activeKeys} onSelect={setActiveKeys} alwaysOpen>
          {teams.map(team => (
            <Accordion.Item eventKey={team.id} key={team.id}>
              <Accordion.Header>
                <div className="d-flex justify-content-between align-items-center w-100 me-2">
                  <div>
                    <span className="fw-bold me-2">{team.name}</span>
                    <Badge pill bg="secondary">{team.memberDetails.length}</Badge>
                  </div>
                  {!isReadOnly && (
                    <div className="team-actions d-flex gap-2">
                      <Button variant="outline-primary" size="sm" className="action-btn" onClick={(e) => { e.stopPropagation(); handleOpenAddModal(team); }}><i className="bi bi-plus-lg me-1"></i>Add</Button>
                      <Button variant="outline-danger" size="sm" className="action-btn" onClick={(e) => { e.stopPropagation(); setTeamToModify(team); setShowDeleteModal(true); }}><i className="bi bi-trash me-1"></i>Delete Team</Button>
                    </div>
                  )}
                </div>
              </Accordion.Header>
              <Accordion.Body>
                <ListGroup variant="flush">
                  {team.memberDetails.length > 0 ? team.memberDetails.map(member => (
                    <ListGroup.Item key={member.id} className="team-member-item d-flex justify-content-between align-items-center">
                      <span>{member.name} {member.isOrganist && <span className="text-primary fw-bold ms-1">(Organist)</span>}</span>
                      {!isReadOnly && (
                        <Button variant="link" className="text-danger p-0 remove-member-btn" onClick={() => handleRemoveMember(team, member.id)} title={`Remove ${member.name}`}>
                          <i className="bi bi-x-circle-fill"></i>
                        </Button>
                      )}
                    </ListGroup.Item>
                  )) : (
                    <ListGroup.Item className="text-muted">{searchTerm ? 'No members found matching search.' : 'No members in this team.'}</ListGroup.Item>
                  )}
                </ListGroup>
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      </Card.Body>
    </Card>
  );

  return (
    <>
      {renderTeamSection('Sunday Evening Mass Teams', filteredSundayTeams, sundaySearch, setSundaySearch, sundayActiveKeys, setSundayActiveKeys, 'sunday', () => handleDownloadPdf(sundayTeams, 'Sunday Evening Mass Teams'))}
      <div className="mt-4">
        {renderTeamSection('Marriage Mass Teams', filteredMarriageTeams, marriageSearch, setMarriageSearch, marriageActiveKeys, setMarriageActiveKeys, 'marriage', () => handleDownloadPdf(marriageTeams, 'Marriage Mass Teams'))}
      </div>

      {/* --- MODALS (Shared for both sections) --- */}
      {!isReadOnly && (
        <>
          <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
            <Modal.Header closeButton><Modal.Title>Add Member to {teamToModify?.name}</Modal.Title></Modal.Header>
            <Modal.Body>
              <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {(() => {
                  const membersToShow = teamToModify?.type === 'sunday' ? unassignedSundayMembers : unassignedMarriageMembers;
                  if (membersToShow && membersToShow.length > 0) {
                    return membersToShow.map(member => (
                      <ListGroup.Item key={member.id} action onClick={() => { handleAddMember(member.id); setShowAddModal(false); }} className="d-flex justify-content-between align-items-center">
                        {member.name}
                        <i className="bi bi-plus-circle-fill text-success"></i>
                      </ListGroup.Item>
                    ));
                  } else {
                    return <ListGroup.Item className="text-muted">All members are already assigned to a team of this type.</ListGroup.Item>;
                  }
                })()}
              </ListGroup>
            </Modal.Body>
          </Modal>

          <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
            <Modal.Header closeButton><Modal.Title>Create New {teamTypeToCreate === 'sunday' ? 'Sunday Mass' : 'Marriage Mass'} Team</Modal.Title></Modal.Header>
            <Form onSubmit={handleCreateTeamSubmit}>
              <Modal.Body>
                <Form.Group>
                  <Form.Label>Team Name</Form.Label>
                  <Form.Control type="text" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="e.g., Team D" required />
                </Form.Group>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Create</Button>
              </Modal.Footer>
            </Form>
          </Modal>

          <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
            <Modal.Header closeButton><Modal.Title>Confirm Deletion</Modal.Title></Modal.Header>
            <Modal.Body>Are you sure you want to permanently delete this team<strong>{teamToModify?.name}</strong>? This action cannot be undone.</Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteTeamConfirm}>Yes, Delete</Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </>
  );
}

export default ManageTeams;

