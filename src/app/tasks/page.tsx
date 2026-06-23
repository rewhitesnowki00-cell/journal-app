import { getTasks } from "@/lib/actions/tasks";
import TasksList from "./TasksList";

export default async function TasksPage() {
  const tasks = await getTasks();
  return <TasksList initialTasks={tasks} />;
}
