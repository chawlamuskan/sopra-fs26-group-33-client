import HeaderButtons from "@/components/HeaderButtons";

export default function Header() {
  return (
    <header
      style={{
        background: "#0B0696",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        height: "107px",
      }}
    >
      <h1
        style={{
          color: "#FFF",
          fontSize: "48px",
          fontFamily: "DM Sans",
          fontWeight: 700,
          letterSpacing: "-0.293px",
          margin: 0,
        }}
      >
        Worldtura
      </h1>
      <HeaderButtons />
    </header>
  );
}