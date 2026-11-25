import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/auth/RouteGuards';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import DiseaseDetectionPage from './pages/DiseaseDetectionPage';
import PlantIdentificationPage from './pages/PlantIdentificationPage';
import MultiImageAnalysisPage from './pages/MultiImageAnalysisPage';
import WeatherPredictionPage from './pages/WeatherPredictionPage';
import HistoryPage from './pages/HistoryPage';
import ProfilePage from './pages/ProfilePage';
import { ROUTES } from './utils/constants';

const App = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicOnlyRoute />}>
              <Route path={ROUTES.LOGIN} element={<LoginPage />} />
              <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path={ROUTES.HOME} element={<HomePage />} />
                <Route path={ROUTES.DISEASE_DETECTION} element={<DiseaseDetectionPage />} />
                <Route path={ROUTES.PLANT_IDENTIFICATION} element={<PlantIdentificationPage />} />
                <Route path={ROUTES.MULTI_IMAGE_ANALYSIS} element={<MultiImageAnalysisPage />} />
                <Route path={ROUTES.WEATHER_PREDICTION} element={<WeatherPredictionPage />} />
                <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
                <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
                <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
