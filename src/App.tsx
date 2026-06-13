import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import { CurrencyProvider } from "./context/CurrencyContext";
import { AppSettingsProvider } from "./hooks/useAppSettings";
import { PlatformSettingsProvider } from "./hooks/usePlatformSettings";

// Lazy load all pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MyResearch = lazy(() => import("./pages/MyResearch"));
const ResearchUpload = lazy(() => import("./pages/ResearchUpload"));
const StudentResearchStart = lazy(() => import("./pages/StudentResearchStart"));
const CompletedResearchUpload = lazy(() => import("./pages/CompletedResearchUpload"));
const AIAssistant = lazy(() => import("./pages/AIAssistant"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const PaymentHistory = lazy(() => import("./pages/PaymentHistory"));
const SubscriptionSummary = lazy(() => import("./pages/SubscriptionSummary"));
const ProfileSettings = lazy(() => import("./pages/ProfileSettings"));
const BrowseResearch = lazy(() => import("./pages/BrowseResearch"));
const TopicRefiner = lazy(() => import("./pages/TopicRefiner"));
const GapDetector = lazy(() => import("./pages/GapDetector"));
const CollabMatcher = lazy(() => import("./pages/CollabMatcher"));
const Collaborations = lazy(() => import("./pages/Collaborations"));
const Challenges = lazy(() => import("./pages/Challenges"));
const ChallengeDetails = lazy(() => import("./pages/ChallengeDetails"));
const ResearchDetails = lazy(() => import("./pages/ResearchDetails"));
const ResearchEdit = lazy(() => import("./pages/ResearchEdit"));
const ResearchResubmit = lazy(() => import("./pages/ResearchResubmit"));
const PersonalizedFeed = lazy(() => import("./pages/PersonalizedFeed"));
const Documentaries = lazy(() => import("./pages/Documentaries"));
const Achievements = lazy(() => import("./pages/Achievements"));
const Wallet = lazy(() => import("./pages/Wallet"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Contact = lazy(() => import("./pages/Contact"));
const ResearchPublic = lazy(() => import("./pages/ResearchPublic"));
const ResearchDetailsPublic = lazy(() => import("./pages/ResearchDetailsPublic"));
const DocumentariesPublic = lazy(() => import("./pages/DocumentariesPublic"));
const DocumentaryDetailsPublic = lazy(() => import("./pages/DocumentaryDetailsPublic"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("./pages/TermsOfUse"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const StudentJobBoard = lazy(() => import("./pages/StudentJobBoard"));
const StudentWallet = lazy(() => import("./pages/StudentWallet"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const ReviewerInvite = lazy(() => import("./pages/ReviewerInvite"));
const SupervisorInvitePage = lazy(() => import("./pages/SupervisorInvite"));
const ExternalSupervisorInvite = lazy(() => import("./pages/ExternalSupervisorInvite"));
const ResearcherProfilePublic = lazy(() => import("./pages/ResearcherProfilePublic"));
const JobsPublic = lazy(() => import("./pages/JobsPublic"));
const JobDetailsPublic = lazy(() => import("./pages/JobDetailsPublic"));
const SupervisorInbox = lazy(() => import("./pages/SupervisorInbox"));
const AISupervisorOverview = lazy(() => import("./pages/AISupervisorOverview"));
const FAQPage = lazy(() => import("./pages/FAQ"));
const AdminFAQ = lazy(() => import("./pages/admin/AdminFAQ"));

// Institution pages
const InstitutionDashboard = lazy(() => import("./pages/institution/InstitutionDashboard"));
const InstitutionReviewers = lazy(() => import("./pages/institution/InstitutionReviewers"));
const InstitutionReviews = lazy(() => import("./pages/institution/InstitutionReviews"));
const InstitutionAnalytics = lazy(() => import("./pages/institution/InstitutionAnalytics"));
const InstitutionResearchers = lazy(() => import("./pages/institution/InstitutionResearchers"));
const InstitutionCommissions = lazy(() => import("./pages/institution/InstitutionCommissions"));
const InstitutionWithdrawals = lazy(() => import("./pages/institution/InstitutionWithdrawals"));
const InstitutionVerification = lazy(() => import("./pages/institution/InstitutionVerification"));
const InstitutionSettings = lazy(() => import("./pages/institution/InstitutionSettings"));
const ResearcherProfile = lazy(() => import("./pages/institution/ResearcherProfile"));
const InstitutionSupervisors = lazy(() => import("./pages/institution/InstitutionSupervisors"));
const InstitutionDepartments = lazy(() => import("./pages/institution/InstitutionDepartments"));

// Industry pages
const IndustryDashboard = lazy(() => import("./pages/industry/IndustryDashboard"));
const IndustryChallenges = lazy(() => import("./pages/industry/IndustryChallenges"));
const IndustrySubmissions = lazy(() => import("./pages/industry/IndustrySubmissions"));
const IndustryResearchers = lazy(() => import("./pages/industry/IndustryResearchers"));
const IndustryAnalytics = lazy(() => import("./pages/industry/IndustryAnalytics"));
const IndustryProfile = lazy(() => import("./pages/industry/IndustryProfile"));
const IndustrySubscriptions = lazy(() => import("./pages/industry/IndustrySubscriptions"));
const IndustrySubscriptionSummary = lazy(() => import("./pages/industry/IndustrySubscriptionSummary"));
const IndustryPaymentHistory = lazy(() => import("./pages/industry/IndustryPaymentHistory"));
const IndustryJobPostings = lazy(() => import("./pages/industry/IndustryJobPostings"));
const IndustryApplications = lazy(() => import("./pages/industry/IndustryApplications"));
const IndustryHiredStudents = lazy(() => import("./pages/industry/IndustryHiredStudents"));
const IndustryWallet = lazy(() => import("./pages/industry/IndustryWallet"));
const IndustryInvites = lazy(() => import("./pages/industry/IndustryInvites"));
const IndustryDocumentaries = lazy(() => import("./pages/industry/IndustryDocumentaries"));

// Investor pages
const InvestorDashboard = lazy(() => import("./pages/investor/InvestorDashboard"));
const InvestorPortfolio = lazy(() => import("./pages/investor/InvestorPortfolio"));
const InvestorOpportunities = lazy(() => import("./pages/investor/InvestorOpportunities"));
const InvestorResearchers = lazy(() => import("./pages/investor/InvestorResearchers"));
const InvestorAnalytics = lazy(() => import("./pages/investor/InvestorAnalytics"));
const InvestorProfile = lazy(() => import("./pages/investor/InvestorProfile"));
const InvestorDocumentaries = lazy(() => import("./pages/investor/InvestorDocumentaries"));

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminUserProfile = lazy(() => import("./pages/admin/AdminUserProfile"));
const AdminInstitutions = lazy(() => import("./pages/admin/AdminInstitutions"));
const AdminResearch = lazy(() => import("./pages/admin/AdminResearch"));
const AdminChallenges = lazy(() => import("./pages/admin/AdminChallenges"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminRevenue = lazy(() => import("./pages/admin/AdminRevenue"));
const AdminSystem = lazy(() => import("./pages/admin/AdminSystem"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminDocumentaries = lazy(() => import("./pages/admin/AdminDocumentaries"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminWithdrawals = lazy(() => import("./pages/admin/AdminWithdrawals"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminSupervisors = lazy(() => import("./pages/admin/AdminSupervisors"));

// Reviewer pages
const ReviewerDashboard = lazy(() => import("./pages/reviewer/ReviewerDashboard"));
const ReviewerPending = lazy(() => import("./pages/reviewer/ReviewerPending"));
const ReviewerAssignments = lazy(() => import("./pages/reviewer/ReviewerAssignments"));
const ReviewerCompleted = lazy(() => import("./pages/reviewer/ReviewerCompleted"));
const ReviewerStats = lazy(() => import("./pages/reviewer/ReviewerStats"));
const ReviewerProfile = lazy(() => import("./pages/reviewer/ReviewerProfile"));

// Supervisor pages
const SupervisorDashboard = lazy(() => import("./pages/supervisor/SupervisorDashboard"));
const SupervisorStudents = lazy(() => import("./pages/supervisor/SupervisorStudents"));
const SupervisorStudentDetail = lazy(() => import("./pages/supervisor/SupervisorStudentDetail"));
const SupervisorPending = lazy(() => import("./pages/supervisor/SupervisorPending"));
const SupervisorApproved = lazy(() => import("./pages/supervisor/SupervisorApproved"));
const SupervisorResearch = lazy(() => import("./pages/supervisor/SupervisorResearch"));
const SupervisorProfile = lazy(() => import("./pages/supervisor/SupervisorProfile"));
const SupervisorResearchDetail = lazy(() => import("./pages/supervisor/SupervisorResearchDetail"));
const SupervisorInviteStudents = lazy(() => import("./pages/supervisor/SupervisorInviteStudents"));
const SupervisorRevenue = lazy(() => import("./pages/supervisor/SupervisorRevenue"));
const SupervisorWithdrawals = lazy(() => import("./pages/supervisor/SupervisorWithdrawals"));
const SupervisorAITraining = lazy(() => import("./pages/supervisor/SupervisorAITraining"));
const AdminCommissionSettings = lazy(() => import("./pages/admin/AdminCommissionSettings"));

// IPN pages
const IPNDashboard = lazy(() => import("./pages/ipn/IPNDashboard"));
const IPNCompanies = lazy(() => import("./pages/ipn/IPNCompanies"));
const IPNOpportunities = lazy(() => import("./pages/ipn/IPNOpportunities"));
const IPNApplicants = lazy(() => import("./pages/ipn/IPNApplicants"));
const IPNRevenue = lazy(() => import("./pages/ipn/IPNRevenue"));
const IPNAnalytics = lazy(() => import("./pages/ipn/IPNAnalytics"));
const IPNProfile = lazy(() => import("./pages/ipn/IPNProfile"));
const IPNSettings = lazy(() => import("./pages/ipn/IPNSettings"));
const IPNActivation = lazy(() => import("./pages/ipn/IPNActivation"));
const AdminIPN = lazy(() => import("./pages/admin/AdminIPN"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <PlatformSettingsProvider>
        <AppSettingsProvider>
          <CurrencyProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ScrollToTop />
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/verify-email" element={<VerifyEmail />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/reviewer-invite" element={<ReviewerInvite />} />
                  <Route path="/supervisor-invite" element={<SupervisorInvitePage />} />
                  <Route path="/external-supervisor-invite" element={<ExternalSupervisorInvite />} />
                  <Route path="/about-us" element={<AboutUs />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/browse" element={<ResearchPublic />} />
                  <Route path="/research" element={<ResearchPublic />} />
                  <Route path="/research/:id" element={<ResearchDetailsPublic />} />
                  <Route path="/documentaries" element={<DocumentariesPublic />} />
                  <Route path="/documentary/:id" element={<DocumentaryDetailsPublic />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/terms-of-use" element={<TermsOfUse />} />
                  <Route path="/how-it-works" element={<HowItWorks />} />
                  <Route path="/researcher/:id" element={<ResearcherProfilePublic />} />
                  <Route path="/jobs" element={<JobsPublic />} />
                  <Route path="/jobs/:id" element={<JobDetailsPublic />} />
                  <Route path="/faq" element={<FAQPage />} />

                  {/* Researcher Dashboard - Protected */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/research"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <MyResearch />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/research/upload"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <ResearchUpload />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/research/start-student"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <StudentResearchStart />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/research/upload-completed"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <CompletedResearchUpload />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/browse"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <BrowseResearch />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/topic-refiner"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <TopicRefiner />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/gap-detector"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <GapDetector />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/ai-assistant"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <AIAssistant />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/collab"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <CollabMatcher />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/collaborations"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <Collaborations />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/challenges"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <Challenges />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/challenges/:id"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <ChallengeDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/research/:id"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <ResearchDetails />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/research/edit/:id"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <ResearchEdit />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/research/resubmit/:id"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <ResearchResubmit />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/feed"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <PersonalizedFeed />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/documentaries"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <Documentaries />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/achievements"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <Achievements />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/wallet"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <Wallet />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/subscriptions"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <Subscriptions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/subscription-summary"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <SubscriptionSummary />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/payment-history"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <PaymentHistory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/profile"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <ProfileSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/job-board"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <StudentJobBoard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/student-wallet"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <StudentWallet />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/supervisor-inbox"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <SupervisorInbox />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/ai-supervisor"
                    element={
                      <ProtectedRoute allowedRoles={["researcher"]}>
                        <AISupervisorOverview />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/institution"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/researchers"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionResearchers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/reviewers"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionReviewers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/reviews"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionReviews />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/papers"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionReviews />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/analytics"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/commissions"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionCommissions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/withdrawals"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionWithdrawals />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/verification"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionVerification />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/settings"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/researcher/:id"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <ResearcherProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/supervisors"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionSupervisors />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/institution/departments"
                    element={
                      <ProtectedRoute allowedRoles={["institution"]}>
                        <InstitutionDepartments />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/industry"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/challenges"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryChallenges />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/submissions"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustrySubmissions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/researchers"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryResearchers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/analytics"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/profile"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/subscriptions"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustrySubscriptions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/subscription-summary"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustrySubscriptionSummary />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/payment-history"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryPaymentHistory />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/job-postings"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryJobPostings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/applications"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryApplications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/hired-students"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryHiredStudents />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/wallet"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryWallet />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/invites"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryInvites />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/industry/documentaries"
                    element={
                      <ProtectedRoute allowedRoles={["industry"]}>
                        <IndustryDocumentaries />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/investor"
                    element={
                      <ProtectedRoute allowedRoles={["investor"]}>
                        <InvestorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/investor/portfolio"
                    element={
                      <ProtectedRoute allowedRoles={["investor"]}>
                        <InvestorPortfolio />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/investor/opportunities"
                    element={
                      <ProtectedRoute allowedRoles={["investor"]}>
                        <InvestorOpportunities />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/investor/researchers"
                    element={
                      <ProtectedRoute allowedRoles={["investor"]}>
                        <InvestorResearchers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/investor/analytics"
                    element={
                      <ProtectedRoute allowedRoles={["investor"]}>
                        <InvestorAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/investor/profile"
                    element={
                      <ProtectedRoute allowedRoles={["investor"]}>
                        <InvestorProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/investor/documentaries"
                    element={
                      <ProtectedRoute allowedRoles={["investor"]}>
                        <InvestorDocumentaries />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminUsers />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/users/:id"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminUserProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/institutions"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminInstitutions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/research"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminResearch />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/challenges"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminChallenges />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/analytics"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/revenue"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminRevenue />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/system"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminSystem />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/settings"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminSettings />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/documentaries"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminDocumentaries />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/subscriptions"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminSubscriptions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/withdrawals"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminWithdrawals />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/coupons"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminCoupons />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/supervisors"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminSupervisors />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/faq"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminFAQ />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/reviewer"
                    element={
                      <ProtectedRoute allowedRoles={["reviewer"]}>
                        <ReviewerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reviewer/pending"
                    element={
                      <ProtectedRoute allowedRoles={["reviewer"]}>
                        <ReviewerPending />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reviewer/assignments"
                    element={
                      <ProtectedRoute allowedRoles={["reviewer"]}>
                        <ReviewerAssignments />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reviewer/completed"
                    element={
                      <ProtectedRoute allowedRoles={["reviewer"]}>
                        <ReviewerCompleted />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reviewer/stats"
                    element={
                      <ProtectedRoute allowedRoles={["reviewer"]}>
                        <ReviewerStats />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/reviewer/profile"
                    element={
                      <ProtectedRoute allowedRoles={["reviewer"]}>
                        <ReviewerProfile />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/supervisor"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/students"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorStudents />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/students/:id"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorStudentDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/invite-students"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorInviteStudents />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/pending"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorPending />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/approved"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorApproved />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/research"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorResearch />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/research/:id"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorResearchDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/profile"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/revenue"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorRevenue />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/withdrawals"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorWithdrawals />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/supervisor/ai-training"
                    element={
                      <ProtectedRoute allowedRoles={["supervisor"]}>
                        <SupervisorAITraining />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/admin/commission-settings"
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminCommissionSettings />
                      </ProtectedRoute>
                    }
                  />

                  {/* IPN Routes */}
                  <Route path="/ipn" element={<ProtectedRoute allowedRoles={["ipn"]}><IPNDashboard /></ProtectedRoute>} />
                  <Route path="/ipn/activate" element={<ProtectedRoute allowedRoles={["ipn"]}><IPNActivation /></ProtectedRoute>} />
                  <Route path="/ipn/companies" element={<ProtectedRoute allowedRoles={["ipn"]}><IPNCompanies /></ProtectedRoute>} />
                  <Route path="/ipn/opportunities" element={<ProtectedRoute allowedRoles={["ipn"]}><IPNOpportunities /></ProtectedRoute>} />
                  <Route path="/ipn/applicants" element={<ProtectedRoute allowedRoles={["ipn"]}><IPNApplicants /></ProtectedRoute>} />
                  <Route path="/ipn/revenue" element={<ProtectedRoute allowedRoles={["ipn"]}><IPNRevenue /></ProtectedRoute>} />
                  <Route path="/ipn/analytics" element={<ProtectedRoute allowedRoles={["ipn"]}><IPNAnalytics /></ProtectedRoute>} />
                  <Route path="/ipn/profile" element={<ProtectedRoute allowedRoles={["ipn"]}><IPNProfile /></ProtectedRoute>} />
                  <Route path="/ipn/settings" element={<ProtectedRoute allowedRoles={["ipn"]}><IPNSettings /></ProtectedRoute>} />

                  {/* Admin IPN */}
                  <Route path="/admin/ipn" element={<ProtectedRoute allowedRoles={["admin"]}><AdminIPN /></ProtectedRoute>} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
            </TooltipProvider>
          </CurrencyProvider>
        </AppSettingsProvider>
      </PlatformSettingsProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
