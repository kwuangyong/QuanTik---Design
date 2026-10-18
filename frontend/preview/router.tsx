import {createContext, useContext, useEffect, useMemo, useState, type ReactNode, type AnchorHTMLAttributes} from "react";
const Context=createContext({pathname:"/dashboard",search:"",navigate:(_href:string,_replace=false)=>{}});
const routePath=(pathname:string)=>pathname==="/"||pathname==="/index.html"?"/dashboard":pathname;
export function PreviewRouter({children}:{children:ReactNode}){
  const [location,setLocation]=useState(() => ({pathname:document.getElementById("quantik-design-preview")?.dataset.route ?? routePath(window.location.pathname),search:window.location.search}));
  useEffect(()=>{const sync=()=>setLocation({pathname:routePath(window.location.pathname),search:window.location.search});window.addEventListener("popstate",sync);return()=>window.removeEventListener("popstate",sync);},[]);
  const navigate=(href:string,replace=false)=>{const url=new URL(href,window.location.origin);window.history[replace?"replaceState":"pushState"]({},"",url.pathname+url.search+url.hash);setLocation({pathname:url.pathname,search:url.search});};
  return <Context.Provider value={{...location,navigate}}>{children}</Context.Provider>;
}
export function usePathname(){return useContext(Context).pathname;}
export function useSearchParams(){const {search}=useContext(Context);return useMemo(()=>new URLSearchParams(search),[search]);}
export function useRouter(){const {navigate}=useContext(Context);return {push:(href:string)=>navigate(href),replace:(href:string)=>navigate(href,true)};}
export default function Link({href,onClick,children,...props}:AnchorHTMLAttributes<HTMLAnchorElement>&{href:string}){
  const {navigate}=useContext(Context);
  return <a {...props} href={href} onClick={event=>{onClick?.(event);if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button!==0||props.target==="_blank")return;event.preventDefault();navigate(href);}}>{children}</a>;
}
