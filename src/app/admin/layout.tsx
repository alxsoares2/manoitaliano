export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="admin-theme min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
