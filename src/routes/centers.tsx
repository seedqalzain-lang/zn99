import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/centers")({
  component: CentersLayout,
});

function CentersLayout() {
  return <Outlet />;
}
