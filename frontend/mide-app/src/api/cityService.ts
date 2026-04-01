import axiosInstance from './axios';

export interface City {
  id: number;
  name: string;
  region: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CityCreate {
  name: string;
  region?: string | null;
}

export interface CityUpdate {
  name?: string;
  region?: string | null;
  isActive?: boolean;
}

// Трансформация данных из API (snake_case -> camelCase)
const transformCityFromApi = (city: any): City => {
  return {
    id: city.id,
    name: city.name,
    region: city.region,
    isActive: city.is_active,  // snake_case -> camelCase
    createdAt: city.created_at,
    updatedAt: city.updated_at,
  };
};

// Трансформация данных для отправки (camelCase -> snake_case)
const transformCityToApi = (city: CityCreate | CityUpdate): any => {
  const result: any = {};
  
  if ('name' in city && city.name !== undefined) {
    result.name = city.name;
  }
  if ('region' in city && city.region !== undefined) {
    result.region = city.region;
  }
  if ('isActive' in city && city.isActive !== undefined) {
    result.is_active = city.isActive;
  }
  
  return result;
};

export const cityService = {
  // Получить все города
  getAllCities: async (skip: number = 0, limit: number = 100): Promise<City[]> => {
    const response = await axiosInstance.get('/api/cities', {
      params: { skip, limit }
    });
    return response.data.map(transformCityFromApi);
  },
  
  // Получить город по ID
  getCityById: async (id: number): Promise<City> => {
    const response = await axiosInstance.get(`/api/cities/${id}`);
    return transformCityFromApi(response.data);
  },
  
  // Создать город
  createCity: async (data: CityCreate): Promise<City> => {
    const transformedData = transformCityToApi(data);
    const response = await axiosInstance.post('/api/cities', transformedData);
    return transformCityFromApi(response.data);
  },
  
  // Обновить город
  updateCity: async (id: number, data: CityUpdate): Promise<City> => {
    const transformedData = transformCityToApi(data);
    const response = await axiosInstance.put(`/api/cities/${id}`, transformedData);
    return transformCityFromApi(response.data);
  },
  
  // Удалить город
  deleteCity: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/api/cities/${id}`);
  },
};