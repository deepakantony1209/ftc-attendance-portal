import React, { useState, useMemo } from 'react';
import { Table, Button, Modal, Card, ListGroup, Form, InputGroup, Row, Col, Spinner } from 'react-bootstrap';
import MemberForm from './MemberForm';
import { toast } from 'react-toastify';

function ManageMembers({ members, onAddMember, onEditMember, onRemoveMember, isReadOnly = false, isLoading }) {
  const [showModal, setShowModal] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [memberToView, setMemberToView] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  const handleShowAddModal = () => {
    setMemberToEdit(null);
    setShowModal(true);
  };
  
  const handleShowEditModal = (member) => {
    setMemberToEdit(member);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setMemberToEdit(null);
  };

  const handleFormSubmit = async (memberData) => {
    if (memberToEdit) {
      // Check if email was changed
      const emailChanged = memberData.email !== memberToEdit.email;
      
      if (emailChanged) {
        // Admin is changing a user's email - this requires special handling
        await handleAdminEmailUpdate(memberData);
      } else {
        // Regular profile update
        await onEditMember({ ...memberData, id: memberToEdit.id });
      }
    } else {
      await onAddMember(memberData);
    }
    handleCloseModal();
  };

  const handleAdminEmailUpdate = async (memberData) => {
    try {
      // First, update the database
      await onEditMember({ ...memberData, id: memberToEdit.id });
      
      // Show admin instructions for Firebase Auth update
      toast.info(
        `Profile updated in database. Note: The user will need to contact you to update their login email, or you'll need to update it manually in the Firebase Console.`,
        { autoClose: 8000 }
      );
      
      // Alternative: If you want to try updating auth (requires the user to be signed in)
      // This won't work for admin updating other users, but keeping for reference
      /*
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === memberToEdit.id) {
        await updateEmail(currentUser, memberData.email);
        toast.success(`Email updated in both database and authentication.`);
      } else {
        toast.info(`Database updated. Authentication email must be updated separately.`);
      }
      */
      
    } catch (error) {
      console.error('Admin email update error:', error);
      toast.error('Failed to update member email. Please try again.');
    }
  };

  const openConfirmDialog = (member) => {
    setMemberToRemove(member);
    setShowConfirmDialog(true);
  };

  const closeConfirmDialog = () => {
    setMemberToRemove(null);
    setShowConfirmDialog(false);
  };

  const confirmRemove = () => {
    if (memberToRemove) {
      onRemoveMember(memberToRemove.id);
    }
    closeConfirmDialog();
  };

  const handleViewDetails = (member) => {
    setMemberToView(member);
  };

  const handleCloseDetails = () => {
    setMemberToView(null);
  };
  
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <i className="bi bi-arrow-up ms-1"></i> : <i className="bi bi-arrow-down ms-1"></i>;
  };
  
  const filteredAndSortedMembers = useMemo(() => {
    let sortableMembers = [...members];
    
    sortableMembers = sortableMembers.filter(member => 
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (member.phone && member.phone.includes(searchTerm))
    );
    
    sortableMembers.sort((a, b) => {
      if (sortConfig.key === 'dob') {
        const dateA = new Date(a.dob);
        const dateB = new Date(b.dob);
        return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
      }
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      const comparison = aValue.toString().localeCompare(bValue.toString(), undefined, { numeric: true });
      if (comparison !== 0) {
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      }
      if (sortConfig.key === 'name') {
        return new Date(a.dob) - new Date(b.dob);
      }
      return 0;
    });

    return sortableMembers;
  }, [members, searchTerm, sortConfig]);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading Members...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <Card.Header>
          <Row className="align-items-center">
            <Col><h4 className="mb-0">{isReadOnly ? 'Choir Members' : 'Manage Choir Members'} ({filteredAndSortedMembers.length})</h4></Col>
          </Row>
          <Row className="mt-3">
            <Col md={8} lg={9}>
              <InputGroup>
                <Form.Control
                  placeholder="Search by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={4} lg={3} className="d-grid d-md-block mt-2 mt-md-0">
              {!isReadOnly && (
                <Button variant="primary" onClick={handleShowAddModal} className="w-100">
                  <i className="bi bi-plus-lg me-2"></i>Add New Member
                </Button>
              )}
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          <Table striped bordered hover responsive className="members-table">
            <thead>
              <tr>
                <th onClick={() => requestSort('name')} style={{ cursor: 'pointer' }}>Name {getSortIndicator('name')}</th>
                <th onClick={() => requestSort('dob')} style={{ cursor: 'pointer' }}>Birth date {getSortIndicator('dob')}</th>
                <th onClick={() => requestSort('phone')} style={{ cursor: 'pointer' }}>Phone {getSortIndicator('phone')}</th>
                <th onClick={() => requestSort('email')} style={{ cursor: 'pointer' }}>Email {getSortIndicator('email')}</th>
                {!isReadOnly && <th className="text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedMembers.map(member => (
                <tr key={member.id} onClick={() => handleViewDetails(member)} style={{ cursor: 'pointer' }}>
                  <td>{member.name}</td>
                  <td>{new Date(member.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}</td>
                  <td>{member.phone}</td>
                  <td>{member.email}</td>
                  {!isReadOnly && (
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => handleShowEditModal(member)}>Edit</Button>
                      <Button variant="outline-danger" size="sm" onClick={() => openConfirmDialog(member)}>Delete</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{memberToEdit ? 'Edit Member Details' : 'Add New Member'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <MemberForm 
            onFormSubmit={handleFormSubmit} 
            onCancel={handleCloseModal} 
            initialData={memberToEdit}
          />
        </Modal.Body>
      </Modal>

      <Modal show={showConfirmDialog} onHide={closeConfirmDialog} centered>
        <Modal.Header closeButton><Modal.Title>Confirm Delete</Modal.Title></Modal.Header>
        <Modal.Body>Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from the choir?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeConfirmDialog}>Cancel</Button>
          <Button variant="danger" onClick={confirmRemove}>Yes, Remove</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!memberToView} onHide={handleCloseDetails} centered>
        <Modal.Header closeButton><Modal.Title>{memberToView?.name}'s Information</Modal.Title></Modal.Header>
        <Modal.Body>
          {memberToView && (
            <ListGroup variant="flush">
              <ListGroup.Item><strong>Name:</strong> {memberToView.name}</ListGroup.Item>
              <ListGroup.Item><strong>Gender:</strong> {memberToView.gender}</ListGroup.Item>
              <ListGroup.Item><strong>Date of Birth:</strong> {new Date(memberToView.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</ListGroup.Item>
              <ListGroup.Item><strong>Marital Status:</strong> {memberToView.maritalStatus || 'N/A'}</ListGroup.Item>
{memberToView.maritalStatus === 'Married' && (
    <ListGroup.Item><strong>Wedding Date:</strong> {memberToView.weddingDate ? new Date(memberToView.weddingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A'}</ListGroup.Item>
  )}
              <ListGroup.Item><strong>Phone:</strong> <a href={`tel:${memberToView.phone}`}>{memberToView.phone}</a></ListGroup.Item>
              <ListGroup.Item><strong>Email:</strong> <a href={`mailto:${memberToView.email}`}>{memberToView.email}</a></ListGroup.Item>
              <ListGroup.Item><strong>Anbiyam / Community:</strong> {memberToView.anbiyam}</ListGroup.Item>
              <ListGroup.Item><strong>Address:</strong> {memberToView.address}</ListGroup.Item>
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDetails}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default ManageMembers;