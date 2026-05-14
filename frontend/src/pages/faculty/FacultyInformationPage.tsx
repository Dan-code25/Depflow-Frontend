import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FacultyLayout } from "../../components/layout/FacultyLayout";
import { FacultyHeader } from "../../components/admin/FacultyHeader";
import { FacultyGrid } from "../../components/admin/FacultyGrid";
import type {
  Faculty,
  CoreGroupFilter,
  EmploymentTypeFilter,
} from "../../types/faculty";
import { getAllFaculty } from "../../services/facultyService";

export default function FacultyInformationPage() {
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<CoreGroupFilter>("All");
  const [selectedEmploymentFilter, setSelectedEmploymentFilter] =
    useState<EmploymentTypeFilter>("All");

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

  const handleViewProfile = (selectedFaculty: Faculty) => {
    navigate(`/faculty/faculty/${selectedFaculty.id}`);
  };

  return (
    <FacultyLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header Section */}
        <div className="container-main pt-0 pb-8">
          <FacultyHeader
            title="Faculty Information"
            description="View all faculty members in the system"
            isAdmin={false}
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            selectedEmploymentFilter={selectedEmploymentFilter}
            onEmploymentFilterChange={setSelectedEmploymentFilter}
            onAddClick={() => {}}
            totalCount={faculty.length}
            faculty={faculty}
          />
        </div>

        {/* Content Section */}
        <div className="container-main py-8">
          <FacultyGrid
            faculty={filteredFaculty}
            onViewProfile={handleViewProfile}
            isAdmin={false}
          />
        </div>
      </div>
    </FacultyLayout>
  );
}
