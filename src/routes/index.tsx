import { createFileRoute } from "@tanstack/react-router";
import { Studio } from "@/components/tes/studio";

export const Route = createFileRoute("/")({ component: () => <Studio scene="unit" /> });
