"use client";
import { useAtom } from "jotai";
import { activeSideBarItem } from "../configs/constants";

const useSidebar = () => {
    const [activeSidebar, setActiveSidebar] = useAtom(activeSideBarItem);
    return{ activeSidebar, setActiveSidebar };
  
};


export default useSidebar;

// "use client";
// import React, { createContext, useContext, useState } from "react";

// interface SidebarContextType {
//     activeSidebar: string;
//     setActiveSidebar: (path: string) => void;
// }

// const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
//     const [activeSidebar, setActiveSidebar] = useState("");

//     return (
//         <SidebarContext.Provider value={{ activeSidebar, setActiveSidebar }}>
//             {children}
//         </SidebarContext.Provider>
//     );
// };

// const useSidebar = () => {
//     const context = useContext(SidebarContext);
//     if (!context) {
//         throw new Error("useSidebar must be used within a SidebarProvider");
//     }
//     return context;
// };
// export default useSidebar;