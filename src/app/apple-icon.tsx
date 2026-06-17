import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#1A3C2E",
          borderRadius: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#C9A84C",
            fontSize: 72,
            fontWeight: 800,
            fontFamily: "Georgia, serif",
            letterSpacing: "-3px",
            lineHeight: 1,
          }}
        >
          BP
        </span>
      </div>
    ),
    { ...size }
  );
}
