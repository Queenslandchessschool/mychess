import Link from "next/link";
import ChessboardBackground from "@/components/layout/ChessboardBackground";

function NewsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4.5h14v15H5z" />
      <path d="M8 8h8M8 11.5h8M8 15h5" />
    </svg>
  );
}

function RatingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 18L9 13L12.5 16L20 7" />
      <path d="M14.5 7H20V12.5" />
    </svg>
  );
}

function ChampionsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10M9 4v5a3 3 0 0 0 6 0V4" />
      <path d="M5 5v2a5 5 0 0 0 4 4M19 5v2a5 5 0 0 1-4 4" />
      <path d="M12 12v5M8 20h8M9 17h6" />
    </svg>
  );
}

function PuzzleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 4h3a2 2 0 1 1 4 0h3v4a2 2 0 1 0 0 4v4h-4a2 2 0 1 1-4 0H6v-4a2 2 0 1 0 0-4V4z" />
    </svg>
  );
}

function CampIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2" />
      <path d="M12 19.5v2" />
      <path d="M2.5 12h2" />
      <path d="M19.5 12h2" />
      <path d="M5.3 5.3l1.4 1.4" />
      <path d="M17.3 17.3l1.4 1.4" />
      <path d="M18.7 5.3l-1.4 1.4" />
      <path d="M6.7 17.3l-1.4 1.4" />
    </svg>
  );
}

function EventsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 9h16M8 13h3M8 16h5" />
    </svg>
  );
}

const quickLinks = [
  {
    title: "News",
    icon: <NewsIcon />,
    href: "https://queenslandchessschool.com.au/blog",
  },
  {
    title: "Ratings",
    icon: <RatingsIcon />,
    href: "https://queenslandchessschool.com.au/tournaments/qj-rating",
  },
  {
    title: "Champions",
    icon: <ChampionsIcon />,
    href: "https://queenslandchessschool.com.au/champions",
  },
  {
    title: "Puzzles",
    icon: <PuzzleIcon />,
    href: "https://sites.google.com/view/wrsschessprogram/challenge?authuser=0",
  },
  {
    title: "Holiday Camps",
    icon: <CampIcon />,
    href: "https://queenslandchessschool.com.au/classes#holiday-camp",
  },
  {
    title: "Events",
    icon: <EventsIcon />,
    href: "https://queenslandchessschool.com.au/tournaments",
  },
];

