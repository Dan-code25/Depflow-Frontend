import api from "./api";
import type { Credential } from "../types/profile";

// Fetch all credentials
export const getCredentials = async () => {
  try {
    const response = await api.get("/credentials/get-credentials");
    const data = response.data;

    // Transform typed arrays into flat array with type field
    const credentials: Credential[] = [];

    // Add certifications
    (data.certifications || []).forEach((cert: any) => {
      credentials.push({
        id: cert.cert_id,
        type: "certification",
        title: cert.title,
        organization: cert.organization,
        yearObtained: cert.year_obtained,
      });
    });

    // Add licenses
    (data.licenses || []).forEach((license: any) => {
      credentials.push({
        id: license.license_id,
        type: "license",
        title: license.title,
        issuingAuthority: license.authority,
        yearObtained: license.year_obtained,
      });
    });

    // Add seminars
    (data.seminars || []).forEach((seminar: any) => {
      credentials.push({
        id: seminar.seminar_id,
        type: "seminar",
        title: seminar.title,
        organizer: seminar.organizer,
        yearObtained: seminar.year_attended,
      });
    });

    // Add work experiences
    (data.workExperiences || []).forEach((exp: any) => {
      credentials.push({
        id: exp.work_exp_id,
        type: "experience",
        title: exp.job_title,
        company: exp.company,
        startYear: exp.start_year,
        endYear: exp.end_year,
      });
    });

    return credentials;
  } catch (error) {
    console.error("Error fetching credentials:", error);
    throw error;
  }
};

// Fetch credentials for a specific faculty member
export const getFacultyCredentials = async (facultyId: string) => {
  try {
    const response = await api.get(
      `/faculty/credentials/faculty/${facultyId}`,
    );
    const data = response.data;

    // Transform typed arrays into flat array with type field
    const credentials: Credential[] = [];

    // Add certifications
    (data.certifications || []).forEach((cert: any) => {
      credentials.push({
        id: cert.cert_id,
        type: "certification",
        title: cert.title,
        organization: cert.organization,
        yearObtained: cert.year_obtained,
      });
    });

    // Add licenses
    (data.licenses || []).forEach((license: any) => {
      credentials.push({
        id: license.license_id,
        type: "license",
        title: license.title,
        issuingAuthority: license.authority,
        yearObtained: license.year_obtained,
      });
    });

    // Add seminars
    (data.seminars || []).forEach((seminar: any) => {
      credentials.push({
        id: seminar.seminar_id,
        type: "seminar",
        title: seminar.title,
        organizer: seminar.organizer,
        yearObtained: seminar.year_attended,
      });
    });

    // Add work experiences
    (data.workExperiences || []).forEach((exp: any) => {
      credentials.push({
        id: exp.work_exp_id,
        type: "experience",
        title: exp.job_title,
        company: exp.company,
        startYear: exp.start_year,
        endYear: exp.end_year,
      });
    });

    return credentials;
  } catch (error) {
    console.error("Error fetching faculty credentials:", error);
    throw error;
  }
};

// Certification endpoints
export const addCertification = async (credential: Credential) => {
  try {
    const response = await api.post(
      "/credentials/add-certification",
      credential,
    );
    return response.data;
  } catch (error) {
    console.error("Error adding certification:", error);
    throw error;
  }
};

export const deleteCertification = async (id: string) => {
  try {
    const response = await api.delete(`/credentials/certificate/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting certification:", error);
    throw error;
  }
};

// License endpoints
export const addLicense = async (credential: Credential) => {
  try {
    const response = await api.post("/credentials/add-license", credential);
    return response.data;
  } catch (error) {
    console.error("Error adding license:", error);
    throw error;
  }
};

export const deleteLicense = async (id: string) => {
  try {
    const response = await api.delete(`/credentials/license/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting license:", error);
    throw error;
  }
};

// Seminar endpoints
export const addSeminar = async (credential: Credential) => {
  try {
    const response = await api.post("/credentials/add-seminar", credential);
    return response.data;
  } catch (error) {
    console.error("Error adding seminar:", error);
    throw error;
  }
};

export const deleteSeminar = async (id: string) => {
  try {
    const response = await api.delete(`/credentials/seminar/delete/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting seminar:", error);
    throw error;
  }
};

// Work experience endpoints
export const addExperience = async (credential: Credential) => {
  try {
    const response = await api.post(
      "/credentials/add-work-experience",
      credential,
    );
    return response.data;
  } catch (error) {
    console.error("Error adding work experience:", error);
    throw error;
  }
};

export const deleteExperience = async (id: string) => {
  try {
    const response = await api.delete(
      `/credentials/work-experience/delete/${id}`,
    );
    return response.data;
  } catch (error) {
    console.error("Error deleting work experience:", error);
    throw error;
  }
};
