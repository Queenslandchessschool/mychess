"use client";

interface ChessboardBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export default function ChessboardBackground({
  children,
  className = "",
}: ChessboardBackgroundProps) {
  return (
    <main
      className={`min-h-screen w-full bg-[#0D2444] text-[#F4F7FB] ${className}`}
    >
      <div
        className="min-h-screen"
        style={{
          backgroundImage: `
            conic-gradient(
              #102A4A 25%,
              #0D2444 0 50%,
              #102A4A 0 75%,
              #0D2444 0
            )
          `,
          backgroundSize: "50px 50px",
        }}
      >
        {children}
      </div>
    </main>
  );
}