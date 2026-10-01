import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import AdminLayout from '@/layouts/AdminLayout';
import ClientLayout from '@/layouts/ClientLayout';
import MasterPlan from '@/pages/MasterPlan';

import SecureViewer from '@/components/SecureViewer';
import AuthGate from '@/components/AuthGate';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AuthGate>
          <Routes>
            <Route path="/" element={<AdminLayout />} />
            <Route path="/cotizacion/:slug" element={<ClientLayout />} />
            <Route path="/master-plan" element={<MasterPlan />} />
            <Route path="/master-plan/:slug" element={<MasterPlan />} />
            <Route path="/visor-seguro" element={<SecureViewer />} />
          </Routes>
        </AuthGate>
      </Router>
    </HelmetProvider>
  );
}

export default App;