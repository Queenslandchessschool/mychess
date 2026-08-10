import AdminNavigation from "@/components/admin/AdminNavigation";
import ChessboardBackground from "@/components/layout/ChessboardBackground";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <AdminNavigation />

      <div className="min-h-screen lg:pl-[248px]">
        <main className="min-h-screen">
          <ChessboardBackground>
            {children}
          </ChessboardBackground>
        </main>
      </div>
    </>
  );
}