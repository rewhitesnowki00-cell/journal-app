"use client";

import { Task, Conversation } from "./types";

const TASKS_KEY = "journal_tasks";
const CONVERSATIONS_KEY = "journal_conversations";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// Tasks
export function getTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveTask(task: Omit<Task, "id" | "createdAt">): Task {
  const newTask: Task = { ...task, id: generateId(), createdAt: new Date().toISOString() };
  const tasks = getTasks();
  localStorage.setItem(TASKS_KEY, JSON.stringify([...tasks, newTask]));
  return newTask;
}

export function updateTask(id: string, patch: Partial<Task>): void {
  const tasks = getTasks().map((t) => (t.id === id ? { ...t, ...patch } : t));
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function deleteTask(id: string): void {
  const tasks = getTasks().filter((t) => t.id !== id);
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// Conversations
export function getConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveConversation(conv: Omit<Conversation, "id" | "createdAt">): Conversation {
  const newConv: Conversation = { ...conv, id: generateId(), createdAt: new Date().toISOString() };
  const convs = getConversations();
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify([...convs, newConv]));
  return newConv;
}

export function updateConversation(id: string, patch: Partial<Conversation>): void {
  const convs = getConversations().map((c) => (c.id === id ? { ...c, ...patch } : c));
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
}

export function deleteConversation(id: string): void {
  const convs = getConversations().filter((c) => c.id !== id);
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(convs));
}

// Unique person names from past conversations
export function getPersonNames(): string[] {
  const names = getConversations().map((c) => c.person).filter(Boolean);
  return [...new Set(names)];
}
