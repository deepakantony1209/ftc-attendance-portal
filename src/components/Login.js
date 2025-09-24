import React, { useState } from 'react';
import { Card, Form, Button, Container, Alert, Modal, Spinner, InputGroup } from 'react-bootstrap';

function Login({ onLogin, onPasswordReset }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = await onLogin(username, password);
    
    if (!result.success) {
      switch (result.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Incorrect email or password. Please try again.');
          break;
        case 'auth/too-many-requests':
          setError('Access to this account has been temporarily disabled due to too many failed login attempts. Please reset your password or try again later.');
          break;
        default:
          setError('An unexpected error occurred. Please try again.');
          break;
      }
    }
    
    setIsLoading(false);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    const success = await onPasswordReset(resetEmail);
    if (success) {
      setResetMessage(`A password reset link has been sent to ${resetEmail}.`);
    } else {
      setResetMessage('Could not send reset email. Please ensure the email address is correct.');
    }
  };

  const openResetModal = () => {
    setError('');
    setResetMessage('');
    setResetEmail('');
    setShowResetModal(true);
  };
  
  const closeResetModal = () => setShowResetModal(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <>
      {/* 1. ADDED `login-page-background` CLASS TO THIS WRAPPER DIV */}
      <div className="login-page-background">
        <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
          <div className="w-100" style={{ maxWidth: '450px' }}>
            {/* 2. ADDED `login-card` CLASS TO THE CARD COMPONENT */}
            <Card className="shadow-lg login-card">
              <Card.Body className="p-5">
                <h2 className="text-center fw-bold mb-4">FTC Attendance Portal</h2>
                {error && <Alert variant="danger">{error}</Alert>}
                <Form onSubmit={handleLogin}>
                  <Form.Group id="username" className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control type="email" value={username} onChange={(e) => setUsername(e.target.value)} required size="lg" />
                  </Form.Group>

                  <Form.Group id="password"  className="mb-4">
                    <Form.Label>Password</Form.Label>
                    <InputGroup>
                      <Form.Control 
                        type={isPasswordVisible ? 'text' : 'password'} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        size="lg"
                      />
                      <Button variant="outline-secondary" onClick={togglePasswordVisibility} className="password-toggle-btn">
                        <i className={isPasswordVisible ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill'}></i>
                      </Button>
                    </InputGroup>
                  </Form.Group>
                  
                  <Button className="w-100" type="submit" disabled={isLoading} size="lg">
                    {isLoading ? (
                      <>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                        <span className="ms-2">Logging In...</span>
                      </>
                    ) : (
                      'Log In'
                    )}
                  </Button>

                </Form>
                <div className="w-100 text-center mt-3">
                  <Button variant="link" onClick={openResetModal}>
                    Forgot Password?
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        </Container>
      </div>

      <Modal show={showResetModal} onHide={closeResetModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Reset Password</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resetMessage ? (
            <Alert variant={resetMessage.includes('sent') ? 'success' : 'danger'}>{resetMessage}</Alert>
          ) : (
            <Form onSubmit={handlePasswordReset}>
              <Form.Group id="reset-email" className="mb-3">
                <Form.Label>Enter your account email address</Form.Label>
                <Form.Control type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
              </Form.Group>
              <Button className="w-100" type="submit">Send Reset Email</Button>
            </Form>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}

export default Login;

