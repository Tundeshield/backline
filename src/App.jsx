import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './lib/store.jsx';
import Layout from './components/Layout.jsx';
import Landing from './pages/Landing.jsx';
import Auth from './pages/Auth.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Invoices from './pages/Invoices.jsx';
import Bookkeeping from './pages/Bookkeeping.jsx';
import Vat from './pages/Vat.jsx';
import Payroll from './pages/Payroll.jsx';
import Inbox from './pages/Inbox.jsx';
import Review from './pages/Review.jsx';
import Settings from './pages/Settings.jsx';

function Private({ children }) {
  const { user, business, bizLoading } = useApp();
  if (user === undefined || bizLoading) return <div className="grid h-full place-items-center text-sm text-ink/50">Loading Backline…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!business?.onboarded) return <Navigate to="/onboarding" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useApp();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/signup" replace />} />
      <Route path="/app" element={<Private><Dashboard /></Private>} />
      <Route path="/app/invoices" element={<Private><Invoices /></Private>} />
      <Route path="/app/invoices/:id" element={<Private><Invoices /></Private>} />
      <Route path="/app/books" element={<Private><Bookkeeping /></Private>} />
      <Route path="/app/vat" element={<Private><Vat /></Private>} />
      <Route path="/app/payroll" element={<Private><Payroll /></Private>} />
      <Route path="/app/inbox" element={<Private><Inbox /></Private>} />
      <Route path="/app/review" element={<Private><Review /></Private>} />
      <Route path="/app/settings" element={<Private><Settings /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
