import AdminNavigation from "@/components/admin/AdminNavigation";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[#0D2444] text-[#F4F7FB]">
      <AdminNavigation />

      <div className="min-h-screen lg:pl-[248px]">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}