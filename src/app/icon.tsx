import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#1A3C2E",
          borderRadius: 7,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            color: "#C9A84C",
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "Georgia, serif",
            letterSpacing: "-0.5px",
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
