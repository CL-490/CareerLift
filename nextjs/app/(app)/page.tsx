import RecentResumeCard from "@/components/RecentResumeCard";
import SavedJobsCard from "@/components/SavedJobsCard";
import ApplicationsCard from "@/components/ApplicationsCard";
import CoachCenterCard from "@/components/CoachCenterCard";

export default function Home() {
  return (
    <div className="mx-auto max-w-300">
      <h1 className="mb-2 text-[30px] font-semibold tracking-tight heading-gradient sm:text-[32px]">
        Welcome back! <span className="animate-wave select-none">👋</span>
      </h1>
      <p className="text-[15px] text-muted mb-6">Here is your career overview.</p>
      <section className="grid gap-6 lg:grid-cols-2">
        <RecentResumeCard />
        <SavedJobsCard />
        <ApplicationsCard />
        <CoachCenterCard />
      </section>
    </div>
  );
}
