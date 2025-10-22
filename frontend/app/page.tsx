export default function Home() {
  return (
    <div className="max-w-[1400px] mx-auto text-[15px]">
      <header className="mb-12">
        <h1 className="text-[36px] font-semibold tracking-tight flex items-center gap-2 leading-[1.15] heading-gradient">
          Welcome back! <span className="animate-wave select-none">👋</span>
        </h1>
        <p className="mt-3 text-[15px] font-normal text-muted">Here is your career overview.</p>
      </header>
  <section className="grid gap-9 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 auto-rows-fr">
        {/* ATS Score Card */}
        <div className="card hover-ring flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 className="card-header">ATS Score</h2>
            <span className="text-[11px] uppercase tracking-wider text-muted font-medium">Tracked</span>
          </div>
          <div className="progress-shell mb-5">
            <div className="progress-fill shadow-inner" style={{ width: '72%' }}>
              <span className="drop-shadow-sm">72%</span>
            </div>
          </div>
            <p className="text-[13px] leading-5 text-muted">Average match across saved jobs.</p>
        </div>
        {/* Resume Lab Card */}
        <div className="card hover-ring flex flex-col">
          <h2 className="card-header mb-5">Resume Lab</h2>
          <div className="dropzone flex-1">
            <span>Drop resume or click to upload.</span>
          </div>
          <p className="text-[13px] leading-5 text-muted mt-5">Parse, edit, and optimize your resume.</p>
        </div>
        {/* Job Finder Card */}
        <div className="card hover-ring flex flex-col">
          <h2 className="card-header mb-1">Job Finder</h2>
          <p className="text-[13px] leading-5 text-muted mb-5">2 new jobs with high fit score!</p>
          <ul className="space-y-4 text-[14px]">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 job-bullet">•</span>
              <span className="text-foreground">Frontend Engineer — <span className="text-accent font-medium">Fit 86%</span></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 job-bullet">•</span>
              <span className="text-foreground">Backend Engineer — <span className="text-accent font-medium">Fit 78%</span></span>
            </li>
          </ul>
        </div>
        {/* Applications Card */}
        <div className="card hover-ring flex flex-col">
          <h2 className="card-header mb-4">Applications</h2>
          <div className="grid grid-cols-3 gap-4 text-center mt-2 mb-6">
            <div className="rounded-md bg-[var(--background-alt)]/50 border border-[var(--border-color)] p-3 flex flex-col gap-1">
              <span className="text-[11px] tracking-wide uppercase text-muted">Total</span>
              <span className="text-lg font-semibold text-accent">24</span>
            </div>
            <div className="rounded-md bg-[var(--background-alt)]/50 border border-[var(--border-color)] p-3 flex flex-col gap-1">
              <span className="text-[11px] tracking-wide uppercase text-muted">Offers</span>
              <span className="text-lg font-semibold text-foreground">1</span>
            </div>
          </div>
          <p className="text-[13px] leading-5 text-muted">Snapshot of your current pipeline.</p>
        </div>
        {/* Coach Center Card */}
        <div className="card hover-ring flex flex-col">
          <h2 className="card-header mb-4 flex items-center gap-2">Coach Center <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#121c27]/60 border border-[rgba(255,255,255,0.08)] tracking-wide uppercase text-muted">Beta</span></h2>
          <div className="flex-1 flex flex-col gap-4">
            <div className="rounded-md border border-[rgba(255,255,255,0.08)] bg-[#121c27]/40 p-4">
              <p className="text-[13px] text-[#9aa5b3] leading-relaxed">Daily tip: Tailor the first 3 bullet points of your resume to mirror the strongest verbs in the job description.</p>
            </div>
            <ul className="space-y-2 text-[13px] text-foreground">
              <li className="flex items-start gap-2"><span className="job-bullet mt-0.5">•</span><span>Interview prep set in 2 days</span></li>
              <li className="flex items-start gap-2"><span className="job-bullet mt-0.5">•</span><span>1 skill gap flagged: System Design</span></li>
              <li className="flex items-start gap-2"><span className="job-bullet mt-0.5">•</span><span>New growth plan recommendation</span></li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
