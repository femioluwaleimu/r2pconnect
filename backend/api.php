<?php
/**
 * API Entry Point
 */

// Enable error logging
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/logs/error.log');

// Require bootstrap
require_once __DIR__ . '/bootstrap.php';

use App\Core\Router;

try {
    $router = new Router();

    // Auth endpoints
    $router->post('/auth/register', 'Auth@register');
    $router->post('/auth/login', 'Auth@login');
    $router->get('/auth/me', 'Auth@me');
    $router->post('/auth/logout', 'Auth@logout');
    $router->post('/auth/refresh-token', 'Auth@refreshToken');
    $router->post('/auth/password/request-reset', 'Auth@requestPasswordReset');
    $router->post('/auth/password/reset', 'Auth@resetPassword');

    // Generic MySQL data endpoints used by the frontend compatibility client
    $router->post('/data/query', 'DataController@query');
    $router->post('/data/insert', 'DataController@insert');
    $router->post('/data/update', 'DataController@update');
    $router->post('/data/upsert', 'DataController@upsert');
    $router->post('/data/delete', 'DataController@delete');

    // PHP replacements for former Supabase functions/storage calls
    $router->post('/functions/{name}', 'FunctionController@invoke');
    $router->post('/storage/{bucket}/upload', 'StorageController@upload');
    $router->post('/storage/{bucket}/signed-url', 'StorageController@signedUrl');

    // User endpoints
    $router->get('/users/profile', 'UserController@getProfile');
    $router->put('/users/profile', 'UserController@updateProfile');
    $router->post('/users/password/change', 'UserController@changePassword');
    $router->get('/users/search', 'UserController@search');
    $router->get('/users/{id}', 'UserController@getProfileById');
    
    // User subscriptions
    $router->get('/users/subscriptions', 'UserController@getSubscriptions');
    $router->get('/users/subscription/active', 'UserController@getActiveSubscription');
    
    // User wallet
    $router->get('/users/wallet', 'UserController@getWallet');
    $router->get('/users/wallet/transactions', 'UserController@getWalletTransactions');
    
    // Admin user management
    $router->get('/admin/users', 'UserController@listUsers');
    $router->put('/admin/users/{id}/role', 'UserController@updateRole');
    $router->delete('/admin/users/{id}', 'UserController@deleteAccount');

    // Research endpoints
    $router->post('/research', 'ResearchController@create');
    $router->get('/research/{id}', 'ResearchController@show');
    $router->get('/research/user/{id}', 'ResearchController@getUserPapers');
    $router->get('/research/search', 'ResearchController@search');
    $router->get('/research/trending', 'ResearchController@trending');
    $router->get('/research/my-papers', 'ResearchController@myPapers');
    $router->put('/research/{id}', 'ResearchController@update');
    $router->post('/research/{id}/submit', 'ResearchController@submit');
    $router->post('/research/{id}/comments', 'ResearchController@addComment');
    $router->get('/research/{id}/comments', 'ResearchController@getComments');
    $router->post('/research/{id}/download', 'ResearchController@download');
    $router->delete('/research/{id}', 'ResearchController@delete');

    // Payment endpoints
    $router->post('/payments/initiate', 'PaymentController@initiate');
    $router->post('/payments/verify', 'PaymentController@verify');
    $router->post('/payments/webhook', 'PaymentController@webhook');
    $router->get('/payments/history', 'PaymentController@getHistory');

    // AI endpoints
    $router->post('/ai/review/{id}', 'AIController@reviewResearch');
    $router->post('/ai/summarize/{id}', 'AIController@summarizeResearch');
    $router->post('/ai/chat', 'AIController@chat');
    $router->post('/ai/topics', 'AIController@generateTopics');
    $router->post('/ai/plagiarism/{id}', 'AIController@checkPlagiarism');
    $router->get('/ai/credits', 'AIController@getCredits');

    // Search & Browse endpoints
    $router->get('/search', 'SearchController@search');
    $router->get('/search/advanced', 'SearchController@advancedSearch');
    $router->get('/browse/category/{category}', 'SearchController@browseByCategory');
    $router->get('/browse/categories', 'SearchController@getCategories');
    $router->get('/browse/featured', 'SearchController@getFeatured');
    $router->get('/browse/recommendations', 'SearchController@getRecommendations');
    $router->get('/browse/similar/{id}', 'SearchController@getSimilar');
    $router->get('/statistics', 'SearchController@getStatistics');

    // Notification endpoints
    $router->get('/notifications', 'NotificationController@getNotifications');
    $router->get('/notifications/unread-count', 'NotificationController@getUnreadCount');
    $router->put('/notifications/{id}/read', 'NotificationController@markAsRead');
    $router->put('/notifications/read-all', 'NotificationController@markAllAsRead');
    $router->delete('/notifications/{id}', 'NotificationController@delete');
    $router->delete('/notifications', 'NotificationController@deleteAll');
    $router->get('/notifications/preferences', 'NotificationController@getPreferences');
    $router->put('/notifications/preferences', 'NotificationController@updatePreferences');

    // Messaging endpoints
    $router->post('/messages', 'MessagingController@sendMessage');
    $router->get('/messages/{id}', 'MessagingController@getConversation');
    $router->get('/conversations', 'MessagingController@getConversations');
    $router->put('/messages/{id}/read', 'MessagingController@markAsRead');
    $router->delete('/messages/{id}', 'MessagingController@deleteMessage');
    $router->get('/messages/search', 'MessagingController@searchMessages');
    $router->get('/messages/unread-count', 'MessagingController@getUnreadCount');

    // Challenge endpoints
    $router->get('/challenges', 'ChallengeController@listChallenges');
    $router->post('/challenges', 'ChallengeController@createChallenge');
    $router->get('/challenges/{id}', 'ChallengeController@getChallenge');
    $router->put('/challenges/{id}', 'ChallengeController@updateChallenge');
    $router->delete('/challenges/{id}', 'ChallengeController@deleteChallenge');
    $router->post('/challenges/{id}/submit', 'ChallengeController@submitEntry');
    $router->post('/challenges/{id}/vote', 'ChallengeController@voteOnEntry');
    $router->get('/challenges/{id}/submissions', 'ChallengeController@getSubmissions');
    $router->get('/challenges/my-submissions', 'ChallengeController@getUserSubmissions');
    $router->post('/challenges/{id}/finalize', 'ChallengeController@finalizeChallenge');

    // Collaboration endpoints
    $router->get('/collaborations', 'CollaborationController@getCollaborations');
    $router->post('/collaborations', 'CollaborationController@createCollaboration');
    $router->get('/collaborations/{id}', 'CollaborationController@getCollaboration');
    $router->delete('/collaborations/{id}', 'CollaborationController@deleteCollaboration');
    $router->post('/collaborations/{id}/leave', 'CollaborationController@leaveCollaboration');
    $router->post('/collaborations/{id}/invite', 'CollaborationController@inviteMember');
    $router->delete('/collaborations/{id}/members/{user_id}', 'CollaborationController@removeMember');
    $router->get('/collaborations/{id}/members', 'CollaborationController@getMembers');
    $router->post('/collaborations/{id}/projects', 'CollaborationController@createProject');
    $router->get('/collaborations/{id}/projects', 'CollaborationController@getProjects');

    // Supervisor endpoints
    $router->get('/supervisors', 'SupervisorController@listSupervisors');
    $router->get('/supervisors/{id}', 'SupervisorController@getProfile');
    $router->get('/supervisor/papers', 'SupervisorController@getAssignedPapers');
    $router->post('/supervisor/feedback', 'SupervisorController@submitFeedback');
    $router->get('/supervisor/reviews', 'SupervisorController@getReviews');
    $router->put('/supervisor/papers/{id}/approve', 'SupervisorController@approvePaper');
    $router->put('/supervisor/papers/{id}/reject', 'SupervisorController@rejectPaper');
    $router->put('/supervisor/papers/{id}/revise', 'SupervisorController@requestRevision');
    $router->get('/research/{id}/feedback', 'SupervisorController@getFeedback');
    $router->post('/supervisor/request-assignment', 'SupervisorController@requestAssignment');

    // Analytics endpoints
    $router->get('/analytics/user', 'AnalyticsController@getUserAnalytics');
    $router->get('/analytics/paper/{id}', 'AnalyticsController@getPaperAnalytics');
    $router->get('/analytics/platform', 'AnalyticsController@getPlatformStats');
    $router->get('/analytics/popular-papers', 'AnalyticsController@getPopularPapers');
    $router->get('/analytics/top-authors', 'AnalyticsController@getTopAuthors');
    $router->get('/analytics/growth', 'AnalyticsController@getGrowthMetrics');
    $router->get('/analytics/engagement', 'AnalyticsController@getUserEngagement');

    // Admin Dashboard endpoints
    $router->get('/admin/dashboard', 'AdminDashboardController@getDashboardOverview');
    $router->get('/admin/health', 'AdminDashboardController@getSystemHealth');
    $router->get('/admin/activities', 'AdminDashboardController@getRecentActivities');
    $router->get('/admin/users', 'AdminDashboardController@manageUsers');
    $router->put('/admin/users/{id}/suspend', 'AdminDashboardController@suspendUser');
    $router->put('/admin/users/{id}/activate', 'AdminDashboardController@activateUser');
    $router->get('/admin/content', 'AdminDashboardController@moderateContent');
    $router->post('/admin/content/flag', 'AdminDashboardController@flagContent');
    $router->delete('/admin/content/{id}', 'AdminDashboardController@removeContent');
    $router->get('/admin/logs', 'AdminDashboardController@getSystemLogs');
    $router->get('/admin/database', 'AdminDashboardController@getDatabaseStats');

    // Dispatch request
    $router->dispatch();

} catch (\Exception $e) {
    error_log("Request error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}
