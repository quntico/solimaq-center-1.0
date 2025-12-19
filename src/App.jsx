import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import AdminLayout from '@/layouts/AdminLayout';
import ClientLayout from '@/layouts/ClientLayout';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AdminLayout />} />
          <Route path="/cotizacion/:slug" element={<ClientLayout />} />
        </Routes>
      </Router>
    </HelmetProvider>
  );
}

export default App;