import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/components/tes/studio";

export const Route = createFileRoute("/facility")({ component: () => <Studio scene="facility" /> });
