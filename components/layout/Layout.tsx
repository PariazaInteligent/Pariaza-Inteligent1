import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isSidebarForceHidden, setSidebarForceHidden] = React.useState(false);
  const location = useLocation();
  const isTrophyRoom = location.pathname === '/trophy-room';
  const isHowItWorks = location.pathname === '/cum-functioneaza';
  const isDesertOasis = location.pathname === '/desert-oasis';
  const isDataStream = location.pathname === '/data-stream';

  // When the route changes away from the trophy room, ensure the sidebar is not hidden.
  React.useEffect(() => {
    if (!isTrophyRoom && !isDesertOasis && !isDataStream) {
      setSidebarForceHidden(false);
    }
  }, [isTrophyRoom, isDesertOasis, isDataStream]);
  
  const isSpecialLayout = isTrophyRoom || isHowItWorks || isDesertOasis || isDataStream;

  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
        isForceHidden={isSidebarForceHidden} 
      />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Header onMenuButtonClick={() => setSidebarOpen(true)} />
        
        <main className={`flex-grow ${isTrophyRoom ? 'bg-[#111111]' : 'bg-neutral-100 dark:bg-neutral-900'} ${!isSpecialLayout ? 'p-4 md:p-6 lg:p-8' : ''}`}>
          {isSpecialLayout ? (
            // Full-width container for special pages like Trophy Room and How It Works
            <Outlet context={{ setSidebarForceHidden }} />
          ) : (
            // Default constrained container
            <div className="container mx-auto max-w-7xl">
              <Outlet context={{ setSidebarForceHidden }} />
            </div>
          )}
        </main>
        
        {/* Do not render footer on special layout pages to give a more immersive feel */}
        {!isSpecialLayout && <Footer />}
      </div>
    </div>
  );
};

export default Layout;