import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// The form now accepts `onFormSubmit` and `initialData`
function MemberForm({ onFormSubmit, onCancel, initialData }) {
  const [formData, setFormData] = useState({
    name: '', gender: 'Male', dob: '', phone: '', email: '',
    anbiyam: '', address: '', maritialStatus: '', weddingDate: ''
  });

  // New state to track if the form has been modified from its initial state
  const [isDirty, setIsDirty] = useState(false);

  // This `useEffect` hook runs when the component opens or the member being edited changes.
  // If `initialData` exists (i.e., we are editing), it populates the form and resets the dirty state.
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setIsDirty(false); // Form is clean when first loaded with data
    } else {
      // If adding a new member, reset the form completely
      setFormData({
        name: '', gender: 'Male', dob: '', phone: '', email: '',
        anbiyam: '', address: ''
      });
    }
  }, [initialData]);

  // This effect runs whenever the form data changes to check for modifications.
  useEffect(() => {
    if (initialData) {
      // A simple string comparison to check if the current data differs from the initial data
      const hasChanged = JSON.stringify(initialData) !== JSON.stringify(formData);
      setIsDirty(hasChanged);
    }
  }, [formData, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and Phone Number are required.');
      return;
    }
    // This now calls the generic onFormSubmit function passed from ManageMembers
    onFormSubmit(formData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Col md={8}>
          <Form.Group className="mb-3">
            <Form.Label>Name</Form.Label>
            <Form.Control type="text" name="name" value={formData.name} onChange={handleChange} required />
          </Form.Group>
        </Col>
        <Col md={4}>
          <Form.Group className="mb-3">
            <Form.Label>Gender</Form.Label>
            <Form.Select name="gender" value={formData.gender} onChange={handleChange}>
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
            <Form.Control type="date" name="dob" value={formData.dob} onChange={handleChange} />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Phone Number</Form.Label>
            <Form.Control type="tel" name="phone" value={formData.phone} onChange={handleChange} required />
          </Form.Group>
        </Col>
      </Row>
      <Form.Group className="mb-3">
        <Form.Label>Email Address</Form.Label>
        <Form.Control
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          readOnly={!!initialData} // Make read-only if editing
        />
        {initialData && (
          <Alert variant="info" className="mt-2 mb-0">
            <small>
              <strong>Note for Admin:</strong> You can't update the email here. Users can update it themselves from their profile page.
            </small>
          </Alert>
        )}
        {!initialData && (
          <Form.Text className="text-muted">
            This will be the user's login email address.
          </Form.Text>
        )}
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Anbiyam / Community</Form.Label>
        <Form.Control type="text" name="anbiyam" value={formData.anbiyam} onChange={handleChange} />
      </Form.Group>
      {/* ... after the Email Form.Group ... */}

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

      <Row>
        <Col md={12}>
          <Form.Group className="mb-3">
            <Form.Label>Choir Roles</Form.Label>
            <div className="d-flex gap-3">
              <Form.Check
                type="checkbox"
                id="isOrganist"
                label="Organist"
                name="isOrganist"
                checked={formData.isOrganist || false}
                onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.checked })}
              />
              <Form.Check
                type="checkbox"
                id="isSoundEngineer"
                label="Sound Engineer"
                name="isSoundEngineer"
                checked={formData.isSoundEngineer || false}
                onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.checked })}
              />
              <Form.Check
                type="checkbox"
                id="isPresentationSpecialist"
                label="Presentation Specialist"
                name="isPresentationSpecialist"
                checked={formData.isPresentationSpecialist || false}
                onChange={(e) => setFormData({ ...formData, [e.target.name]: e.target.checked })}
              />
            </div>
          </Form.Group>
        </Col>
      </Row>

      {/* ... Anbiyam / Community Form.Group ... */}
      <Form.Group className="mb-3">
        <Form.Label>Address</Form.Label>
        <Form.Control as="textarea" rows={2} name="address" value={formData.address} onChange={handleChange} />
      </Form.Group>
      <div className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" type="submit" disabled={initialData && !isDirty}>
          {initialData ? 'Save Changes' : 'Add Member'}
        </Button>
      </div>
    </Form>
  );
}

export default MemberForm;