import Link from "next/link";
import { QuantGuideBody } from "@/components/quant-guide";
import styles from "@/components/quant-guide.module.css";

export const metadata = { title: "Cách đọc báo cáo Quant" };
export default function Page() {
  return <main className={styles.page} data-quant-guide-page>
    <p><Link className={styles.back} href="/analysis" prefetch={false}>← Quay lại phân tích Quant</Link></p>
    <QuantGuideBody headingLevel={1}/>
  </main>;
}
