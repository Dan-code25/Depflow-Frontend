import api from "./api";

export async function getSchedule(facultyId: string) {
  const response = await api.get(`/schedules/faculty-schedule/${facultyId}`);

  if (!response.data) {
    throw new Error("Failed to fetch schedule");
  }

  return response.data;
}

// Get current user's schedule (backend identifies user from auth token)
export async function getMySchedule() {
  const response = await api.get(`/schedules/my-schedule`);

  if (!response.data) {
    throw new Error("Failed to fetch schedule");
  }

  return response.data;
}
