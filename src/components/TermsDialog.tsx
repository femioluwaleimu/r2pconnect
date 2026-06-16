import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["app_role"];

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: UserRole | null;
}

const roleTerms: Record<string, { title: string; sections: { heading: string; content: string }[] }> = {
  researcher: {
    title: "Terms of Use for Researchers/Students",
    sections: [
      {
        heading: "1. Research Submission",
        content: "By uploading research, you confirm that you own or have rights to all content. Student research requires supervisor approval before publication. All research must comply with ethical research standards and institutional guidelines."
      },
      {
        heading: "2. AI-Powered Features",
        content: "You consent to AI analysis of your research for summaries, matching, and recommendations. AI suggestions are advisory only. You retain full ownership of your research content."
      },
      {
        heading: "3. Monetization & Credits",
        content: "Approved research may earn credits through views and downloads. Withdrawals are subject to verification. Platform fees may apply to transactions."
      },
      {
        heading: "4. Supervisor Relationship",
        content: "For student research, your supervisor has authority to approve, request revisions, or reject your submissions. You must maintain ethical research practices and proper attribution."
      },
      {
        heading: "5. Industry Visibility",
        content: "Published research may be visible to industry partners for collaboration opportunities. You may receive invites from companies interested in your work."
      }
    ]
  },
  supervisor: {
    title: "Terms and Conditions of Supervisor Registration",
    sections: [
      {
        heading: "1. Eligibility and Accurate Information",
        content: "By registering as a supervisor, you confirm that your name, email address, phone number, institution, department, academic rank, staff ID, and other submitted details are accurate and belong to you. R2P Connect may verify this information before approving or activating your supervisor account."
      },
      {
        heading: "2. Institution and Department Association",
        content: "You agree to register under the correct institution and department. Your institution may review, approve, suspend, or remove your supervisor access where required by its internal policies or by platform rules."
      },
      {
        heading: "3. Academic Supervision Responsibilities",
        content: "You agree to provide fair, timely, and constructive academic guidance to assigned students. You are responsible for reviewing submissions professionally, requesting revisions where needed, and approving only work that meets acceptable academic, ethical, and institutional standards."
      },
      {
        heading: "4. Ethical Review and Academic Integrity",
        content: "You must not approve plagiarized, fabricated, misleading, or unethical research. You agree to encourage proper citation, originality, responsible AI use, data integrity, and compliance with applicable research ethics requirements."
      },
      {
        heading: "5. AI Review Tools",
        content: "AI review tools on R2P Connect are provided to support supervision and are advisory only. You retain responsibility for your academic decisions and should independently assess AI-generated suggestions before relying on them."
      },
      {
        heading: "6. Student Data and Confidentiality",
        content: "You agree to protect student information, research drafts, feedback, messages, and institutional data. You must not disclose student work or personal data outside approved academic, institutional, or platform workflows."
      },
      {
        heading: "7. Conduct and Communication",
        content: "You agree to communicate respectfully with students, institutions, reviewers, and platform administrators. Harassment, exploitation, abusive conduct, fraudulent approval, or misuse of supervisor privileges may lead to account restriction or removal."
      },
      {
        heading: "8. Payments, Credits, and Revenue",
        content: "Where supervisor-related payments, credits, commissions, or withdrawals apply, they are subject to platform rules, verification, transaction history, and applicable institutional arrangements. R2P Connect may review transactions for fraud prevention and compliance."
      },
      {
        heading: "9. Account Review and Suspension",
        content: "R2P Connect and authorized institution administrators may review supervisor activity. Your account may be suspended, limited, or removed if your information is false, your conduct violates these terms, or your supervision activity creates academic or operational risk."
      }
    ]
  },
  institution: {
    title: "Terms of Use for Institutions",
    sections: [
      {
        heading: "1. Institutional Responsibility",
        content: "As an institution admin, you are responsible for managing researchers, supervisors, and reviewers within your institution. You must ensure all users comply with platform policies."
      },
      {
        heading: "2. Verification Codes",
        content: "Institution verification codes are confidential and should only be shared with authorized personnel. You are responsible for any accounts created using your institution's codes."
      },
      {
        heading: "3. Supervisor Management",
        content: "You have authority to invite, manage, and remove supervisors. Supervisors act on behalf of your institution when approving student research."
      },
      {
        heading: "4. Commission Structure",
        content: "Institutions may earn commissions from researcher activities. Commission rates and payment terms are subject to platform policies."
      },
      {
        heading: "5. Data & Privacy",
        content: "You must protect researcher data and comply with data protection regulations. Institution analytics are confidential."
      }
    ]
  },
  industry: {
    title: "Terms of Use for Industry Partners",
    sections: [
      {
        heading: "1. Challenge Posting",
        content: "By posting challenges, you agree to pay stated rewards to winning researchers. Challenge descriptions must be accurate and not misleading."
      },
      {
        heading: "2. Research Access",
        content: "Access to research is subject to subscription plans. Downloaded research is for internal use only unless otherwise agreed with the researcher."
      },
      {
        heading: "3. AI Matching",
        content: "AI-powered researcher matching is provided as a service. Match quality is advisory and should be verified independently."
      },
      {
        heading: "4. Hiring & Payments",
        content: "Hiring through the platform is subject to local employment laws. Payments to students must be processed through the platform wallet system."
      },
      {
        heading: "5. Intellectual Property",
        content: "Research accessed through the platform remains the property of the original researchers. Commercial licensing must be negotiated separately."
      }
    ]
  },
  investor: {
    title: "Terms of Use for Investors",
    sections: [
      {
        heading: "1. Investment Disclaimer",
        content: "Research funding through this platform is not a guarantee of returns. All investments carry risk and should be made after due diligence."
      },
      {
        heading: "2. Research Access",
        content: "Investors may access research papers and researcher profiles. Access levels depend on subscription tier."
      },
      {
        heading: "3. Funding Commitments",
        content: "Funding commitments are legally binding once confirmed. Funds are held in escrow until release conditions are met."
      },
      {
        heading: "4. Confidentiality",
        content: "Research details shared with you are confidential. Do not share without explicit permission from the researcher."
      },
      {
        heading: "5. Reporting",
        content: "You will receive periodic updates on funded research progress. Reporting frequency may vary by project."
      }
    ]
  },
  ipn: {
    title: "Terms of Use for Industry Partner Network (IPN)",
    sections: [
      {
        heading: "1. Account Activation",
        content: "IPN membership requires a one-time activation fee and valid identification. Your ID will be reviewed and must be approved by the platform before full access is granted. If your ID is rejected, you may re-upload without additional payment."
      },
      {
        heading: "2. Company Management",
        content: "You may register and manage multiple companies under your IPN account. You are responsible for the accuracy of all company information, logos, and descriptions."
      },
      {
        heading: "3. Opportunity Posting",
        content: "You may post job opportunities (internships, SIWES, part-time, full-time) for students. All postings must be genuine and comply with applicable labour laws. Misleading or fraudulent postings will result in account suspension."
      },
      {
        heading: "4. Paid Applications & Revenue Sharing",
        content: "You may charge application fees for opportunities. Revenue from paid applications is shared between you and the platform according to the prevailing revenue-sharing formula set by the administrator."
      },
      {
        heading: "5. Applicant Data & Privacy",
        content: "You will receive applicant details including name, email, and academic level. This data must be handled in accordance with data protection regulations and used only for recruitment purposes."
      },
      {
        heading: "6. Withdrawals",
        content: "Earnings from paid applications may be withdrawn to your bank account, subject to platform verification and processing timelines."
      }
    ]
  }
};

