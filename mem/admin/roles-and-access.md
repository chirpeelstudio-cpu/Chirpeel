---
name: Roles & Access Matrix
description: 6 roles (owner/admin/manager/sales/designer/accounts/installer), DB helpers, and RLS scopes for distribution
type: feature
---
**Roles** (in `app_role` enum):
- `owner` / `admin` / `manager` → full access (treated identically by `is_owner_equivalent` and `is_admin_or_manager`)
- `sales` → all leads (RW), quotations, messages, marketing
- `designer` → all leads (R), projects/BOQ, vendors
- `accounts` → all leads (R), finance (RW), invoices, payments, expenses
- `installer` → projects only

**DB helpers** (SECURITY DEFINER, authenticated only):
- `is_owner_equivalent`, `is_admin_or_manager` (includes owner), `has_finance_access`, `has_lead_access`, `has_project_access`, `can_manage_team`, `can_edit_sales`

**Batch 1 RLS changes:** `leads` SELECT widened to `has_lead_access`; `leads` UPDATE allows sales role OR assignee.

**Frontend:** `useCurrentUserPermissions` exposes `isOwner`/`isAccounts`. `TeamManagement` dialogs include Owner + Accounts with permission presets.
