// components/staff/UserCategoryRatesEditor.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Paper,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add, Delete, Category } from '@mui/icons-material';
import { productService } from '../../api/productService';
import { UserCategoryRateCreate } from '../../types';

interface UserCategoryRatesEditorProps {
  initialRates?: UserCategoryRateCreate[];
  onChange: (rates: UserCategoryRateCreate[]) => void;
  disabled?: boolean;
}

export const UserCategoryRatesEditor: React.FC<UserCategoryRatesEditorProps> = ({
  initialRates = [],
  onChange,
  disabled = false,
}) => {
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [selectedRate, setSelectedRate] = useState<string>('');
  const [rates, setRates] = useState<UserCategoryRateCreate[]>(initialRates);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setRates(initialRates);
  }, [initialRates]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await productService.getAllCategories();
      setCategories(data.filter(c => c.isActive));
    } catch (error) {
      console.error('Ошибка загрузки категорий:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRate = () => {
    if (selectedCategoryId && selectedRate !== '' && !isNaN(Number(selectedRate)) && Number(selectedRate) >= 0) {
      if (rates.some(r => r.category_id === selectedCategoryId)) {
        return;
      }
      const newRates = [...rates, { category_id: selectedCategoryId, rate: Number(selectedRate) }];
      setRates(newRates);
      onChange(newRates);
      setSelectedCategoryId(0);
      setSelectedRate('');
    }
  };

  const handleRemoveRate = (categoryId: number) => {
    const newRates = rates.filter(r => r.category_id !== categoryId);
    setRates(newRates);
    onChange(newRates);
  };

  const handleRateChange = (categoryId: number, value: string) => {
    if (value === '' || /^\d+$/.test(value)) {
      const newRates = rates.map(r =>
        r.category_id === categoryId ? { ...r, rate: value === '' ? 0 : Number(value) } : r
      );
      setRates(newRates);
      onChange(newRates);
    }
  };

  const getCategoryName = (categoryId: number): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || `Категория ${categoryId}`;
  };

  const availableCategories = categories.filter(
    c => !rates.some(r => r.category_id === c.id)
  );

  const handleSelectedRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setSelectedRate(value);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1, color: '#2a0f35', fontWeight: 500 }}>
        Ставки по категориям
      </Typography>
      
      {rates.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {rates.map(rate => (
            <Paper
              key={rate.category_id}
              variant="outlined"
              sx={{
                p: 1.5,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                flexWrap: 'wrap',
                borderRadius: 4,
                backgroundColor: '#f8f7fa',
                border: '1px solid rgba(103, 79, 182, 0.1)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 150 }}>
                <Category sx={{ fontSize: 20, color: '#674fb6' }} />
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#2a0f35' }}>
                  {getCategoryName(rate.category_id)}
                </Typography>
              </Box>
              
              <TextField
                size="small"
                type="text"
                label="Ставка (₽)"
                value={rate.rate === 0 && !disabled ? '' : rate.rate}
                onChange={(e) => handleRateChange(rate.category_id, e.target.value)}
                disabled={disabled}
                sx={{
                  width: 120,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 4,
                    backgroundColor: '#ffffff',
                  },
                }}
                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
              />
              
              <IconButton
                size="small"
                onClick={() => handleRemoveRate(rate.category_id)}
                disabled={disabled}
                sx={{ color: '#ca0ec0' }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Paper>
          ))}
        </Box>
      )}
      
      {availableCategories.length > 0 && !disabled && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 180, flex: 2 }}>
            <InputLabel sx={{ color: '#4c5454' }}>Категория</InputLabel>
            <Select
              value={selectedCategoryId}
              label="Категория"
              onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
              sx={{
                borderRadius: 4,
                backgroundColor: '#f8f7fa',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(103, 79, 182, 0.2)',
                },
              }}
              MenuProps={{
                disableScrollLock: true,
              }}
            >
              <MenuItem value={0}>-- Выберите категорию --</MenuItem>
              {availableCategories.map(category => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <TextField
            size="small"
            type="text"
            label="Ставка (₽)"
            value={selectedRate}
            onChange={handleSelectedRateChange}
            sx={{
              width: 120,
              '& .MuiOutlinedInput-root': {
                borderRadius: 4,
                backgroundColor: '#f8f7fa',
              },
            }}
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
          />
          
          <Button
            size="small"
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAddRate}
            disabled={!selectedCategoryId || selectedRate === ''}
            sx={{
              borderRadius: 4,
              height: 40,
              borderColor: '#674fb6',
              color: '#674fb6',
              '&:hover': {
                borderColor: '#483399',
                backgroundColor: 'rgba(103, 79, 182, 0.04)',
              },
            }}
          >
            Добавить
          </Button>
        </Box>
      )}
      
      {availableCategories.length === 0 && rates.length > 0 && !disabled && (
        <Alert 
          severity="info" 
          sx={{ 
            mt: 1, 
            borderRadius: 4,
            backgroundColor: 'rgba(103, 79, 182, 0.08)',
            border: '1px solid rgba(103, 79, 182, 0.2)',
            color: '#674fb6',
            '& .MuiAlert-icon': { color: '#674fb6' },
          }}
        >
          Все категории уже добавлены
        </Alert>
      )}
    </Box>
  );
};