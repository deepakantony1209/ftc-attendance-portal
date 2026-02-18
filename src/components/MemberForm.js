import React, { useState } from 'react';
import Button from './UI/Button';

function MemberForm({ member, onSave, onCancel, isViewOnly }) {
  const [formData, setFormData] = useState(member || {
    name: '', email: '', phone: '', gender: 'Male', dob: '',
    maritalStatus: '', weddingDate: '', anbiyam: '', address: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Full Name</label>
          <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required disabled={isViewOnly} className="form-input" />
        </div>
        <div>
          <label className="form-label">Email</label>
          <input type="email" name="email" value={formData.email || ''} onChange={handleChange} required disabled={isViewOnly || !!member} className="form-input" />
          {member && <p className="text-xs text-slate-400 mt-1">Email cannot be changed after creation.</p>}
        </div>
        <div>
          <label className="form-label">Phone</label>
          <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} required disabled={isViewOnly} className="form-input" />
        </div>
        <div>
          <label className="form-label">Gender</label>
          <select name="gender" value={formData.gender || 'Male'} onChange={handleChange} disabled={isViewOnly} className="form-select">
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="form-label">Date of Birth</label>
          <input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} disabled={isViewOnly} className="form-input" />
        </div>
        <div>
          <label className="form-label">Marital Status</label>
          <select name="maritalStatus" value={formData.maritalStatus || ''} onChange={handleChange} disabled={isViewOnly} className="form-select">
            <option value="" disabled>Select...</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
          </select>
        </div>
        {formData.maritalStatus === 'Married' && (
          <div>
            <label className="form-label">Wedding Date</label>
            <input type="date" name="weddingDate" value={formData.weddingDate || ''} onChange={handleChange} disabled={isViewOnly} className="form-input" />
          </div>
        )}
        <div>
          <label className="form-label">Anbiyam</label>
          <input type="text" name="anbiyam" value={formData.anbiyam || ''} onChange={handleChange} disabled={isViewOnly} className="form-input" />
        </div>
      </div>
      <div>
        <label className="form-label">Address</label>
        <textarea name="address" rows={3} value={formData.address || ''} onChange={handleChange} disabled={isViewOnly} className="form-textarea" />
      </div>
      {!isViewOnly && (
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" type="submit" icon="bi-check-lg">{member ? 'Update' : 'Add Member'}</Button>
        </div>
      )}
    </form>
  );
}

export default MemberForm;