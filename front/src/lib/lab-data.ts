export type Question = {
  id: string;
  type: "code" | "completion";
  task: string;
  code?: string;
};

export type LabPart = {
  part: number;
  title: string;
  questions: Question[];
};

export type Lab = {
  title: string;
  parts: LabPart[];
};

export const sampleLab: Lab = {
  title: "Spring Boot Lab - Student Management API (Mixed Questions)",
  parts: [
    {
      part: 1,
      title: "Project Setup & Basic REST",
      questions: [
        {
          id: "1.a",
          type: "code",
          task: "Create a Spring Boot project with dependencies: Spring Web, Spring Data JPA, H2. Configure application.properties to enable H2 console and in-memory database.",
        },
        {
          id: "1.b",
          type: "completion",
          task: "Complete the Student entity.",
          code: '@Entity\npublic class Student {\n\n    @Id\n    @GeneratedValue(strategy = ______)\n    private Long id;\n\n    @________\n    private String name;\n\n    private String email;\n}',
        },
        {
          id: "1.c",
          type: "code",
          task: "Create a REST controller with endpoint GET /students that returns all students using StudentRepository.",
        },
      ],
    },
    {
      part: 2,
      title: "Repository & Service Layer",
      questions: [
        {
          id: "2.a",
          type: "completion",
          task: "Complete the repository interface.",
          code: "public interface StudentRepository extends ________<Student, Long> {\n    Optional<Student> findByEmail(String email);\n}",
        },
        {
          id: "2.b",
          type: "code",
          task: "Create a StudentService class with a method addStudent(Student s) that checks if email already exists and throws an exception if true.",
        },
      ],
    },
    {
      part: 3,
      title: "CRUD, Validation & Relations",
      questions: [
        {
          id: "3.a",
          type: "completion",
          task: "Complete the update method.",
          code: '@PutMapping("/{id}")\npublic Student update(@PathVariable Long id, @RequestBody Student s) {\n    Student existing = repository.findById(id)\n        .orElseThrow(() -> new RuntimeException("Not found"));\n\n    existing.setName(s.getName());\n    existing.setEmail(s.getEmail());\n\n    return ________;\n}',
        },
        {
          id: "3.b",
          type: "code",
          task: "Implement DELETE /students/{id} endpoint with verification that the student exists before deletion.",
        },
        {
          id: "3.c",
          type: "completion",
          task: "Add validation annotations.",
          code: "public class Student {\n\n    @Id\n    @GeneratedValue\n    private Long id;\n\n    @________\n    private String name;\n\n    @________\n    private String email;\n}",
        },
        {
          id: "3.d",
          type: "code",
          task: "Create a Course entity and define a ManyToOne relationship with Student. Then implement POST /students/{id}/courses to assign a course to a student.",
        },
      ],
    },
  ],
};
