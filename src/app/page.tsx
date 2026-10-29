import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Redirect based on role
  switch (session.role) {
    case "JURADO":
      redirect("/jurado");
    case "ADMIN":
      redirect("/admin");
    case "NOTARIO":
      redirect("/notaria");
    case "CONTROL":
      redirect("/control");
    default:
      redirect("/login");
  }
}
