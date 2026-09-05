import { SessionDetail } from "@/tools/workouts/session-detail";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default async function Page({ params }: PageProps<"/workouts/[id]">) {
  const { id } = await params;
  return <SessionDetail workoutId={id as Id<"workouts">} />;
}
