import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import AdminLayout from '@/layouts/AdminLayout';
import ClientLayout from '@/layouts/ClientLayout';
import MasterPlan from '@/pages/MasterPlan';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AdminLayout />} />
          <Route path="/cotizacion/:slug" element={<ClientLayout />} />
          <Route path="/master-plan" element={<MasterPlan />} />
          <Route path="/master-plan/:slug" element={<MasterPlan />} />
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;