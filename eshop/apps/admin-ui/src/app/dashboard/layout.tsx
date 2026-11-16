import type { ReactNode } from "react";
import SidebarWrapper from "../shared/components/sidebar";
import AuthGuard from "../shared/components/auth-guard";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <AuthGuard>
      <div className="flex h-full bg-black min-h-screen">
        {/* sidebar */}
        <aside className="w-[280px] min-w-[250px] max-w-[300px] border-r border-r-slate-800 text-white p-4">
          <div className="sticky top-0">
            <SidebarWrapper />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1">
          <div className="overflow-auto">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
};

export default Layout;