export default function Home() {
  return (
    <ChessboardBackground>
      <div className="min-h-[100svh] w-full px-2.5 py-3 sm:px-5 sm:py-5">
        <div className="mx-auto flex min-h-[calc(100svh-1.5rem)] w-full max-w-6xl flex-col justify-center gap-[clamp(0.65rem,2.8vh,2rem)] sm:min-h-[calc(100svh-2.5rem)]">
          {/* MyCHESS Hero */}
          <section className="shrink-0">
            <div className="w-full overflow-hidden rounded-[22px] border border-[#D4AF37] bg-white shadow-[0_14px_40px_rgba(0,0,0,0.18)]">
              <div className="flex flex-col items-center px-3 py-2.5 text-center sm:px-6 sm:py-4 md:py-5">
                <div className="w-[min(72vw,310px)] sm:w-[min(48vw,360px)] md:w-[min(38vw,410px)]">
                  <img
                    src="/mychess-logo.gif"
                    alt="MyCHESS"
                    className="block h-auto w-full"
                  />
                </div>

                <p className="mt-0.5 text-[clamp(0.9rem,3.5vw,1.35rem)] font-semibold tracking-[0.11em] text-[#102B4D] sm:mt-1">
                  LEARN <span className="mx-1 inline-block align-middle text-[1.6em] leading-none text-[#D4AF37]">·</span> GROW <span className="mx-1 inline-block align-middle text-[1.6em] leading-none text-[#D4AF37]">·</span> SUCCEED
                </p>

                <Link
                  href="/login"
                  className="mt-2.5 inline-flex min-h-10 items-center justify-center rounded-full bg-[#D4AF37] px-7 py-2 text-[0.72rem] font-semibold tracking-[0.08em] text-[#102B4D] transition duration-200 hover:scale-[1.02] hover:bg-[#E0BD50] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 sm:mt-3 sm:min-h-11 sm:px-8 sm:text-sm"
                >
                  ENTER MyCHESS
                </Link>
              </div>
            </div>
          </section>

          {/* Quick Access */}
          <section className="shrink-0">
            <div className="relative overflow-hidden rounded-[18px] border border-[#D4AF37] bg-[#102B4D]/95 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="grid grid-cols-3">
                {quickLinks.map((item) => (
                  <a
  key={item.title}
  href={item.href}
  target="_blank"
  rel="noopener noreferrer"
                    aria-label={item.title}
                    className="flex min-h-[86px] flex-col items-center justify-center gap-1.5 px-1.5 py-2 text-center text-[#F4F7FB] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D4AF37]/10 hover:shadow-[0_0_18px_rgba(212,175,55,0.18)] focus:-translate-y-0.5 focus:bg-[#D4AF37]/10 focus:outline-none focus:shadow-[0_0_18px_rgba(212,175,55,0.18)] active:scale-[0.97] active:-translate-y-0.5 active:bg-[#D4AF37]/15 active:shadow-[0_0_18px_rgba(212,175,55,0.22)] sm:min-h-[104px] sm:gap-2"
                  >
                    <span className="h-6 w-6 text-[#D4AF37] sm:h-7 sm:w-7 [&>svg]:h-full [&>svg]:w-full [&>svg]:fill-none [&>svg]:stroke-current [&>svg]:stroke-[1.5]">
                      {item.icon}
                    </span>

                    <span className="text-[0.7rem] font-medium tracking-[0.025em] sm:text-[0.82rem]">
                      {item.title}
                    </span>
                  </a>
                ))}
              </div>

              {/* Precision gold dividers */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
              >
                <div className="absolute bottom-1/2 left-0 right-0 h-px -translate-y-1/2 bg-[#D4AF37]/65" />

                <div className="absolute bottom-0 left-1/3 top-0 w-px -translate-x-1/2 bg-[#D4AF37]/65" />

                <div className="absolute bottom-0 left-2/3 top-0 w-px -translate-x-1/2 bg-[#D4AF37]/65" />

                <span className="absolute left-1/3 top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#D4AF37] bg-[#102B4D]" />

                <span className="absolute left-2/3 top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-[#D4AF37] bg-[#102B4D]" />
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="shrink-0 px-2 pb-0.5 text-center">
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-sm font-semibold tracking-[0.05em] text-[#F4F7FB] sm:text-base">
                Queensland Chess School PTY LTD
              </p>

              <a
  href="https://www.kqchess.com/"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="KING & QUEEN CHESS CLUB"
  className="inline-flex items-center gap-1.5 text-[0.58rem] font-medium tracking-[0.16em] text-[#D4AF37] transition duration-200 hover:-translate-y-0.5 hover:text-[#F4F7FB] hover:drop-shadow-[0_0_8px_rgba(212,175,55,0.35)] active:scale-[0.97] sm:text-[0.65rem]"
>
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="h-3.5 w-3.5 shrink-0 stroke-current sm:h-4 sm:w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.2 2.4 3.3 5.4 3.3 9s-1.1 6.6-3.3 9" />
    <path d="M12 3c-2.2 2.4-3.3 5.4-3.3 9s1.1 6.6 3.3 9" />
    <path d="M4.2 7.5h15.6" />
    <path d="M4.2 16.5h15.6" />
  </svg>

  <span>KING &amp; QUEEN CHESS CLUB</span>
</a>

              <p className="mt-1 text-[0.5rem] tracking-wide text-[#C8D2DF]/75 sm:text-[0.55rem]">
                Developed by Peter with AI assistance
              </p>

              <p className="text-[0.5rem] tracking-wide text-[#C8D2DF]/65 sm:text-[0.55rem]">
                &copy; Queensland Chess School. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </ChessboardBackground>
  );
}