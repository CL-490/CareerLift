import RecentResumeCard from "@/components/RecentResumeCard";
import SavedJobsCard from "@/components/SavedJobsCard";

export default function Home() {
  return (
    <div className="max-w-400 mx-auto">
      <h1 className="text-[40px] font-semibold tracking-tight heading-gradient mb-2">
        Welcome back! <span className="animate-wave select-none">👋</span>
      </h1>
      <p className="text-[15px] text-muted mb-6">Here is your career overview.</p>
      <section className="grid gap-9 lg:grid-cols-2">
        <RecentResumeCard />
        <SavedJobsCard />
      </section>
    </div>
  );
}
