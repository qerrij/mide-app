import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Toolbar } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { theme } from './theme';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { RoleBasedRoute } from './components/auth/RoleBasedRoute';
import AppBar from './components/layout/AppBar';
import Drawer from './components/layout/Drawer';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import InventoryPage from './pages/InventoryPage';
import MovementsPage from './pages/MovementsPage';
import DefectsPage from './pages/DefectsPage';
import StockPage from './pages/StockPage';
import StaffPage from './pages/StaffPage';
import { UserRole } from './types';

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/*" element={
              <PrivateRoute>
                <Box sx={{ display: 'flex' }}>
                  <AppBar onDrawerToggle={handleDrawerToggle} />
                  <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
                  <Box
                    component="main"
                    sx={{
                      flexGrow: 1,
                      p: { xs: 2, sm: 3 },
                      width: { sm: `calc(100% - ${drawerOpen ? 280 : 0}px)` },
                      transition: 'width 0.3s, margin-left 0.3s',
                      maxWidth: '100%',
                      overflowX: 'hidden',
                      minHeight: '100vh',
                      backgroundColor: '#f5f3f6',
                    }}
                  >
                    <Toolbar /> {/* Этот Toolbar создает отступ под AppBar */}
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      
                      <Route path="/reports" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER
                        ]}>
                          <ReportsPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/inventory" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR
                        ]}>
                          <InventoryPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/movements" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER
                        ]}>
                          <MovementsPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/defects" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER
                        ]}>
                          <DefectsPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/stock" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR
                        ]}>
                          <StockPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/staff" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER                        ]}>
                          <StaffPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Box>
                </Box>
              </PrivateRoute>
            } />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;