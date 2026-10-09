"use client";

export default function CoachInfoPage() {
  return (
    <main
      className="relative flex min-h-[calc(100dvh-5rem)] w-full items-center justify-center overflow-x-hidden overflow-y-auto bg-[#011029] px-5 py-8 text-[#F4F7FB] md:min-h-[calc(100dvh-4rem)] md:py-8"

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
      {/* Subtle gold ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(420px,80vw)] w-[min(420px,80vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D4AF37]/[0.045] blur-3xl"
      />

      {/* Content stays centered in the available Coach Portal area */}
      <section className="relative z-10 mx-auto flex w-full max-w-xl shrink-0 flex-col items-center justify-center text-center">
        {/* Pawn → Queen animation reused from the login page */}
        <div className="relative mb-8 flex h-24 w-24 shrink-0 items-center justify-center">
          <div
            aria-hidden="true"
            className="absolute h-[88px] w-[88px] rounded-full border border-[#D4AF37]/35 shadow-[0_0_18px_rgba(212,175,55,0.08)]"
          />

          <svg
            viewBox="0 0 24 30"
            aria-hidden="true"
            className="relative h-14 w-14 text-[#D4AF37]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Pawn */}
            <g>
              <circle cx="12" cy="6" r="2.7" />
              <path d="M9.2 10.2h5.6" />
              <path d="M10 10.2l-1.2 7.2h6.4L14 10.2" />
              <path d="M8.2 17.4h7.6" />
              <path d="M7 20.2h10" />
              <path d="M6 23h12" />

              <animate
                attributeName="opacity"
                dur="6s"
                repeatCount="indefinite"
                values="1;1;0;0;1"
                keyTimes="0;0.42;0.55;0.92;1"
              />
            </g>

            {/* Queen */}
            <g>
              <path d="M5.5 7.5L7.5 4L10 7L12 3L14 7L16.5 4L18.5 7.5" />
              <path d="M5.5 7.5L8 17.5H16L18.5 7.5L15.2 10L12 6L8.8 10L5.5 7.5Z" />
              <path d="M8 17.5h8" />
              <path d="M7.2 20.5h9.6" />
              <path d="M6.2 23.5h11.6" />

              <animate
                attributeName="opacity"
                dur="6s"
                repeatCount="indefinite"
                values="0;0;1;1;0"
                keyTimes="0;0.42;0.55;0.92;1"
              />
            </g>
          </svg>
        </div>

        <h1 className="font-serif text-3xl font-semibold tracking-wide text-[#D4AF37] sm:text-4xl">
          Coming Soon
        </h1>

        <p className="mt-4 text-base text-[#F4F7FB] sm:text-lg">
          We're working on something new.
        </p>

        <p className="mt-2 text-sm text-[#C8D2DF]/70">
          This section will be available soon.
        </p>

        <div className="mx-auto mt-8 h-px w-20 shrink-0 bg-[#D4AF37]/60" />
      </section>
    </main>
  );
}