import { redirect } from "next/navigation";

export default function CrisisPage() {
  redirect("/planner?tab=crisis");
}
