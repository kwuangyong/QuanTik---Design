import {createContext, useContext, useMemo, useState, type ReactNode, type AnchorHTMLAttributes} from "react";
const Context=createContext({pathname:"/dashboard",search:"",navigate:(_href:string)=>{}});
export function PreviewRouter({children}:{children:ReactNode}){
  const [location,setLocation]=useState(() => ({pathname:document.getElementById("quantik-design-preview")?.dataset.route ?? "/dashboard",search:window.location.search}));
  const navigate=(href:string)=>{const url=new URL(href,"https://preview.local");setLocation({pathname:url.pathname,search:url.search});};
  return <Context.Provider value={{...location,navigate}}>{children}</Context.Provider>;
}
export function usePathname(){return useContext(Context).pathname;}
export function useSearchParams(){const {search}=useContext(Context);return useMemo(()=>new URLSearchParams(search),[search]);}
export function useRouter(){const {navigate}=useContext(Context);return {push:navigate,replace:navigate};}
export default function Link({href,onClick,children,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{href:string}){
  const {navigate}=useContext(Context);
  return <a {...props} href={href} onClick={event=>{event.preventDefault();onClick?.(event);navigate(href);}}>{children}</a>;
}
