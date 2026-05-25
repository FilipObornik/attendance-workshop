import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "./supabase-server";

export async function requireAdmin() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}
