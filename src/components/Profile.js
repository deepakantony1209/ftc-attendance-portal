import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';

/**
 * A component for users to view and update their profile information.
 * @param {object} user - The currently logged-in user's data.
 * @param {function} onUpdateProfile - Callback function to update the user's profile in the database.
 */
function Profile({ user, onUpdateProfile }) {
  // --- STATE MANAGEMENT ---
  const [formData, setFormData] = useState(user);

  // --- EFFECTS ---

  // Syncs the form data if the user prop changes
  useEffect(() => {
    setFormData(user);
  }, [user]);

  // --- HANDLER FUNCTIONS ---

  // Updates form data state on input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handles the main profile form submission (for non-email fields)
  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateProfile(formData);
  };

  // --- RENDER LOGIC ---

  return (
    <>
      <Card className="shadow-sm">
        <Card.Header>
          <h4 className="mb-0">Your Profile</h4>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control type="text" name="name" value={formData.name || ''} onChange={handleChange} required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Gender</Form.Label>
                  <Form.Select name="gender" value={formData.gender || 'Male'} onChange={handleChange}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date of Birth</Form.Label>
                  <Form.Control type="date" name="dob" value={formData.dob || ''} onChange={handleChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} required />
                </Form.Group>
              </Col>
            </Row>
            <Row>
  <Col md={6}>
    <Form.Group className="mb-3">
      <Form.Label>Marital Status</Form.Label>
      <Form.Select name="maritalStatus" value={formData.maritalStatus || ''} onChange={handleChange}>
        <option value="" disabled>Select status...</option>
        <option value="Single">Single</option>
        <option value="Married">Married</option>
      </Form.Select>
    </Form.Group>
  </Col>

  {/* Conditionally render Wedding Date based on Marital Status */}
  {formData.maritalStatus === 'Married' && (
    <Col md={6}>
      <Form.Group className="mb-3">
        <Form.Label>Wedding Date</Form.Label>
        <Form.Control type="date" name="weddingDate" value={formData.weddingDate || ''} onChange={handleChange} />
      </Form.Group>
    </Col>
  )}
</Row>
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control type="email" value={user.email} disabled />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Anbiyam (Community)</Form.Label>
              <Form.Control type="text" name="anbiyam" value={formData.anbiyam || ''} onChange={handleChange} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control as="textarea" rows={2} name="address" value={formData.address || ''} onChange={handleChange} />
            </Form.Group>
            <div className="d-flex justify-content-end">
              <Button variant="primary" type="submit">Update Profile</Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </>
  );
}

export default Profile;