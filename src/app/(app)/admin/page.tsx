import { redirect } from "next/navigation";

/**
 * `/admin` is a stable entry point (the brand link, the post-login redirect for platform admins).
 * The console itself is split into real routes — land on the overview.
 */
export default function AdminIndexPage() {
  redirect("/admin/overview");
}
