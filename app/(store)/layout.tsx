import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get("auth_token")?.value;
  const user = token ? await verifyJWT(token) : null;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={user} />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
