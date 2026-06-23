import { getTasks } from "@/lib/actions/tasks";
import { getConversations, getPersonNames } from "@/lib/actions/conversations";
import TimelineView from "@/components/timeline/TimelineView";

export default async function Home() {
  const [tasks, conversations, personNames] = await Promise.all([
    getTasks(),
    getConversations(),
    getPersonNames(),
  ]);

  return <TimelineView tasks={tasks} conversations={conversations} personNames={personNames} />;
}
