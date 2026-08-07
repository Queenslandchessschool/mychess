export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-2">
        Admin Dashboard
      </h1>

      <p className="text-gray-600 mb-8">
        Welcome to MyChess Administration System.
      </p>

      <div className="grid grid-cols-2 gap-6">

        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Students</h2>
          <p className="text-gray-500 mt-2">
            Student Management
          </p>
        </div>

        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Parents</h2>
          <p className="text-gray-500 mt-2">
            Parent Management
          </p>
        </div>

        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Attendance</h2>
          <p className="text-gray-500 mt-2">
            Attendance Overview
          </p>
        </div>

        <div className="rounded-xl border p-6">
          <h2 className="text-xl font-semibold">Classes</h2>
          <p className="text-gray-500 mt-2">
            Class Management
          </p>
        </div>

      </div>
    </div>
  );
}