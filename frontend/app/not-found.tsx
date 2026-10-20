import Link from "next/link";
import { Fuse } from "@/components/ui/Fuse";

export default function NotFound() {
  return (
    <main className="center-page">
      <Fuse mood="dead" className="hero-bomb" />
      <h1>No such room.</h1>
      <p>That code doesn&apos;t match a room. Codes are 6 characters, letters and numbers only.</p>
      <div className="actions">
        <Link href="/" className="btn btn-primary">Go home</Link>
      </div>
    </main>
  );
}
