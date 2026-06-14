import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import App from "../App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Guest Manager - Restaurant Reservations" },
      { name: "description", content: "Manage restaurant reservations, walk-ins, table maps, and staff with a beautiful real-time dashboard." },
      { property: "og:title", content: "Guest Manager" },
      { property: "og:description", content: "Restaurant reservations, table maps, and staff management." },
    ],
  }),
  component: Index,
});

function Index() {
  // App uses localStorage at init — render only on client to avoid SSR mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <App />;
}
