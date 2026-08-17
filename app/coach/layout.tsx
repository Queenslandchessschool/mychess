import CoachNavigation from "@/components/coach/CoachNavigation";
import ChessboardBackground from "@/components/layout/ChessboardBackground";

export default function CoachLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <CoachNavigation />

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