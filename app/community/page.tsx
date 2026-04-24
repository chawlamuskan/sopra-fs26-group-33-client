"use client";

import {useProtectedRoute} from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import { useParams } from "next/navigation";
import styles from "@/styles/page.module.css";

const CommunityPage: React.FC = () => {
    const isAllowed = useProtectedRoute(); 
    const { id } = useParams();

    if (isAllowed === null) return null;
    if (!isAllowed) return null;

  return (
    <>
    <Header />
    <div className={styles.page}>
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}> Coming Soon... {id}</h1>
            </div>
        </div>
    </div>
    </>
  );
};
export default CommunityPage;