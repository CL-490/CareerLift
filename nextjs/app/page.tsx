import RecentResumeCard from "@/components/RecentResumeCard";
import SavedJobsCard from "@/components/SavedJobsCard";

export default function Home() {
  return (
    <div className="max-w-350 mx-auto text-[15px]">
      <header className="mb-12">
        <h1 className="text-[36px] font-semibold tracking-tight flex items-center gap-2 leading-[1.15] heading-gradient">
          Welcome back! <span className="animate-wave select-none">👋</span>
        </h1>
        <p className="mt-3 text-[15px] font-normal text-muted">Here is your career overview.</p>
      </header>
      <section className="grid gap-9 lg:grid-cols-2">
        <RecentResumeCard />
        <SavedJobsCard />
      </section>
    </div>
  );
}
