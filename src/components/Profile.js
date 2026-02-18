import React, { useState, useEffect } from 'react';
import PageHeader from './Layout/PageHeader';
import Card from './UI/Card';
import Button from './UI/Button';

function Profile({ user, onUpdateProfile }) {
  const [formData, setFormData] = useState(user);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => { setFormData(user); setIsDirty(false); }, [user]);

  useEffect(() => {
    const hasChanged = JSON.stringify(user) !== JSON.stringify(formData);
    setIsDirty(hasChanged);
  }, [formData, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onUpdateProfile(formData);
    setIsDirty(false);
  };

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your personal information and preferences." />

      <div className="max-w-3xl mx-auto">
        <Card>
          <Card.Header>
            <h5 className="font-bold text-slate-800 dark:text-white">Edit Details</h5>
          </Card.Header>
          <Card.Body>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <label className="form-label">Full Name</label>
                  <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required className="form-input font-medium" />
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  <select name="gender" value={formData.gender || 'Male'} onChange={handleChange} className="form-select">
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="form-label">Date of Birth</label>
                  <input type="date" name="dob" value={formData.dob || ''} onChange={handleChange} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone || ''} onChange={handleChange} required className="form-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="form-label">Marital Status</label>
                  <select name="maritalStatus" value={formData.maritalStatus || ''} onChange={handleChange} className="form-select">
                    <option value="" disabled>Select status...</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                  </select>
                </div>
                {formData.maritalStatus === 'Married' && (
                  <div>
                    <label className="form-label">Wedding Date</label>
                    <input type="date" name="weddingDate" value={formData.weddingDate || ''} onChange={handleChange} className="form-input" />
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Email Address</label>
                <input type="email" value={user.email} disabled className="form-input bg-slate-50 dark:bg-slate-900 text-slate-500 cursor-not-allowed" />
                <p className="text-xs text-slate-400 mt-1">Email cannot be changed as it is your login identifier.</p>
              </div>

              <div>
                <label className="form-label">Anbiyam (Community)</label>
                <input type="text" name="anbiyam" value={formData.anbiyam || ''} onChange={handleChange} className="form-input" />
              </div>

              <div>
                <label className="form-label">Address</label>
                <textarea name="address" rows={3} value={formData.address || ''} onChange={handleChange} className="form-textarea" />
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="primary" type="submit" size="lg" disabled={!isDirty} icon="bi-check-lg">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

export default Profile;