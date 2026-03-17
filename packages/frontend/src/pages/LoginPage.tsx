import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  WaterDrop,
  Person,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    try {
      setLoading(true);
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 20% 50%, rgba(108, 99, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(0, 217, 255, 0.1) 0%, transparent 50%), #0B0F1A',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated background orbs */}
      <Box sx={{
        position: 'absolute', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)',
        top: '-10%', left: '-5%', animation: 'float 8s ease-in-out infinite',
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(30px)' },
        },
      }} />
      <Box sx={{
        position: 'absolute', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,217,255,0.06) 0%, transparent 70%)',
        bottom: '-5%', right: '-3%', animation: 'float 10s ease-in-out infinite reverse',
      }} />

      <Container maxWidth="xs">
        <Box
          sx={{
            p: 5,
            borderRadius: 4,
            bgcolor: 'rgba(17, 24, 39, 0.8)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 100px rgba(108, 99, 255, 0.05)',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 72, height: 72, borderRadius: 3,
                background: 'linear-gradient(135deg, #6C63FF 0%, #00D9FF 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                mb: 3, boxShadow: '0 8px 32px rgba(108, 99, 255, 0.3)',
              }}
            >
              <WaterDrop sx={{ fontSize: 36, color: 'white' }} />
            </Box>
            <Typography variant="h5" sx={{ color: '#F1F5F9', fontWeight: 700, mb: 0.5 }}>
              Smart Water
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              AI-Powered IoT Water Management
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              placeholder="Username"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: '#64748B' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            <TextField
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: '#64748B' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: '#64748B' }}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{
                py: 1.5,
                background: 'linear-gradient(135deg, #6C63FF 0%, #4A42DB 100%)',
                fontSize: '1rem',
                '&:hover': {
                  background: 'linear-gradient(135deg, #8B83FF 0%, #6C63FF 100%)',
                  boxShadow: '0 8px 32px rgba(108, 99, 255, 0.4)',
                },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Sign In'}
            </Button>
          </form>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(108, 99, 255, 0.06)', borderRadius: 2, border: '1px solid rgba(108, 99, 255, 0.1)' }}>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              💡 Demo: Use any username and password to explore the system
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default LoginPage;
