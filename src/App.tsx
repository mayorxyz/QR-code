import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GeneratorPage } from './pages/Generator';
import { BulkPage } from './pages/Bulk';
import { HistoryPage } from './pages/History';
import { HowItWorksPage } from './pages/HowItWorks';
import { PrivacyPage } from './pages/Privacy';
import { NotFoundPage } from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<GeneratorPage />} />
          <Route path="/bulk" element={<BulkPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
