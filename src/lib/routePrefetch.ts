// Route prefetching utility for lazy-loaded components
// Maps routes to their dynamic import functions for prefetching on hover

type PrefetchFn = () => Promise<unknown>;

const routeImports: Record<string, PrefetchFn> = {
  // Public pages
  "/": () => import("@/pages/Landing"),
  "/auth": () => import("@/pages/Auth"),
  "/verify-email": () => import("@/pages/VerifyEmail"),
  "/reset-password": () => import("@/pages/ResetPassword"),
  "/reviewer-invite": () => import("@/pages/ReviewerInvite"),
  "/supervisor-invite": () => import("@/pages/SupervisorInvite"),
  "/about-us": () => import("@/pages/AboutUs"),
  "/contact": () => import("@/pages/Contact"),
  "/browse": () => import("@/pages/ResearchPublic"),
  "/research": () => import("@/pages/ResearchPublic"),
  "/documentaries": () => import("@/pages/DocumentariesPublic"),
  "/privacy-policy": () => import("@/pages/PrivacyPolicy"),
  "/terms-of-use": () => import("@/pages/TermsOfUse"),
  "/how-it-works": () => import("@/pages/HowItWorks"),
  "/jobs": () => import("@/pages/JobsPublic"),

  // Researcher Dashboard
  "/dashboard": () => import("@/pages/Dashboard"),
  "/dashboard/research": () => import("@/pages/MyResearch"),
  "/dashboard/research/upload": () => import("@/pages/ResearchUpload"),
  "/dashboard/research/start-student": () => import("@/pages/StudentResearchStart"),
  "/dashboard/research/upload-completed": () => import("@/pages/CompletedResearchUpload"),
  "/dashboard/browse": () => import("@/pages/BrowseResearch"),
  "/dashboard/topic-refiner": () => import("@/pages/TopicRefiner"),
  "/dashboard/gap-detector": () => import("@/pages/GapDetector"),
  "/dashboard/ai-assistant": () => import("@/pages/AIAssistant"),
  "/dashboard/collab": () => import("@/pages/CollabMatcher"),
  "/dashboard/collaborations": () => import("@/pages/Collaborations"),
  "/dashboard/challenges": () => import("@/pages/Challenges"),
  "/dashboard/feed": () => import("@/pages/PersonalizedFeed"),
  "/dashboard/documentaries": () => import("@/pages/Documentaries"),
  "/dashboard/achievements": () => import("@/pages/Achievements"),
  "/dashboard/wallet": () => import("@/pages/Wallet"),
  "/dashboard/subscriptions": () => import("@/pages/Subscriptions"),
  "/dashboard/profile": () => import("@/pages/ProfileSettings"),
  "/dashboard/job-board": () => import("@/pages/StudentJobBoard"),
  "/dashboard/student-wallet": () => import("@/pages/StudentWallet"),
  "/dashboard/supervisor-inbox": () => import("@/pages/SupervisorInbox"),

  // Institution pages
  "/institution": () => import("@/pages/institution/InstitutionDashboard"),
  "/institution/researchers": () => import("@/pages/institution/InstitutionResearchers"),
  "/institution/reviewers": () => import("@/pages/institution/InstitutionReviewers"),
  "/institution/reviews": () => import("@/pages/institution/InstitutionReviews"),
  "/institution/papers": () => import("@/pages/institution/InstitutionReviews"),
  "/institution/analytics": () => import("@/pages/institution/InstitutionAnalytics"),
  "/institution/commissions": () => import("@/pages/institution/InstitutionCommissions"),
  "/institution/withdrawals": () => import("@/pages/institution/InstitutionWithdrawals"),
  "/institution/verification": () => import("@/pages/institution/InstitutionVerification"),
  "/institution/settings": () => import("@/pages/institution/InstitutionSettings"),
  "/institution/supervisors": () => import("@/pages/institution/InstitutionSupervisors"),

  // Industry pages
  "/industry": () => import("@/pages/industry/IndustryDashboard"),
  "/industry/challenges": () => import("@/pages/industry/IndustryChallenges"),
  "/industry/submissions": () => import("@/pages/industry/IndustrySubmissions"),
  "/industry/researchers": () => import("@/pages/industry/IndustryResearchers"),
  "/industry/analytics": () => import("@/pages/industry/IndustryAnalytics"),
  "/industry/profile": () => import("@/pages/industry/IndustryProfile"),
  "/industry/subscriptions": () => import("@/pages/industry/IndustrySubscriptions"),
  "/industry/job-postings": () => import("@/pages/industry/IndustryJobPostings"),
  "/industry/applications": () => import("@/pages/industry/IndustryApplications"),
  "/industry/hired-students": () => import("@/pages/industry/IndustryHiredStudents"),
  "/industry/wallet": () => import("@/pages/industry/IndustryWallet"),
  "/industry/invites": () => import("@/pages/industry/IndustryInvites"),
  "/industry/documentaries": () => import("@/pages/industry/IndustryDocumentaries"),

  // Investor pages
  "/investor": () => import("@/pages/investor/InvestorDashboard"),
  "/investor/portfolio": () => import("@/pages/investor/InvestorPortfolio"),
  "/investor/opportunities": () => import("@/pages/investor/InvestorOpportunities"),
  "/investor/researchers": () => import("@/pages/investor/InvestorResearchers"),
  "/investor/analytics": () => import("@/pages/investor/InvestorAnalytics"),
  "/investor/profile": () => import("@/pages/investor/InvestorProfile"),
  "/investor/documentaries": () => import("@/pages/investor/InvestorDocumentaries"),

  // Admin pages
  "/admin": () => import("@/pages/admin/AdminDashboard"),
  "/admin/users": () => import("@/pages/admin/AdminUsers"),
  "/admin/institutions": () => import("@/pages/admin/AdminInstitutions"),
  "/admin/research": () => import("@/pages/admin/AdminResearch"),
  "/admin/challenges": () => import("@/pages/admin/AdminChallenges"),
  "/admin/analytics": () => import("@/pages/admin/AdminAnalytics"),
  "/admin/system": () => import("@/pages/admin/AdminSystem"),
  "/admin/settings": () => import("@/pages/admin/AdminSettings"),
  "/admin/documentaries": () => import("@/pages/admin/AdminDocumentaries"),
  "/admin/subscriptions": () => import("@/pages/admin/AdminSubscriptions"),
  "/admin/withdrawals": () => import("@/pages/admin/AdminWithdrawals"),

  // Reviewer pages
  "/reviewer": () => import("@/pages/reviewer/ReviewerDashboard"),
  "/reviewer/pending": () => import("@/pages/reviewer/ReviewerPending"),
  "/reviewer/assignments": () => import("@/pages/reviewer/ReviewerAssignments"),
  "/reviewer/completed": () => import("@/pages/reviewer/ReviewerCompleted"),
  "/reviewer/stats": () => import("@/pages/reviewer/ReviewerStats"),
  "/reviewer/profile": () => import("@/pages/reviewer/ReviewerProfile"),

  // Supervisor pages
  "/supervisor": () => import("@/pages/supervisor/SupervisorDashboard"),
  "/supervisor/students": () => import("@/pages/supervisor/SupervisorStudents"),
  "/supervisor/pending": () => import("@/pages/supervisor/SupervisorPending"),
  "/supervisor/approved": () => import("@/pages/supervisor/SupervisorApproved"),
  "/supervisor/research": () => import("@/pages/supervisor/SupervisorResearch"),
  "/supervisor/profile": () => import("@/pages/supervisor/SupervisorProfile"),
};

