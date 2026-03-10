import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Avatar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Lock } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    if (!trimmedUsername || !trimmedPassword) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      await login(trimmedUsername, trimmedPassword);
      navigate('/');
    } catch (error: any) {
      console.error('Login failed:', error);
      
      if (error.response?.status === 401) {
        setError('Неверный логин или пароль');
      } else if (error.response?.status === 400) {
        setError(error.response.data?.detail || 'Ошибка в запросе');
      } else if (error.response?.status === 422) {
        setError('Неверный формат данных');
      } else if (error.code === 'ERR_NETWORK' || !error.response) {
        setError('Сервер не отвечает. Проверьте подключение к интернету.');
      } else {
        setError('Ошибка авторизации. Попробуйте позже.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            borderRadius: 2,
          }}
        >
          <Avatar
            sx={{
              m: 1,
              bgcolor: '#674fb6',
              width: 56,
              height: 56,
            }}
          >
            <Lock sx={{ fontSize: 30 }} />
          </Avatar>
          
          <Typography 
            component="h1" 
            variant="h5" 
            sx={{ 
              mb: 3, 
              color: '#2a0f35',
              fontWeight: 600,
            }}
          >
            Система отчетов
          </Typography>

          {error && (
            <Alert 
              severity="error" 
              sx={{ 
                width: '100%', 
                mb: 2,
                animation: 'shake 0.5s ease-in-out',
                '@keyframes shake': {
                  '0%, 100%': { transform: 'translateX(0)' },
                  '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
                  '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
                },
                '& .MuiAlert-message': {
                  width: '100%',
                  fontWeight: 500,
                }
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="Логин"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              error={!!error}
              onBlur={(e) => setUsername(e.target.value.trim())}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#674fb6',
                  },
                },
              }}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Пароль"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              error={!!error}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: '#674fb6',
                  },
                },
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isSubmitting}
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                backgroundColor: '#674fb6',
                '&:hover': {
                  backgroundColor: '#483399',
                },
                '&:disabled': {
                  backgroundColor: '#cccccc',
                },
              }}
            >
              {isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Войти'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;