import Sidebar from "@/components/Sidebar";
import OllamaStatus from "@/components/OllamaStatus";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="min-h-screen lg:flex">
        <Sidebar />
        <div className="min-w-0 flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6 fade-in">
          {children}
        </div>
      </div>
      <OllamaStatus />
    </>
  );
}