export function TermsDialog({ open, onOpenChange, role }: TermsDialogProps) {
  const terms = role ? roleTerms[role] || roleTerms.researcher : roleTerms.researcher;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{terms.title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            {terms.sections.map((section, index) => (
              <div key={index}>
                <h3 className="font-semibold text-foreground mb-2">{section.heading}</h3>
                <p className="text-sm text-muted-foreground">{section.content}</p>
              </div>
            ))}

            <div className="border-t pt-4">
              <h3 className="font-semibold text-foreground mb-2">General Terms</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• You agree to provide accurate information during registration</li>
                <li>• You are responsible for maintaining account security</li>
                <li>• Violation of terms may result in account suspension</li>
                <li>• These terms are governed by the laws of Nigeria</li>
                <li>• R2P Connect reserves the right to modify these terms</li>
              </ul>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                For the full terms of use and privacy policy, visit our{" "}
                <a href="/terms-of-use" target="_blank" className="text-primary hover:underline">
                  Terms of Use
                </a>{" "}
                and{" "}
                <a href="/privacy-policy" target="_blank" className="text-primary hover:underline">
                  Privacy Policy
                </a>{" "}
                pages.
              </p>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface TermsCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  role: UserRole | null;
}

export function TermsCheckbox({ checked, onCheckedChange, role }: TermsCheckboxProps) {
  const [termsOpen, setTermsOpen] = useState(false);
  const terms = role ? roleTerms[role] || roleTerms.researcher : roleTerms.researcher;

  return (
    <>
      <div className="flex items-start gap-2 mt-4">
        <Checkbox
          id="terms"
          checked={checked}
          onCheckedChange={(checked) => onCheckedChange(checked === true)}
          className="mt-0.5"
        />
        <Label htmlFor="terms" className="text-sm text-muted-foreground font-normal leading-tight">
          I accept the{" "}
          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            className="text-primary hover:underline"
          >
            {terms.title}
          </button>
        </Label>
      </div>
      <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} role={role} />
    </>
  );
}
