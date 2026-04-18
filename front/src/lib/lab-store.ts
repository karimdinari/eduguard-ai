// Simple in-memory lab store (non-persistent). Holds the active lab loaded
// from a "PDF upload" so the lab route can read it.
import type { Lab } from "./lab-data";

let activeLab: Lab | null = null;
let answers: Record<string, string> = {};

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
  reset() {
    activeLab = null;
    answers = {};
  },
};
