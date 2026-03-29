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

import ReportsPage from './pages/reports/ReportsPage';
import CreateReportPage from './pages/reports/CreateReportPage';
import ViewReportPage from './pages/reports/ViewReportPage';
import FixReportPage from './pages/reports/FixReportPage';
import AccountantReviewPage from './pages/reports/AccountantReviewPage';
import FinalApprovalPage from './pages/reports/FinalApprovalPage';

import ProductsPage from './pages/ProductsPage'; 
import RevisionsPage from './pages/revisions/RevisionPage';
import RequestRevisionPage from './pages/revisions/RequestRevisionPage';
import FillRevisionPage from './pages/revisions/FillRevisionPage';
import VerifyRevisionPage from './pages/revisions/VerifyRevisionPage';
import ViewRevisionPage from './pages/revisions/ViewRevisionPage';
import MovementsPage from './pages/transfers/MovementsPage';
import CreateTransferPage from './pages/transfers/CreateTransferPage';
import TransferDetailPage from './pages/transfers/TransferDetailPage';
import ArrivedTransferPage from './pages/transfers/ArrivedTransferPage';
import VerifyDiscrepancyPage from './pages/transfers/VerifyDiscrepancyPage';
import CreateManagerTransferPage from './pages/transfers/CreateManagerTransferPage';
import ExecuteManagerRequestPage from './pages/transfers/ExecuteManagerRequestPage';
import DefectsPage from './pages/defects/DefectsPage';
import CreateDefectPage from './pages/defects/CreateDefectPage';
import DefectDetailPage from './pages/defects/DefectDetailPage';
import NotificationsPage from './pages/NotificationsPage';

import DebtsPage from './pages/user/DebtsPage';

import SoldProductsStatsPage from './pages/SoldProductsStatsPage';

import CompanyPage from './pages/company/CompanyPage';

import DefectStatsPage from './pages/defects/DefectStatsPage';
import StaffPage from './pages/staff/StaffPage';
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
                          UserRole.OWNER
                          ]}>
                          <StaffPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/products" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER
                        ]}>
                          <ProductsPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/company" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.ACCOUNTANT
                        ]}>
                          <CompanyPage />
                        </RoleBasedRoute>
                      } />

                      <Route path="/debts" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER
                        ]}>
                          <DebtsPage />
                        </RoleBasedRoute>
                        } />

                      <Route path="/sold-products-stats" element={
                        <RoleBasedRoute allowedRoles={[
                          UserRole.OWNER,
                          UserRole.ADMIN,
                          UserRole.SENIOR_SELLER,
                          UserRole.MENTOR,
                          UserRole.SELLER
                        ]}>
                          <SoldProductsStatsPage />
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