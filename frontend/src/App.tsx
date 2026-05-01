import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Settings from './pages/Settings'
import CampaignList from './pages/CampaignList'
import NewCampaign from './pages/NewCampaign'
import CampaignDetail from './pages/CampaignDetail'
import Attachments from './pages/Attachments'
import Templates from './pages/Templates'
import EmailTemplates from './pages/EmailTemplates'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/campaigns" replace />} />
          <Route path="campaigns" element={<CampaignList />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
          <Route path="new-campaign" element={<NewCampaign />} />
          <Route path="attachments" element={<Attachments />} />
          <Route path="templates" element={<Templates />} />
          <Route path="email-templates" element={<EmailTemplates />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
