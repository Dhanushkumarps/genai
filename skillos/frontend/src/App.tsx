import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './features/auth/AuthContext'
import DashboardLayout from './components/layout/DashboardLayout'
import ProtectedRoute from './features/auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/DashboardPage'
import TasksPage from './pages/TasksPage'
import PlacementAgent from './features/placement/PlacementAgent'

// Innovative Features
import NeuralProcessManager from './features/neural/NeuralProcessManager'
import DejaVuPanel from './features/memory/DejaVuPanel'
import FlowOrchestrator from './features/flow/FlowOrchestrator'
import SkillPackageManager from './features/skills/SkillPackageManager'
import CognitiveFirewall from './features/firewall/CognitiveFirewall'
import LearningBrowser from './features/browser/LearningBrowser'
import { ResourcesPage } from './features/resources'
import SkillBridgePage from './pages/SkillBridgePage'
import SkillHeatmap from './features/heatmap/SkillHeatmap'
import ResumeAnalyser from './features/resume/ResumeAnalyser'
import LearningPathway from './features/learning/LearningPathway'
import CodingPractice from './features/coding/CodingPractice'
import MockInterview from './features/interview/MockInterview'
import ExamAutopsy from './features/exam/ExamAutopsy'

import { Toaster } from 'sonner'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster richColors position="top-center" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Onboarding - Protected but without layout */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } />

          <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/placement" element={<PlacementAgent />} />

            {/* Innovative Features */}
            <Route path="/neural" element={<NeuralProcessManager />} />
            <Route path="/dejavu" element={<DejaVuPanel />} />
            <Route path="/flow" element={<FlowOrchestrator />} />
            <Route path="/skills" element={<SkillPackageManager />} />
            <Route path="/firewall" element={<CognitiveFirewall />} />
            <Route path="/browser" element={<LearningBrowser />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/bridge" element={<SkillBridgePage />} />
            <Route path="/heatmap" element={<SkillHeatmap />} />
            <Route path="/resume" element={<ResumeAnalyser />} />
            <Route path="/learning" element={<LearningPathway />} />
            <Route path="/coding" element={<CodingPractice />} />
            <Route path="/interview" element={<MockInterview />} />
            <Route path="/exam-autopsy" element={<ExamAutopsy />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
