export default function Sidebar() {
  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-6">
      <h2 className="text-2xl font-bold mb-8">MyCHESS</h2>

      <nav className="space-y-3">
        <a href="/coach/dashboard" className="block hover:text-blue-300">
          Dashboard
        </a>

        <a href="/coach/attendance" className="block hover:text-blue-300">
          Attendance
        </a>

        <a href="/coach/trial" className="block hover:text-blue-300">
          Trial
        </a>

        <a href="/coach/info" className="block hover:text-blue-300">
          Info
        </a>

        <a href="/coach/profile" className="block hover:text-blue-300">
          Profile
        </a>
      </nav>
    </aside>
  );
}