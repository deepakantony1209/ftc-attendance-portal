import React, { useState, useMemo } from 'react';
import MemberForm from './MemberForm';
import { toast } from 'react-toastify';
import PageHeader from './Layout/PageHeader';
import Button from './UI/Button';
import Card from './UI/Card';

function ManageMembers({ members, onAddMember, onEditMember, onRemoveMember, onToggleDisable, isReadOnly = false, isLoading }) {
  const [showModal, setShowModal] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [memberToToggle, setMemberToToggle] = useState(null);
  const [memberToView, setMemberToView] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('active'); // 'all' | 'active' | 'disabled'
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  const activeCount = useMemo(() => members.filter(m => !m.disabled).length, [members]);
  const disabledCount = useMemo(() => members.filter(m => m.disabled).length, [members]);

  const handleShowAddModal = () => { setMemberToEdit(null); setShowModal(true); };
  const handleShowEditModal = (member) => { setMemberToEdit(member); setShowModal(true); };
  const handleCloseModal = () => { setShowModal(false); setMemberToEdit(null); };

  const handleFormSubmit = async (memberData) => {
    if (memberToEdit) {
      const emailChanged = memberData.email !== memberToEdit.email;
      if (emailChanged) {
        await handleAdminEmailUpdate(memberData);
      } else {
        await onEditMember({ ...memberData, id: memberToEdit.id });
      }
    } else {
      await onAddMember(memberData);
    }
    handleCloseModal();
  };

  const handleAdminEmailUpdate = async (memberData) => {
    try {
      await onEditMember({ ...memberData, id: memberToEdit.id });
      toast.info(`Profile updated. The user needs to update their login email separately.`, { autoClose: 8000 });
    } catch (error) {
      console.error('Admin email update error:', error);
      toast.error('Failed to update member email.');
    }
  };

  const openConfirmDialog = (member) => { setMemberToRemove(member); setShowConfirmDialog(true); };
  const closeConfirmDialog = () => { setMemberToRemove(null); setShowConfirmDialog(false); };
  const confirmRemove = () => { if (memberToRemove) onRemoveMember(memberToRemove.id); closeConfirmDialog(); };

  const openDisableConfirmDialog = (member) => { setMemberToToggle(member); setShowDisableDialog(true); };
  const closeDisableConfirmDialog = () => { setMemberToToggle(null); setShowDisableDialog(false); };
  const confirmToggleDisable = async () => {
    if (memberToToggle && onToggleDisable) {
      await onToggleDisable(memberToToggle.id, !!memberToToggle.disabled);
    }
    closeDisableConfirmDialog();
  };

  const handleViewDetails = (member) => setMemberToView(member);
  const handleCloseDetails = () => setMemberToView(null);

  const filteredAndSortedMembers = useMemo(() => {
    let sortableMembers = [...members].filter(member => {
      // Non-admins only see active members
      if (isReadOnly) {
        if (member.disabled) return false;
      } else {
        if (statusFilter === 'active' && member.disabled) return false;
        if (statusFilter === 'disabled' && !member.disabled) return false;
      }

      return (
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.email && member.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.phone && member.phone.includes(searchTerm))
      );
    });

    sortableMembers.sort((a, b) => {
      if (sortConfig.key === 'dob') {
        const dateA = new Date(a.dob); const dateB = new Date(b.dob);
        return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
      }
      const aValue = a[sortConfig.key] || ''; const bValue = b[sortConfig.key] || '';
      const comparison = aValue.toString().localeCompare(bValue.toString(), undefined, { numeric: true });
      return sortConfig.direction === 'ascending' ? comparison : -comparison;
    });
    return sortableMembers;
  }, [members, searchTerm, sortConfig, statusFilter, isReadOnly]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Choir Members"
        subtitle={isReadOnly ? `${activeCount} members` : `${activeCount} active · ${disabledCount} disabled · ${members.length} total`}
        actions={!isReadOnly && (
          <Button variant="primary" onClick={handleShowAddModal} icon="bi-person-plus-fill">Add Member</Button>
        )}
      />

      {/* Status Filter Tabs (Admin Only) */}
      {!isReadOnly && (
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4 w-fit border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'active'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Active <span className="ml-1 opacity-70">({activeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('disabled')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'disabled'
                ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Disabled <span className="ml-1 opacity-70">({disabledCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            All <span className="ml-1 opacity-70">({members.length})</span>
          </button>
        </div>
      )}

      {/* Search & Sort Bar */}
      <Card className="mb-5">
        <Card.Body className="py-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 whitespace-nowrap">Sort:</span>
              <select
                value={`${sortConfig.key}-${sortConfig.direction}`}
                onChange={(e) => { const [key, direction] = e.target.value.split('-'); setSortConfig({ key, direction }); }}
                className="form-select w-auto"
              >
                <option value="name-ascending">Name (A-Z)</option>
                <option value="name-descending">Name (Z-A)</option>
                <option value="dob-ascending">Birth Date (Jan-Dec)</option>
                <option value="email-ascending">Email (A-Z)</option>
              </select>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Members Table */}
      {filteredAndSortedMembers.length === 0 ? (
        <Card>
          <div className="text-center py-16 text-slate-400">
            <i className="bi bi-people text-5xl block mb-3 opacity-50"></i>
            <p className="text-lg font-medium">No members found</p>
            {statusFilter === 'disabled' && (
              <p className="text-xs text-slate-400 mt-1">There are currently no disabled members.</p>
            )}
          </div>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Status</th>
                      <th>Birth Date</th>
                      <th>Contact</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedMembers.map(member => (
                      <tr key={member.id} className={member.disabled ? 'opacity-70 bg-slate-50/40 dark:bg-slate-800/20' : ''}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${member.gender === 'Female' ? 'bg-amber-500' : 'bg-sky-500'}`}>
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                {member.name}
                                {member.isOrganist && <span className="text-[10px] font-bold uppercase bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 px-1.5 py-0.5 rounded">Organist</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {member.disabled ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 py-0.5 rounded-full">
                              <i className="bi bi-slash-circle text-[10px]"></i> Disabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                              <i className="bi bi-check-circle-fill text-[10px]"></i> Active
                            </span>
                          )}
                        </td>
                        <td>{member.dob ? new Date(member.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'long' }) : '—'}</td>
                        <td>
                          <div className="text-sm space-y-0.5">
                            {member.phone && <a href={`tel:${member.phone}`} className="text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:underline block"><i className="bi bi-telephone mr-1.5 text-xs"></i>{member.phone}</a>}
                            {member.email && <a href={`mailto:${member.email}`} className="text-slate-400 dark:text-slate-500 hover:text-primary-500 dark:hover:text-primary-400 hover:underline text-xs block mt-0.5"><i className="bi bi-envelope mr-1.5"></i>{member.email}</a>}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleViewDetails(member)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="View"><i className="bi bi-eye-fill"></i></button>
                            {!isReadOnly && (
                              <>
                                <button onClick={() => handleShowEditModal(member)} className="p-2 rounded-lg text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors" title="Edit"><i className="bi bi-pencil-fill"></i></button>
                                {member.role !== 'admin' && member.email !== 'fathimatamilchoir@gmail.com' && (
                                  <button
                                    onClick={() => openDisableConfirmDialog(member)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      member.disabled
                                        ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                        : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                    }`}
                                    title={member.disabled ? "Enable Member" : "Disable Member"}
                                  >
                                    <i className={`bi ${member.disabled ? 'bi-person-check-fill' : 'bi-person-slash'}`}></i>
                                  </button>
                                )}
                                <button onClick={() => openConfirmDialog(member)} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove"><i className="bi bi-trash-fill"></i></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredAndSortedMembers.map(member => (
              <Card key={member.id} className={`animate-fade-in ${member.disabled ? 'opacity-75' : ''}`}>
                <Card.Body className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${member.gender === 'Female' ? 'bg-amber-500' : 'bg-sky-500'}`}>
                      {member.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{member.name}</div>
                        {member.disabled ? (
                          <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-1.5 py-0.2 rounded-full">Disabled</span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.2 rounded-full">Active</span>
                        )}
                      </div>
                      <a href={`mailto:${member.email}`} className="text-xs text-slate-400 truncate hover:text-primary-500 hover:underline block">{member.email}</a>
                      {member.phone && <a href={`tel:${member.phone}`} className="text-xs text-slate-500 dark:text-slate-500 hover:text-primary-500 hover:underline block mt-0.5"><i className="bi bi-telephone mr-1 text-[10px]"></i>{member.phone}</a>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleViewDetails(member)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 dark:text-primary-400 dark:bg-primary-900/20 transition-colors">
                      <i className="bi bi-eye-fill"></i> View
                    </button>
                    {!isReadOnly && (
                      <>
                        <button onClick={() => handleShowEditModal(member)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-700 transition-colors">
                          <i className="bi bi-pencil-fill"></i> Edit
                        </button>
                        {member.role !== 'admin' && member.email !== 'fathimatamilchoir@gmail.com' && (
                          <button
                            onClick={() => openDisableConfirmDialog(member)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                              member.disabled
                                ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20'
                                : 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20'
                            }`}
                          >
                            <i className={`bi ${member.disabled ? 'bi-person-check-fill' : 'bi-person-slash'}`}></i> {member.disabled ? 'Enable' : 'Disable'}
                          </button>
                        )}
                        <button onClick={() => openConfirmDialog(member)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-900/20 transition-colors">
                          <i className="bi bi-trash-fill"></i> Remove
                        </button>
                      </>
                    )}
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white">{memberToEdit ? 'Edit Member Details' : 'Add New Member'}</h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <MemberForm member={memberToEdit} onSave={handleFormSubmit} onCancel={handleCloseModal} />
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Modal */}
      {showConfirmDialog && (
        <div className="modal-overlay" onClick={closeConfirmDialog}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <i className="bi bi-exclamation-triangle-fill text-red-600 dark:text-red-400"></i>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Confirm Remove</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-1">Are you sure you want to remove <strong>{memberToRemove?.name}</strong>?</p>
              <p className="text-sm text-slate-400 mb-6">This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={closeConfirmDialog}>Cancel</Button>
                <Button variant="danger" onClick={confirmRemove}>Yes, Remove</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Disable/Enable Modal */}
      {showDisableDialog && memberToToggle && (
        <div className="modal-overlay" onClick={closeDisableConfirmDialog}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  memberToToggle.disabled
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }`}>
                  <i className={`bi ${memberToToggle.disabled ? 'bi-person-check-fill' : 'bi-person-slash'} text-lg`}></i>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  {memberToToggle.disabled ? 'Enable Member' : 'Disable Member'}
                </h3>
              </div>
              {memberToToggle.disabled ? (
                <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                  Are you sure you want to re-enable <strong>{memberToToggle.name}</strong>? They will be restored to attendance marking sheets, teams, and reports.
                </p>
              ) : (
                <div className="space-y-3 mb-6">
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    Are you sure you want to mark <strong>{memberToToggle.name}</strong> as disabled?
                  </p>
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <i className="bi bi-check2 text-emerald-500"></i>
                      <span>Their name will <strong>not</strong> appear in attendance sheets.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="bi bi-check2 text-emerald-500"></i>
                      <span>Their name will <strong>not</strong> appear in teams or reports.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="bi bi-shield-check text-primary-500"></i>
                      <span>All their existing attendance records and data remain <strong>fully preserved</strong>.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <i className="bi bi-arrow-repeat text-indigo-500"></i>
                      <span>You can re-enable them at any time.</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={closeDisableConfirmDialog}>Cancel</Button>
                <Button
                  variant={memberToToggle.disabled ? 'success' : 'warning'}
                  onClick={confirmToggleDisable}
                >
                  {memberToToggle.disabled ? 'Yes, Enable' : 'Yes, Disable'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {memberToView && (
        <div className="modal-overlay" onClick={handleCloseDetails}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-white">Member Profile</h3>
              <button onClick={handleCloseDetails} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="overflow-y-auto flex-1">
              <div className="bg-slate-50 dark:bg-slate-900 p-6 text-center border-b border-slate-200 dark:border-slate-700">
                <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-3 ${memberToView.gender === 'Female' ? 'bg-amber-500' : 'bg-sky-500'}`}>
                  {memberToView.name.charAt(0)}
                </div>
                <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{memberToView.name}</h4>
                <a href={`mailto:${memberToView.email}`} className="text-sm text-slate-500 mb-2 hover:text-primary-500 hover:underline inline-block">{memberToView.email}</a>
                <div className="flex justify-center gap-2">
                  <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full">{memberToView.gender}</span>
                  {memberToView.disabled ? (
                    <span className="text-xs font-semibold bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 px-2 py-1 rounded-full">Disabled</span>
                  ) : (
                    <span className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">Active</span>
                  )}
                  {memberToView.isOrganist && <span className="text-xs font-semibold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 px-2 py-1 rounded-full">Organist</span>}
                </div>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {[
                  { label: 'Status', value: memberToView.disabled ? 'Disabled' : 'Active' },
                  { label: 'Date of Birth', value: memberToView.dob ? new Date(memberToView.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'N/A' },
                  { label: 'Phone', value: memberToView.phone ? <a href={`tel:${memberToView.phone}`} className="hover:text-primary-600 hover:underline text-primary-600 dark:text-primary-400">{memberToView.phone}</a> : 'N/A' },
                  { label: 'Marital Status', value: memberToView.maritalStatus || 'N/A' },
                  ...(memberToView.maritalStatus === 'Married' ? [{ label: 'Wedding Date', value: memberToView.weddingDate ? new Date(memberToView.weddingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A' }] : []),
                  { label: 'Anbiyam', value: memberToView.anbiyam || 'N/A' },
                  { label: 'Address', value: memberToView.address || 'N/A' },
                ].map((item, i) => (
                  <div key={i} className="px-6 py-3">
                    <div className="text-xs font-bold uppercase text-slate-400 mb-0.5">{item.label}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <Button variant="secondary" onClick={handleCloseDetails}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ManageMembers;