"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { refresh } from "@/lib/api/client";

export default function DerivativesPage() {
  const [state, setState] = useState("loading");
  useEffect(() => {
    let active = true;
    refresh("user").then(() => { if (active) setState("ready"); })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, []);
  if (state === "loading") return <p>Đang kiểm tra phiên đăng nhập…</p>;
  if (state === "error") return <p>Chưa xác nhận được phiên. <Link href="/login">Đăng nhập lại</Link></p>;
  return <iframe title="Phòng phái sinh QuanTik Pro" src="/phai-sinh/desk/index.html" className="w-full min-h-[85vh] border-0" />;
}
