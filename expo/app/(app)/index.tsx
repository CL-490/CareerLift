import React from "react";

import { ApplicationsCard } from "@/components/dashboard/ApplicationsCard";
import { CoachCenterCard } from "@/components/dashboard/CoachCenterCard";
import { RecentResumeCard } from "@/components/dashboard/RecentResumeCard";
import { SavedJobsCard } from "@/components/dashboard/SavedJobsCard";
import { AppShell } from "@/components/shell/AppShell";

export default function DashboardScreen() {
  return (
    <AppShell title="Welcome back" subtitle="Your mobile career cockpit is live with the same priorities as the web dashboard.">
      <RecentResumeCard />
      <SavedJobsCard />
      <ApplicationsCard />
      <CoachCenterCard />
    </AppShell>
  );
}
