import type { PropsWithChildren } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { Sidebar } from "@/components/sidebar";
import { Tour } from "@/components/tour";
import { isTourDone } from "@/lib/preferences";

const MainLayout = async ({ children }: PropsWithChildren) => {
  const showTour = !(await isTourDone());

  return (
    <>
      <Tour open={showTour} />
      <MobileHeader />
      <Sidebar className="hidden lg:flex" />
      <BottomNav />
      {/* Room for the phone's top bar and tab bar; wide screens have neither. */}
      <main className="h-full pb-[calc(4rem+env(safe-area-inset-bottom))] pt-[56px] lg:pb-0 lg:ps-[256px] lg:pt-0">
        <div className="mx-auto h-full max-w-[1056px] pt-6">{children}</div>
      </main>
    </>
  );
};

export default MainLayout;
