type InfoRowProps = {
  title: string;
  value: string;
};

export default function InfoRow({
  title,
  value,
}: InfoRowProps) {
  return (
    <div className="flex justify-between items-center py-3 border-b last:border-b-0">
      <span className="font-medium text-slate-800">
        {title}
      </span>

      <span className="text-slate-500 text-sm">
        {value}
      </span>
    </div>
  );
}