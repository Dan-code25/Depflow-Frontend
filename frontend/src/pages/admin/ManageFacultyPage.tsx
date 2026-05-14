import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { FacultyHeader } from "../../components/admin/FacultyHeader";
import { FacultyGrid } from "../../components/admin/FacultyGrid";
import { AddFacultyModal } from "../../components/admin/AddFacultyModal";
import { ConfirmDeleteModal } from "../../components/common/ConfirmDeleteModal";
import type {
  Faculty,
  AddFacultyFormData,
  CoreGroupFilter,
  EmploymentTypeFilter,
} from "../../types/faculty";
import {
  getAllFaculty,
  addFaculty,
  deleteFaculty,
} from "../../services/facultyService";

export default function ManageFacultyPage() {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<CoreGroupFilter>("All");
  const [selectedEmploymentFilter, setSelectedEmploymentFilter] =
    useState<EmploymentTypeFilter>("All");
  const [isLoading, setIsLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [facultyToDelete, setFacultyToDelete] = useState<Faculty | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch faculty data on component mount
  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const data = await getAllFaculty();
        setFaculty(data);
      } catch (error) {
        console.error("Failed to fetch faculty:", error);
      }
    };

    fetchFaculty();
  }, []);

  // Get user role from localStorage
  const userRole = localStorage.getItem("user_role");
  const isAdmin = userRole === "admin";

  // Filter faculty by core group and employment type
  const filteredFaculty = useMemo(() => {
    return faculty.filter((f) => {
      const matchesCoreGroup =
        selectedFilter === "All" || f.coreGroup === selectedFilter;
      const matchesEmployment =
        selectedEmploymentFilter === "All" ||
        f.employmentType === selectedEmploymentFilter;
      return matchesCoreGroup && matchesEmployment;
    });
  }, [faculty, selectedFilter, selectedEmploymentFilter]);

  // Handle add faculty
  const handleAddFaculty = async (formData: AddFacultyFormData) => {
    try {
      setIsLoading(true);
      const newFaculty = await addFaculty(formData);
      setFaculty((prev) => [newFaculty, ...prev]);
      setIsModalOpen(false);
      console.log("Faculty added successfully:", newFaculty);
    } catch (error) {
      console.error("Failed to add faculty:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete faculty
  const handleDeleteClick = (selectedFaculty: Faculty) => {
    setFacultyToDelete(selectedFaculty);
    setDeleteModalOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!facultyToDelete) return;

    try {
      setIsDeleting(true);
      await deleteFaculty(facultyToDelete.id);
      setFaculty((prev) => prev.filter((f) => f.id !== facultyToDelete.id));
      setDeleteModalOpen(false);
      setFacultyToDelete(null);
      console.log("Faculty deleted successfully");
    } catch (error) {
      console.error("Failed to delete faculty:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle cancel delete
  const handleCancelDelete = () => {
    setDeleteModalOpen(false);
    setFacultyToDelete(null);
  };

  // Handle view profile - navigate to faculty profile page
  const handleViewProfile = (selectedFaculty: Faculty) => {
    // Navigate to the faculty profile view page with faculty ID
    navigate(`/admin/faculty/${selectedFaculty.id}`);
  };

  // Page title based on role
  const pageTitle = isAdmin ? "Manage Faculty" : "Faculty Information";
  const pageDescription = isAdmin
    ? "View all faculty members, add new members, and manage their information"
    : "View all faculty members in the system";

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header Section */}
        <div className="container-main pt-0 pb-8">
          <FacultyHeader
            title={pageTitle}
            description={pageDescription}
            isAdmin={isAdmin}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            selectedEmploymentFilter={selectedEmploymentFilter}
            onEmploymentFilterChange={setSelectedEmploymentFilter}
            onAddClick={() => setIsModalOpen(true)}
            totalCount={faculty.length}
            faculty={faculty}
          />
        </div>

        {/* Content Section */}
        <div className="container-main py-8">
          <FacultyGrid
            faculty={filteredFaculty}
            onViewProfile={handleViewProfile}
            onDeleteClick={handleDeleteClick}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      {/* Add Faculty Modal (Admin Only) */}
      {isAdmin && (
        <AddFacultyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddFaculty}
          isLoading={isLoading}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        title="Delete Faculty Member"
        message={
          facultyToDelete
            ? `Are you sure you want to delete ${facultyToDelete.firstName} ${facultyToDelete.lastName}? This action cannot be undone.`
            : "Are you sure you want to delete this faculty member?"
        }
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </AdminLayout>
  );
}
