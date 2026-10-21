
import Link from "next/link";

const reports = [
  {
    title: "Make-up Credit Report",
    description:
      "Review available, booked and used credits, inspect credit records and identify data issues.",
    href: "/admin/reports/makeup-credits",
    status: "Available",
  },
    {
    title: "Attendance History",
    description:
      "Review historical attendance records and attendance-related information.",
    href: "/admin/attendance-history",
    status: "Available",
  },
  {
    title: "Parent Account Management",
    description:
      "Review existing parent accounts and manage controlled batch account creation.",
    href: "/admin/parent-accounts-check",
    status: "Available",
  },
  {
    title: "Payment Report",
    description:
      "Review payment records and payment-related information.",
    href: "",
    status: "Coming Soon",
  },
  {
    title: "Student Report",
    description:
      "Review student information and student-related summaries.",
    href: "",
    status: "Coming Soon",
  },
  {
    title: "Enrolment Report",
    description:
      "Review enrolments and enrolment-related summaries.",
    href: "",
    status: "Coming Soon",
  },
];

export default function ReportsPage() {
  return (
    <main className="min-h-screen text-[#F4F7FB]">
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">
            MyCHESS · ADMIN
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
            Reports
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#C8D2DF] sm:text-base">
            Reporting centre for credit management, payments, students and enrolments.
          </p>
        </header>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold sm:text-xl">
              Available Reports
            </h2>
            <span className="text-xs text-[#C8D2DF]">
              {reports.filter((report) => report.status === "Available").length} available
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {reports.map((report) => {
              const available = report.status === "Available";

              const content = (
                <div
                  className={`relative h-full overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-[#152D4D] p-5 sm:p-6 ${
                    available
                      ? "transition-colors hover:border-[#D4AF37] hover:bg-[#1A3558]"
                      : "opacity-80"
                  }`}
                >
                  <div className="absolute left-0 top-0 h-[3px] w-2/5 bg-gradient-to-r from-[#D4AF37] to-transparent" />

                  <div className="mb-4 flex items-start justify-between gap-3">
                    <h3 className="text-base font-bold sm:text-lg">
                      {report.title}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold sm:text-xs ${
                        available
                          ? "border-emerald-400/40 text-emerald-200"
                          : "border-white/15 text-[#C8D2DF]"
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-[#C8D2DF]">
                    {report.description}
                  </p>

                  <div className="mt-6 text-sm font-semibold text-[#D4AF37]">
                    {available ? "Open report →" : "Not yet available"}
                  </div>
                </div>
              );

              return available ? (
                <Link
                  key={report.title}
                  href={report.href}
                  className="block min-h-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D4AF37]"
                >
                  {content}
                </Link>
              ) : (
                <div key={report.title}>{content}</div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
