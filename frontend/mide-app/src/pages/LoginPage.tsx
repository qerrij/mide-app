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
    
    // ВАЖНО: Убираем пробелы в начале и конце
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    
    // Валидация
    if (!trimmedUsername || !trimmedPassword) {
      setError('Введите логин и пароль');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    try {
      // Используем очищенные значения
      await login(trimmedUsername, trimmedPassword);
      navigate('/');
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Обработка ошибок
      if (error.response?.status === 401) {
        setError('Неверный логин или пароль');
      } else if (error.response?.status === 400) {
        setError(error.response.data?.detail || 'Ошибка в запросе');
      } else if (error.response?.status === 422) {
        setError('Неверный формат данных');
      } else if (!error.response) {
        setError('Сервер не отвечает. Проверьте подключение.');
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
                '& .MuiAlert-message': {
                  width: '100%'
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
              // Добавляем trim на onChange для удобства
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

          <Typography 
            variant="body2" 
            color="#4c5454" 
            sx={{ mt: 2, textAlign: 'center' }}
          >
            Тестовые пользователи:
            <br />
            <strong>owner</strong> / owner123
            <br />
            <strong>admin</strong> / admin123
            <br />
            <strong>seller</strong> / seller123
          </Typography>
        </Paper>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="#6d3f57">
            Система управления отчетами и товарами
          </Typography>
          <Typography variant="caption" color="#4c5454">
            v1.0.0
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default LoginPage;