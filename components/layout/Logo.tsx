import Link from "next/link";

export function Logo({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`text-xl font-bold tracking-tight ${className}`}
      aria-label="Sidestep home"
    >
      <span className="text-teal-600">Side</span>
      <span className="text-foreground">step</span>
    </Link>
  );
}
