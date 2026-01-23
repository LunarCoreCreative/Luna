import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';

const MainLayout = ({ children }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    return (
        <div className="flex h-screen w-full bg-slate-950 overflow-hidden font-sans">
            {/* Sidebar */}
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                {/* Background Gradients (Sutil) */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-blue-600/5 blur-[120px] rounded-full -ml-48 -mb-48 pointer-events-none" />

                {/* Page Content */}
                <div className="flex-1 relative z-10 flex flex-col h-full overflow-hidden">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
