import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  IconButton,
  Collapse,
  Paper,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Business,
  Groups,
  Person,
  SupervisorAccount,
  AdminPanelSettings,
} from '@mui/icons-material';
import { accountantAssignmentService } from '../../api/accountantAssignmentService';
import { 
  AccountantAssignmentHierarchy,
  AccountantAssignmentCluster,
  AccountantAssignmentGroup,
  AccountantAssignmentUser 
} from '../../types';

interface AccountantAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  accountantId: number;
  accountantName: string;
  onSuccess: () => void;
}

const AccountantAssignmentDialog: React.FC<AccountantAssignmentDialogProps> = ({
  open,
  onClose,
  accountantId,
  accountantName,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hierarchy, setHierarchy] = useState<AccountantAssignmentHierarchy | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [expandedClusters, setExpandedClusters] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedUnassignedGroups, setExpandedUnassignedGroups] = useState(false);
  const [expandedUnassignedUsers, setExpandedUnassignedUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка иерархии при открытии диалога
  useEffect(() => {
    if (open && accountantId) {
      loadHierarchy();
    }
  }, [open, accountantId]);

  const loadHierarchy = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountantAssignmentService.getAssignmentHierarchy(accountantId);
      setHierarchy(data);
      
      // Инициализируем выбранных пользователей из привязанных
      const initialSelected = new Set<number>();
      
      // Собираем всех привязанных пользователей из иерархии
      data.clusters.forEach(cluster => {
        if (cluster.seniorSeller?.isAssigned) initialSelected.add(cluster.seniorSeller.id);
        cluster.groups.forEach(group => {
          if (group.mentor?.isAssigned) initialSelected.add(group.mentor.id);
          group.sellers.forEach(seller => {
            if (seller.isAssigned) initialSelected.add(seller.id);
          });
        });
      });
      
      data.unassignedGroups.forEach(group => {
        if (group.mentor?.isAssigned) initialSelected.add(group.mentor.id);
        group.sellers.forEach(seller => {
          if (seller.isAssigned) initialSelected.add(seller.id);
        });
      });
      
      data.unassignedUsers.forEach(user => {
        if (user.isAssigned) initialSelected.add(user.id);
      });
      
      setSelectedUserIds(initialSelected);
      
      // Автоматически раскрываем узлы, где есть привязанные пользователи
      const clustersToExpand = new Set<number>();
      const groupsToExpand = new Set<string>();
      
      data.clusters.forEach(cluster => {
        if (cluster.assignedCount > 0) {
          clustersToExpand.add(cluster.id);
          cluster.groups.forEach(group => {
            if (group.assignedCount > 0) {
              groupsToExpand.add(`cluster-${cluster.id}-group-${group.id}`);
            }
          });
        }
      });
      
      data.unassignedGroups.forEach(group => {
        if (group.assignedCount > 0) {
          groupsToExpand.add(`unassigned-group-${group.id}`);
        }
      });
      
      setExpandedClusters(clustersToExpand);
      setExpandedGroups(groupsToExpand);
      
      if (data.unassignedGroups.some(g => g.assignedCount > 0)) {
        setExpandedUnassignedGroups(true);
      }
      
      if (data.unassignedUsers.some(u => u.isAssigned)) {
        setExpandedUnassignedUsers(true);
      }
      
    } catch (error) {
      console.error('Ошибка при загрузке иерархии:', error);
      setError('Не удалось загрузить данные для назначения');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await accountantAssignmentService.assignUsersToAccountant(
        accountantId,
        Array.from(selectedUserIds)
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Ошибка при сохранении назначений:', error);
      setError(error.response?.data?.detail || 'Не удалось сохранить назначения');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUser = (userId: number, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleToggleAllInCluster = (cluster: AccountantAssignmentCluster, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    
    // Добавляем или удаляем старшего продавца
    if (cluster.seniorSeller) {
      if (checked) {
        newSelected.add(cluster.seniorSeller.id);
      } else {
        newSelected.delete(cluster.seniorSeller.id);
      }
    }
    
    // Добавляем или удаляем всех в группах
    cluster.groups.forEach((group: AccountantAssignmentGroup) => {
      if (group.mentor) {
        if (checked) {
          newSelected.add(group.mentor.id);
        } else {
          newSelected.delete(group.mentor.id);
        }
      }
      group.sellers.forEach((seller: AccountantAssignmentUser) => {
        if (checked) {
          newSelected.add(seller.id);
        } else {
          newSelected.delete(seller.id);
        }
      });
    });
    
    setSelectedUserIds(newSelected);
  };

  const handleToggleAllInGroup = (group: AccountantAssignmentGroup, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    
    // Добавляем или удаляем наставника
    if (group.mentor) {
      if (checked) {
        newSelected.add(group.mentor.id);
      } else {
        newSelected.delete(group.mentor.id);
      }
    }
    
    // Добавляем или удаляем продавцов
    group.sellers.forEach((seller: AccountantAssignmentUser) => {
      if (checked) {
        newSelected.add(seller.id);
      } else {
        newSelected.delete(seller.id);
      }
    });
    
    setSelectedUserIds(newSelected);
  };

  const getClusterCheckedState = (cluster: AccountantAssignmentCluster): boolean => {
    const allIds = cluster.allUserIds || [];
    if (allIds.length === 0) return false;
    return allIds.every((id: number) => selectedUserIds.has(id));
  };

  const getClusterIndeterminateState = (cluster: AccountantAssignmentCluster): boolean => {
    const allIds = cluster.allUserIds || [];
    if (allIds.length === 0) return false;
    const someChecked = allIds.some((id: number) => selectedUserIds.has(id));
    const allChecked = allIds.every((id: number) => selectedUserIds.has(id));
    return someChecked && !allChecked;
  };

  const getGroupCheckedState = (group: AccountantAssignmentGroup): boolean => {
    const allIds = group.allUserIds || [];
    if (allIds.length === 0) return false;
    return allIds.every((id: number) => selectedUserIds.has(id));
  };

  const getGroupIndeterminateState = (group: AccountantAssignmentGroup): boolean => {
    const allIds = group.allUserIds || [];
    if (allIds.length === 0) return false;
    const someChecked = allIds.some((id: number) => selectedUserIds.has(id));
    const allChecked = allIds.every((id: number) => selectedUserIds.has(id));
    return someChecked && !allChecked;
  };

  const toggleCluster = (clusterId: number) => {
    const newExpanded = new Set(expandedClusters);
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId);
    } else {
      newExpanded.add(clusterId);
    }
    setExpandedClusters(newExpanded);
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <AdminPanelSettings sx={{ fontSize: 18, color: '#2a436d' }} />;
      case 'SENIOR_SELLER':
        return <SupervisorAccount sx={{ fontSize: 18, color: '#3f1f4b' }} />;
      case 'MENTOR':
        return <Person sx={{ fontSize: 18, color: '#56b8d1' }} />;
      case 'SELLER':
        return <Groups sx={{ fontSize: 18, color: '#674fb6' }} />;
      default:
        return <Person sx={{ fontSize: 18, color: '#4c5454' }} />;
    }
  };

  const renderUserCheckbox = (user: AccountantAssignmentUser, level: number = 0) => (
    <Box
      key={user.id}
      sx={{
        display: 'flex',
        alignItems: 'center',
        ml: level * 4,
        py: 0.5,
        px: 2,
        '&:hover': { bgcolor: 'action.hover' },
        borderRadius: 1,
      }}
    >
      <Checkbox
        size="small"
        checked={selectedUserIds.has(user.id)}
        onChange={(e) => handleToggleUser(user.id, e.target.checked)}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
        {getRoleIcon(user.role)}
        <Typography variant="body2">{user.fullName}</Typography>
      </Box>
    </Box>
  );

  const renderGroup = (group: AccountantAssignmentGroup, clusterId?: number) => {
    const groupId = clusterId ? `cluster-${clusterId}-group-${group.id}` : `unassigned-group-${group.id}`;
    const isExpanded = expandedGroups.has(groupId);
    const checked = getGroupCheckedState(group);
    const indeterminate = getGroupIndeterminateState(group);

    const handleHeaderClick = (e: React.MouseEvent) => {
      // Проверяем, что клик был не по чекбоксу
      if (!(e.target as HTMLElement).closest('.MuiCheckbox-root')) {
        toggleGroup(groupId);
      }
    };

    return (
      <Box key={groupId} sx={{ mb: 1 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 1,
            bgcolor: 'background.default',
            borderLeft: '4px solid #56b8d1',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
          }}
          onClick={handleHeaderClick}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton size="small" sx={{ mr: 0.5 }}>
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={checked}
                  indeterminate={indeterminate}
                  onChange={(e) => handleToggleAllInGroup(group, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Groups sx={{ fontSize: 20, color: '#56b8d1' }} />
                  <Typography variant="body2" fontWeight="medium">
                    {group.name}
                  </Typography>
                  {group.assignedCount > 0 && (
                    <Chip
                      label={`${group.assignedCount}/${group.allUserIds.length}`}
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              }
              onClick={(e) => e.stopPropagation()}
            />
          </Box>
        </Paper>
        
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 1 }}>
            {group.mentor && renderUserCheckbox(group.mentor, 1)}
            {group.sellers.map((seller: AccountantAssignmentUser) => renderUserCheckbox(seller, 1))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  const renderCluster = (cluster: AccountantAssignmentCluster) => {
    const isExpanded = expandedClusters.has(cluster.id);
    const checked = getClusterCheckedState(cluster);
    const indeterminate = getClusterIndeterminateState(cluster);

    const handleHeaderClick = (e: React.MouseEvent) => {
      // Проверяем, что клик был не по чекбоксу
      if (!(e.target as HTMLElement).closest('.MuiCheckbox-root')) {
        toggleCluster(cluster.id);
      }
    };

    return (
      <Box key={cluster.id} sx={{ mb: 2 }}>
        <Paper
          elevation={2}
          sx={{
            p: 1.5,
            bgcolor: '#f5f5f5',
            borderLeft: '4px solid #3f1f4b',
            cursor: 'pointer',
            '&:hover': { bgcolor: '#e8e8e8' },
          }}
          onClick={handleHeaderClick}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton size="small" sx={{ mr: 0.5 }}>
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={checked}
                  indeterminate={indeterminate}
                  onChange={(e) => handleToggleAllInCluster(cluster, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business sx={{ fontSize: 20, color: '#3f1f4b' }} />
                  <Typography variant="body2" fontWeight="bold">
                    {cluster.name}
                  </Typography>
                  {cluster.assignedCount > 0 && (
                    <Chip
                      label={`${cluster.assignedCount}/${cluster.allUserIds.length}`}
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              }
              onClick={(e) => e.stopPropagation()}
            />
          </Box>
        </Paper>
        
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box sx={{ ml: 4, mt: 1 }}>
            {cluster.seniorSeller && renderUserCheckbox(cluster.seniorSeller, 0)}
            {cluster.groups.map((group) => renderGroup(group, cluster.id))}
          </Box>
        </Collapse>
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '60vh', maxHeight: '80vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">
            Назначение пользователей бухгалтеру
          </Typography>
        </Box>
        <Typography variant="subtitle2" color="text.secondary">
          {accountantName}
        </Typography>
      </DialogTitle>
      
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {!loading && !error && hierarchy && (
          <Box>
            {/* Статистика */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<Business />}
                label={`Кустов: ${hierarchy.clusters.length}`}
                variant="outlined"
              />
              <Chip
                icon={<Groups />}
                label={`Групп без куста: ${hierarchy.unassignedGroups.length}`}
                variant="outlined"
              />
              <Chip
                icon={<AdminPanelSettings />}
                label={`Админов: ${hierarchy.unassignedUsers.length}`}
                variant="outlined"
              />
              <Chip
                label={`Выбрано: ${selectedUserIds.size}`}
                color="primary"
              />
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Кусты */}
            {hierarchy.clusters.map(cluster => renderCluster(cluster))}
            
            {/* Группы без куста */}
            {hierarchy.unassignedGroups.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    bgcolor: 'background.default',
                    borderLeft: '4px solid #4c5454',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => setExpandedUnassignedGroups(!expandedUnassignedGroups)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton size="small" sx={{ mr: 0.5 }}>
                      {expandedUnassignedGroups ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Groups sx={{ fontSize: 20, color: '#4c5454' }} />
                      <Typography variant="body2" fontWeight="bold">
                        Группы без куста
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
                
                <Collapse in={expandedUnassignedGroups} timeout="auto" unmountOnExit>
                  <Box sx={{ ml: 4, mt: 1 }}>
                    {hierarchy.unassignedGroups.map(group => renderGroup(group))}
                  </Box>
                </Collapse>
              </Box>
            )}
            
            {/* Админы */}
            {hierarchy.unassignedUsers.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    bgcolor: 'background.default',
                    borderLeft: '4px solid #4c5454',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                  onClick={() => setExpandedUnassignedUsers(!expandedUnassignedUsers)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton size="small" sx={{ mr: 0.5 }}>
                      {expandedUnassignedUsers ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AdminPanelSettings sx={{ fontSize: 20, color: '#2a436d' }} />
                      <Typography variant="body2" fontWeight="bold">
                        Админы
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
                
                <Collapse in={expandedUnassignedUsers} timeout="auto" unmountOnExit>
                  <Box sx={{ mt: 1 }}>
                    {hierarchy.unassignedUsers.map(user => renderUserCheckbox(user))}
                  </Box>
                </Collapse>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Отмена
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || saving}
          color="primary"
        >
          {saving ? <CircularProgress size={24} /> : 'Сохранить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AccountantAssignmentDialog;