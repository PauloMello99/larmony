import { ImageResponse } from "next/og"

export const config = {
  runtime: "edge",
}

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0d0d0f",
          backgroundImage:
            "radial-gradient(circle at 25% 15%, rgba(20,184,166,0.25), transparent 45%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width={96} height={96} viewBox="0 0 96 96">
            <rect width="96" height="96" rx="26" fill="#14b8a6" />
            <path
              d="M48 24 L74 45 L74 68 A6 6 0 0 1 68 74 L28 74 A6 6 0 0 1 22 68 L22 45 Z"
              fill="#ffffff"
            />
            <path d="M41 74 L41 56 A7 7 0 0 1 55 56 L55 74 Z" fill="#14b8a6" />
          </svg>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, color: "#ffffff" }}>
            <span style={{ color: "#14b8a6" }}>lar</span>
            <span>mony</span>
          </div>
        </div>
        <div style={{ marginTop: 28, fontSize: 32, color: "rgba(255,255,255,0.6)" }}>
          Transações, orçamentos e metas — compartilhados com quem divide o lar com você.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
