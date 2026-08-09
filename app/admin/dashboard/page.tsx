import type { ReactNode } from "react";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-[#0D2444] text-[#F4F7FB]">
      {/* Navy Chessboard Background */}
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
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

          {/* =====================================================
              HEADER
          ====================================================== */}
          <header className="mb-7">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl leading-none">♟</span>

              <span className="text-sm font-semibold tracking-[0.2em] text-[#D4AF37]">
                MyCHESS
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm text-[#C8D2DF] sm:text-base">
              Manage your chess school operations from one place.
            </p>
          </header>


          {/* =====================================================
              TODAY'S LESSON
          ====================================================== */}
          <section
            className="
              relative mb-7 overflow-hidden rounded-[18px]
              border border-[#D4AF37]/45
              bg-[#152D4D]
              p-5
              transition-colors duration-200
              hover:border-[#D4AF37]/90
              active:border-[#D4AF37]/90
              sm:p-6
            "
          >
            {/* Gold Gradient Top Line */}
            <GoldTopLine />

            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
                  Today&apos;s Lesson
                </p>

                <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                  Saturday Classes
                </h2>
              </div>

              <span
                className="
                  shrink-0 rounded-full
                  border border-[#D4AF37]/70
                  px-3 py-1
                  text-[10px] font-semibold tracking-wide
                  text-[#D4AF37]
                  sm:text-xs
                "
              >
                CURRENT
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-6">
              <StatItem label="Classes" value="8" />
              <StatItem label="Students" value="120" />
              <StatItem label="Status" value="Active" highlight />
            </div>
          </section>


          {/* =====================================================
              QUICK ACTIONS
          ====================================================== */}
          <section className="mb-7">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold sm:text-xl">
                Quick Actions
              </h2>

              <span className="text-xs text-[#C8D2DF] sm:text-sm">
                Admin
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <DashboardCard
                title="Students"
                description="Student Management"
                icon="♙"
              />

              <DashboardCard
                title="Parents"
                description="Parent Management"
                icon="♕"
              />

              <DashboardCard
                title="Attendance"
                description="Attendance Overview"
                icon="◷"
              />

              <DashboardCard
                title="Classes"
                description="Class Management"
                icon="♜"
              />

            </div>
          </section>


          {/* =====================================================
              RECENT ACTIVITY + NEWS
          ====================================================== */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Recent Activity */}
            <DashboardSection
              eyebrow="Recent Activity"
              title="Latest Updates"
            >
              <div className="overflow-hidden rounded-xl border border-[#0D2444]/10">

                <ActivityItem
                  title="Student records"
                  description="120 students currently in the system."
                  index={0}
                />

                <ActivityItem
                  title="Parent records"
                  description="Family relationships successfully verified."
                  index={1}
                />

                <ActivityItem
                  title="System security"
                  description="Authenticated access is active."
                  index={2}
                />

              </div>
            </DashboardSection>


            {/* News */}
            <DashboardSection
              eyebrow="News"
              title="MyCHESS Updates"
            >
              <div className="overflow-hidden rounded-xl border border-[#0D2444]/10">

                <NewsItem
                  label="SYSTEM"
                  text="Authentication foundation complete"
                  index={0}
                />

                <NewsItem
                  label="NEXT"
                  text="Admin Framework & Navigation"
                  index={1}
                />

              </div>
            </DashboardSection>

          </div>


          {/* =====================================================
              ACHIEVEMENTS
          ====================================================== */}
          <DashboardSection
            eyebrow="Achievements"
            title="Growing Through Every Step"
            className="mt-6"
          >
            <div className="flex flex-wrap gap-2.5 sm:gap-3">
              <Badge>2026</Badge>
              <Badge>Active</Badge>
              <Badge>120 Students</Badge>
              <Badge>Admin</Badge>
            </div>
          </DashboardSection>

        </div>
      </div>
    </main>
  );
}


/* =============================================================
   GOLD TOP LINE
   ============================================================= */

function GoldTopLine() {
  return (
    <div
      className="
        pointer-events-none
        absolute left-0 top-0
        h-[3px]
        w-[58%]
        bg-gradient-to-r
        from-[#D4AF37]
        via-[#D4AF37]/70
        to-transparent
      "
    />
  );
}


/* =============================================================
   DASHBOARD SECTION
   ============================================================= */

function DashboardSection({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`
        relative overflow-hidden rounded-[18px]
        border border-[#D4AF37]/40
        bg-[#152D4D]
        p-5
        transition-colors duration-200
        hover:border-[#D4AF37]/85
        active:border-[#D4AF37]/85
        sm:p-6
        ${className}
      `}
    >
      <GoldTopLine />

      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-xl font-bold">
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}


/* =============================================================
   STAT ITEM
   ============================================================= */

function StatItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-[#C8D2DF] sm:text-sm">
        {label}
      </p>

      <p
        className={`
          mt-1 truncate text-lg font-semibold sm:text-xl
          ${highlight ? "text-[#D4AF37]" : "text-[#F4F7FB]"}
        `}
      >
        {value}
      </p>
    </div>
  );
}


/* =============================================================
   DASHBOARD CARD
   ============================================================= */

function DashboardCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div
      className="
        group relative overflow-hidden rounded-[16px]
        border border-[#D4AF37]/35
        bg-[#152D4D]
        p-5

        transition-colors duration-200

        hover:border-[#D4AF37]/90
        active:border-[#D4AF37]/90
      "
    >
      {/* Gold Gradient Top Line */}
      <GoldTopLine />

      {/* Icon */}
      <div
        className="
          mb-4 flex h-10 w-10 items-center justify-center
          rounded-xl
          border border-[#D4AF37]/60
          bg-[#0D2444]/55
          text-xl text-[#D4AF37]

          transition-colors duration-200

          group-hover:border-[#D4AF37]
          group-active:border-[#D4AF37]
        "
      >
        {icon}
      </div>

      <h3 className="text-base font-bold sm:text-lg">
        {title}
      </h3>

      <p className="mt-1 truncate text-xs text-[#C8D2DF] sm:text-sm">
        {description}
      </p>

      <div
        className="
          mt-4
          text-sm font-semibold
          text-[#D4AF37]
          transition-transform duration-200
          group-hover:translate-x-1
        "
      >
        Open →
      </div>
    </div>
  );
}


/* =============================================================
   ACTIVITY ITEM
   ============================================================= */

function ActivityItem({
  title,
  description,
  index,
}: {
  title: string;
  description: string;
  index: number;
}) {
  return (
    <div
      className={`
        px-4 py-3.5
        transition-colors duration-150
        sm:px-5

        ${
          index % 2 === 0
            ? "bg-[#F7F8FA] text-[#011029] hover:bg-white"
            : "bg-[#F8F5ED] text-[#011029] hover:bg-[#FAF8F2]"
        }
      `}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 truncate text-sm font-semibold">
          {title}
        </p>

        <span
          className="
            shrink-0
            text-[10px]
            font-medium
            uppercase
            tracking-wide
            opacity-45
          "
        >
          UPDATE
        </span>
      </div>

      <p className="mt-1 truncate text-xs opacity-65 sm:text-sm">
        {description}
      </p>
    </div>
  );
}


/* =============================================================
   NEWS ITEM
   ============================================================= */

function NewsItem({
  label,
  text,
  index,
}: {
  label: string;
  text: string;
  index: number;
}) {
  return (
    <div
      className={`
        px-4 py-3.5
        transition-colors duration-150
        sm:px-5

        ${
          index % 2 === 0
            ? "bg-[#F7F8FA] text-[#011029] hover:bg-white"
            : "bg-[#F8F5ED] text-[#011029] hover:bg-[#FAF8F2]"
        }
      `}
    >
      <div className="flex items-center gap-3">
        <span
          className="
            shrink-0
            text-[10px]
            font-bold
            tracking-[0.14em]
            text-[#9A7610]
          "
        >
          {label}
        </span>

        <p className="min-w-0 truncate text-sm font-semibold">
          {text}
        </p>
      </div>
    </div>
  );
}


/* =============================================================
   BADGE
   ============================================================= */

function Badge({ children }: { children: ReactNode }) {
  return (
    <span
      className="
        rounded-full
        border border-[#D4AF37]/45
        bg-[#0D2444]/65
        px-3 py-1.5
        text-xs font-medium
        text-[#F4F7FB]

        transition-colors duration-200

        hover:border-[#D4AF37]/85
        active:border-[#D4AF37]/85
      "
    >
      {children}
    </span>
  );
}