import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Row, Col, Card, Alert, Modal, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  sendEmailVerification,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { auth } from '../firebase';

/**
 * A component for users to view and update their profile information.
 * It includes functionality to change their email, which requires re-authentication
 * and verification of the new email address.
 * @param {object} user - The currently logged-in user's data.
 * @param {function} onUpdateProfile - Callback function to update the user's profile in the database.
 */
function Profile({ user, onUpdateProfile }) {
  // --- STATE MANAGEMENT ---
  const [formData, setFormData] = useState(user);
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailUpdateStep, setEmailUpdateStep] = useState('input'); // 'input', 'pre-verify', 'verification', 'complete'
  const [pendingEmail, setPendingEmail] = useState('');
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const verificationPollIntervalRef = useRef(null);
  
  // State for alerts inside the modal
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  // --- EFFECTS ---

  // Syncs the form data if the user prop changes
  useEffect(() => {
    setFormData(user);
  }, [user]);

  // Polling-based verification check
  useEffect(() => {
    if (emailUpdateStep === 'pre-verify' && pendingEmail) {
      // Start polling every 3 seconds to check if email has been verified
      const pollForVerification = async () => {
        try {
          const currentUser = auth.currentUser;
          if (!currentUser) {
            console.log('No current user found, stopping polling');
            return;
          }

          // Try to reload user data - this might fail if token is expired
          await currentUser.reload();
          
          console.log('Polling check - Current email:', currentUser.email);
          console.log('Polling check - Pending email:', pendingEmail);
          console.log('Polling check - Email verified:', currentUser.emailVerified);
          
          // Check if email has been updated and verified
          if (currentUser.email === pendingEmail && currentUser.emailVerified) {
            console.log('Email verification detected via polling, updating database...');
            console.log('User object:', user);
            console.log('Pending email:', pendingEmail);
            
            // Clear polling interval FIRST
            if (verificationPollIntervalRef.current) {
              clearInterval(verificationPollIntervalRef.current);
              verificationPollIntervalRef.current = null;
            }
            
            // IMMEDIATELY update the database using the original user data
            const updatedProfile = { 
              ...user, 
              email: pendingEmail,
              id: user.id
            };
            
            console.log('Profile data being sent to update:', updatedProfile);
            
            try {
              // Update database first
              console.log('Calling onUpdateProfile...');
              const success = await onUpdateProfile(updatedProfile);
              console.log('onUpdateProfile returned:', success);
              
              if (success) {
                console.log('Database updated successfully');
                // Update local form data immediately
                setFormData(prevData => ({ ...prevData, email: pendingEmail }));
                toast.success('Email successfully verified and updated in all systems!');
                setEmailUpdateStep('complete');
                
                // Give user more time to see the success message - 6 seconds
                setTimeout(() => {
                  setShowEmailChangeModal(false);
                  setShowAlert(false);
                  setCurrentPassword('');
                  setNewEmail('');
                  setEmailUpdateStep('input');
                  setPendingEmail('');
                }, 6000);
              } else {
                console.error('Profile update returned false');
                toast.error('Email verified in authentication but failed to update profile database. Please refresh the page.');
                setAlertMessage('Email verified but failed to update profile. Please refresh the page.');
                setAlertType('warning');
                setShowAlert(true);
              }
            } catch (dbError) {
              console.error('Database update error:', dbError);
              toast.error('Email verified in authentication but failed to update profile database. Please refresh the page.');
              setAlertMessage('Email verified but failed to update profile. Please refresh the page.');
              setAlertType('warning');
              setShowAlert(true);
            }
          }
        } catch (error) {
          console.log('Error during verification polling:', error.code, error.message);
          
          // If token expired, try one more approach - update database with stored data
          if (error.code === 'auth/user-token-expired' || error.code === 'auth/user-not-found') {
            console.log('Token expired - attempting direct database update with stored user data');
            
            // Clear polling interval
            if (verificationPollIntervalRef.current) {
              clearInterval(verificationPollIntervalRef.current);
              verificationPollIntervalRef.current = null;
            }
            
            // Try to update database with the original user data and pending email
            const updatedProfile = { 
              ...user, 
              email: pendingEmail,
              id: user.id
            };
            
            try {
              console.log('Attempting database update after token expiry...');
              const success = await onUpdateProfile(updatedProfile);
              console.log('Database update after token expiry result:', success);
              
              if (success) {
                console.log('Database updated successfully after token expiry');
                setFormData(prevData => ({ ...prevData, email: pendingEmail }));
                toast.success('Email successfully verified and updated! You may need to log in again with your new email.');
                setEmailUpdateStep('complete');
                
                setTimeout(() => {
                  setShowEmailChangeModal(false);
                  setShowAlert(false);
                  setCurrentPassword('');
                  setNewEmail('');
                  setEmailUpdateStep('input');
                  setPendingEmail('');
                }, 6000);
              } else {
                console.error('Database update failed after token expiry');
                toast.error('Email verification completed but database update failed. Please log out and log back in with your new email, then update your profile manually.');
                setAlertMessage('Email verification completed but profile update failed. Please log out and log back in with your new email.');
                setAlertType('warning');
                setShowAlert(true);
              }
            } catch (dbUpdateError) {
              console.error('Database update error after token expiry:', dbUpdateError);
              toast.error('Email verification completed but database update failed. Please log out and log back in with your new email, then update your profile manually.');
              setAlertMessage('Email verification completed but profile update failed. Please log out and log back in with your new email.');
              setAlertType('warning');
              setShowAlert(true);
            }
          }
        }
      };

      // Start polling immediately and then every 3 seconds
      pollForVerification();
      const interval = setInterval(pollForVerification, 3000);
      verificationPollIntervalRef.current = interval;

      // Cleanup function
      return () => {
        if (interval) {
          clearInterval(interval);
          verificationPollIntervalRef.current = null;
        }
      };
    }
  }, [emailUpdateStep, pendingEmail, user, onUpdateProfile]); // Removed verificationPollInterval from deps

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

  // Sends a verification email to the user's CURRENT email address
  const handleSendVerificationEmail = async () => {
    setIsSendingVerification(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await sendEmailVerification(currentUser);
        toast.success(`Verification email sent to ${currentUser.email}. Please check your inbox.`);
      }
    } catch (error) {
      toast.error('Failed to send verification email. Please try again later.');
      console.error("Verification email error:", error);
    }
    setIsSendingVerification(false);
  };

  // Opens the modal to start the email change process
  const handleEmailChangeRequest = () => {
    setNewEmail('');
    setCurrentPassword('');
    setEmailUpdateStep('input');
    setPendingEmail('');
    setShowAlert(false);
    setShowEmailChangeModal(true);
  };

  // Handles sending verification to the new email address first
  const handlePreVerifyEmail = async (e) => {
    e.preventDefault();
    setIsUpdatingEmail(true);
    setShowAlert(false);

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      // Validate inputs
      if (!newEmail.trim()) {
        throw new Error('New email is required');
      }
      
      if (newEmail === currentUser.email) {
        throw new Error('Please enter a different email address');
      }

      if (!currentPassword.trim()) {
        throw new Error('Current password is required for security');
      }

      // Re-authenticate first for security
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Import and use verifyBeforeUpdateEmail
      const { verifyBeforeUpdateEmail } = await import('firebase/auth');
      await verifyBeforeUpdateEmail(currentUser, newEmail);

      // Move to verification step
      setPendingEmail(newEmail);
      setEmailUpdateStep('pre-verify');
      setAlertMessage(`Verification email sent to ${newEmail}. Please check your email and click the verification link. This page will automatically update when verification is complete.`);
      setAlertType('success');
      setShowAlert(true);
      
      toast.success(`Verification email sent to ${newEmail}. We're monitoring for verification completion.`);

    } catch (error) {
      console.error('Pre-verify email error:', error);
      let errorMessage = 'Failed to send verification: ';
      
      switch (error.code) {
        case 'auth/wrong-password':
          errorMessage += 'Current password is incorrect.';
          break;
        case 'auth/email-already-in-use':
          errorMessage += 'This email is already in use by another account.';
          break;
        case 'auth/invalid-email':
          errorMessage += 'The email address format is invalid.';
          break;
        case 'auth/requires-recent-login':
          errorMessage += 'For security, please log out and log back in before changing your email.';
          break;
        case 'auth/too-many-requests':
          errorMessage += 'Too many requests. Please wait a moment and try again.';
          break;
        default:
          if (error.message) {
            errorMessage = error.message;
          } else {
            errorMessage += 'Unknown error occurred.';
          }
      }
      
      setAlertMessage(errorMessage);
      setAlertType('danger');
      setShowAlert(true);
    }
    setIsUpdatingEmail(false);
  };

  // Manual completion handler for when automatic detection doesn't work
  const handleManualCompleteVerification = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error('No user found. Please refresh the page.');
        return;
      }

      // Force reload the user to get latest data
      await currentUser.reload();
      
      console.log('Manual check - Current email:', currentUser.email);
      console.log('Manual check - Pending email:', pendingEmail);
      console.log('Manual check - Email verified:', currentUser.emailVerified);
      
      // Check if the email was actually changed AND verified
      if (currentUser.email === pendingEmail && currentUser.emailVerified) {
        console.log('Email verification confirmed, updating database...');
        
        // Clear polling if it's running
        if (verificationPollIntervalRef.current) {
          clearInterval(verificationPollIntervalRef.current);
          verificationPollIntervalRef.current = null;
        }
        
        const updatedProfile = { 
          ...user, 
          email: pendingEmail,
          id: user.id
        };
        
        try {
          const success = await onUpdateProfile(updatedProfile);
          if (success) {
            console.log('Database updated successfully');
            setFormData(prevData => ({ ...prevData, email: pendingEmail }));
            toast.success('Email successfully verified and updated in all systems!');
            setEmailUpdateStep('complete');
            
            setTimeout(() => {
              closeEmailModal();
            }, 3000);
          } else {
            throw new Error('Profile update returned false');
          }
        } catch (dbError) {
          console.error('Database update error:', dbError);
          toast.error('Email verified in authentication but failed to update profile database. Please refresh the page.');
          setAlertMessage('Email verified but failed to update profile. Please refresh the page.');
          setAlertType('warning');
          setShowAlert(true);
        }
      } else if (currentUser.email === pendingEmail && !currentUser.emailVerified) {
        toast.warn('Email has been updated but not yet verified. Please check your email for the verification link.');
      } else if (currentUser.email !== pendingEmail) {
        toast.warn('Email verification not yet complete. Please click the verification link in your email first.');
      } else {
        toast.warn('Verification status unclear. Please try again.');
      }
    } catch (error) {
      console.error('Manual completion error:', error);
      toast.error('Error checking verification status. Please try again.');
    }
  };

  // Resends the verification email to the new address
  const resendVerificationEmail = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser && pendingEmail) {
        const { verifyBeforeUpdateEmail } = await import('firebase/auth');
        await verifyBeforeUpdateEmail(currentUser, pendingEmail);
        toast.info('Verification email sent again. Please check your inbox and spam folder.');
      }
    } catch (error) {
      toast.error('Failed to resend verification email.');
      console.error('Resend verification error:', error);
    }
  };
  
  // Resets state and closes the email change modal
  const closeEmailModal = () => {
    // Clear polling interval if it exists
    if (verificationPollIntervalRef.current) {
      clearInterval(verificationPollIntervalRef.current);
      verificationPollIntervalRef.current = null;
    }
    
    setShowEmailChangeModal(false);
    setShowAlert(false);
    setCurrentPassword('');
    setNewEmail('');
    setEmailUpdateStep('input');
    setPendingEmail('');
  };

  // --- RENDER LOGIC ---

  // Dynamically renders the content of the email change modal based on the current step
  const renderModalContent = () => {
    switch (emailUpdateStep) {
      case 'input':
        return (
          <>
            {showAlert && <Alert variant={alertType}>{alertMessage}</Alert>}
            <Alert variant="info">
              <strong>How to Change Your Email:</strong>
              <ol className="mb-0 mt-2">
                <li>First, we'll send a verification email to your NEW email address</li>
                <li>You'll click the verification link in that email</li>
                <li>Your email will be automatically updated</li>
              </ol>
            </Alert>
            <Form.Group className="mb-3">
              <Form.Label>New Email Address</Form.Label>
              <Form.Control 
                type="email" 
                value={newEmail} 
                onChange={(e) => setNewEmail(e.target.value)} 
                placeholder="Enter your new email address" 
                required 
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                placeholder="Enter your current password for security" 
                required 
              />
            </Form.Group>
          </>
        );
      case 'pre-verify':
        return (
          <div className="text-center">
            {showAlert && <Alert variant={alertType}>{alertMessage}</Alert>}
            <div className="mb-4">
              <i className="bi bi-envelope-arrow-down text-primary" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5>Check Your New Email Address</h5>
            <p>We've sent a verification email to <strong>{pendingEmail}</strong></p>
            <div className="mb-3">
              <div className="d-flex align-items-center justify-content-center mb-2">
                <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                <small className="text-muted">Automatically checking for verification...</small>
              </div>
            </div>
            <Alert variant="warning" className="text-start">
              <small>
                <strong>Important Steps:</strong>
                <ol className="mb-0 mt-1">
                  <li>Open your email and look for a message from Firebase</li>
                  <li>Click the "Verify email address" link in that email</li>
                  <li>Your email will be automatically changed once verified</li>
                  <li>This page will update automatically when complete</li>
                </ol>
              </small>
            </Alert>
            <div className="d-flex gap-2 justify-content-center mb-3">
              <Button variant="outline-primary" size="sm" onClick={resendVerificationEmail}>
                Resend Verification Email
              </Button>
            </div>
            <hr />
            <div className="mt-3">
              <p className="text-muted"><small>If the page doesn't update automatically:</small></p>
              <Button 
                variant="outline-success" 
                size="sm" 
                onClick={handleManualCompleteVerification}
              >
                I have verified, check now
              </Button>
            </div>
            <p className="text-muted mt-2"><small>This page is automatically monitoring for verification completion.</small></p>
          </div>
        );
      case 'complete':
        return (
          <div className="text-center">
            <div className="mb-3">
              <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5>Email Successfully Updated!</h5>
            <p>Your email has been changed to <strong>{pendingEmail}</strong></p>
            <Alert variant="success" className="text-start">
              <small>
                <strong>What's Updated:</strong>
                <ul className="mb-0 mt-1">
                  <li>Your login email is now <strong>{pendingEmail}</strong></li>
                  <li>Your profile has been updated in our database</li>
                  <li>You can now log in using your new email address</li>
                </ul>
              </small>
            </Alert>
            <p className="text-muted">This window will close automatically in 6 seconds...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card className="shadow-sm">
        <Card.Header>
          <h4 className="mb-0">Your Profile</h4>
        </Card.Header>
        <Card.Body>
          {auth.currentUser && !auth.currentUser.emailVerified && (
            <Alert variant="warning" className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Email Not Verified</strong><br />
                <small>Your current email must be verified before you can change it. Click the button to send a verification email.</small>
              </div>
              <Button variant="outline-primary" size="sm" onClick={handleSendVerificationEmail} disabled={isSendingVerification}>
                {isSendingVerification ? 'Sending...' : 'Send Verification'}
              </Button>
            </Alert>
          )}
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
              <div className="d-flex gap-2 align-items-center">
                <Form.Control type="email" value={user.email} disabled className="flex-grow-1" />
                <Button 
                  variant="outline-primary" 
                  onClick={handleEmailChangeRequest} 
                  size="sm" 
                  style={{ whiteSpace: 'nowrap' }}
                  disabled={auth.currentUser && !auth.currentUser.emailVerified}
                >
                  Change Email
                </Button>
              </div>
              <Form.Text className="text-muted">
                {auth.currentUser && !auth.currentUser.emailVerified 
                  ? 'Please verify your current email address before changing it.'
                  : 'Click "Change Email" to update both your login credentials and profile information.'
                }
              </Form.Text>
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

      {/* Email Change Modal */}
      <Modal show={showEmailChangeModal} onHide={closeEmailModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Change Email Address</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePreVerifyEmail}>
          <Modal.Body>{renderModalContent()}</Modal.Body>
          {emailUpdateStep === 'input' && (
            <Modal.Footer>
              <Button variant="secondary" onClick={closeEmailModal}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={isUpdatingEmail || !currentPassword.trim() || !newEmail.trim()}>
                {isUpdatingEmail ? (
                  <>
                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                    <span className="ms-2">Sending Verification...</span>
                  </>
                ) : (
                  'Send Verification Email'
                )}
              </Button>
            </Modal.Footer>
          )}
          {(emailUpdateStep === 'pre-verify' || emailUpdateStep === 'complete') && (
            <Modal.Footer>
              <Button variant="secondary" onClick={closeEmailModal}>Close</Button>
            </Modal.Footer>
          )}
        </Form>
      </Modal>
    </>
  );
}

export default Profile;