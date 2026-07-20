import { redirect } from "next/navigation";

export default function NewShowPage() {
  redirect("/shows?create=1");
}
