import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyService, CompanyStatsResponse } from '../api/companyService';

// Типы для фильтров
interface DashboardFilters {
  period: string;
  city?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
  max_points?: number;
}

interface TransactionsFilters {
  operation_type?: string;
  reference_type?: string;  // Добавляем фильтр по reference_type
  date_from?: string;
  date_to?: string;
  city?: string;
  page?: number;
  page_size?: number;
}

// Хук для получения данных дашборда
export const useDashboardData = (filters: DashboardFilters) => {
  return useQuery({
    queryKey: ['company-dashboard', filters],
    queryFn: () => companyService.getDashboardData(filters),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
};

// Хук для получения транзакций с пагинацией
export const useTransactions = (filters: TransactionsFilters) => {
  return useQuery({
    queryKey: ['company-transactions', filters],
    queryFn: () => companyService.getTransactions(filters),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
};

// Хук для получения статистики с правильным типом возврата
export const useStats = (params: {
  period: string;
  city?: string;
  date?: string;
  date_from?: string;
  date_to?: string;
}) => {
  return useQuery<CompanyStatsResponse>({
    queryKey: ['company-stats', params],
    queryFn: () => companyService.getStats(params),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
};

// Хук для получения баланса по городам (только для OWNER)
export const useBalanceByCities = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['balance-by-cities'],
    queryFn: () => companyService.getBalanceByCities(),
    enabled,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
};

// Мутация для добавления дохода
export const useAddIncome = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      amount: number;
      description: string;
      reference_id?: number;
      reference_type?: string;
      city?: string;
    }) => companyService.addIncome(data),
    onSuccess: () => {
      // Инвалидируем все связанные запросы
      queryClient.invalidateQueries({ queryKey: ['company-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['company-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
      queryClient.invalidateQueries({ queryKey: ['balance-by-cities'] });
    },
  });
};

// Мутация для добавления расхода
export const useAddExpense = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: {
      amount: number;
      description: string;
      reference_id?: number;
      reference_type?: string;
      city?: string;
    }) => companyService.addExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['company-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['company-stats'] });
      queryClient.invalidateQueries({ queryKey: ['balance-by-cities'] });
    },
  });
};