// Cache to track already prefetched routes
const prefetchedRoutes = new Set<string>();

/**
 * Prefetch a route's component on hover
 * Only prefetches once per route per session
 */
export const prefetchRoute = (path: string): void => {
  // Normalize path (remove trailing slashes, query params)
  const normalizedPath = path.split("?")[0].replace(/\/$/, "") || "/";
  
  // Skip if already prefetched
  if (prefetchedRoutes.has(normalizedPath)) {
    return;
  }

  // Check for exact match first
  let importFn = routeImports[normalizedPath];

  // If no exact match, try to find a base route match (for dynamic routes)
  if (!importFn) {
    // Handle dynamic routes like /dashboard/research/:id
    const pathParts = normalizedPath.split("/");
    for (let i = pathParts.length - 1; i > 0; i--) {
      const basePath = pathParts.slice(0, i).join("/");
      if (routeImports[basePath]) {
        importFn = routeImports[basePath];
        break;
      }
    }
  }

  if (importFn) {
    prefetchedRoutes.add(normalizedPath);
    // Use requestIdleCallback for non-blocking prefetch, fallback to setTimeout
    const prefetch = () => {
      importFn().catch(() => {
        // Silently fail - prefetching is an optimization, not critical
        prefetchedRoutes.delete(normalizedPath);
      });
    };

    if ("requestIdleCallback" in window) {
      (window as Window).requestIdleCallback(prefetch, { timeout: 2000 });
    } else {
      setTimeout(prefetch, 100);
    }
  }
};

/**
 * Get handler props for prefetching on hover/focus
 */
export const getPrefetchHandlers = (to: string) => ({
  onMouseEnter: () => prefetchRoute(to),
  onFocus: () => prefetchRoute(to),
});
