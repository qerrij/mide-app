import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { theme } from './theme';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { RoleBasedRoute } from './components/auth/RoleBasedRoute';
import AppBar from './components/layout/AppBar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

import ReportsPage from './pages/ReportsPage';
import CreateReportPage from './pages/CreateReportPage';
import ViewReportPage from './pages/ViewReportPage';
import FixReportPage from './pages/FixReportPage';
import AccountantReviewPage from './pages/AccountantReviewPage';
import FinalApprovalPage from './pages/FinalApprovalPage';

import ProductsPage from './pages/ProductsPage'; 
import RevisionsPage from './pages/RevisionPage';
import RequestRevisionPage from './pages/RequestRevisionPage';
import FillRevisionPage from './pages/FillRevisionPage';
import VerifyRevisionPage from './pages/VerifyRevisionPage';
import ViewRevisionPage from './pages/ViewRevisionPage';
import MovementsPage from './pages/MovementsPage';
import CreateTransferPage from './pages/CreateTransferPage';
import TransferDetailPage from './pages/TransferDetailPage';
import ArrivedTransferPage from './pages/ArrivedTransferPage';
import VerifyDiscrepancyPage from './pages/VerifyDiscrepancyPage';
import CreateManagerTransferPage from './pages/CreateManagerTransferPage';
import ExecuteManagerRequestPage from './pages/ExecuteManagerRequestPage';
import DefectsPage from './pages/DefectsPage';
import CreateDefectPage from './pages/CreateDefectPage';
import DefectDetailPage from './pages/DefectDetailPage';
import NotificationsPage from './pages/NotificationsPage';

import DefectStatsPage from './pages/DefectStatsPage';
import StaffPage from './pages/StaffPage';
import { UserRole } from './types';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/*" element={
              <PrivateRoute>
                <Box sx={{ 
                  minHeight: '100vh', 
                  backgroundColor: '#f5f3f6',
                  position: 'relative',
                }}>
                  <AppBar />
                  <Box
                    sx={{
                      maxWidth: { xs: '100%', sm: '100%', md: '100%', lg: 1200 },
                      mx: 'auto',
                      width: '100%',
                      px: { xs: 2, sm: 3, md: 4 },
                      pb: 3,
                    }}
                  >
                    <Routes>
                      <Route path="/" element={<DashboardPage />} />
                      
                      <Route path="/reports" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER, 
                          UserRole.ACCOUNTANT
                        ]}>
                          <ReportsPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/reports/create" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER
                        ]}>
                          <CreateReportPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/reports/:id" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER,
                          UserRole.ACCOUNTANT
                        ]}>
                          <ViewReportPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/reports/:id/fix" element={
                        <RoleBasedRoute allowedRoles={[                          
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER,]}>
                          <FixReportPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/reports/:id/accountant-review" element={
                        <RoleBasedRoute allowedRoles={[UserRole.ACCOUNTANT]}>
                          <AccountantReviewPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/reports/:id/final-approval" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR
                        ]}>
                          <FinalApprovalPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/revisions" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER,
                          UserRole.ACCOUNTANT
                        ]}>
                          <RevisionsPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/revisions/request" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                        ]}>
                          <RequestRevisionPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/revisions/:id" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER,
                          UserRole.ACCOUNTANT
                        ]}>
                          <ViewRevisionPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/revisions/:id/fill" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER,
                          UserRole.ACCOUNTANT
                        ]}>
                          <FillRevisionPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/revisions/:id/verify" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                        ]}>
                          <VerifyRevisionPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/movements" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER,
                        ]}>
                          <MovementsPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/movements/create" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER,
                        ]}>
                          <CreateTransferPage />
                        </RoleBasedRoute>
                      } />
                      <Route path="/movements/create-manager" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                        ]}>
                          <CreateManagerTransferPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/movements/:id" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER,
                        ]}>
                          <TransferDetailPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/notifications" element={<NotificationsPage />} />

                      <Route path="/movements/:id/arrived" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER,
                        ]}>
                          <ArrivedTransferPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/movements/:id/verify-discrepancy" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                        ]}>
                          <VerifyDiscrepancyPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/movements/:id/execute-manager-request" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER,
                        ]}>
                          <ExecuteManagerRequestPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/defects" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER,
                        ]}>
                          <DefectsPage  />
                        </RoleBasedRoute>
                      } />

                      <Route path="/defects/create" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER
                        ]}>
                          <CreateDefectPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/defects/:id" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER
                        ]}>
                          <DefectDetailPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/defects/stats" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER
                        ]}>
                          <DefectStatsPage />
                        </RoleBasedRoute>
                      } />
                      
                      <Route path="/staff" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER                        ]}>
                          <StaffPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/products" element={
                        <RoleBasedRoute allowedRoles={[UserRole.OWNER]}>
                          <ProductsPage />
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