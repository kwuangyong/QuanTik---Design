"use client";
import { createContext, useContext, type ReactNode } from "react";
const Context = createContext(false);
/** Only the standalone preview opts in. Product routes retain the real widget. */
export function MockChartPreview({children}:{children:ReactNode}) { return <Context.Provider value={true}>{children}</Context.Provider>; }
export const useMockChartPreview = () => useContext(Context);
