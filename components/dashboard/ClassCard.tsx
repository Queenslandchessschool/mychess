type ClassCardProps = {
  time: string;
  className: string;
  students: number;
  status: string;
};

export default function ClassCard({
  time,
  className,
  students,
  status,
}: ClassCardProps) {
  return (
    <div className="border rounded-xl p-4 flex justify-between items-center">

      <div>
        <p className="text-sm text-slate-500">{time}</p>

        <h3 className="font-bold text-lg">{className}</h3>

        <p className="text-sm text-slate-500">
          {students} Students
        </p>

        <p className="text-xs mt-2 text-blue-600">
          {status}
        </p>
      </div>

      <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2">
        Attendance
      </button>

    </div>
  );
}