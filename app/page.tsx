import { redirect } from "next/navigation";

// The client-facing surface IS the plan picker (ported verbatim, lives in /public/picker.html).
// Kept as a standalone document so its tested vanilla code is untouched and never bleeds
// into — or exposes — the internal cockpit at /studio.
export default function Home() {
  redirect("/picker.html");
}
