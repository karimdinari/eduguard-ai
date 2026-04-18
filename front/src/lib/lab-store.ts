/* eslint-disable prettier/prettier */
import type { Lab } from "./lab-data";

let activeLab: Lab | null = null;
let answers: Record<string, string> = {};
let sessionId: string | null = null;
let initialMessages: Array<{ role: string; content: string; agent: string; ts: number }> = [];

export const labStore = {
  setLab(lab: Lab) {
    activeLab = lab;
    answers = {};
  },
  getLab(): Lab | null {
    return activeLab;
  },
  setAnswer(id: string, value: string) {
    answers[id] = value;
  },
  getAnswer(id: string): string {
    return answers[id] ?? "";
  },
  getAllAnswers() {
    return { ...answers };
  },
  setSessionId(id: string) {
    sessionId = id;
  },
  getSessionId(): string | null {
    return sessionId;
  },
  setInitialMessages(msgs: typeof initialMessages) {
    initialMessages = msgs;
  },
  getInitialMessages() {
    return initialMessages;
  },
  reset() {
    activeLab = null;
    answers = {};
    sessionId = null;
    initialMessages = [];
  },
};
