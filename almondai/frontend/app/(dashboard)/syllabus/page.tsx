import { redirect } from "next/navigation";

export default function SyllabusPage() {
  redirect("/planner?tab=map");
}
