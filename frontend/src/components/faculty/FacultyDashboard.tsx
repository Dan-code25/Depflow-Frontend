import { FacultyLayout } from "../layout/FacultyLayout";

export default function FacultyDashboard() {
  return (
    <FacultyLayout>
      <div>
        <h1 className="text-2xl font-bold mb-4">Faculty Dashboard</h1>
        <p>
          Welcome to the faculty dashboard! Here you can view your courses,
          manage assignments, and communicate with students.
        </p>
      </div>
    </FacultyLayout>
  );
}
