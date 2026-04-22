"use client";

import {useProtectedRoute} from "@/hooks/useProtectedRoute";
import Header from "@/components/Header";
import { useParams } from "next/navigation";
import styles from "./boarddetail.module.css";

const TravelBoardPage: React.FC = () => {
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
                <h1 className={styles.title}> Board details - ID: {id}</h1>
                <button 
                    className={styles.addBtn}
                    onClick = {() =>console.log("Add places")}
                >
                    +
                </button>
            </div>
        </div>
    </div>
    </>
  );
};
export default TravelBoardPage;