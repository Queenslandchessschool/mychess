import ParentNavigation from "@/components/parent/ParentNavigation";
import ChessboardBackground from "@/components/layout/ChessboardBackground";

export default function ParentLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <ParentNavigation />

      <div className="min-h-screen lg:pl-[248px]">
        <ChessboardBackground>
          <main className="min-h-screen pt-4 lg:pt-0">
            {children}
          </main>
        </ChessboardBackground>
      </div>
    </>
  );
}