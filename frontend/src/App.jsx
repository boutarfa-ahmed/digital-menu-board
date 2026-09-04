import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ScrollToTop } from './components/common/ScrollToTop'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layout/AppLayout'
import Login from './pages/Login'
import Display from './pages/Display'
import Dashboard from './pages/Dashboard'
import Menu from './pages/admin/Menu'
import Categories from './pages/admin/Categories'
import Screens from './pages/admin/Screens'
import Library from './pages/admin/Library'
import ScreenLayoutCanvas from './pages/admin/ScreenLayoutCanvas'
import Pricing from './pages/admin/Pricing'
import Settings from './pages/admin/Settings'
import NotFound from './pages/NotFound'
import LibraryFontFaces from './components/common/LibraryFontFaces'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <LibraryFontFaces />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/display" element={<Display />} />
            <Route path="/error-404" element={<NotFound />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="menu" element={<Menu />} />
              <Route path="categories" element={<Categories />} />
              <Route path="screens" element={<Screens />} />
              <Route path="library" element={<Library />} />
              <Route path="screens/:id/layout" element={<ScreenLayoutCanvas />} />
              <Route
                path="pricing"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Pricing />
                  </ProtectedRoute>
                }
              />
              <Route
                path="settings"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/error-404" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
