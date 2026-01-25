// components/transfers/ProductSelector.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Autocomplete,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Inventory as InventoryIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

interface Product {
  id: number;
  name: string;
  sku: string;
  availableQuantity: number;
  categoryName?: string;
  description?: string;
}

interface ProductSelectorProps {
  selectedProducts: Array<{
    productId: number;
    expectedQuantity: number;
  }>;
  onChange: (products: Array<{
    productId: number;
    expectedQuantity: number;
  }>) => void;
  availableProducts: Product[]; // Теперь получаем готовый список товаров
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  selectedProducts,
  onChange,
  availableProducts,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Обработчики
  const handleAddProduct = () => {
    if (!selectedProduct) {
      setError('Выберите товар');
      return;
    }
    
    if (quantity <= 0) {
      setError('Количество должно быть больше 0');
      return;
    }
    
    if (quantity > selectedProduct.availableQuantity) {
      setError(`Доступно только ${selectedProduct.availableQuantity} шт.`);
      return;
    }
    
    const existingProduct = selectedProducts.find(p => p.productId === selectedProduct.id);
    
    if (existingProduct) {
      const newQuantity = existingProduct.expectedQuantity + quantity;
      if (newQuantity > selectedProduct.availableQuantity) {
        setError(`Общее количество превышает доступное (${selectedProduct.availableQuantity} шт.)`);
        return;
      }
    }
    
    const updatedProducts = [...selectedProducts];
    if (existingProduct) {
      const index = updatedProducts.findIndex(p => p.productId === selectedProduct.id);
      updatedProducts[index] = {
        ...existingProduct,
        expectedQuantity: existingProduct.expectedQuantity + quantity,
      };
    } else {
      updatedProducts.push({
        productId: selectedProduct.id,
        expectedQuantity: quantity,
      });
    }
    
    onChange(updatedProducts);
    handleCloseDialog();
  };

  const handleRemoveProduct = (productId: number) => {
    const updatedProducts = selectedProducts.filter(p => p.productId !== productId);
    onChange(updatedProducts);
  };

  const handleUpdateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveProduct(productId);
      return;
    }
    
    const product = availableProducts.find(p => p.id === productId);
    if (product && newQuantity > product.availableQuantity) {
      setError(`Максимально доступно: ${product.availableQuantity} шт.`);
      return;
    }
    
    const updatedProducts = selectedProducts.map(p => 
      p.productId === productId ? { ...p, expectedQuantity: newQuantity } : p
    );
    onChange(updatedProducts);
  };

  const handleOpenDialog = () => {
    setSelectedProduct(null);
    setQuantity(1);
    setError(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedProduct(null);
    setQuantity(1);
    setError(null);
  };

  const getProductInfo = (productId: number): Product | undefined => {
    return availableProducts.find(p => p.id === productId);
  };

  const totalQuantity = selectedProducts.reduce((sum, p) => sum + p.expectedQuantity, 0);

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6">
              Товары для перемещения
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Доступно для перемещения: {availableProducts.length} товаров
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
            disabled={loading || availableProducts.length === 0}
          >
            Добавить товар
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {selectedProducts.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <InventoryIcon sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
            <Typography color="text.secondary">
              Нет выбранных товаров
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Нажмите "Добавить товар" чтобы начать
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Товар</TableCell>
                  <TableCell>Артикул</TableCell>
                  <TableCell>Категория</TableCell>
                  <TableCell align="center">Доступно</TableCell>
                  <TableCell align="center">Количество</TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedProducts.map((item) => {
                  const productInfo = getProductInfo(item.productId);
                  return (
                    <TableRow key={item.productId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {productInfo?.name || `Товар ${item.productId}`}
                        </Typography>
                        {productInfo?.description && (
                          <Tooltip title={productInfo.description}>
                            <IconButton size="small">
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={productInfo?.sku || 'N/A'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {productInfo?.categoryName || '-'}
                      </TableCell>
                      <TableCell align="center">
                        {productInfo?.availableQuantity || 0} шт.
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQuantity(item.productId, item.expectedQuantity - 1)}
                          >
                            -
                          </IconButton>
                          <TextField
                            size="small"
                            type="number"
                            value={item.expectedQuantity}
                            onChange={(e) => handleUpdateQuantity(item.productId, parseInt(e.target.value) || 0)}
                            sx={{ width: 80 }}
                            inputProps={{ min: 1, max: productInfo?.availableQuantity }}
                          />
                          <IconButton
                            size="small"
                            onClick={() => handleUpdateQuantity(item.productId, item.expectedQuantity + 1)}
                          >
                            +
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveProduct(item.productId)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {selectedProducts.length > 0 && (
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Выбрано товаров:
                </Typography>
                <Typography variant="h6">
                  {selectedProducts.length} позиций
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Общее количество:
                </Typography>
                <Typography variant="h6" color="primary">
                  {totalQuantity} шт.
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>

      {/* Диалог добавления товара */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить товар</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Autocomplete
            options={availableProducts}
            getOptionLabel={(option) => `${option.name} (${option.sku}) - ${option.availableQuantity} шт.`}
            value={selectedProduct}
            onChange={(_, newValue) => {
              setSelectedProduct(newValue);
              if (newValue) {
                setQuantity(1);
                setError(null);
              }
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Выберите товар"
                margin="normal"
                fullWidth
                required
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body1">
                    {option.name}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {option.sku} • {option.categoryName}
                    </Typography>
                    <Typography variant="body2" color="primary" fontWeight={500}>
                      {option.availableQuantity} шт.
                    </Typography>
                  </Box>
                </Box>
              </li>
            )}
          />
          
          {selectedProduct && (
            <>
              <TextField
                label="Количество"
                type="number"
                value={quantity}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  setQuantity(value);
                  if (value > selectedProduct.availableQuantity) {
                    setError(`Максимально доступно: ${selectedProduct.availableQuantity} шт.`);
                  } else {
                    setError(null);
                  }
                }}
                margin="normal"
                fullWidth
                required
                inputProps={{ 
                  min: 1, 
                  max: selectedProduct.availableQuantity 
                }}
                error={!!error}
                helperText={error || `Доступно: ${selectedProduct.availableQuantity} шт.`}
              />
              
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Информация о товаре:
                </Typography>
                <Typography variant="body1">
                  {selectedProduct.name}
                </Typography>
                {selectedProduct.description && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {selectedProduct.description}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Артикул: {selectedProduct.sku} • Категория: {selectedProduct.categoryName}
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button 
            onClick={handleAddProduct} 
            variant="contained"
            disabled={!selectedProduct || quantity <= 0 || !!error}
          >
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductSelector;