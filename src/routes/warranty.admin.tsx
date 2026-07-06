import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/warranty/admin")({
  component: () => <Navigate to="/admin" replace />,
});
