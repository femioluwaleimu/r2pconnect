import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZEPTOMAIL_API_KEY = Deno.env.get("ZEPTOMAIL_API_KEY");
const FROM_EMAIL = "support@r2pconnect.com";
const FROM_NAME = "R2P Connect";

interface EmailRequest {
  type: string;
  to: string;
  data?: Record<string, any>;
}

// Email templates
const templates: Record<string, (data: Record<string, any>) => { subject: string; html: string }> = {
  welcome: (data) => ({
    subject: "Welcome to R2P Connect!",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to R2P Connect!</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.name || "Researcher"},</p>
          <p style="font-size: 16px; color: #333;">Thank you for joining R2P Connect - your gateway to connecting research with practice!</p>
          <p style="font-size: 16px; color: #333;">With your new account, you can:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Upload and share your research papers</li>
            <li>Use AI-powered tools for research analysis</li>
            <li>Connect with industry partners</li>
            <li>Participate in research challenges</li>
          </ul>
          <a href="https://r2pconnect.com/dashboard" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Go to Dashboard</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  subscription_activated: (data) => ({
    subject: `Your ${data.planName} Subscription is Active!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Subscription Activated! 🎉</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Your ${data.planName} subscription is now active!</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Plan:</strong> ${data.planName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Amount Paid:</strong> ₦${data.amount?.toLocaleString() || "N/A"}</p>
            <p style="margin: 0;"><strong>Monthly AI Credits:</strong> ${data.aiCredits || "N/A"}</p>
          </div>
          <p style="font-size: 16px; color: #333;">Enjoy your enhanced features and increased AI credits!</p>
          <a href="https://r2pconnect.com/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Start Using Premium Features</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  research_published: (data) => ({
    subject: `Your Research "${data.title}" is Now Published!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Research Published! 📚</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Congratulations! Your research paper has been published on R2P Connect.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; font-size: 18px;">${data.title}</p>
          </div>
          <p style="font-size: 16px; color: #333;">Your research is now visible to:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Industry partners looking for research collaborations</li>
            <li>Fellow researchers for potential collaborations</li>
            <li>Investors interested in funding research</li>
          </ul>
          <a href="https://r2pconnect.com/dashboard/research" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Your Research</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  application_submitted: (data) => ({
    subject: `Application Submitted for "${data.jobTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Application Submitted! ✅</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Your application has been submitted successfully!</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Position:</strong> ${data.jobTitle}</p>
            <p style="margin: 0;"><strong>Company:</strong> ${data.companyName || "N/A"}</p>
          </div>
          <p style="font-size: 16px; color: #333;">We'll notify you when there's an update on your application.</p>
          <a href="https://r2pconnect.com/dashboard/job-board" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View My Applications</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  application_approved: (data) => ({
    subject: `Good News! Your Application for "${data.jobTitle}" was Approved!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Congratulations! 🎉</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Great news! Your application has been approved!</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Position:</strong> ${data.jobTitle}</p>
            <p style="margin: 0;"><strong>Company:</strong> ${data.companyName || "N/A"}</p>
          </div>
          <p style="font-size: 16px; color: #333;">The employer will contact you soon with next steps.</p>
          <a href="https://r2pconnect.com/dashboard/job-board" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Details</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  withdrawal_requested: (data) => ({
    subject: `Withdrawal Request of ₦${data.amount?.toLocaleString()} Submitted`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Withdrawal Requested 💰</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Your withdrawal request has been submitted and is being processed.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Amount:</strong> ₦${data.amount?.toLocaleString() || "N/A"}</p>
            <p style="margin: 0 0 10px 0;"><strong>Bank:</strong> ${data.bankName || "N/A"}</p>
            <p style="margin: 0;"><strong>Account:</strong> ${data.accountNumber || "N/A"}</p>
          </div>
          <p style="font-size: 16px; color: #333;">Processing usually takes 1-3 business days. We'll notify you once it's completed.</p>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  verification_approved: (data) => ({
    subject: "Your Account Has Been Verified! ✅",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Account Verified! ✅</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Congratulations! Your account has been verified by ${data.institutionName || "your institution"}.</p>
          <p style="font-size: 16px; color: #333;">As a verified researcher, you now have:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>A verified badge on your profile</li>
            <li>Higher visibility in search results</li>
            <li>Access to exclusive opportunities</li>
          </ul>
          <a href="https://r2pconnect.com/dashboard" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Go to Dashboard</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  research_match: (data) => ({
    subject: `New Research Matches Your Interests: "${data.paperTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #6366f1); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Research Alert! 🔔</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.name || "Researcher"},</p>
          <p style="font-size: 16px; color: #333;">A new research paper that matches your interests has been published on R2P Connect!</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; font-size: 18px; color: #6366f1;">${data.paperTitle}</p>
          </div>
          <p style="font-size: 16px; color: #333;">This paper aligns with your research interests. Check it out to discover potential collaboration opportunities!</p>
          <a href="https://r2pconnect.com/dashboard/browse?paper=${data.paperId}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Research</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  reviewer_invite: (data) => ({
    subject: `You're Invited to Review Research at ${data.institutionName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #a855f7); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Reviewer Invitation 📝</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.reviewerName || "Researcher"},</p>
          <p style="font-size: 16px; color: #333;">You have been invited to join <strong>${data.institutionName}</strong> as a research paper reviewer on R2P Connect!</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Institution:</strong> ${data.institutionName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Invited by:</strong> ${data.invitedBy || "Institution Admin"}</p>
          </div>
          <p style="font-size: 16px; color: #333;">As a reviewer, you'll help evaluate research quality and provide valuable feedback to researchers.</p>
          <p style="font-size: 16px; color: #333;">To accept this invitation:</p>
          <ol style="font-size: 16px; color: #333;">
            <li>Sign up or log in to R2P Connect</li>
            <li>Use this verification code: <strong style="color: #8b5cf6; font-size: 20px;">${data.verificationCode || "N/A"}</strong></li>
            <li>Start reviewing research submissions</li>
          </ol>
          <a href="${data.inviteLink || "https://r2pconnect.com/reviewer-invite?code=" + data.verificationCode}" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Accept Invitation</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  supervisor_invite: (data) => ({
    subject: `You're Invited to Supervise Students at ${data.institutionName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Supervisor Invitation 🎓</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.supervisorName || "Professor"},</p>
          <p style="font-size: 16px; color: #333;">You have been invited to join <strong>${data.institutionName}</strong> as a research supervisor on R2P Connect!</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Institution:</strong> ${data.institutionName}</p>
            ${data.department ? `<p style="margin: 0 0 10px 0;"><strong>Department:</strong> ${data.department}</p>` : ""}
            <p style="margin: 0 0 10px 0;"><strong>Invited by:</strong> ${data.invitedBy || "Institution Admin"}</p>
          </div>
          <p style="font-size: 16px; color: #333;">As a supervisor, you'll be able to:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Guide and mentor student research projects</li>
            <li>Review and approve student research submissions</li>
            <li>Track student progress through the research lifecycle</li>
            <li>Provide feedback and request revisions</li>
          </ul>
          <p style="font-size: 16px; color: #333; margin-top: 20px;">To accept this invitation, click the button below and complete your registration:</p>
          <a href="${data.inviteLink || "https://r2pconnect.com/supervisor-invite?code=" + data.inviteCode}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Accept Invitation</a>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">Your invite code: <strong>${data.inviteCode}</strong></p>
          <p style="font-size: 14px; color: #666;">This invitation expires in 7 days.</p>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  supervisor_registered: (data) => ({
    subject: `Supervisor ${data.supervisorName} Has Completed Registration`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Supervisor Registered! 🎓</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.adminName || "Admin"},</p>
          <p style="font-size: 16px; color: #333;">A new supervisor has accepted your invitation and completed their registration.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${data.supervisorName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${data.supervisorEmail}</p>
            ${data.department ? `<p style="margin: 0;"><strong>Department:</strong> ${data.department}</p>` : ""}
          </div>
          <p style="font-size: 16px; color: #333;">They can now supervise and approve student research submissions.</p>
          <a href="https://r2pconnect.com/institution/supervisors" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Supervisors</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  reviewer_registered: (data) => ({
    subject: `Reviewer ${data.reviewerName} Has Completed Registration`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6, #a855f7); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Reviewer Registered! 📝</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.adminName || "Admin"},</p>
          <p style="font-size: 16px; color: #333;">A new reviewer has accepted your invitation and completed their registration.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${data.reviewerName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${data.reviewerEmail}</p>
          </div>
          <p style="font-size: 16px; color: #333;">They can now review research paper submissions.</p>
          <a href="https://r2pconnect.com/institution/reviewers" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Reviewers</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  revision_requested: (data) => ({
    subject: `Revision Requested for Your Research: "${data.title}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Revision Requested 📝</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.studentName || "Student"},</p>
          <p style="font-size: 16px; color: #333;">Your supervisor has reviewed your research and requested some revisions.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Research Title:</strong> ${data.title}</p>
            <p style="margin: 0 0 10px 0;"><strong>Supervisor:</strong> ${data.supervisorName || "Your Supervisor"}</p>
          </div>
          ${
            data.comments
              ? `
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px 0; font-weight: bold; color: #92400e;">Supervisor's Feedback:</p>
            <p style="margin: 0; color: #78350f;">${data.comments}</p>
          </div>
          `
              : ""
          }
          <p style="font-size: 16px; color: #333;">Please review the feedback and resubmit your research after making the necessary changes.</p>
          <a href="https://r2pconnect.com/dashboard/research" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View & Resubmit Research</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  research_approved: (data) => ({
    subject: `Congratulations! Your Research "${data.title}" Has Been Approved`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Research Approved! 🎉</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.studentName || "Student"},</p>
          <p style="font-size: 16px; color: #333;">Great news! Your supervisor has approved your research.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Research Title:</strong> ${data.title}</p>
            <p style="margin: 0;"><strong>Approved by:</strong> ${data.supervisorName || "Your Supervisor"}</p>
          </div>
          ${
            data.comments
              ? `
          <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px 0; font-weight: bold; color: #065f46;">Supervisor's Comments:</p>
            <p style="margin: 0; color: #047857;">${data.comments}</p>
          </div>
          `
              : ""
          }
          <p style="font-size: 16px; color: #333;">Your research is now ready for the next stage. You can now convert it to a completed research paper for institutional review and publication.</p>
          <a href="https://r2pconnect.com/dashboard/research" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Your Research</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  research_rejected: (data) => ({
    subject: `Update on Your Research: "${data.title}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Research Review Update</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.studentName || "Student"},</p>
          <p style="font-size: 16px; color: #333;">Your supervisor has reviewed your research submission.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Research Title:</strong> ${data.title}</p>
            <p style="margin: 0 0 10px 0;"><strong>Reviewed by:</strong> ${data.supervisorName || "Your Supervisor"}</p>
            <p style="margin: 0;"><strong>Status:</strong> <span style="color: #dc2626;">Not Approved</span></p>
          </div>
          ${
            data.comments
              ? `
          <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 5px 0; font-weight: bold; color: #991b1b;">Supervisor's Feedback:</p>
            <p style="margin: 0; color: #b91c1c;">${data.comments}</p>
          </div>
          `
              : ""
          }
          <p style="font-size: 16px; color: #333;">Please contact your supervisor for more information about this decision.</p>
          <a href="https://r2pconnect.com/dashboard/research" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Your Research</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  research_resubmitted: (data) => ({
    subject: `Research Resubmitted for Review: "${data.title}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Research Resubmitted 🔄</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.reviewerName || "Reviewer"},</p>
          <p style="font-size: 16px; color: #333;">${data.researcherName || "A researcher"} has resubmitted their research after addressing your revision request.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Research Title:</strong> ${data.title}</p>
            <p style="margin: 0 0 10px 0;"><strong>Submitted by:</strong> ${data.researcherName || "Researcher"}</p>
            ${data.researchField ? `<p style="margin: 0;"><strong>Research Field:</strong> ${data.researchField}</p>` : ""}
          </div>
          <p style="font-size: 16px; color: #333;">Please review the updated submission at your earliest convenience.</p>
          <a href="https://r2pconnect.com/reviewer/pending" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Review Research</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  documentary_tagged: (data) => ({
    subject: `You've Been Featured in a Documentary: "${data.documentaryTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">You're Featured! 🎬</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.name || "Researcher"},</p>
          <p style="font-size: 16px; color: #333;">Great news! You have been tagged in a research documentary on R2P Connect.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; font-size: 18px; color: #dc2626;">${data.documentaryTitle}</p>
          </div>
          <p style="font-size: 16px; color: #333;">This is a great opportunity to showcase your research to a wider audience!</p>
          <a href="https://r2pconnect.com/dashboard/documentaries" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Documentary</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  new_student_submission: (data) => ({
    subject: `New Research Submission from ${data.studentName}: "${data.title}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Research Submission 📝</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.supervisorName || "Supervisor"},</p>
          <p style="font-size: 16px; color: #333;">A student has submitted new research for your review on R2P Connect.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Research Title:</strong> ${data.title}</p>
            <p style="margin: 0 0 10px 0;"><strong>Student:</strong> ${data.studentName}</p>
            ${data.researchField ? `<p style="margin: 0 0 10px 0;"><strong>Field:</strong> ${data.researchField}</p>` : ""}
            ${data.researchStage ? `<p style="margin: 0;"><strong>Stage:</strong> ${data.researchStage}</p>` : ""}
          </div>
          <p style="font-size: 16px; color: #333;">Please review the submission at your earliest convenience.</p>
          <a href="https://r2pconnect.com/supervisor/pending" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Review Now</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  supervisor_message: (data) => ({
    subject: `New Message from Your Supervisor - ${data.supervisorName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">New Supervisor Message 💬</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.studentName || "Student"},</p>
          <p style="font-size: 16px; color: #333;">You have received a new message from your supervisor on R2P Connect.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${data.supervisorName}</p>
            <div style="background: white; border-left: 4px solid #10b981; padding: 15px; margin-top: 15px; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #333; font-style: italic;">"${data.messagePreview}"</p>
            </div>
          </div>
          <p style="font-size: 16px; color: #333;">Log in to view the full message and reply.</p>
          <a href="https://r2pconnect.com/dashboard/supervisor-inbox" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View Message</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  subscription_expiring: (data) => ({
    subject: `Your ${data.planName} Subscription Expires in 2 Days`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Subscription Expiring Soon ⏰</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.name || "Valued User"},</p>
          <p style="font-size: 16px; color: #333;">Your <strong>${data.planName}</strong> subscription on R2P Connect will expire on <strong>${data.expiryDate}</strong>.</p>
          <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #92400e;">What you'll lose if not renewed:</p>
            <ul style="margin: 0; color: #92400e;">
              <li>Premium AI credits and features</li>
              <li>Priority research matching</li>
              <li>Advanced analytics access</li>
              <li>Unlimited challenge submissions</li>
            </ul>
          </div>
          <p style="font-size: 16px; color: #333;">Renew now to continue enjoying uninterrupted access to all premium features.</p>
          <a href="https://r2pconnect.com/${data.role === 'industry' ? 'industry' : 'dashboard'}/subscriptions" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Renew Now</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  subscription_expired: (data) => ({
    subject: `Your ${data.planName} Subscription Has Expired`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Subscription Expired 😢</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.name || "Valued User"},</p>
          <p style="font-size: 16px; color: #333;">Your <strong>${data.planName}</strong> subscription on R2P Connect has expired.</p>
          <div style="background: #fee2e2; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #991b1b;">Features now restricted:</p>
            <ul style="margin: 0; color: #991b1b;">
              <li>AI credits are no longer available</li>
              <li>Premium matching features disabled</li>
              <li>Advanced analytics access revoked</li>
              <li>Challenge submission limits applied</li>
            </ul>
          </div>
          <p style="font-size: 16px; color: #333;">Don't miss out on valuable opportunities! Reactivate your subscription to regain full access.</p>
          <a href="https://r2pconnect.com/${data.role === 'industry' ? 'industry' : 'dashboard'}/subscriptions" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Reactivate Subscription</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  external_supervisor_invite: (data) => ({
    subject: `You're Invited to Supervise Research on R2P Connect`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Research Supervision Invite 🎓</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Dear ${data.supervisorName || "Professor"},</p>
          <p style="font-size: 16px; color: #333;"><strong>${data.studentName || "A student"}</strong> has invited you to be their research supervisor on <strong>R2P Connect</strong> — a platform that connects research with practice.</p>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #065f46;">Invitation Details</p>
            <p style="margin: 0 0 8px 0; color: #333;"><strong>Student:</strong> ${data.studentName || "N/A"}</p>
            <p style="margin: 0 0 8px 0; color: #333;"><strong>Your Name:</strong> ${data.supervisorName || "N/A"}</p>
            ${data.institutionName ? `<p style="margin: 0 0 8px 0; color: #333;"><strong>Institution:</strong> ${data.institutionName}</p>` : ""}
            ${data.department ? `<p style="margin: 0; color: #333;"><strong>Department:</strong> ${data.department}</p>` : ""}
          </div>
          <p style="font-size: 16px; color: #333;">As a supervisor on R2P Connect, you'll be able to:</p>
          <ul style="font-size: 16px; color: #333; line-height: 1.8;">
            <li>Guide and mentor student research projects</li>
            <li>Review and approve research submissions</li>
            <li>Provide chapter-by-chapter feedback</li>
            <li>Track student progress in real-time</li>
            <li>Communicate directly with your students</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.inviteLink}" style="display: inline-block; background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: bold;">Accept Invitation & Register</a>
          </div>
          <p style="font-size: 14px; color: #666; text-align: center;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 13px; color: #6366f1; word-break: break-all; text-align: center; background: #f8fafc; padding: 12px; border-radius: 8px;">${data.inviteLink}</p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">This invitation expires in 7 days. If you have any questions, please contact us at support@r2pconnect.com.</p>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  credit_topup: (data) => ({
    subject: `AI Credits Top-Up Successful! +${data.credits} Credits`,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Credits Added! ⚡</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.name || "Researcher"},</p>
          <p style="font-size: 16px; color: #333;">Your AI credit top-up was successful! Here are the details:</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Credits Added:</strong> ${data.credits}</p>
            <p style="margin: 0 0 10px 0;"><strong>Amount Paid:</strong> ₦${data.amount?.toLocaleString() || "N/A"}</p>
            <p style="margin: 0;"><strong>Reference:</strong> ${data.reference || "N/A"}</p>
          </div>
          <p style="font-size: 16px; color: #333;">Your new credits are ready to use for AI-powered research tools!</p>
          <a href="https://r2pconnect.com/dashboard/subscriptions" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">View My Credits</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  ipn_activation_submitted: (data) => ({
    subject: "New IPN Activation Request Submitted",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">New IPN Activation Request 🔔</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">A new IPN user has submitted their activation request and payment.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Network Name:</strong> ${data.companyName || "N/A"}</p>
            <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${data.email || "N/A"}</p>
            <p style="margin: 0 0 10px 0;"><strong>Amount Paid:</strong> ₦${data.amount?.toLocaleString() || "N/A"}</p>
            <p style="margin: 0;"><strong>Reference:</strong> ${data.reference || "N/A"}</p>
          </div>
          <p style="font-size: 16px; color: #333;">Please review the uploaded ID document and approve or reject the request.</p>
          <a href="https://r2pconnect.com/admin/ipn" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Review IPN Request</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  ipn_id_accepted: (data) => ({
    subject: "Your IPN Account Has Been Activated! ✅",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">Account Activated! 🎉</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.name || "Partner"},</p>
          <p style="font-size: 16px; color: #333;">Great news! Your identity document has been verified and your IPN account is now fully activated.</p>
          <p style="font-size: 16px; color: #333;">You can now:</p>
          <ul style="font-size: 16px; color: #333;">
            <li>Register and manage your companies</li>
            <li>Post job opportunities (SIWES, Internships, etc.)</li>
            <li>Review and manage applicants</li>
            <li>Track your analytics and revenue</li>
          </ul>
          <a href="https://r2pconnect.com/ipn" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Go to Dashboard</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  ipn_id_rejected: (data) => ({
    subject: "Your IPN ID Verification Was Rejected",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">ID Verification Rejected ⚠️</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">Hi ${data.name || "Partner"},</p>
          <p style="font-size: 16px; color: #333;">Unfortunately, your identity document could not be verified.</p>
          ${data.reason ? `<div style="background: #fef2f2; border-radius: 8px; padding: 15px; margin: 20px 0; border-left: 4px solid #ef4444;"><p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${data.reason}</p></div>` : ""}
          <p style="font-size: 16px; color: #333;">Please log in and re-upload a valid government-issued ID. <strong>You do not need to pay again</strong> — just upload a new document.</p>
          <a href="https://r2pconnect.com/ipn/activate" style="display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">Re-upload ID Document</a>
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),

  generic: (data) => ({
    subject: data.subject || "Notification from R2P Connect",
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: white; margin: 0;">${data.title || "Notification"}</h1>
        </div>
        <div style="padding: 30px 0;">
          <p style="font-size: 16px; color: #333;">${data.message || ""}</p>
          ${data.ctaUrl ? `<a href="${data.ctaUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin-top: 20px;">${data.ctaText || "View Details"}</a>` : ""}
        </div>
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center; color: #666; font-size: 14px;">
          <p>© ${new Date().getFullYear()} R2P Connect. All rights reserved.</p>
        </div>
      </body>
      </html>
    `,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ZEPTOMAIL_API_KEY) {
      console.error("ZEPTOMAIL_API_KEY is not configured");
      throw new Error("Email service not configured");
    }

    const { type, to, data = {} }: EmailRequest = await req.json();

    if (!to) {
      return new Response(JSON.stringify({ error: "Recipient email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get template
    const template = templates[type] || templates.generic;
    const { subject, html } = template(data);

    console.log(`Sending ${type} email to ${to}`);

    // Send via ZeptoMail API
    const response = await fetch("https://api.zeptomail.com/v1.1/email", {
      method: "POST",
      headers: {
        Authorization: `Zoho-enczapikey ${ZEPTOMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          address: FROM_EMAIL,
          name: FROM_NAME,
        },
        to: [
          {
            email_address: {
              address: to,
            },
          },
        ],
        subject,
        htmlbody: html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("ZeptoMail error:", result);
      throw new Error(result.message || "Failed to send email");
    }

    console.log(`Email sent successfully to ${to}:`, result);

    return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in send-email function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
