## IPN Activation & Enhancements Plan

### Phase 1: Database Schema
- Add `ipn_activations` table (user_id, id_document_url, payment_reference, payment_amount, status, activated_at)
- Add `state` column to `ipn_companies` table
- Add `ipn_activation_fee` platform setting
- Create storage bucket `ipn-documents` for ID uploads
- RLS policies for all new tables

### Phase 2: IPN Activation Flow
- Create `/ipn/activate` page with 2 steps:
  1. Upload valid ID document
  2. Pay activation fee (Paystack)
- Add activation check wrapper to IPNLayout that redirects unactivated users to `/ipn/activate`
- Block access to companies/opportunities until activated

### Phase 3: Admin IPN Management
- Create admin page listing all IPN users with: name, email, activation status, payment details, ID document link
- Add activation fee setting to admin settings page

### Phase 4: IPN Companies Enhancements
- Add `state` field to company form
- Add logo upload functionality (using existing storage)
- Redesign company cards for mobile optimization with proper icon layout

### Phase 5: Public Jobs Integration
- Update `/jobs` public page to also fetch and display IPN opportunities alongside direct industry jobs

### Phase 6: Page Optimizations
- IPN Settings: make cards fill desktop width, optimize mobile layout
- IPN Profile: same desktop/mobile optimization

### Files to create/modify:
- New: `src/pages/ipn/IPNActivation.tsx`, `src/pages/admin/AdminIPN.tsx`
- Modify: `IPNLayout.tsx`, `IPNCompanies.tsx`, `IPNSettings.tsx`, `IPNProfile.tsx`, `JobsPublic.tsx`, `AdminSettings.tsx`, `App.tsx`
