"use client";

import {useState, useEffect} from "react";

export default function InfoButton() {

    const features = [
    "Explore countries and cities through an interactive world map",
    "Discover history, culture, cuisine, attractions, and hidden gems",
    "Create travel itineraries and organize your dream trips",
    "Save and share travel boards with friends and the community",
    "Discover trending and highly rated destinations",
    "Connect with travelers who share similar interests",
    ];

    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
    const hasVisited = localStorage.getItem("worldtura_visited");
    if (!hasVisited) setShowWelcome(true);
    }, []);

    const handleCloseWelcome = () => {
    localStorage.setItem("worldtura_visited", "true");
    setShowWelcome(false);
    };

    return(
        <>
            <button
                onClick={() => setShowWelcome(true)}
                style={{
                    position: "fixed",
                    bottom: "24px",
                    right: "24px",
                    background: "#0B0696",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "50%",
                    width: "48px",
                    height: "48px",
                    fontSize: "22px",
                    cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                    zIndex: 1500,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                title="About Worldtura"
            >
                ?
            </button>
        {showWelcome && (
        <div style={{
            position: "fixed", inset: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 2000,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
            animation: "fadeIn 0.3s ease",
        }}>
        <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(24px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .wt-feature { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; font-size: 14px; color: rgba(255,255,255,0.88); line-height: 1.5; border-bottom: 1px solid rgba(255,255,255,0.07); }
        .wt-feature:last-child { border-bottom: none; }
        .wt-dot { width: 6px; height: 6px; border-radius: 50%; background: #5AA7C3; margin-top: 7px; flex-shrink: 0; }
        .wt-btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #5AA7C3, #5AA7C3); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 20px; transition: opacity 0.2s, transform 0.15s; }
        .wt-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        `}</style>

        <div style={{
        background: "linear-gradient(160deg, #0d1f5c 0%, #0a1540 60%, #081030 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "20px", padding: "32px 28px 28px",
        width: "100%", maxWidth: "460px", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
        animation: "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
        }}>
        <button onClick={handleCloseWelcome} style={{
            position: "absolute", top: "16px", right: "18px",
            background: "rgba(255,255,255,0.08)", border: "none",
            color: "rgba(255,255,255,0.6)", fontSize: "16px", cursor: "pointer",
            width: "30px", height: "30px", borderRadius: "50%",
        }}>✕</button>

        <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>🌍</div>
            <h2 style={{ color: "white", fontSize: "22px", fontWeight: 700, margin: "0 0 10px" }}>
            Welcome to Worldtura
            </h2>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
            Your all-in-one travel planning and community platform. Discover destinations, plan trips with your friends, and share experiences with travelers around the world.
            </p>
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginBottom: "16px" }} />

        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "11px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 8px" }}>
            What you can do
        </p>

        <div>
            {features.map((f, i) => (
            <div key={i} className="wt-feature">
                <span className="wt-dot" />
                <span>{f}</span>
            </div>
            ))}
        </div>

        <button className="wt-btn" onClick={handleCloseWelcome}>
            Start your next adventure ✈️
        </button>
        </div>
    </div>
    )}

    </>
    );
}